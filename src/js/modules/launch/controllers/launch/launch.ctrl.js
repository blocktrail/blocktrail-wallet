(function() {
    "use strict";

    angular.module("blocktrail.launch")
        .controller("LaunchCtrl", LaunchCtrl);

    function LaunchCtrl($q, $state, $log, $ionicHistory, launchService, localSettingsService, CONFIG, storageService) {
        // disable animation on transition from this state
        $ionicHistory.nextViewOptions({
            disableAnimate: true
        });

        checkStorageVersion()
            .then(function(continueLoading) {
                if (continueLoading) {
                    gotoNextState();
                }
            });

        /**
         * Check the storage version
         * @returns Promise<bool> true -> when we can continue loading
         */
        function checkStorageVersion() {
            var storageVersionDB = storageService.db("_storage-version");
            var STORAGE_VERSION_DOC = "STORAGE_VERSION";

            return storageVersionDB.get(STORAGE_VERSION_DOC)
                .then(function(doc) {
                    if (doc.STORAGE_VERSION !== CONFIG.STORAGE_VERSION) {
                        doc.STORAGE_VERSION = CONFIG.STORAGE_VERSION;

                        storageVersionDB.put(doc)
                            .catch(function(e) {
                                console.log("ERR", e);
                            })
                            .then(function() {
                                $state.go("app.reset");
                            });
                    } else {
                        return true;
                    }
                }, function() {
                    storageVersionDB.put({_id: STORAGE_VERSION_DOC, STORAGE_VERSION: CONFIG.STORAGE_VERSION})
                        .catch(function(e) {
                            console.log("ERR", e);
                        })
                        .then(function() {
                            $state.go("app.reset");
                        });
                });
        }

        /**
         * Go to a next step
         * @return { promise }
         */
        function gotoNextState() {
            $log.debug("M:LAUNCH:LaunchCtrl:gotoNextState");

            return $q.all([
                launchService.getAccountInfo(),
                launchService.getWalletInfo(),
                launchService.getWalletBackup(),
                localSettingsService.getLocalSettings()
            ])
                .then(function(data) {
                    var accountInfo = data[0];
                    var walletInfo = data[1];
                    var walletBackup = data[2];
                    var localSettings = data[3];

                    var isLoggedIn = !!(accountInfo.apiKey && accountInfo.apiSecret);
                    var walletCreated = !!walletInfo.identifier;
                    var isWalletBackupSaved = !walletBackup.identifier;

                    navigator.splashscreen.hide();

                    // Order for setup process
                    // login -> init wallet & set PIN -> save backup -> phone verification -> contacts synchronization -> profile picture

                    // default step is reset, shouldn't happen unless something goes wrong terribly
                    var nextStep = "app.reset";

                    // when not logged in or when wallet is not created yet, we go back to start
                    //  because the password is required to init/create wallet and we wouldn't have that if you're logged in already from a previous session
                    if (isLoggedIn && walletCreated) {
                        if(!isWalletBackupSaved) {
                            nextStep = "app.setup.backup";
                        } else if(!localSettings.isPhoneVerified) {
                            nextStep = "app.setup.phone";
                        } else if(!localSettings.isContactsSynchronized) {
                            nextStep = "app.setup.contacts";
                        } else {
                            nextStep = "app.wallet.summary";
                        }


                        // TODO Discuss with Ruben
                        /*if ($rootScope.handleOpenURL) {
                         $log.log("launching app with uri: " + $rootScope.handleOpenURL);
                         $log.log("bitcoin? " + $rootScope.handleOpenURL.startsWith("bitcoin"));
                         $log.log("bitcoincash? " + ($rootScope.handleOpenURL.startsWith("bitcoincash") || $rootScope.handleOpenURL.startsWith("bitcoin cash")));
                         $log.log("glidera? " + $rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback"));

                         if ($rootScope.handleOpenURL.startsWith("bitcoin") ||
                         $rootScope.handleOpenURL.startsWith("bitcoincash") ||
                         $rootScope.handleOpenURL.startsWith("bitcoin cash")) {
                         $rootScope.bitcoinuri = $rootScope.handleOpenURL;
                         nextState = "app.wallet.send";
                         $ionicSideMenuDelegate.toggleLeft(false);
                         } else if ($rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback/oauth2")) {
                         $rootScope.glideraCallback = $rootScope.handleOpenURL;
                         nextState = "app.wallet.buybtc.glidera_oauth2_callback";
                         $ionicSideMenuDelegate.toggleLeft(false);
                         } else if ($rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback/return")) {
                         nextState = "app.wallet.buybtc.choose";
                         $ionicSideMenuDelegate.toggleLeft(false);
                         } else {
                         nextState = "app.wallet.summary";
                         }
                         } else {
                         nextState = "app.wallet.summary";
                         }

                         $state.go(nextState);*/
                    } else {
                        nextStep = "app.setup.start";
                    }

                    $state.go(nextStep);
                });
        }
    }

})();
