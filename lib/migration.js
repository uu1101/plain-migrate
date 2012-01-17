var fspath = require('path')
  , fs = require('fs')
  , pg = require('pg')

var config = require('./config')

var Migration = function(directory_name) {
  this.id = parseInt(directory_name);

  this.path_prefix = fspath.join(this.migrations_directory, directory_name)
  this.upgrade_script_path   = fspath.join(this.path_prefix, 'up.sql')
  this.downgrade_script_path = fspath.join(this.path_prefix, 'down.sql')
  this.js_path = './' + fspath.join(this.path_prefix, 'index.js')
}

Migration.prototype = config;

Migration.prototype.execute = function(sql, cb) {
  var transaction =  "START TRANSACTION; " + sql + "COMMIT;";

  pg.connect(this.database_url, function(err, client) {
    err && cb(err);
    client.query(transaction, cb);
  })
}

Migration.prototype.upgrade = function(next) {
  var self = this;
  fspath.exists(self.js_path, function(exists) {
    if(exists) {
      require(self.js_path).up.call(self, next);
    } else {
      self.upgrade_sql(next);
    }
  })
}

Migration.prototype.downgrade = function(next) {
  var self = this;
  fspath.exists(self.js_path, function(exists) {
    if(exists) {
      require(self.js_path).down.call(self, next);
    } else {
      self.downgrade_sql(next);
    }
  })
}

Migration.prototype.upgrade_sql = function(next) {
  var self = this;
  fspath.exists(self.upgrade_script_path, function(exists) {
    if(!exists) return next("Can't find upgrade script: " + self.upgrade_script_path + "'.");

    fs.readFile(self.upgrade_script_path, function(err, upgrade_script) {
      if(err) return next(err);

      var sql = upgrade_script.toString() + ';'
              + "INSERT INTO "
              + self.migrations_table
              + " VALUES (" + self.id + ");"

      self.execute(sql, next);
    })
  })
}

Migration.prototype.downgrade_sql = function(next) {
  var self = this;
  fspath.exists(self.downgrade_script_path, function(exists) {
    if(!exists) return next("Can't find downgrade script: " + self.downgrade_script_path + "'.");

    fs.readFile(self.downgrade_script_path, function(err, downgrade_script) {
      if(err) return next(err);

      var sql = downgrade_script.toString() + ';'
              + "DELETE FROM "
              + self.migrations_table
              + " WHERE id = " + self.id + ";"

      self.execute(sql, next);
    })
  })
}

module.exports = Migration
