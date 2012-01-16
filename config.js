var fspath = require('path')

var config_filename = 'migrations.json'
  , config_path = fspath.join(process.cwd(), config_filename)

var default_config = { database_url: process.env.DATABASE_URL
                     , migrations_table: "schema_migrations"
                     , migrations_directory: fspath.join(process.cwd(), 'migrations')
                     }

if(!fspath.existsSync(config_path)) {
  console.log('Could not find configuration file "' + config_path + '", using default parameters.');
  module.exports = default_config;
} else {
  module.exports = require(config_path);
}

