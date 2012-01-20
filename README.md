# plain-migrate

Plain migrate helps you organizing, applying and reverting changes to your
database schema. Its main distinctive is it being DSL-free: you can use plain
SQL for your migrations, and fall back to Javascript when needed.

# Setup

 1. Create a directory to archive migrations:

    ~~~~
    $ mkdir migrations
    ~~~~

 2. Set up `config.js`:

    ~~~~
    $ cat >>config.js <<END
    module.exports.migrations = {
      database_url: "postgres://<username>@localhost:5432/<database_name>"
    }
    END
    ~~~~

 3. Create a table for recording applied migrations:

    ~~~~
    $ psql -U <username> <database_name> <<END
    CREATE TABLE schema_migrations (
      id numeric PRIMARY KEY
    );
    END
    ~~~~

# Usage

The command line client is straightforward to use:

~~~
$ plain-migrate
Usage: plain-migrate COMMAND
Where COMMAND is one of:
  create <description>   Create a new migration.
  upgrade                Run every pending migration.
  downgrade              Revert last applied migration.
~~~

## Create a migration

The first step is to initialize the directory that will contain the migration
scripts:

~~~
$ plain-migrate create add users table
Created /home/user/project/migrations/1326987725537-add-users-table
Created /home/user/project/migrations/1326987725537-add-users-table/up.sql
Created /home/user/project/migrations/1326987725537-add-users-table/down.sql
~~~

Then edit the upgrade script `./migrations/1326987725537-add-users-table/up.sql`:

~~~.sql
CREATE TABLE users (
  id serial PRIMARY KEY,
  name text NOT NULL
);
~~~

and downgrade script `./migrations/1326987725537-add-users-table/down.sql`:

~~~.sql
DROP TABLE users;
~~~

## Upgrade your database

Apply this and every other pending migrations:

~~~
$ plain-migrate upgrade
Upgrading to 1326987725537
~~~

## Downgrade your database

To revert the changes just made run:

~~~
$ plain-migrate downgrade
Reverting 1326987725537
~~~

# Configuration file

`plain-migrate` will try to obtain its configuration from a file named
`config.js` in the directory its called from. The configuration values should
be exported in a property named `migrations`. Internally, we roughly do:

~~~.javascript
var config = require('./config').migrations
~~~

If `plain-migrate` can't find a `config.js` file it will use the following
default values:

~~~.javascript
var default_config = {
  database_url: process.env.DATABASE_URL,
  migrations_table: 'schema_migrations',
  migrations_directory: 'migrations'
}
~~~

`plain-migrate` will connect to the database using the url specified in
`DATABASE_URL` environment variable.

# Migration directory structure

Each migration is a directory. This directory can contain files named `up.sql`,
`down.sql` and `index.js`.

To be able to upgrade you must have the `up.sql` file or export an
`upgrade(callback)` method from `index.js`.

To be able to downgrade you must have the `down.sql` file or export an
`downgrade(callback)` method from `index.js`.

# Javascript migrations

You can use Javascript if your migration needs functionality not available in
SQL.

To do so you must create a file named `index.js` in the migration directory.
This file should export `upgrade(callback)` and `downgrade(callback)`
functions. As noted earlier you can omit any of them.

`this` binds to the migration object when `plain-migrate` calls those
functions, so it's easy to run accompanying SQL scripts `up.sql` and
`down.sql`, just call `this.upgrade_sql(callback)` and
`this.downgrade_sql(callback)`); and querying the database,
`this.execute(sql_string, [values], callback)` (see `pg` package's
documentation for further information).

# Attention: PostgreSQL only

`plain-migrate` only works with PostgreSQL and depends on the `pg` package.
Please, fill an issue if you need support for other databases.

