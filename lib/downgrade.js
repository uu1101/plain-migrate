var m = require('./migrations')

module.exports = function(next) {
  m.applied(function(err, applied_migrations) {
    if(err) return next(err);
    if(!applied_migrations.length) {
      return next('There aren\'t any applied migrations.');
    }

    var a_m = applied_migrations[0];
    console.log('Downgrading to ' + a_m.id + '.');
    a_m.downgrade(next);
  })
}