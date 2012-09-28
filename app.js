var inotify = require('inotify-plusplus').create(true)
var fs = require('fs')
var forever = require('forever-monitor')
var _ = require('underscore')
var express = require('express')

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
    if( !_.contains(ev.masks, "create") ||
        !runningChildren.hasOwnProperty(filepath)
    ) {
      filepathHandler(filepath)
    }
  }
}

function startWorker(filepath) {
  var child_config = {} 
  var options = {}
  try {
    var dataStr = fs.readFileSync(filepath, "utf8")
    child_config = JSON.parse(dataStr)
  } catch (e) {
    console.log('Error parsing worker config: ' + filepath)
    console.log(e)
    return
  }
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
  modify: function(ev) { handleInotifyEvent(ev, reloadWorker) },
  moved_from: function(ev) { handleInotifyEvent(ev, stopWorker) },
  moved_to: function(ev) { handleInotifyEvent(ev, startWorker) }
}
var options =  {}
inotify.watch(directive, configDir, options)

var app = express()
app.get("/processes",  function(req, res) {
  var processList = _.map(runningChildren, function(value, key) {
    var processInfo = { }
    processInfo.configpath = key
    processInfo.uid = value.uid
    return processInfo
  })
  res.send(JSON.stringify(processList))
})
app.listen(3000)
console.log("started worker manager")
