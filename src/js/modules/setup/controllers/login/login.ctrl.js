(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupLoginCtrl", SetupLoginCtrl);

    function SetupLoginCtrl($scope, $rootScope, $state, $q, $http, $timeout, $cordovaNetwork, launchService, CONFIG, loginFormService, modalService,
                            settingsService, $btBackButtonDelegate, $log, $cordovaDialogs, $translate, trackingService, sdkService, formHelperService) {
        $scope.form = {
            email: "",
            password: "",
            networkType: sdkService.getNetworkType(),
            twoFactorToken: null
        };

        // ionic.Platform.isAndroid()

        // Methods
        $scope.onSubmitFormLogin = onSubmitFormRegister;

        /**
         * On submit the form login handler
         * @param loginForm
         * @return { boolean | promise }
         */
        function onSubmitFormRegister(loginForm) {
            formHelperService.setAllDirty(loginForm);

            if (loginForm.email.$invalid) {
                modalService.alert({
                    body: 'MSG_BAD_EMAIL'
                });
                return false;
            }

            if (loginForm.password.$invalid) {
                modalService.alert({
                    body: 'MSG_MISSING_LOGIN'
                });
                return false;
            }

            $scope.form.twoFactorToken = null;

            login();
        }

        /**
         * Login
         * @return { promise }
         */
        function login() {
            var data = {
                login: $scope.form.email,
                password: $scope.form.password,
                twoFactorToken: $scope.form.twoFactorToken,
                networkType: $scope.form.networkType
            };

            modalService.showSpinner();

            return loginFormService.login(data)
                .then(loginFormSuccessHandler, loginFormErrorHandler);
        }

        /**
         * Login success handle
         * @param data
         */
        function loginFormSuccessHandler(data) {
            modalService.hideSpinner();

            if (!$scope.form.forceNewWallet) {
                $scope.setupInfo.identifier = data.existing_wallet || $scope.setupInfo.identifier;
            }

            $scope.setupInfo.password = $scope.form.password;
            $scope.setupInfo.network = $scope.form.network;

            $state.go('app.setup.pin');
        }

        /**
         * Login error handle
         * @param error
         */
        function loginFormErrorHandler(error) {
            modalService.hideSpinner();

            switch (error.type) {
                case "BANNED_IP":
                    // TODO do we have this state
                    $state.go("app.bannedip", { bannedIp: error.data });

                    break;

                case "SHA_512":

                    // TODO Check this case !!!
                    return modalService.alert({
                        title: $translate.instant("SETUP_LOGIN_FAILED"),
                        bodyHtml: $sce.trustAsHtml($translate.instant("MSG_UPGRADE_REQUIRED"))
                    });

                    break;

                case "2FA_MISSING":
                    modalService.prompt({
                            placeholder: "MSG_MISSING_TWO_FACTOR_TOKEN"
                        })
                        .then(function(dialogResult) {
                            if (dialogResult !== null) {
                                $scope.form.twoFactorToken = dialogResult;
                                login();
                            }
                        });

                    break;

                case "2FA_INVALID":
                    modalService.prompt({
                            placeholder: "MSG_INCORRECT_TWO_FACTOR_TOKEN"
                        })
                        .then(function(dialogResult) {
                            if (dialogResult !== null) {
                                $scope.form.twoFactorToken = dialogResult;
                                login();
                            }
                        });

                    break;

                case "MSG_BAD_LOGIN":
                    modalService.alert({
                        body: "MSG_BAD_LOGIN"
                    });

                    break;

                case "MSG_BAD_LOGIN_UNKNOWN":
                    modalService.alert({
                        body: "MSG_BAD_LOGIN_UNKNOWN"
                    });

                    break;
            }
        }






















        
        $scope.doLogin = function() {
            if ($scope.appControl.working) {
                return false;
            }

            //validate
            if (!$scope.form.username) {
                $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_MISSING_LOGIN'};
                $scope.showMessage();
                return false;
            }
            if (!$scope.form.password) {
                $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_MISSING_LOGIN'};
                $scope.showMessage();
                return false;
            }


            $scope.message = {title: 'LOGGING_IN', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();

            $scope.login();
        };

        $scope.twoFactorCode = null;

        $scope.login = function() {
            if (!$cordovaNetwork.isOnline()) {
                $scope.retry++;

                if ($scope.retry <= 5) {
                    $timeout(function() {
                        $scope.login();
                    }, 200);
                    return;
                } else {
                    $scope.retry = 0;
                    $log.error("No network connection!");

                    $scope.message = {title: 'SETUP_LOGIN_FAILED', title_class: 'text-bad', body: 'MSG_BAD_NETWORK'};
                    $scope.appControl.working = false;
                    $scope.showMessage();
                    return;
                }
            }
            $scope.retry = 0;

            //disable back button
            $btBackButtonDelegate.setBackButton(angular.noop);
            $btBackButtonDelegate.setHardwareBackButton(angular.noop);

            var twoFactorCode = $scope.twoFactorCode;

            $scope.twoFactorCode = null; // consumed
            $http.post(CONFIG.API_URL + "/v1/" + (CONFIG.TESTNET ? "t" : "") + ($rootScope.NETWORK) + "/mywallet/enable", {
                login: $scope.form.username,
                password: CryptoJS.SHA512($scope.form.password).toString(),
                platform: $rootScope.isIOS && "iOS" || "Android",
                version: $rootScope.appVersion,
                two_factor_token: twoFactorCode,
                device_uuid: device.uuid,
                device_name: ([device.platform, device.model].clean().join(" / ")) || 'Unknown Device',
                skip_two_factor: true // will make the resulting API key not require 2FA in the future
            })
                .then(function(result) {
                    trackingService.setUserTrackingId(result.tracking_id);
                    trackingService.trackEvent(trackingService.EVENTS.LOGIN);

                    var newSecret = false;
                    var createSecret = function() {
                        var secret = randomBytes(32).toString('base64');
                        var encryptedSecret = CryptoJS.AES.encrypt(secret, $scope.form.password).toString();

                        //@TODO put in sdk service
                        return $http.post(CONFIG.API_URL + "/v1/" + (CONFIG.TESTNET ? "tBTC" : "BTC") + "/mywallet/secret?api_key=" + result.data.api_key, {
                            encrypted_secret: encryptedSecret
                        }).then(function() {
                            newSecret = true;
                            return {secret: secret, encrypted_secret: encryptedSecret};
                        });
                    };

                    return $q.when(result.data.encrypted_secret)
                        .then(function(encryptedSecret) {
                            if (!encryptedSecret) {
                                return createSecret();
                            } else {
                                var secret;
                                try {
                                    secret = CryptoJS.AES.decrypt(encryptedSecret, $scope.form.password).toString(CryptoJS.enc.Utf8);
                                } catch (e) {
                                    $log.error(e);
                                    secret = null;
                                }

                                // @TODO: we should have a checksum
                                if (!secret || secret.length != 44) {
                                    $log.error("failed to decrypt encryptedSecret");
                                    secret = null;
                                }

                                if (secret) {
                                    return {secret: secret, encrypted_secret: encryptedSecret};
                                } else {
                                    return createSecret();
                                }
                            }
                        })
                        .then(function(secretData) {
                            return launchService.storeAccountInfo(_.merge({}, {
                                secret: secretData.secret,
                                encrypted_secret: secretData.encrypted_secret,
                                new_secret: newSecret
                            }, result.data)).then(function() {
                                $log.debug('existing_wallet', result.data.existing_wallet);
                                $scope.setupInfo.password = $scope.form.password;
                                if (!$scope.form.forceNewWallet) {
                                    $scope.setupInfo.identifier = result.data.existing_wallet || $scope.setupInfo.identifier;
                                }

                                $scope.message = {title: 'SUCCESS', title_class: 'text-good', body: ''};

                                //save the default settings and do a profile sync
                                settingsService.username = $scope.form.username || result.data.username;
                                settingsService.displayName = $scope.form.username || result.data.username;
                                settingsService.enableContacts = false;
                                settingsService.accountCreated = result.data.timestamp_registered;
                                settingsService.email = $scope.form.email;
                                settingsService.$store().then(function() {
                                    settingsService.$syncSettingsDown();
                                    settingsService.$syncProfileDown();
                                    $timeout(function() {
                                        $scope.dismissMessage();
                                        $timeout(function() {
                                            $scope.appControl.working = false;
                                            $state.go('app.setup.pin');
                                        }, 300);
                                    }, 400);
                                });
                            });
                        })
                        ;
                })
                .catch(function(error) {
                    if (error.data && error.data.requires_2fa) {
                        return $cordovaDialogs.prompt(
                            $translate.instant('MSG_TWO_FACTOR_REQUIRED'),
                            $translate.instant('TWO_FACTOR_REQUIRED'),
                            [$translate.instant('OK'), $translate.instant('CANCEL')],
                            ""
                        )
                            .then(
                                function(dialogResult) {
                                    $scope.dismissMessage();
                                    $scope.appControl.working = false;

                                    if (dialogResult.buttonIndex == 1) {
                                        $scope.twoFactorCode = dialogResult.input1.trim();
                                        return $scope.doLogin();
                                    }
                                },
                                function(e) {
                                    $scope.dismissMessage();
                                    $scope.appControl.working = false;

                                    throw e;
                                }
                            )
                            ;
                    } else if (error.data && error.data.requires_sha512) {
                        // legacy thing, old passwords were sha1, requires a login to webapp to update
                        //  will soon be changed to require a password reset
                        $scope.message = {title: 'SETUP_LOGIN_FAILED', title_class: 'text-bad', body: 'MSG_UPGRADE_REQUIRED'};
                        $scope.appControl.working = false;
                    } else if(error) {
                        $scope.message = {title: 'SETUP_LOGIN_FAILED', title_class: 'text-bad', body: 'MSG_BAD_LOGIN'};
                        $scope.appControl.working = false;
                    } else {
                        $scope.message = {title: 'SETUP_LOGIN_FAILED', title_class: 'text-bad', body: 'MSG_BAD_NETWORK'};
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

                    throw error;
                })
            ;
        };
    }
})();
