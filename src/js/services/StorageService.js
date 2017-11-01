angular.module('blocktrail.wallet').factory(
    'storageService',
    function(CONFIG, $log, $window, $q) {
        var dbs = {};

        var db = function(name) {
            if (!dbs[name]) {
                dbs[name] = new PouchDB(name, {
                    adapter: CONFIG.POUCHDB_DRIVER,
                    location: 2 // storage file on iOS in location that is not synced to iTunes or iCloud
                });

                dbs[name].on('error', function(err) {
                    alert(name + ' ERR');
                });
            }

            return dbs[name];
        };

        var resetAll = function() {
            return Q.all(Object.keys(dbs).map(function(name) {
                var adapter = db(name).adapter;

                return db(name).destroy().then(function() {
                    if (adapter === 'idb') {
                        indexedDB.deleteDatabase('_pouch_' + name);
                    }

                    return db(name);
                });
            }))
                .catch(function(e) { $log.error('storage ERR' + e); })
            ;
        };

        var resetSingle = function(name) {
            var adapter = db(name).adapter;
            return db(name).destroy().then(function() {
                if (adapter === 'idb') {
                    indexedDB.deleteDatabase('_pouch_' + name);
                }
                dbs[name] = null;

                $log.debug('cleared database: ' + name);

                //recreate the database, empty
                return $q.when(db(name));
            });
        };

        // init defaults
        db('launch');
        db('contacts');
        db('wallet');
        db('wallet_info');
        db('settings');
        db('currency-rates-cache');
        db('apprate');

        return {
            db: db,
            reset: resetSingle,
            resetAll: resetAll
        };
    }
);
