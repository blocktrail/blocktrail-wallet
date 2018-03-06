(function() {
    "use strict";

    angular.module('blocktrail.launch')
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

            isFormSubmit = true;

            // Check on numbers, pattern="[0-9]*" is in html
            if (!pin) {
                modalService.alert({
                    body: "MSG_BAD_PIN"
                });
                isFormSubmit = false;
                return false;
            }

            // Check on length
            if (pin.toString().length < 4) {
                modalService.alert({
                    body: "MSG_BAD_PIN_LENGTH"
                });
                isFormSubmit = false;
                return false;
            }

            modalService.showSpinner();

            launchService.getWalletInfo()
                .then(function(walletInfo) {
                    var unlockData = {
                        secret: null,
                        password: null
                    };

                    try {
                        if (walletInfo.encryptedSecret) {
                            unlockData.secret = cryptoJS.AES.decrypt(walletInfo.encryptedSecret, pin).toString(cryptoJS.enc.Utf8);
                        } else {
                            unlockData.password = cryptoJS.AES.decrypt(walletInfo.encryptedPassword, pin).toString(cryptoJS.enc.Utf8)
                        }
                    } catch (e) {
                        throw new blocktrail.WalletPinError(e.message);
                    }

                    if (!unlockData.secret && !unlockData.password) {
                        throw new blocktrail.WalletPinError("Bad PIN");
                    }

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
                        // app.wallet.summary
                        if($stateParams.nextState === "app.wallet.send" || $stateParams.nextState === "app.wallet.send") {
                            $state.go($stateParams.nextState);
                        } else {
                            $state.go("app.wallet.summary");
                        }
                    });
                })
                .catch(function () {
                    navigator.vibrate(300);

                    var data = {
                        pinFailureCount: (localSettingsData.pinFailureCount + 1),
                        pinLastFailure: (new Date()).getTime()
                    };

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
    }

})();
