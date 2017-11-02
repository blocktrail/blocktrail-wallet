angular.module('blocktrail.wallet')
    .controller('LaunchCtrl', function($rootScope, $state, $log, launchService, CONFIG, blocktrailLocalisation, $http,
                                       settingsService, $ionicHistory, $ionicSideMenuDelegate, storageService) {
        $log.debug('starting');

        //disable animation on transition from this state
        $ionicHistory.nextViewOptions({
            disableAnimate: true
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

        checkStorageVersion()
            .then(function(continueLoading) {
                if (!continueLoading) {
                    return;
                }

                return settingsService.$isLoaded();
            })
            .then(function() {
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

                if (navigator.splashscreen) {
                    navigator.splashscreen.hide();
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
    });

angular.module('blocktrail.wallet')
    .controller('OpenWalletPinCtrl', function ($scope, $rootScope, $state, $stateParams, $log, launchService,
                                               settingsService, walletsManagerService, $timeout, $interval, CONFIG) {

        var DEFAULT_PIN = CONFIG.DEBUG_PIN_PREFILL || "";

        $scope.appControl = {
            showPinInput: false,
            showPinInputError: false,
            pin: DEFAULT_PIN,
            result: {
                error: null
            },
            locked: false,
            lockTimer: null
        };

        var lockInterval = null;

        $rootScope.hideLoadingScreen = true;
        $scope.appControl.showPinInput = true;

        $rootScope.STATE.PENDING_PIN_REQUEST = true;

        function evaluateLock() {
            // Lock on restart
            settingsService.$isLoaded().then(function () {
                if (settingsService.pinFailureCount > 4) {
                    $scope.appControl.locked = true;

                    lockInterval = $interval(function () {
                        var lockTime = (((new Date()).getTime() - settingsService.pinLastFailure) / 1000).toFixed(0);
                        $scope.appControl.lockTimer = settingsService.pinLocktimeSeconds - lockTime;

                        if ($scope.appControl.lockTimer <= 0) {
                            $scope.appControl.locked = false;
                            // Reset failure counter
                            settingsService.pinFailureCount = 0;
                            settingsService.pinLastFailure = null;
                            settingsService.$store().then(function () {
                                $log.debug('PIN entry possible again.');
                                $interval.cancel(lockInterval);
                            });
                        }
                    }, 300);
                }
            });
        }
        
        evaluateLock();

        $scope.proceed = function () {
            if($scope.appControl.showPinInputError) {
                return;
            }

            if($scope.appControl.locked) {
                return;
            }

            settingsService.$isLoaded().then(function () {
                launchService.getWalletInfo().then(function(walletInfo) {
                    var password, secret;

                    try {
                        // legacy; storing encrypted password instead of secret
                        if (walletInfo.encryptedSecret) {
                            secret = CryptoJS.AES.decrypt(walletInfo.encryptedSecret, $scope.appControl.pin).toString(CryptoJS.enc.Utf8);
                        } else {
                            password = CryptoJS.AES.decrypt(walletInfo.encryptedPassword, $scope.appControl.pin).toString(CryptoJS.enc.Utf8);
                        }
                    } catch (e) {
                        throw new blocktrail.WalletPinError(e.message);
                    }

                    if (!password && !secret) {
                        throw new blocktrail.WalletPinError("Bad PIN");
                    }

                    var unlockData = {};

                    if (password) {
                        unlockData.password = password;
                    } else {
                        unlockData.secret = secret;
                    }

                    return unlockData;
                }).then(function() {
                    console.log('PIN OK', $stateParams.nextState);

                    // Vibrate, reset pin, go to next state
                    navigator.vibrate(100);
                    $scope.appControl.pin = DEFAULT_PIN;
                    $rootScope.STATE.PENDING_PIN_REQUEST = false;
                    $rootScope.STATE.INITIAL_PIN_DONE = true;
                    $state.go($stateParams.nextState);

                }).catch(function () {
                    // On error, vibrate and show error message for a short while
                    $scope.appControl.showPinInputError = true;
                    $scope.appControl.result.error = "MSG_BAD_PIN";
                    $log.log('PIN is wrong');
                    navigator.vibrate(300);

                    // Set failure counter
                    settingsService.pinLastFailure = (new Date()).getTime();
                    settingsService.pinFailureCount += 1;
                    settingsService.$store().then(function () {
                        evaluateLock();
                    });

                    // double timeout to allow for nice animations
                    $timeout(function () {
                        $timeout(function() {
                            $scope.appControl.showPinInputError = false;
                        }, 1000);
                        $scope.appControl.pin = DEFAULT_PIN;
                    }, 700);
                });
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
