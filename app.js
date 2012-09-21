var inotify = require('inotify-plusplus').create(true)
var fs = require('fs')
var forever = require('forever-monitor')

var runningChildren = {}

function startWorker(filepath) {
  fs.readFile(filepath, function(err, data) {
    console.log("Read JSON: " + data)
    var child_config = JSON.parse(data.toString())
    var child = new (forever.Monitor)(child_config.filepath)
    runningChildren[filepath] = child
    child.start()
  })
}

var directive = { 
  create: function(ev) {
    console.log("some things happened: " + JSON.stringify(ev));
    if(ev.hasOwnProperty("name") && ev.name.match("\\.json$")) {
      var filename = ev.name
      var dir = ev.watch
      var filepath = dir + "/" + filename
      startWorker(filepath)      
    }
  },

  delete: function(ev) {
    console.log("some things happened: " + JSON.stringify(ev));
    if(ev.hasOwnProperty("name") && ev.name.match("\\.json$")) {
      var filename = ev.name
      var dir = ev.watch
      var filepath = dir + "/" + filename
      if(runningChildren.hasOwnProperty(filepath)) {
        runningChildren[filepath].stop()
        delete runningChildren[filepath]
      } else {
        console.log("Child DNE: " + filepath)
      }
    }
  },

  attrib: function(ev) {
    console.log("some things happened: " + JSON.stringify(ev));
    if(ev.hasOwnProperty("name") && ev.name.match("\\.json$")) {
      var filename = ev.name
      var dir = ev.watch
      var filepath = dir + "/" + filename
      if(runningChildren.hasOwnProperty(filepath)) {
        runningChildren[filepath].restart()
      } else {
        console.log("Child DNE: " + filepath)
      }
    }
  },

  modify: function(ev) {
    console.log("some things happened: " + JSON.stringify(ev));
    if(ev.hasOwnProperty("name") && ev.name.match("\\.json$")) {
      var filename = ev.name
      var dir = ev.watch
      var filepath = dir + "/" + filename
      if(runningChildren.hasOwnProperty(filepath)) {
        runningChildren[filepath].restart()
      } else {
        console.log("Child DNE: " + filepath)
      }
    }
  },
}
var options =  {
 // all_events_is_catchall: true
}
inotify.watch(directive, './worker-configs', options);
