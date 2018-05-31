// TODO REVIEW STORAGE SERVICE
/*(function () {
    "use strict";

    angular.module('blocktrail.core')
        .factory('storageService', function($q, $window, $log, CONFIG) {
            return new StorageService($q, $window, $log, CONFIG);
        });

        function StorageService($q, $window, $log, CONFIG) {
            var self = this;

            self._$q = $q;
            self._$window = $window;
            self._$log = $log;
            self._CONFIG = CONFIG;

            self._dbs = {};
        }

})();*/

angular.module('blocktrail.wallet').factory(
    'storageService',
    function(CONFIG, $log, $window, $q) {
        var dbs = {};
        var isWebSQL = false;

        var db = function(name) {
            if (!dbs[name]) {
                dbs[name] = new PouchDB(name, {
                    adapter: CONFIG.POUCHDB_DRIVER,
                    location: 2, // storage file on iOS in location that is not synced to iTunes or iCloud
                    androidDatabaseImplementation: 2,
                    iosDatabaseLocation: 'default'
                });

                dbs[name].on('error', function(err) {
                    alert(name + ' ERR');
                });
            }

            return dbs[name];
        };

        var resetAll = function() {
            return Q.all(Object.keys(dbs).map(function(name) {
                // protected DB names with _ won't get deleted
                if (name.substr(0, 1) === "_") {
                    return Q.resolve();
                }

                return resetSingle(name);
            })).then(function () {
                dbs = {};
            })
                .catch(function(e) { $log.error('storage ERR' + e); })
            ;
        };

        var resetSingle = function(name) {
            return deleteDB(name)
                .then(function() {
                //recreate the database, empty
                return $q.when(db(name));
            });
        };

        var deleteDB = function(name) {
            var adapter = db(name).adapter;
            return db(name).destroy().then(function() {
                if (adapter === 'idb') {
                    indexedDB.deleteDatabase('_pouch_' + name);
                }
                dbs[name] = null;

                $log.debug('cleared database: ' + name);
            });
        };

        // init defaults
        db('contacts');
        db('wallet');
        db('settings');
        db('currencyRatesCache');

        return {
            db: db,
            deleteDB: deleteDB,
            reset: resetSingle,
            resetAll: resetAll
        };
    }
);
