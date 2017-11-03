angular.module('blocktrail.wallet')
    .controller('LaunchCtrl', function($rootScope, $state, $log, launchService, CONFIG, blocktrailLocalisation, $http,
                                       settingsService, $ionicHistory, $ionicSideMenuDelegate, storageService) {
        $log.debug('starting');

        //disable animation on transition from this state
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
         * @returns Promise<bool> TRUE when we can continue loading
         */
        function checkStorageVersion() {
            var storageVersionDB = storageService.db('_storage-version');
            var STORAGE_VERSION_DOC = "STORAGE_VERSION";

            return storageVersionDB.get(STORAGE_VERSION_DOC)
                .then(function(doc) {
                    if (doc.STORAGE_VERSION !== CONFIG.STORAGE_VERSION) {
                        doc.STORAGE_VERSION = CONFIG.STORAGE_VERSION;
                        storageVersionDB.put(doc)
                            .catch(function(e) {
                                console.log('ERR', e);
                            })
                            .then(function() {
                                $state.go('app.reset');
                            });
                    } else {
                        return true;
                    }
                }, function() {
                    storageVersionDB.put({_id: STORAGE_VERSION_DOC, STORAGE_VERSION: CONFIG.STORAGE_VERSION})
                        .catch(function(e) {
                            console.log('ERR', e);
                        })
                        .then(function() {
                            $state.go('app.reset');
                        });
                });
        }

        function gotoNextState() {
            return settingsService.$isLoaded()
                .then(function() {
                    if (navigator.splashscreen) {
                        navigator.splashscreen.hide();
                    }

                    //setup not started yet
                    if (!settingsService.setupStarted) {
                        // never show rebrand to user who just got started
                        settingsService.$isLoaded().then(function () {
                            settingsService.showRebrandMessage = false;
                            settingsService.$store();
                            $state.go('app.setup.start');
                        });

                        return;
                    }

                    if (settingsService.showRebrandMessage) {
                        $state.go('app.rebrand');
                        return;
                    }

                    var nextState = null;

                    //setup has been started: resume from the relevant step
                    if (settingsService.setupComplete) {
                        if ($rootScope.handleOpenURL) {
                            $log.log("launching app with uri: " + $rootScope.handleOpenURL);
                            $log.log("bitcoin? " + $rootScope.handleOpenURL.startsWith("bitcoin"));
                            $log.log("bitcoincash? " + ($rootScope.handleOpenURL.startsWith("bitcoincash") || $rootScope.handleOpenURL.startsWith("bitcoin cash")));
                            $log.log("glidera? " + $rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback"));

                            if ($rootScope.handleOpenURL.startsWith("bitcoin") || $rootScope.handleOpenURL.startsWith("bitcoincash") || $rootScope.handleOpenURL.startsWith("bitcoin cash")) {
                                $rootScope.bitcoinuri = $rootScope.handleOpenURL;
                                nextState = 'app.wallet.send';
                                $ionicSideMenuDelegate.toggleLeft(false);
                            } else if ($rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback/oauth2")) {
                                $rootScope.glideraCallback = $rootScope.handleOpenURL;
                                nextState = 'app.wallet.buybtc.glidera_oauth2_callback';
                                $ionicSideMenuDelegate.toggleLeft(false);
                            } else if ($rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback/return")) {
                                nextState = 'app.wallet.buybtc.choose';
                                $ionicSideMenuDelegate.toggleLeft(false);
                            } else {
                                nextState = 'app.wallet.summary';
                            }
                        } else {
                            nextState = 'app.wallet.summary';
                        }

                        $state.go(nextState);

                    } else if (!settingsService.backupSaved && !settingsService.backupSkipped) {
                        //backup saving
                        $state.go('app.setup.backup');
                    } else if (!settingsService.phoneVerified) {
                        //phone setup
                        $state.go('app.setup.phone');
                    } else if (!settingsService.contactsLastSync) {
                        //contacts sync
                        $state.go('app.setup.contacts');
                    } else {
                        //profile
                        $state.go('app.setup.profile');
                    }
                });
        }
    });



angular.module('blocktrail.wallet')
    .controller('ResetCtrl', function($state, storageService) {
        storageService.resetAll().then(
            function() {
                window.location.replace('');
            }
        );
    }
);

angular.module('blocktrail.wallet')
    .controller('Android43Ctrl', function($rootScope, $scope, altNotice) {
        $rootScope.hideLoadingScreen = true;

        $scope.altNotice = altNotice;

        if (navigator.splashscreen) {
            navigator.splashscreen.hide();
        }
    }
);

angular.module('blocktrail.wallet')
    .controller('RebrandCtrl', function($state, $scope, $rootScope, settingsService) {
        $rootScope.hideLoadingScreen = true;

        var readyToContinue = settingsService.$isLoaded().then(function() {
             settingsService.showRebrandMessage = false;
            settingsService.$store();
        });

        $scope.continue = function() {
            readyToContinue.then(function() {
                window.location.replace('');
            });
        };
    }
);
