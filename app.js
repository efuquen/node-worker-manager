var inotify = require('inotify-plusplus').create(true)
var fs = require('fs')
var forever = require('forever-monitor')
var _ = require('underscore')

var runningChildren = {}
var configDir = './worker-configs'

function handleInotifyEvent(ev, filepathHandler) {
  if(ev.hasOwnProperty("name") && ev.name.match("\\.json$")) {
    var filename = ev.name
    var dir = ev.watch
    var filepath = dir + "/" + filename
    filepathHandler(filepath)      
  }
}

function startWorker(filepath) {
  fs.readFile(filepath, function(err, data) {
    var child_config = JSON.parse(data.toString())
    var child = new (forever.Monitor)(child_config.filepath)
    runningChildren[filepath] = child
    child.start()
  })
}

function stopWorker(filepath) {
  if(runningChildren.hasOwnProperty(filepath)) {
    runningChildren[filepath].stop()
    delete runningChildren[filepath]
  } else {
    console.log("Child DNE: " + filepath)
  }
}

function restartWorker(filepath) {
  if(runningChildren.hasOwnProperty(filepath)) {
    runningChildren[filepath].restart()
  } else {
    console.log("Child DNE: " + filepath)
  }
}

//initialize with what is already in the directory
_.each(fs.readdirSync(configDir), function(filepath){ 
  if(filepath.match("\\.json$")) {
    startWorker(filepath) 
  }
})

var directive = { 
  create: function(ev) { handleInotifyEvent(ev, startWorker) }
  delete: function(ev) { handleInotifyEvent(ev, stopWorker) }
  attrib: function(ev) { handleInotifyEvent(ev, restartWorker) }
  modify: function(ev) { handleInotifyEvent(ev, restartWorker) }
}
var options =  {}
inotify.watch(directive, configDir, options);
