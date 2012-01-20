var fspath = require('path')

var config_path = 'config.js'
  , default_config = { database_url: process.env.DATABASE_URL
                     , migrations_table: "schema_migrations"
                     , migrations_directory: 'migrations'
                     }
  , exists = fspath.existsSync(config_path)

if(!exists) {
  console.log('Could not find configuration file "' + config_path + '", using default parameters.');
  module.exports = default_config;
} else {
  var config = require(config_path);
  if(!config.migrations) {
    console.log('Configuration file does not export a `migrations` property, using default parameters.');
    module.exports = default_config;
  } else {
    module.exports = config.migrations;
  }
}
