angular.module('blocktrail.wallet-bootstrapper', [
    'ngCordova',
    NG_CORDOVA_MOCKS ? 'ngCordovaMocks' : null
].filter(function filterNull(r) { return !!r; }));

angular.module('blocktrail.wallet-bootstrapper').run(function ($q, $cordovaFile) {
    var DBs = ['apprate', 'contacts', 'currency-rates-cache', 'settings', 'wallet', 'wallet_info', 'launch'];

    ionic.Platform.ready(function () {
        $q.when(ionic.Platform.isIOS())
        .then(function (isIOS) {
            if (isIOS) {
                var sourceDir = cordova.file.documentsDirectory;
                var destDir = cordova.file.applicationStorageDirectory + "Library/LocalDatabase";

                return $cordovaFile.checkFile(sourceDir, "_pouch_launch").then(function () {
                    return $cordovaFile.checkFile(destDir, "_pouch_launch").then(function () {
                        console.log(destDir + "_pouch_launch: already exists");
                    }).catch(function () {
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
        .then(function() {
            // bootstrap the real wallet
            console.log('bootstraping the wallet');
            angular.bootstrap(document.body, ["blocktrail.wallet"]);
        });
    });
});
