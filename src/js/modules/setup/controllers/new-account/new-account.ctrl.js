(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupNewAccountCtrl", SetupNewAccountCtrl);

    function SetupNewAccountCtrl($scope, $state, $q, CONFIG, $filter, formHelperService, sdkService,
                                 modalService, passwordStrengthService, newAccountFormService) {

        var listenerForm;
        var listenerFormPassword;

        $scope.form = {
            email: null,
            password: null,
            passwordCheck: null,
            networkType: sdkService.getNetworkType(),
            termsOfService: false
        };

        // Listeners
        listenerForm = $scope.$watch("form", onFormChange, true);
        listenerFormPassword = $scope.$watch("form.password", onFormPasswordChange, true);

        $scope.$on("$destroy", onScopeDestroy);

        // Methods
        $scope.onSubmitFormRegister = onSubmitFormRegister;

        /**
         * On form change handler
         * @param newValue
         * @param oldValue
         */
        function onFormChange(newValue, oldValue) {
            if(newValue.networkType !== oldValue.networkType) {
                sdkService.setNetworkType(newValue.networkType);
            }
        }

        /**
         * On form password change handler
         * @param newValue
         */
        function onFormPasswordChange(newValue) {
            if (!newValue) {
                $scope.form.passwordCheck = null;
                return $q.when(false);
            }

            return passwordStrengthService
                .checkPassword($scope.form.password, [$scope.form.username, $scope.form.email, "BTC.com", "wallet"])
                .then(function(result) {
                    result.duration = $filter("duration")(result.crack_times_seconds.online_no_throttling_10_per_second * 1000);
                    $scope.form.passwordCheck = result;
                    return result;
                });
        }

        /**
         * On submit the form register handler
         * @param registerForm
         * @return { boolean | promise }
         */
        function onSubmitFormRegister(registerForm) {
            formHelperService.setAllDirty(registerForm);

            if (registerForm.email.$invalid) {
                modalService.alert({
                    body: 'MSG_BAD_EMAIL'
                });
                return false;
            }

            if (registerForm.password.$invalid || $scope.form.passwordCheck.score < CONFIG.REQUIRED_PASSWORD_STRENGTH) {
                modalService.alert({
                    body: 'MSG_WEAK_PASSWORD'
                });
                return false;
            }

            if (!$scope.form.termsOfService) {
                modalService.alert({
                    body: 'MSG_BAD_LEGAL'
                });
                return false;
            }

            return modalService.confirmPassword()
                .then(function(dialogResult) {
                    if(dialogResult !== null) {
                        if ($scope.form.password === dialogResult.trim()) {
                            register();
                        } else {
                            modalService.alert({
                                body: 'MSG_BAD_PASSWORD_REPEAT'
                            });
                        }
                    }
                });
        }

        /**
         * Register
         * @return { promise }
         */
        function register() {
            modalService.showSpinner();

            return newAccountFormService
                .register($scope.form)
                .then(registerFormSuccessHandler, registerFormErrorHandler);
        }

        /**
         * Register form success handler
         */
        function registerFormSuccessHandler() {
            $scope.setupInfo.password = $scope.form.password;
            modalService.hideSpinner();
            $state.go('app.setup.pin');
        }

        /**
         * Register form error handler
         */
        function registerFormErrorHandler(error) {
            modalService.hideSpinner();
            modalService.alert({
                body: error
            });
        }

        /**
         * On the scope destroy handler
         */
        function onScopeDestroy() {
            if(listenerForm) {
                listenerForm();
            }

            if(listenerFormPassword) {
                listenerFormPassword();
            }
        }

        // TODO OLD Remove
        /*$scope.retry = 0;
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
                sdkServiceIamOldKillMePLease.refreshNetwork();
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

            if ($scope.form.registerWithEmail && !$scope.form.email) {
                $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_BAD_EMAIL'};
                modalService.alert({
                    body: 'MSG_BAD_EMAIL'
                });
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
                        /!* isPassword= *!/true
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
        };*/

        /*$scope.register = function() {
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

                        return launchService
                            .storeAccountInfo(_.merge({}, {secret: secret, encrypted_secret: encryptedSecret}, result.data)).then(function() {
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
        };*/
    }
})();
