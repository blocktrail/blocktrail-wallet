(function() {
    "use strict";

    angular.module('blocktrail.wallet')
        .controller('OpenWalletPinCtrl', OpenWalletPinCtrl);

    function OpenWalletPinCtrl($scope, $rootScope, $state, $stateParams, launchService, modalService,
                               localSettingsService, $timeout, $interval, CONFIG, cryptoJS) {
        var lockInterval = null;
        var pinLockTimeSeconds = 5 * 60;
        var localSettingsData = localSettingsService.getReadOnlyLocalSettingsData();
        // Flag for submitting form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
        var isFormSubmit = false;

        $scope.form = {
            pin: CONFIG.DEBUG_PIN_PREFILL || ""
        };

        $rootScope.hideLoadingScreen = true;
        $rootScope.STATE.PENDING_PIN_REQUEST = true;
        $scope.isLocked = false;
        $scope.lockTimer = null;

        $scope.onSubmitFormPin = onSubmitFormPin;

        evaluateLock();

        function evaluateLock() {
            if (localSettingsData.pinFailureCount > 4) {
                $scope.isLocked = true;

                lockInterval = $interval(function () {
                    var lockTime = (((new Date()).getTime() - localSettingsData.pinLastFailure) / 1000).toFixed(0);

                    $scope.lockTimer = pinLockTimeSeconds - lockTime;

                    if ($scope.lockTimer <= 0) {
                        var data = {
                            pinFailureCount: 0,
                            pinLastFailure: null
                        };

                        localSettingsService.setLocalSettings(data)
                            .then(function() {
                                $scope.isLocked = false;
                                $interval.cancel(lockInterval);
                            }, function() {
                                // TODO Error handler
                            });
                    }
                }, 300);
            }
        }

        function onSubmitFormPin(pin) {
            // Submit the form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
            if(isFormSubmit || $scope.isLocked) {
                return false;
            }

            debugger;

            isFormSubmit = true;

            // Check on numbers, pattern="[0-9]*" is in html
            if (!pin) {
                modalService.alert({
                    body: "MSG_BAD_ONLY_NUMBERS"
                });
                return false;
            }

            // Check on length
            if (pin.toString().length < 4) {
                modalService.alert({
                    body: "MSG_BAD_PIN_LENGTH"
                });
                return false;
            }

            modalService.showSpinner();


            debugger;

            launchService.getWalletInfo()
                .then(function() {
                    var secret;

                    try {
                        secret = cryptoJS.AES.decrypt(walletInfo.encryptedSecret, pin).toString(cryptoJS.enc.Utf8);
                    } catch (e) {
                        throw new blocktrail.WalletPinError(e.message);
                    }

                    if (!password && !secret) {
                        throw new blocktrail.WalletPinError("Bad PIN");
                    }

                    var unlockData = {
                        secret: secret
                    };

                    return unlockData;
                })
                .then(function() {
                    // Vibrate, reset pin, go to next state
                    navigator.vibrate(100);

                    $scope.form.pin = CONFIG.DEBUG_PIN_PREFILL || "";
                    $rootScope.STATE.PENDING_PIN_REQUEST = false;
                    $rootScope.STATE.INITIAL_PIN_DONE = true;
                    modalService.hideSpinner();
                    $rootScope.hideLoadingScreen = false;

                    $timeout(function() {
                        isFormSubmit = false;
                        $state.go($stateParams.nextState);
                    });

                })
                .catch(function () {
                    navigator.vibrate(300);

                    var data = {
                        pinFailureCount: (localSettingsData.pinFailureCount + 1),
                        pinLastFailure: (new Date()).getTime()
                    };

                    debugger;

                    localSettingsService.setLocalSettings(data)
                        .then(function() {
                            modalService.hideSpinner();
                            modalService.alert({
                                body: "MSG_BAD_PIN"
                            });
                            evaluateLock();
                            isFormSubmit = false;
                        }, function() {
                            // TODO Error handler
                        });
            });
        }











        /*$scope.proceed = function () {
            if($scope.appControl.showPinInputError) {
                return;
            }

            if($scope.appControl.locked) {
                return;
            }

            settingsService.$isLoaded().then(function () {
                launchService.getWalletInfo().then(function(walletInfo) {
                    var secret;

                    try {
                        secret = CryptoJS.AES.decrypt(walletInfo.encryptedSecret, $scope.appControl.pin).toString(CryptoJS.enc.Utf8);
                    } catch (e) {
                        throw new blocktrail.WalletPinError(e.message);
                    }

                    if (!password && !secret) {
                        throw new blocktrail.WalletPinError("Bad PIN");
                    }

                    var unlockData = {};

                    unlockData.secret = secret;

                    return unlockData;
                }).then(function() {
                    console.log('PIN OK', $stateParams.nextState);

                    // Vibrate, reset pin, go to next state
                    navigator.vibrate(100);
                    $scope.appControl.proceeding = true;
                    $scope.appControl.pin = DEFAULT_PIN;
                    $rootScope.STATE.PENDING_PIN_REQUEST = false;
                    $rootScope.STATE.INITIAL_PIN_DONE = true;
                    $rootScope.hideLoadingScreen = false;
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
        }*/
    }
})();
