(function() {
    "use strict";

    angular.module('blocktrail.wallet')
        .controller('OpenWalletPinCtrl', function ($scope, $rootScope, $state, $stateParams, $log, launchService,
                                                   settingsService, walletsManagerService, $timeout, $interval, CONFIG) {

            var DEFAULT_PIN = CONFIG.DEBUG_PIN_PREFILL || "";
            var PIN_LOCKTIME_SECONDS = 5 * 60;

            $scope.appControl = {
                showPinInput: false,
                showPinInputError: false,
                pin: DEFAULT_PIN,
                proceeding: false,
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
                            $scope.appControl.lockTimer = PIN_LOCKTIME_SECONDS - lockTime;

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
                        $scope.appControl.proceeding = true;
                        $scope.appControl.pin = DEFAULT_PIN;
                        $rootScope.STATE.PENDING_PIN_REQUEST = false;
                        $rootScope.STATE.INITIAL_PIN_DONE = true;
                        $timeout(function() {
                            $state.go($stateParams.nextState);
                        });

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
})();
