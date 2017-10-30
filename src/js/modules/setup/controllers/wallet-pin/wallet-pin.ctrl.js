(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupWalletPinCtrl", SetupWalletPinCtrl);

    function SetupWalletPinCtrl($q, $rootScope, $scope, $state, $cordovaNetwork, $analytics, launchService, $btBackButtonDelegate,
                                   sdkService, $cordovaDialogs, $ionicLoading, $log, $translate, $timeout, settingsService, CONFIG) {
        $scope.retry = 0;
        $scope.form = {
            pin: CONFIG.SETUP_PREFILL_PIN || "",
            pinRepeat: CONFIG.SETUP_PREFILL_PIN || "",
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

                        // new identifier
                        $scope.setupInfo.identifer = CONFIG.DEFAULT_IDENTIFIER + "-" + randomBytes(8).toString('hex');

                        // generate support secret, 6 random digits
                        var supportSecret = randDigits(6);

                        return $scope.sdk.createNewWallet({
                            identifier: $scope.setupInfo.identifier,
                            password: $scope.setupInfo.password,
                            walletVersion: CONFIG.WALLET_DEFAULT_VERSION,
                            support_secret: supportSecret
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
                                $scope.setupInfo.backupInfo.supportSecret = supportSecret;

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
                        facebookConnectPlugin.logEvent("fb_mobile_complete_registration");
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
                            blocktrailPublicKeys: pubKeys,
                            supportSecret: $scope.setupInfo.backupInfo.supportSecret
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
            return $cordovaDialogs.prompt(
                $translate.instant('MSG_WALLET_PASSWORD'),
                $translate.instant('SETUP_WALLET_PASSWORD'),
                [$translate.instant('OK'), $translate.instant('CANCEL')],
                "",
                /* isPassword= */true
            )
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
                        return $cordovaDialogs.alert($translate.instant('MSG_BAD_PWD'), $translate.instant('MSG_TRY_AGAIN'), $translate.instant('OK'))
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
                                return $cordovaDialogs.alert($translate.instant('MSG_BAD_PWD'), $translate.instant('MSG_TRY_AGAIN'), $translate.instant('OK'))
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
    }
})();
