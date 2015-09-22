angular.module('blocktrail.wallet').factory(
    'storageService',
    function(CONFIG, $log, $window, $ionicApp) {
        var dbs = {};

        var db = function(name) {
            if (!dbs[name]) {
                dbs[name] = new PouchDB(name, {adapter: CONFIG.POUCHDB_DRIVER});
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
                .then(function(dbs) {
                    $window.localStorage.removeItem('ionic_analytics_user_' + $ionicApp.getApp().app_id);
                })
                .catch(function(e) { $log.error(e); })
            ;
        };

        var resetSingle = function(name) {
            var adapter = db(name).adapter;
            return db(name).destroy().then(function() {
                if (adapter === 'idb') {
                    indexedDB.deleteDatabase('_pouch_' + name);
                }
                dbs[name] = null;

                //recreate the database, empty
                return db(name);
            });
        };

        // init defaults
        db('launch');
        db('contacts');
        db('tx-cache');
        db('wallet-cache');
        db('history');
        db('settings');

        return {
            db: db,
            reset: resetSingle,
            resetAll: resetAll,
        };
    }
);
