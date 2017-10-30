(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupRegisterCtrl", SetupRegisterCtrl);

    function SetupRegisterCtrl($scope, $rootScope, $state, $q, $http, $timeout, $cordovaNetwork, $log,
                                 launchService, CONFIG, settingsService, $btBackButtonDelegate,
                                 $cordovaDialogs, $translate, trackingService, PasswordStrength, $filter) {
        $scope.retry = 0;
        $scope.usernameTaken = null;
        $scope.form = {
            username: null,
            email: null,
            password: null,
            network: $rootScope.NETWORK,
            registerWithEmail: 1, //can't use bool, must be number equivalent
            passwordCheck: null
        };

        $scope.$watch('form.network', function(newNetwork, oldNetwork) {
            if (newNetwork !== oldNetwork) {
                $rootScope.switchNetwork(newNetwork);
                launchService.storeNetwork(newNetwork);
                sdkService.refreshNetwork();
            }
        });

        var passwordCheckingId = 0;

        $scope.checkPassword = function() {
            if (!$scope.form.password) {
                $scope.form.passwordCheck = null;
                return $q.when(false);
            }

            // increment check counter
            var id = ++passwordCheckingId;

            return PasswordStrength.check($scope.form.password, [$scope.form.username, $scope.form.email, "BTC.com", "wallet"])
                .then(function(result) {
                    // ensure this is the latest check to avoid conflicting state
                    if (id !== passwordCheckingId) {
                        return;
                    }

                    result.duration = $filter('duration')(result.crack_times_seconds.online_no_throttling_10_per_second * 1000);
                    $scope.form.passwordCheck = result;

                    return result;
                });
        };

        $scope.checkUsername = function() {
            if (!$scope.form.username) {
                //invalid
                $scope.usernameTaken = null;
                return false;
            }
            $scope.usernameTaken = null;
            $scope.appControl.checkingUsername = true;

            return $http.post(CONFIG.API_URL + "/v1/" + (CONFIG.TESTNET ? "tBTC" : "BTC") + "/mywallet/account-available", {username: $scope.form.username}).then(
                function(response) {
                    $scope.usernameTaken = response.data;
                    $scope.appControl.checkingUsername = false;
                },
                function(error) {}
            );
        };

        $scope.doRegister = function() {
            if ($scope.appControl.working) {
                return false;
            }

            //validate
            if (!$scope.form.registerWithEmail && (!$scope.form.username || $scope.form.username.trim().length < 4)) {
                $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_BAD_USERNAME'};
                $scope.showMessage();
                return false;
            }
            if ($scope.form.registerWithEmail && !$scope.form.email) {
                $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_BAD_EMAIL'};
                $scope.showMessage();
                return false;
            }
            if (!$scope.form.password) {
                $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_BAD_PASSWORD'};
                $scope.showMessage();
                return false;
            }

            return $scope.checkPassword()
                .then(function(passwordCheck) {
                    if (!passwordCheck || passwordCheck.score < CONFIG.REQUIRED_PASSWORD_STRENGTH) {
                        $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_WEAK_PASSWORD'};
                        $scope.showMessage();
                        return false;
                    }

                    // prompt user to confirm their password
                    return $cordovaDialogs.prompt(
                        $translate.instant('MSG_REPEAT_PASSWORD'),
                        $translate.instant('SETUP_PASSWORD_REPEAT_PLACEHOLDER'),
                        [$translate.instant('OK'), $translate.instant('CANCEL')],
                        "",
                        /* isPassword= */true
                    )
                        .then(function (dialogResult) {
                            if (dialogResult.buttonIndex == 1) {
                                if ($scope.form.password === dialogResult.input1.trim()) {
                                    $scope.message = {title: 'CREATING_ACCOUNT', title_class: 'text-neutral', body: ''};
                                    $scope.appControl.working = true;
                                    $scope.showMessage();

                                    return $scope.register();
                                } else {
                                    return $cordovaDialogs.alert(
                                        $translate.instant('MSG_BAD_PASSWORD_REPEAT'),
                                        $translate.instant('SETUP_PASSWORD_REPEAT_PLACEHOLDER'),
                                        $translate.instant('OK')
                                    );
                                }
                            }
                        });
                });
        };


        $scope.register = function() {
            if (!$cordovaNetwork.isOnline()) {
                $scope.retry++;

                if ($scope.retry <= 5) {
                    $timeout(function() {
                        $scope.createWallet();
                    }, 200);
                    return;
                } else {
                    $scope.retry = 0;
                    $log.error("No network connection!");

                    $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_BAD_NETWORK'};
                    $scope.appControl.working = false;
                    $scope.showMessage();
                    return;
                }
            }
            $scope.retry = 0;

            //disable back button
            $btBackButtonDelegate.setBackButton(angular.noop);
            $btBackButtonDelegate.setHardwareBackButton(angular.noop);

            var secret = randomBytes(32).toString('base64');
            var encryptedSecret = CryptoJS.AES.encrypt(secret, $scope.form.password).toString();

            var postData = {
                username: $scope.form.username,
                email: $scope.form.email,
                password: CryptoJS.SHA512($scope.form.password).toString(),
                password_score: $scope.form.passwordCheck && $scope.form.passwordCheck.score || 0,
                platform: $rootScope.isIOS && "iOS" || "Android",
                version: $rootScope.appVersion,
                encrypted_secret: encryptedSecret,
                device_uuid: device.uuid,
                device_name: ([device.platform, device.model].clean().join(" / ")) || 'Unknown Device',
                skip_two_factor: true // will make the resulting API key not require 2FA in the future
            };
            $http.post(CONFIG.API_URL + "/v1/" + (CONFIG.TESTNET ? "t" : "") + ($rootScope.NETWORK) + "/mywallet/register", postData)
                .then(function(result) {
                        trackingService.setUserTrackingId(result.tracking_id);
                        trackingService.trackEvent(trackingService.EVENTS.SIGN_UP);

                        return launchService.storeAccountInfo(_.merge({}, {secret: secret, encrypted_secret: encryptedSecret}, result.data)).then(function() {
                            $scope.setupInfo.password = $scope.form.password;

                            $scope.message = {title: 'SUCCESS', title_class: 'text-good', body: ''};
                            $scope.appControl.working = false;

                            //save the default user settings
                            settingsService.accountCreated = parseInt(((new Date).getTime() / 1000).toFixed(0), 10);
                            settingsService.username = $scope.form.username;
                            settingsService.displayName = $scope.form.username; //@TODO maybe try and determine a display name from their email
                            settingsService.enableContacts = false;
                            settingsService.email = $scope.form.email;

                            settingsService.$store().then(function() {
                                $scope.dismissMessage();
                                $timeout(function() {
                                    $state.go('app.setup.pin');
                                }, 300);
                            });
                        });
                    },
                    function(error) {
                        $log.error(error);
                        if (error.data.msg.toLowerCase().match(/username exists/)) {
                            $scope.message = {title: 'ERROR_TITLE_1', title_class: 'text-bad', body: 'MSG_USERNAME_TAKEN'};
                            $scope.appControl.working = false;
                        } else if (error.data.msg.toLowerCase().match(/already in use/)) {
                            $scope.message = {title: 'ERROR_TITLE_1', title_class: 'text-bad', body: 'MSG_EMAIL_TAKEN'};
                            $scope.appControl.working = false;
                        } else {
                            $log.error(error);
                            $scope.message = {title: 'ERROR_TITLE_1', title_class: 'text-bad', body: error.data.msg};
                            $scope.appControl.working = false;
                        }

                        //set the back button
                        $btBackButtonDelegate.setBackButton(function() {
                            $timeout(function() {
                                $scope.dismissMessage();
                            });
                        }, true);
                        $btBackButtonDelegate.setHardwareBackButton(function() {
                            $timeout(function() {
                                $scope.dismissMessage();
                            });
                        }, true);

                    });
        };
    }
})();
