angular.module('blocktrail.wallet')
    .controller('LaunchCtrl', function($rootScope, $state, $log, launchService, CONFIG, blocktrailLocalisation, $http, settingsService, $ionicHistory) {
        $log.debug('starting');

        //disable animation on transition from this state
        $ionicHistory.nextViewOptions({
            disableAnimate: true
        });

        settingsService.$isLoaded()
            .then(function() {
                //setup not started yet
                if (!settingsService.setupStarted) {
                    // never show rebrand to user who just got started
                    settingsService.$isLoaded().then(function() {
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

                //setup has been started: resume from the relevant step
                if (settingsService.setupComplete) {
                    if ($rootScope.handleOpenURL) {
                        $log.log("launching app with uri: " + $rootScope.handleOpenURL);
                        $log.log("bitcoin? " + $rootScope.handleOpenURL.startsWith("bitcoin"));
                        $log.log("glidera? " + $rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback"));
                        if ($rootScope.handleOpenURL.startsWith("bitcoin")) {
                            $rootScope.bitcoinuri = $rootScope.handleOpenURL;
                            $state.go('app.wallet.send');
                            $ionicSideMenuDelegate.toggleLeft(false);
                        } else if ($rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback/oauth2")) {
                            $rootScope.glideraCallback = $rootScope.handleOpenURL;
                            $state.go('app.wallet.buybtc.glidera_oauth2_callback');
                            $ionicSideMenuDelegate.toggleLeft(false);
                        } else if ($rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback/return")) {
                            $state.go('app.wallet.buybtc.choose');
                            $ionicSideMenuDelegate.toggleLeft(false);
                        }
                    } else {
                        $state.go('app.wallet.summary');
                    }
                } else if(!settingsService.backupSaved && !settingsService.backupSkipped) {
                    //backup saving
                    $state.go('app.setup.backup');
                } else if(!settingsService.phoneVerified) {
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
    .controller('ResetCtrl', function($state, storageService) {
        storageService.resetAll().then(
            function() {
                alert('reset!');
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
