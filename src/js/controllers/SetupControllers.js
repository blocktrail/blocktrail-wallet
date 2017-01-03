angular.module('blocktrail.wallet')
    .controller('SetupCtrl', function($scope, $state, CONFIG, $btBackButtonDelegate, $rootScope, $timeout) {
        $scope.setupInfo = {
            // force uniqueness of the identifier to make it easier to force a
            identifier: CONFIG.DEFAULT_IDENTIFIER + "-" + randomBytes(8).toString('hex'),
            password: "",
            primaryMnemonic: "",
            backupMnemonic: "",
            blocktrailPublicKeys: null
        };

        $scope.appControl = {
            working: false,
            showMessage: false
        };
        $scope.message = {
            title: "",
            title_class: "",
            body: "",
            body_class: ""
        };

        // wait 200ms timeout to allow view to render before hiding loadingscreen
        $timeout(function() {
            $rootScope.hideLoadingScreen = true;

            // allow for one more digest loop
            $timeout(function() {
                if (navigator.splashscreen) {
                    navigator.splashscreen.hide();
                }
            }, 450);
        }, 0);

        $scope.showMessage = function() {
            $scope.appControl.showMessage = true;
            //set alternative back button function (just fires once)
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
        };

        $scope.dismissMessage = function() {
            $scope.appControl.showMessage = false;
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };
    })
    .controller('SetupStartCtrl', function($scope, $http, CONFIG, $state, $q, blocktrailLocalisation) {
        $scope.slider = {
            displayed: 0
        };

        $scope.newAccount = function() {
            $state.go('app.setup.register');
        };
        $scope.toLogin = function() {
            $state.go('app.setup.login');
        };
    })
    .controller('SetupLoginCtrl', function($scope, $rootScope, $state, $q, $http, $timeout, $cordovaNetwork, launchService, CONFIG,
                                           settingsService, $btBackButtonDelegate, $log, $cordovaDialogs, $translate, trackingService) {
        $scope.retry = 0;

        $scope.form = {
            username: "",
            password: "",
            forceNewWallet: false
        };

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
            $http.post(CONFIG.API_URL + "/v1/" + (CONFIG.TESTNET ? "tBTC" : "BTC") + "/mywallet/enable", {
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
                            $translate.instant('MSG_TWO_FACTOR_REQUIRED').sentenceCase(),
                            $translate.instant('TWO_FACTOR_REQUIRED').sentenceCase(),
                            [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()],
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
    })
    .controller('SetupNewAccountCtrl', function($scope, $rootScope, $state, $q, $http, $timeout, $cordovaNetwork, $log,
                                                launchService, CONFIG, settingsService, $btBackButtonDelegate,
                                                $cordovaDialogs, $translate, trackingService, PasswordStrength, $filter) {
        $scope.retry = 0;
        $scope.usernameTaken = null;
        $scope.form = {
            username: null,
            email: null,
            password: null,
            registerWithEmail: 1, //can't use bool, must be number equivalent
            passwordCheck: null
        };

        $scope.checkPassword = function() {
            if (!$scope.form.password) {
                $scope.passwordCheck = null;
                return $q.when(false);
            }

            return PasswordStrength.check($scope.form.password, [$scope.form.username, $scope.form.email, "BTC.com", "wallet"])
                .then(function(result) {
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
                        $scope.translations['MSG_REPEAT_PASSWORD'].sentenceCase(),
                        $scope.translations['SETUP_PASSWORD_REPEAT_PLACEHOLDER'].sentenceCase(),
                        [$scope.translations['OK'], $scope.translations['CANCEL'].sentenceCase()],
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
                                        $translate.instant('MSG_BAD_PASSWORD_REPEAT').sentenceCase(),
                                        $translate.instant('SETUP_PASSWORD_REPEAT_PLACEHOLDER').capitalize(),
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
            $http.post(CONFIG.API_URL + "/v1/" + (CONFIG.TESTNET ? "tBTC" : "BTC") + "/mywallet/register", postData)
                .then(function(result) {
                    trackingService.trackEvent(trackingService.EVENTS.REGISTRATION);
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
    })
    .controller('SetupWalletPinCtrl', function($q, $scope, $state, $cordovaNetwork, $analytics, launchService, $btBackButtonDelegate,
                                               sdkService, $cordovaDialogs, $ionicLoading, $rootScope, $log, $translate, $timeout, settingsService, CONFIG) {
        $scope.transactions = null;
        $scope.retry = 0;
        $scope.form = {
            pin: "",
            pinRepeat: "",
            identifier: $scope.setupInfo.identifier,
            password: $scope.setupInfo.password
        };

        //disable back button
        $btBackButtonDelegate.setBackButton(angular.noop);
        $btBackButtonDelegate.setHardwareBackButton(angular.noop);

        //override parent scope to ensure backbutton is disabled after dismissal
        $scope.dismissMessage = function() {
            $scope.appControl.showMessage = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton(angular.noop);
            $btBackButtonDelegate.setHardwareBackButton(angular.noop);
        };

        $scope.setupWallet = function() {
            if ($scope.appControl.working) {
                return false;
            }

            //validate
            if ($scope.form.pin.trim().length < 4) {
                $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_BAD_PIN_LENGTH'};
                $scope.showMessage();
                return false;
            }
            if ($scope.form.pin.trim() !== $scope.form.pinRepeat.trim()) {
                $scope.message = {title: 'FAIL', title_class: 'text-bad', body: 'MSG_BAD_PIN_REPEAT'};
                $scope.showMessage();
                return false;
            }

            $scope.message = {title: 'CREATING_INIT_WALLET', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();

            //give some time for the message to display
            $timeout(function(){
                $scope.createWallet();
            }, 300)
        };

        $scope.createWallet = function() {
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


            return $q.when(sdkService.sdk())
                .then(function(sdk) {
                    $scope.sdk = sdk;
                    $log.debug('initialising wallet: ' + $scope.setupInfo.identifier, $scope.sdk);
                    return $scope.sdk.initWallet({identifier: $scope.setupInfo.identifier, password: $scope.setupInfo.password});
                })
                .then(function(wallet) {
                    $analytics.eventTrack('initWallet', {category: 'Events'});

                    // time to upgrade to V3 ppl!
                    if (wallet.walletVersion != blocktrailSDK.Wallet.WALLET_VERSION_V3) {
                        $scope.message = {title: 'UPGRADING_WALLET', title_class: 'text-neutral', body: 'UPGRADING_WALLET_BODY'};

                        return wallet.upgradeToV3($scope.setupInfo.password)
                            .progress(function(progress) {
                                /*
                                 * per step we increment the progress bar and display some new progress text
                                 * some of the text doesn't really match what is being done,
                                 * but we just want the user to feel like something is happening.
                                 */
                                switch (progress) {
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_START:
                                        $scope.message = {title: 'UPGRADING_WALLET', title_class: 'text-neutral', body: 'UPGRADING_WALLET_BODY'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_SECRET:
                                        $scope.message = {title: 'UPGRADING_WALLET', title_class: 'text-neutral', body: 'CREATING_GENERATE_PRIMARYKEY'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_PRIMARY:
                                        $scope.message = {title: 'UPGRADING_WALLET', title_class: 'text-neutral', body: 'CREATING_GENERATE_BACKUPKEY'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_RECOVERY:
                                        $scope.message = {title: 'UPGRADING_WALLET', title_class: 'text-neutral', body: 'CREATING_GENERATE_RECOVERY'};
                                        break;
                                }

                            })
                            .then(function() {
                                $scope.message = {title: 'UPGRADING_WALLET', title_class: 'text-neutral', body: 'UPGRADING_WALLET_BODY'};

                                return wallet;
                            });

                    } else {
                        $log.debug('wallet initialised', wallet);
                        return wallet;
                    }
                }, function(error) {
                    if (error.message.match(/not found/) || error.message.match(/couldn't be found/)) {
                        //no existing wallet - create one
                        $log.debug('creating new wallet');
                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'PLEASE_WAIT'};
                        var t = (new Date).getTime();
                        $analytics.eventTrack('createNewWallet', {category: 'Events'});
                        return $scope.sdk.createNewWallet({
                            identifier: $scope.setupInfo.identifier,
                            password: $scope.setupInfo.password,
                            walletVersion: CONFIG.WALLET_DEFAULT_VERSION
                        })
                            .progress(function(progress) {
                                /*
                                 * per step we increment the progress bar and display some new progress text
                                 * some of the text doesn't really match what is being done,
                                 * but we just want the user to feel like something is happening.
                                 */
                                switch (progress) {
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_START:
                                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'PLEASE_WAIT'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_SECRET:
                                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'CREATING_GENERATE_PRIMARYKEY'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_PRIMARY:
                                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'CREATING_GENERATE_BACKUPKEY'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_RECOVERY:
                                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'CREATING_GENERATE_RECOVERY'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_PRIMARY:
                                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'CREATING_INIT_KEYS'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_BACKUP:
                                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'CREATING_INIT_KEYS'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_SUBMIT:
                                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'CREATING_SUBMIT_WALLET'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_INIT:
                                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'CREATING_INIT_WALLET'};
                                        break;
                                    case blocktrailSDK.CREATE_WALLET_PROGRESS_DONE:
                                        $scope.message = {title: 'CREATING_WALLET', title_class: 'text-neutral', body: 'CREATING_DONE'};
                                        break;
                                }
                            })
                            .spread(function(wallet, backupInfo, more) {
                                $log.debug('new wallet created in [' + ((new Date).getTime() - t) + 'ms]');
                                $scope.setupInfo.backupInfo = backupInfo;

                                return $q.when(wallet);
                            })
                        ;
                    } else if (error.message.match(/password/) || error instanceof blocktrailSDK.WalletDecryptError) {
                        //wallet exists but with different password
                        $log.debug("wallet with identifier [" + $scope.setupInfo.identifier + "] already exists, prompting for old password");
                        return $cordovaDialogs.alert($translate.instant('MSG_WALLET_PASSWORD_MISMATCH'), $translate.instant('SETUP_EXISTING_WALLET'), $translate.instant('OK'))
                            .then(function() {
                                //prompt for old wallet password
                                $scope.message = {title: 'LOADING_WALLET', title_class: 'text-neutral', body: ''};
                                return $scope.promptWalletPassword();
                            });
                    } else {
                        $log.error('error encountered', error);
                        return $q.reject(error);
                    }
                })
                .then(function(wallet) {
                    //set the wallet as the main wallet
                    $log.debug('setting wallet as main wallet');
                    $scope.message = {title: 'SAVING_WALLET', title_class: 'text-neutral', body: ''};
                    return $scope.sdk.setMainMobileWallet($scope.setupInfo.identifier).then(function() { return wallet; });
                })
                .then(function(wallet) {
                    //store the identity and encrypted password
                    $scope.message = {title: 'SAVING_WALLET', title_class: 'text-neutral', body: ''};

                    var encryptedPassword = null, encryptedSecret = null;

                    // legacy wallets use password instead of secret,
                    //  using secret is a lot better since someone cracking a PIN won't get your much reused password xD
                    if (wallet.secret) {
                        encryptedSecret = CryptoJS.AES.encrypt(wallet.secret.toString('hex'), $scope.form.pin).toString();
                    } else {
                        encryptedPassword = CryptoJS.AES.encrypt($scope.setupInfo.password, $scope.form.pin).toString();
                    }

                    $log.debug('saving wallet info', $scope.setupInfo.identifier, encryptedPassword, encryptedSecret);

                    return launchService.storeWalletInfo($scope.setupInfo.identifier, encryptedPassword, encryptedSecret).then(function() { return wallet; });
                })
                .then(function(wallet) {
                    var walletSecret = wallet.secret;
                    if (wallet.walletVersion !== 'v2') {
                        walletSecret = walletSecret.toString('hex');
                    }
                    // while logging in we stash the secret so we can decrypt the glidera accesstoken
                    launchService.stashWalletSecret(walletSecret);
                    wallet.lock();
                })
                .then(function() {
                    if ($scope.setupInfo.backupInfo) {
                        window.fabric.Answers.sendSignUp("App", true);
                        facebookConnectPlugin.logEvent("CompleteRegistration");
                        if (CONFIG.GAPPTRACK_ID) {
                            if ($rootScope.isIOS && CONFIG.GAPPTRACK_SIGNUP_LABELS.iOS) {
                                GappTrack.track(CONFIG.GAPPTRACK_ID, CONFIG.GAPPTRACK_SIGNUP_LABELS.iOS, "1.00", false);
                            }
                            if ($rootScope.isAndroid && CONFIG.GAPPTRACK_ACTIVATE_LABELS.android) {
                                GappTrack.track(CONFIG.GAPPTRACK_ID, CONFIG.GAPPTRACK_SIGNUP_LABELS.android, "1.00", false);
                            }
                        }

                        //store the backup info temporarily
                        $log.debug('saving backup info');
                        var pubKeys = [];
                        angular.forEach($scope.setupInfo.backupInfo.blocktrailPublicKeys, function(pubKey, keyIndex) {
                            pubKeys.push({
                                keyIndex: keyIndex,
                                pubKey: pubKey.toBase58()
                            });
                        });

                        return launchService.storeBackupInfo({
                            identifier: $scope.setupInfo.identifier,
                            walletVersion: $scope.setupInfo.backupInfo.walletVersion,
                            encryptedPrimarySeed: $scope.setupInfo.backupInfo.encryptedPrimarySeed,
                            encryptedSecret: $scope.setupInfo.backupInfo.encryptedSecret,
                            backupSeed: $scope.setupInfo.backupInfo.backupSeed,
                            recoveryEncryptedSecret: $scope.setupInfo.backupInfo.recoveryEncryptedSecret,
                            blocktrailPublicKeys: pubKeys
                        });
                    } else {
                        return;
                    }
                })
                .then(function() {
                    $log.debug('All done. Onwards to victory!');

                    //save in settings that the user has started the setup process
                    settingsService.$isLoaded().then(function() {
                        settingsService.setupStarted = true;
                        settingsService.$store();
                    });

                    if ($scope.setupInfo.backupInfo) {
                        //if a new wallet has been created, go to the wallet backup page
                        $state.go('app.setup.backup');
                    } else {
                        //else continue to profile, phone, etc setup (mark backup as saved)
                        settingsService.$isLoaded().then(function() {
                            settingsService.backupSaved = true;
                            settingsService.$store();
                        });
                        $state.go('app.setup.phone');
                    }
                    $scope.dismissMessage();
                })
                .catch(function(e) {
                    $log.error(e);
                    $scope.appControl.working = false;

                    if (e == 'CANCELLED') {
                        //user canceled action
                        return false;
                    } else {
                        $scope.message = {title: 'FAIL', title_class: 'text-bad', body: e.toString()};
                        $scope.showMessage();
                    }
                });
        };

        /**
         * prompt for a correct wallet password - repeats on bad password
         * @param wallet
         * @returns {*}
         */
        $scope.promptWalletPassword = function(wallet) {
            //prompt for a correct wallet password and retry the wallet creation process
            return $scope.getTranslations()
                .then(function(translations) {
                    //prompt for wallet password
                    return $cordovaDialogs.prompt(
                        $scope.translations['MSG_WALLET_PASSWORD'].sentenceCase(),
                        $scope.translations['SETUP_WALLET_PASSWORD'].sentenceCase(),
                        [$scope.translations['OK'], $scope.translations['CANCEL'].sentenceCase()],
                        "",
                        /* isPassword= */true
                    );
                })
                .then(function(dialogResult) {
                    if (dialogResult.buttonIndex == 2) {
                        //user cancelled...reset the back button and go back to login page
                        $scope.dismissMessage();
                        $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
                        $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
                        $btBackButtonDelegate.goBack();
                        return $q.reject('CANCELLED');
                    }

                    $scope.setupInfo.password = dialogResult.input1.trim();
                    if (!$scope.setupInfo.password) {
                        return $cordovaDialogs.alert($scope.translations['MSG_BAD_PWD'].sentenceCase(), $scope.translations['MSG_TRY_AGAIN'].sentenceCase(), $scope.translations['OK'])
                            .then(function() {
                                return $scope.promptWalletPassword();
                            });
                    }

                    //try the new password
                    $log.debug('re-initialising wallet with new password: ' + $scope.setupInfo.identifier);
                    $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});
                    return $scope.sdk.initWallet({identifier: $scope.setupInfo.identifier, password: $scope.setupInfo.password})
                        .then(function(wallet) {
                            //success, password is correct. We can continue
                            $ionicLoading.hide();
                            return $q.when(wallet);
                        }, function(error) {
                            $ionicLoading.hide();
                            if (error.message.match(/password/) || error instanceof blocktrailSDK.WalletDecryptError) {
                                //password still incorrect, try again
                                return $cordovaDialogs.alert($scope.translations['MSG_BAD_PWD'].sentenceCase(), $scope.translations['MSG_TRY_AGAIN'].sentenceCase(), $scope.translations['OK'])
                                    .then(function() {
                                        return $scope.promptWalletPassword();
                                    });
                            } else {
                                //some other error encountered
                                return $q.reject(error);
                            }
                        });
                });
        };
    })
    .controller('SetupWalletBackupCtrl', function($scope, backupInfo, $state, $q, $btBackButtonDelegate, $translate, $cordovaDialogs,
                                                  $ionicActionSheet, $log, $cordovaFileOpener2, $cordovaFile, sdkService, $cordovaEmailComposer,
                                                  launchService, settingsService, $timeout) {

        $scope.setupInfo.identifier = backupInfo.identifier;
        $scope.setupInfo.backupInfo = {
            walletVersion: backupInfo.walletVersion,
            encryptedPrimarySeed: backupInfo.encryptedPrimarySeed,
            encryptedSecret: backupInfo.encryptedSecret,
            backupSeed: backupInfo.backupSeed,
            recoveryEncryptedSecret: backupInfo.recoveryEncryptedSecret
        };

        // hacky, we asume that user won't click generate backup before this promise is finished
        if (!$scope.setupInfo.backupInfo.blocktrailPublicKeys) {
            sdkService.sdk().then(function(sdk) {
                $scope.setupInfo.backupInfo.blocktrailPublicKeys = {};
                angular.forEach(backupInfo.blocktrailPublicKeys, function(pubkey, key) {
                    $scope.setupInfo.backupInfo.blocktrailPublicKeys[pubkey.keyIndex] = bitcoinjs.HDNode.fromBase58(pubkey.pubKey, sdk.network);
                });
            });
        }

        $scope.appControl.saveButtonClicked = false;
        $scope.appControl.backupSaved = false;
        $scope.qrSettings = {
            correctionLevel: 7,
            SIZE: 150,
            inputMode: 'M',
            image: true
        };
        $scope.backupSettings = {
            //NB: on android fileOpener2 only works with SD storage (i.e. non-private storage)
            path: window.cordova ? (ionic.Platform.isAndroid() ? cordova.file.externalDataDirectory : cordova.file.dataDirectory) : null,
            filename: 'btc-wallet-backup.pdf',
            replace: true
        };
        $scope.transactions = null;

        $scope.getTranslations = function() {
            if ($scope.translations) {
                return $q.when($scope.translations);
            } else {
                var requiredTranslations = [
                    'OK',
                    'CANCEL',
                    'ERROR',
                    'MSG_SAVE_BACKUP',
                    'SETUP_WALLET_BACKUP',
                    'MSG_CANT_OPEN_PDF',
                    'BACKUP_EMAIL_PDF',
                    'BACKUP_CREATE_PDF',
                    'MSG_BACKUP_EMAIL_SUBJECT_1',
                    'MSG_BACKUP_EMAIL_BODY_1'
                ];
                return $translate(requiredTranslations).then(function(translations) {
                    $scope.translations = translations;
                    return $q.when(translations);
                });
            }
        };

        //disable back button
        $btBackButtonDelegate.setBackButton(angular.noop);
        $btBackButtonDelegate.setHardwareBackButton(angular.noop);

        $scope.showExportOptions = function() {
            $scope.getTranslations().then(function(transactions) {

                //Temporary handling of a bug in iOS with the $cordovaFileOpener2
                var optionButtons = [
                    { text: transactions['BACKUP_EMAIL_PDF'].sentenceCase() },
                    { text: transactions['BACKUP_CREATE_PDF'].sentenceCase() },
                ];
                if (ionic.Platform.isIOS()) {
                    optionButtons = [
                        { text: transactions['BACKUP_EMAIL_PDF'].sentenceCase() },
                    ];
                }

                $scope.hideExportOptions = $ionicActionSheet.show({
                    buttons: optionButtons,
                    cancelText: transactions['CANCEL'].sentenceCase(),
                    cancel: function() {},
                    buttonClicked: function(index) {    
                        $timeout(function() {
                            $q.when(true)
                                .then(function() {
                                    var deferred = $q.defer();

                                    var extraInfo = [];

                                    if (settingsService.username) {
                                        extraInfo.push({title: 'Username', value: settingsService.username});
                                    }
                                    if (settingsService.email) {
                                        extraInfo.push({title: 'Email', value: settingsService.email});
                                    }

                                    var backup = new sdkService.BackupGenerator(
                                        $scope.setupInfo.identifier,
                                        $scope.setupInfo.backupInfo,
                                        extraInfo
                                    );

                                    //create a backup pdf
                                    backup.generatePDF(function (err, pdf) {
                                        if (err) {
                                            return deferred.reject(err);
                                        }

                                        deferred.resolve(pdf.output());
                                    });

                                    return deferred.promise;
                                })
                                .then(function(pdfData) {
                                    // FUNKY ASS HACK
                                    // https://coderwall.com/p/nc8hia/making-work-cordova-phonegap-jspdf
                                    var buffer = new ArrayBuffer(pdfData.length);
                                    var array = new Uint8Array(buffer);
                                    for (var i = 0; i < pdfData.length; i++) {
                                        array[i] = pdfData.charCodeAt(i);
                                    }

                                    return buffer;
                                })
                                .then(function(buffer) {

                                    //save file temporarily
                                    $log.debug('writing to ' + $scope.backupSettings.path + $scope.backupSettings.filename);
                                    return $cordovaFile.writeFile($scope.backupSettings.path, $scope.backupSettings.filename, buffer, $scope.backupSettings.replace);
                                })
                                .then(function(result) {
                                    if (index == 0) {
                                        //email the backup pdf
                                        var options = {
                                            to: '',
                                            attachments: [
                                                $scope.backupSettings.path + $scope.backupSettings.filename
                                            ],
                                            subject: $scope.translations['MSG_BACKUP_EMAIL_SUBJECT_1'].sentenceCase(),
                                            body: $scope.translations['MSG_BACKUP_EMAIL_BODY_1'],
                                            isHtml: true
                                        };
                                        var deferred = $q.defer();

                                        //check that emails can be sent (try with normal mail, can't do attachments with gmail)
                                        cordova.plugins.email.isAvailable(function(isAvailable) {
                                            $log.debug('is email supported? ' + isAvailable);
                                            if (isAvailable) {
                                                $scope.appControl.saveButtonClicked = true;
                                                cordova.plugins.email.open(options, function(result) {
                                                    deferred.resolve(result);
                                                });
                                            } else {
                                                //no mail support...sad times :(
                                                $cordovaDialogs.alert(
                                                    $translate.instant('MSG_EMAIL_NOT_SETUP').sentenceCase(), 
                                                    $translate.instant('SORRY').sentenceCase(),
                                                    $translate.instant('OK')
                                                ).then(function() {
                                                    deferred.reject('NO_EMAIL');
                                                });
                                            }
                                        });

                                        return deferred.promise;

                                    } else if (index == 1) {
                                        //export the backup to PDF for user to handle
                                        //call an intent or similar service to allow user decide what to do with PDF
                                        $log.debug('opening file ' + $scope.backupSettings.path + $scope.backupSettings.filename);
                                        $scope.appControl.saveButtonClicked = true;
                                        return $cordovaFileOpener2.open($scope.backupSettings.path + $scope.backupSettings.filename, 'application/pdf');
                                    }
                                })
                                .then(function() {
                                    // backup export successful
                                    $log.debug("backup export complete");
                                    $scope.hideExportOptions();
                                })
                                .catch(function(err) {
                                    $log.error(err);
                                    if (err) {
                                        if (err.status && err.status == 9) {
                                            $cordovaDialogs.alert($scope.translations['MSG_CANT_OPEN_PDF'], $scope.translations['ERROR'], $scope.translations['OK']);
                                        } else {
                                            $cordovaDialogs.alert(err, $scope.translations['ERROR'], $scope.translations['OK']);
                                        }
                                    } else {
                                        //some of the above plugins reject the promise even on success...
                                        $scope.hideExportOptions();
                                    }
                                })
                            ;
                        });
                    }
                });
            });
        };

        /**
         * clear the backup info and continue
         */
        $scope.continue = function() {
            if (!$scope.appControl.backupSaved) {
                $scope.getTranslations().then(function() {
                    $cordovaDialogs.alert($scope.translations['MSG_SAVE_BACKUP'].sentenceCase(), $scope.translations['SETUP_WALLET_BACKUP'].sentenceCase(), $scope.translations['OK'])
                });
            } else {
                //delete all temp backup info
                launchService.clearBackupInfo()
                    .then(function() {
                        settingsService.$isLoaded().then(function() {
                            settingsService.backupSaved = true;
                            settingsService.$store();
                        });

                        //delete the temporary backup file if created
                        $cordovaFile.removeFile($scope.backupSettings.path, $scope.backupSettings.filename)
                            .then(function() {
                                $log.debug('deleted file ' + $scope.backupSettings.path + $scope.backupSettings.filename);
                            }, function(err) {
                                $log.debug('unable to delete temp wallet backup file' + err);
                            });

                        //onwards to phone number and contacts setup
                        $state.go('app.setup.phone');
                    })
                    .catch(function(err) {
                        console.error(err);
                    });
            }
        };

        /**
         * skip the back save process and do it another day
         */
        $scope.skipBackup = function() {
            $cordovaDialogs.confirm(
                $translate.instant('MSG_SKIP_BACKUP').sentenceCase(),
                $translate.instant('MSG_ARE_YOU_SURE').sentenceCase(),
                [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
            )
                .then(function(dialogResult) {
                    if (dialogResult == 1) {
                        settingsService.$isLoaded().then(function() {
                            settingsService.backupSkipped = true;
                            settingsService.$store();
                        });

                        //onwards to phone number and contacts setup
                        $state.go('app.setup.phone');
                    } else {
                        //canceled
                    }
                });
        };

    })
    .controller('SetupPhoneCtrl', function($scope, $state, $btBackButtonDelegate) {
        //re-enable back button, but remove the root state
        $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
        $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        $btBackButtonDelegate.rootState = null;
    })
    .controller('SetupContactsCtrl', function($scope, Contacts, settingsService, $q, $btBackButtonDelegate, $cordovaDialogs, $translate, $log) {
        $btBackButtonDelegate.rootState = null;
        $scope.transactions = null;

        $scope.getTranslations = function() {
            if ($scope.translations) {
                return $q.when($scope.translations);
            } else {
                var requiredTranslations = [
                    'OK',
                    'CANCEL',
                    'PERMISSION_REQUIRED_CONTACTS',
                    'MSG_CONTACTS_PERMISSIONS'
                ];
                return $translate(requiredTranslations).then(function(translations) {
                    $scope.translations = translations;
                    return $q.when(translations);
                });
            }
        };

        $scope.syncContacts = function() {
            if ($scope.appControl.syncing) {
                return false;
            }
            $scope.appControl.syncing = true;

            $q.when(Contacts.sync(true))
                .then(function() {
                    //build the cached contacts list
                    return Contacts.list(true);
                })
                .then(function() {
                    //load the settings so we can update them
                    return settingsService.$isLoaded();
                })
                .then(function(list) {
                    settingsService.contactsLastSync = new Date().valueOf();
                    settingsService.permissionContacts = true;
                    settingsService.enableContacts = true;
                    settingsService.contactsWebSync = false;
                    return settingsService.$store();
                })
                .then(function() {
                    $scope.appControl.syncing = false;
                    $scope.appControl.syncComplete = true;
                })
                .catch(function(err) {
                    $log.error(err);
                    //check if permission related error happened and update settings accordingly
                    if (err instanceof blocktrail.ContactsPermissionError) {
                        settingsService.permissionContacts = false;
                        settingsService.$store();
                        $scope.getTranslations()
                            .then(function() {
                                $cordovaDialogs.alert(
                                    $translate.instant('MSG_CONTACTS_PERMISSIONS').sentenceCase(),
                                    $translate.instant('PERMISSION_REQUIRED_CONTACTS').sentenceCase(),
                                    $translate.instant('OK')
                                )
                            });
                    }
                    $scope.appControl.syncing = false;
                    $scope.appControl.syncComplete = false;
                });
        };
    })
    .controller('SetupProfileCtrl', function($scope, $btBackButtonDelegate) {
        /*-- Profile setup uses ProfileSettingsCtrl in SettingsControllers, this controller just modifies some things --*/
        $btBackButtonDelegate.rootState = null;
    })
    .controller('SetupCompleteCtrl', function($scope, settingsService, $btBackButtonDelegate, $state, $injector, $ionicLoading, $log) {
        //reset the backbutton rootstate (for android hardware back)
        $btBackButtonDelegate.rootState = "app.wallet.summary";
        settingsService.$isLoaded().then(function() {
            //load the settings so we can update them
            settingsService.setupComplete = true;
            settingsService.$store();
        });

        /**
         * init the wallet, poll for transactions, show spinner
         */
        $scope.continue = function() {
            $ionicLoading.show({template: "<div>{{ 'LOADING_WALLET' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});

            var Wallet = $injector.get('Wallet');

            return Wallet.pollTransactions()
                .then(function() {
                    // pregen some addresses
                    return Wallet.refillOfflineAddresses(2)
                        .catch(function() {
                            return false; // suppress err
                        });
                })
                .then(
                    function() {
                        $state.go('app.wallet.summary');
                    },
                    function(err) {
                        $log.error(err);
                        $state.go('app.wallet.summary');
                    }
                )
            ;
        };

    });
