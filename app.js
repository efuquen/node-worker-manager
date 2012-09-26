var inotify = require('inotify-plusplus').create(true)
var fs = require('fs')
var forever = require('forever-monitor')
var _ = require('underscore')

var runningChildren = {}
var configDir = process.env.CONFIG_DIR || "./config/workers"

function handleInotifyEvent(ev, filepathHandler) {
  if( ev.hasOwnProperty("name") && 
      (typeof ev.name != "undefined") && 
      ev.name.match("\\.json$")
  ) {
    var filename = ev.name
    var dir = ev.watch
    var filepath = dir + "/" + filename
    console.log(filepath)
    if( !_.contains(ev.masks, "create") ||
        !runningChildren.hasOwnProperty(filepath)
    ) {
      filepathHandler(filepath)
    }
  }
}

function startWorker(filepath) {
  var dataStr = fs.readFileSync(filepath, "utf8")
  var child_config = JSON.parse(dataStr)
  var options = {}
  if( child_config.hasOwnProperty("options") &&
      (typeof child_config.options == "object")
  ) {
    options = child_config.options
  }
  var child = new (forever.Monitor)(child_config.runpath, options)
  runningChildren[filepath] = child
  child.start()
  console.log("Started Worker: " + filepath)
}

function stopWorker(filepath) {
  if(runningChildren.hasOwnProperty(filepath)) {
    runningChildren[filepath].stop()
    delete runningChildren[filepath]
    console.log("Stopped Worker: " + filepath)
  } else {
    console.log("Child DNE: " + filepath)
  }
}

function reloadWorker(filepath) {
  if(runningChildren.hasOwnProperty(filepath)) {
    stopWorker(filepath)
    startWorker(filepath)
  } else {
    console.log("Child DNE: " + filepath)
  }
}

function restartWorker(filepath) {
  if(runningChildren.hasOwnProperty(filepath)) {
    runningChildren[filepath].restart()
    console.log("Restarted Worker: " + filepath)
  } else {
    console.log("Child DNE: " + filepath)
  }
}


//initialize forever with what is already in the directory
_.each(fs.readdirSync(configDir), function(filename){ 
  if(filename.match("\\.json$")) {
    var filepath = configDir + "/" + filename 
    console.log("Init filepath: " + filepath)
    startWorker(filepath) 
  }
})

//start config directory watching
var directive = { 
  create: function(ev) { handleInotifyEvent(ev, startWorker) },
  delete: function(ev) { handleInotifyEvent(ev, stopWorker) },
  attrib: function(ev) { handleInotifyEvent(ev, restartWorker) },
  modify: function(ev) { handleInotifyEvent(ev, reloadWorker) }
}
var options =  {}
inotify.watch(directive, configDir, options)

console.log("started worker manager")
