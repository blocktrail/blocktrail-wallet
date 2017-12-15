(function() {
    "use strict";

    /**
     * the wallet-bootstrapper phase was added before the bootstrapping the actual app
     *  this has been done so we get a chance to execute code before the actual app inits
     */

    angular.module('blocktrail.wallet-bootstrapper', [
        'ngCordova'
    ]);

    angular.module('blocktrail.wallet-bootstrapper').run(function ($q, $cordovaFile) {
        ionic.Platform.ready(function () {
            /*
             * for iOS we need to migrate from the old storage location to the new storage location
             *  this was done becuase the old storage location would get synced to iTunes otherwise
             */
            $q.when(ionic.Platform.isIOS())
                .then(function (isIOS) {
                    if (isIOS) {
                        var sourceDir = cordova.file.documentsDirectory;
                        var destDir = cordova.file.applicationStorageDirectory + "Library/LocalDatabase";

                        // check if the launch DB is in the old location, if so then we need to migrate
                        return $cordovaFile.checkFile(sourceDir, "_pouch_launch").then(function () {
                            // check if the launch BD is not already in the new location, shouldn't be possible, but incase it is we don't want to overwrite
                            return $cordovaFile.checkFile(destDir, "_pouch_launch").then(function () {
                                console.log(destDir + "_pouch_launch: already exists");
                            }).catch(function () {
                                // list of DBs that need to be migrated, these should remain unchanged since we just want to migrate old users
                                var DBs = ['apprate', 'contacts', 'currency-rates-cache', 'settings', 'wallet', 'wallet_info', 'launch'];

                                // If not found in destination (-> exception thrown), we can start moving files
                                return $q.all(DBs.map(function (resource) {
                                    var fileName = "_pouch_" + resource;

                                    return $cordovaFile.checkFile(sourceDir, "_pouch_" + resource)
                                        .then(function (success) {
                                            return $cordovaFile.copyFile(sourceDir, fileName, destDir, fileName)
                                                .then(function () {
                                                    return $cordovaFile.removeFile(sourceDir, fileName)
                                                        .then(function () {
                                                            console.log(fileName, "success");
                                                        });
                                                });
                                        }).catch(function () {
                                            console.log(fileName + ": not found1")
                                        });
                                }));
                            })
                        }).catch(function () {
                            console.log(sourceDir + "_pouch_launch: not found2")
                        });
                    } else {
                        return;
                    }
                })
                .then(function () {
                    // bootstrap the real wallet
                    console.log('bootstraping the wallet');
                    angular.bootstrap(document.body, ["blocktrail.wallet"]);
                });
        });
    });
})();
