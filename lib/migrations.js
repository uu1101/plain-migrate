var async = require('async')
  , fs = require('fs')
  , fspath = require('path')
  , pg = require('pg')

var config = require('./config')
  , Migration = require('./migration')

var pending_migrations
  , applied_migrations
  , migrations_db

var applied_ids = async.memoize(function(next) {
  var sql = "SELECT id "
          + "FROM " + config.migrations_table + " "
          + "ORDER BY id ";

  pg.connect(config.database_url, function(err, client) {
    if(err) return next(err);

    client.query(sql, function(err, result) {
      if(err) return next(err);
      next(null, result.rows);
    });
  });
})

var all = async.memoize(function(next) {
  fs.readdir(config.migrations_directory, function(err, filenames) {
    if(err) return next(err);

    var is_directory = function(filename, next) {
      var path = fspath.join(config.migrations_directory, filename);
      fs.stat(path, function(err, stats) {
        if(err) return next(null); // doesn't accept error arg
        next(stats.isDirectory());
      })
    }

    async.filter(filenames ,is_directory
      ,function(directories) {
        var ms = directories.map(function(directory) {
          return new Migration(directory);
        })
        next(null, ms);
      })
  })
})

var filtered = function(condition, next) {
  all(function(err, migrations) {
    if(err) return next(err);

    var sorted_migrations = migrations.sort(function(x, y) {
      return x.id > y.id;
    })
      , filtered_migrations = sorted_migrations.filter(condition);

    next(null, filtered_migrations);
  })
}

var pending = async.memoize(function(next) {
  applied_ids(function(err, ids) {
    if(err) return next(err);

    filtered(function(m) {
      return ids.every(function(a) { return a.id != m.id })
    }, next);
  })
})

var applied = async.memoize(function(next) {
  applied_ids(function(err, ids) {
    if(err) return next(err);

    filtered(function(m) {
      return ids.some(function(a) { return a.id == m.id })
    }, next);
  })
})

module.exports = { all: all
                 , pending: pending
                 , applied: applied
                 }
