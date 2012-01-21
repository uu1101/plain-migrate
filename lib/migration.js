var fspath = require('path')
  , fs = require('fs')
  , pg = require('pg')

var config = require('./config')

var Migration = function(directory_name) {
  this.id = parseInt(directory_name, 10)

  var path_prefix = fspath.join(this.migrations_directory, directory_name)

  this.js = { path: './' + fspath.join(path_prefix, 'index.js')
            , up: 'upgrade'
            , down: 'downgrade'
            }

  this.up = { path: fspath.join(path_prefix, 'up.sql')
            , sql: "INSERT INTO " + this.migrations_table
                 + " VALUES (" + this.id + ");"
            }
  this.down = { path: fspath.join(path_prefix, 'down.sql')
              , sql: "DELETE FROM " + this.migrations_table
                   + " WHERE id = " + this.id + ";"
              }
}

Migration.prototype = config

Migration.prototype.wrap_transaction = function(sql) {
  return "START TRANSACTION; " + sql + "COMMIT;"
}

Migration.prototype.execute = function(config, values, next) {
  var args = arguments
  pg.connect(this.database_url, function(err, client) {
    if(err) return next(err)

    client.query.apply(client, args)
  })
}

Migration.prototype.run_sql = function(direction, next) {
  var self = this
    , path = self[direction].path

  fspath.exists(path, function(exists) {
    if(!exists) return next("Can't find '" + path + "'.")

    fs.readFile(path, function(err, content) {
      if(err) return next(err)

      var sql = content.toString() + ';'
              + self[direction].sql
        , transaction = self.wrap_transaction(sql)

      self.execute(transaction, next)
    })
  })
}
Migration.prototype.upgrade_sql = function(next) { this.run_sql('up', next) }
Migration.prototype.downgrade_sql = function(next) { this.run_sql('down', next) }

Migration.prototype.run_migration = function(direction, next) {
  var self = this
  fspath.exists(self.js.path, function(exists) {
    if(exists) {
      require(self.js.path)[self.js[direction]].call(self, function(err) {
        if(err) return next(err)
        self.execute(self[direction].sql, next)
      })
    } else {
      self.run_sql(direction, next)
    }
  })
}
Migration.prototype.upgrade = function(next) { this.run_migration('up', next) }
Migration.prototype.downgrade = function(next) { this.run_migration('down', next) }

module.exports = Migration
