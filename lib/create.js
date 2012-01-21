var fspath = require('path')
  , fs = require('fs')

var config = require('./config')

var touch = function(path) {
  fs.closeSync(fs.openSync(path, 'w', 0644))
  console.log('Created ' + path)
}

module.exports = function(args, next) {
  if(!args.length) return next('Must supply a description')

  var description = args.join('-')
    , time = Date.now().toString()
    , directory_name = time + '-' + description
    , migration_path = fspath.join(config.migrations_directory,
                                   directory_name)
    , up_path = fspath.join(migration_path, 'up.sql')
    , down_path = fspath.join(migration_path, 'down.sql')

  fs.mkdir(migration_path, 0755, function(err) {
    if(err) return next( 'Could not create directory "'
                       + migration_path
                       + '".'
                       )
    console.log('Created ' + migration_path)
    ;[up_path, down_path].map(touch)
    next(null)
  })
}
