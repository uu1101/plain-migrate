var m = require('./migrations')
  , async = require('async')

module.exports = function(next) {
  m.pending(function(err, pending_migrations) {
    if(err) return next(err)

    if(!pending_migrations.length) {
      return next('There aren\'t any pending migrations.')
    }

    async.forEachSeries( pending_migrations
                       , function(p_m, next) {
                           console.log( 'Upgrading to ' + p_m.id)
                           p_m.upgrade(next)
                         }
                       , next
                       )
  })
}
