#!/usr/bin/env node

var fs = require('fs')
  , fspath = require('path')
  , pg = require('pg')
  , async = require('async')
  , optimist = require('optimist')

// Option parsing
var argv = optimist
            .usage('Create and run migrations.\nUsage: $0')
            .option('c', //{ alias: 'create' TODO: optimist does'nt add first parameter to argv._ when using alias
                         { type: 'boolean'
                         , describe: 'Initialize a migration.'
                         })
            .option('u', //{ alias: 'up'
                         { type: 'boolean'
                         , describe: 'Run all pending migrations.'
                         })
            .option('d', //{ alias: 'down'
                         { type: 'boolean'
                         , describe: 'Unwind one migration.'
                         })
            .check(function(argv) {
                     if(argv.create && argv._.length == 0) {
                       console.dir(argv);
                       throw 'Could not create migration: a description must be provided.';
                     } else {
                       return true
                     }
                   })
            .argv

var config = require('./config')
  , Migration = require('./migration')

// Set up migration objects.
var getMigrations = function(migrations_directory, next) {
  var filenames = fs.readdirSync(migrations_directory)
    , is_directory = function(p) {
                       var path  = fspath.join(migrations_directory, p)
                         , stats = fs.statSync(path);
                       return stats.isDirectory();
                     }
    , directories = filenames.filter(is_directory)
    , migrations = directories.map(function(directory) {
        return new Migration(directory);
      })
  next(null, migrations);
}

// get schema_migrations
var appliedMigrations = function(db, migrations_table, next) {
  var sql = "SELECT id FROM " + migrations_table + " ORDER BY id";

  db.query(sql, function(err, result) {
    if(err) return next(err);

    next(null, result.rows);
  });
}

var migrate = function(direction, next) {
  async.auto(
    { db: function(next, res) { pg.connect(config.database_url, function(err, client) { next(err, client); }) }
    , applied: [ 'db'
               , function(next, res) { appliedMigrations(res.db, config.migrations_table, next) }
               ]
    , migrations: function(next, res) { getMigrations(config.migrations_directory, next) }
    , migrate: [ 'migrations'
               , 'applied'
               , 'db'
               , function(next, r) {
                   var is_applied = function(m) { return r.applied.some(function(a) { return a.id == m.id }) }
                     , is_not_applied = function(m) { return !is_applied(m) };

                   sorted_migrations = r.migrations.sort(function(x, y) { return x.id > y.id; })

                   applied_migrations = sorted_migrations.filter(is_applied);
                   pending_migrations = sorted_migrations.filter(is_not_applied);

                   if(direction === 'down') {
                     if(applied_migrations.length == 0) {
                       return next('There aren\'t any applied migrations.');
                     }

                     var a_m = applied_migrations.pop();
                     console.log('Downgrading to ' + a_m.id + '.');
                     a_m.downgrade(next);
                   } else if (direction === 'up') { // 'up'
                     if(pending_migrations.length == 0) {
                       return next('There aren\'t any pending migrations.');
                     }
                     async.forEachSeries( pending_migrations
                                        , function(p_m, next) {
                                            console.log('Upgrading to ' + p_m.id + '.');
                                            p_m.upgrade(next);
                                          }
                                        , function(err) {
                                            next(err);
                                          }
                                        )
                   }
                 }
               ]
    }, next);
}

var initialize_migration = function(params, next) {
  var intersperse_slash = function(a, b) { return a + '-' + b; }
    , description = params.reduce(intersperse_slash,'')
    , new_directory_name = Date.now().toString() + description
    , migration_path = fspath.join(config.migrations_directory,
                                   new_directory_name)
    , up_path = fspath.join(migration_path, 'up.sql')
    , down_path = fspath.join(migration_path, 'down.sql');

  fs.mkdir(migration_path, 0755, function(err) {
    if(err) {
      return next('Could not create directory "' + migration_path + '".');
    }
    var touch = function(path) {
      fs.closeSync(fs.openSync(path, 'w', 0644));
      console.log('Created ' + path + '.');
    };
    [up_path, down_path].map(touch);
    next(null);
  })
}

var quit = function(err, result) {
  if(err) {
    console.error(err);
    process.exit(-1);
  } else {
    process.exit(0);
  }
}

if(argv.create) {
  initialize_migration(argv._, quit);
} else if(argv.down) {
  migrate('down', quit);
} else if(argv.up) {
  migrate('up', quit);
} else {
  quit(optimist.help() + '\nError: Could not recognize command.');
}
