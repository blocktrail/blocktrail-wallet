(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupWalletPinCtrl", SetupWalletPinCtrl);

    // TODO Remove $btBackButtonDelegate, $cordovaDialogs, $ionicLoading use modalService instead
    function SetupWalletPinCtrl($q, $rootScope, $scope, $state, $cordovaNetwork, $analytics, $btBackButtonDelegate, $cordovaDialogs, $ionicLoading,
                                $log, $translate, launchService, modalService, blocktrailSDK, sdkService, genericSdkService, settingsService, CONFIG, setupInfoService,
                                randomBytesJS) {
        var sdk = null;

        $scope.form = {
            pin: CONFIG.DEBUG_PIN_PREFILL || "",
            pinRepeat: CONFIG.DEBUG_PIN_PREFILL || ""
        };

        // Methods
        $scope.onSubmitFormPin = onSubmitFormPin;


        // TODO Remove it !!!
        // promptWalletPassword();


        /**
         * On submit the form
         * @return {boolean}
         */
        function onSubmitFormPin(pin, pinRepeat) {
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

            // Check on match
            if (pin !== pinRepeat) {
                modalService.alert({
                    body: "MSG_BAD_PIN_REPEAT"
                });
                return false;
            }

            createWallet();
        }

        function createWallet() {
            if ($cordovaNetwork.isOnline()) {
                modalService.showSpinner({
                    title: "",
                    body: "CREATING_INIT_WALLET"
                });
                initWallet();
            } else {
                modalService.hideSpinner();
                modalService.alert({
                    body: "MSG_BAD_NETWORK"
                });

            }
        }

        /**
         * Initialize a wallet
         */
        function initWallet() {
            return $q.when(launchService.getAccountInfo())
                .then(function(accountInfo) {
                    sdkService.setAccountInfo(accountInfo);
                    return {
                        identifier: setupInfoService.getSetupInfoProperty("identifier"),
                        password: setupInfoService.getSetupInfoProperty("password")
                    };
                })
                .then(sdkInitWallet)
                .then(initWalletSuccessHandler, initWalletErrorHandler)
                .then(stashWalletSecret)
                .then(setSdkMainMobileWallet)
                .then(storeWalletInfoAndEncryptedPassword)
                .then(storeBackupInfo)
                .then(hallelujah)
                .catch(function(e) {
                    $log.debug("M:SETUP:SetupWalletPinCtrl: init wallet error", e.toString());
                    modalService.hideSpinner();

                    if (e == "CANCELLED") {
                        // user canceled action
                        return false;
                    } else {
                        modalService.alert({
                            body: e.toString()
                        });
                    }
                });
        }

        /**
         * SDK initialize wallet
         * @param options
         * @return { promise }
         */
        function sdkInitWallet(options) {
            $log.debug("M:SETUP:SetupWalletPinCtrl: init wallet", options);

            return sdkService.getSdkByNetworkType(setupInfoService.getSetupInfoProperty("networkType")).then(
                function(sdk) {
                    return sdk.initWallet(options);
                });
        }

        /**
         * Initialize wallet success handler
         * @param wallet
         * @return { wallet }
         */
        function initWalletSuccessHandler(wallet) {
            $analytics.eventTrack("initWallet", { category: "Events" });

            // time to upgrade to V3 ppl!
            if (wallet.walletVersion != blocktrailSDK.Wallet.WALLET_VERSION_V3) {
                modalService.updateSpinner({
                    title: "UPGRADING_WALLET",
                    body: "UPGRADING_WALLET_BODY"
                });

                return wallet.upgradeToV3(setupInfoService.getSetupInfoProperty("password"))
                    .progress(function(progress) {
                        /**
                         * per step we increment the progress bar and display some new progress text
                         * some of the text doesn't really match what is being done,
                         * but we just want the user to feel like something is happening.
                         */
                        switch (progress) {
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_START:
                                modalService.updateSpinner({title: "UPGRADING_WALLET", body: "UPGRADING_WALLET_BODY"});
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_SECRET:
                                modalService.updateSpinner({
                                    title: "UPGRADING_WALLET",
                                    body: "CREATING_GENERATE_PRIMARYKEY"
                                });
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_PRIMARY:
                                modalService.updateSpinner({
                                    title: "UPGRADING_WALLET",
                                    body: "CREATING_GENERATE_BACKUPKEY"
                                });
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_RECOVERY:
                                modalService.updateSpinner({
                                    title: "UPGRADING_WALLET",
                                    body: "CREATING_GENERATE_RECOVERY"
                                });
                                break;
                        }

                    })
                    .then(function() {
                        modalService.updateSpinner({
                            title: "UPGRADING_WALLET",
                            body: "UPGRADING_WALLET_BODY"
                        });
                        return wallet;
                    });

            } else {
                return wallet;
            }

        }

        /**
         * Initialize wallet error handler
         * @param error
         */
        function initWalletErrorHandler(error) {
            // Create new wallet
            if (error.message && (error.message.match(/not found/) || error.message.match(/couldn't be found/))) {
                var timestamp = (new Date).getTime();

                modalService.updateSpinner({
                    title: "",
                    body: "PLEASE_WAIT"
                });

                $analytics.eventTrack("createNewWallet", {category: "Events"});

                // generate support secret, 6 random digits
                var supportSecret = randDigits(6);

                return sdkInitWallet({
                        identifier: setupInfoService.getSetupInfoProperty("identifier"),
                        password: setupInfoService.getSetupInfoProperty("password"),
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
                                modalService.updateSpinner({title: "", body: "PLEASE_WAIT"});
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_SECRET:
                                modalService.updateSpinner({title: "", body: "CREATING_GENERATE_PRIMARYKEY"});
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_PRIMARY:
                                modalService.updateSpinner({title: "", body: "CREATING_GENERATE_BACKUPKEY"});
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_ENCRYPT_RECOVERY:
                                modalService.updateSpinner({title: "", body: "CREATING_GENERATE_RECOVERY"});
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_PRIMARY:
                                modalService.updateSpinner({title: "", body: "CREATING_INIT_KEYS"});
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_BACKUP:
                                modalService.updateSpinner({title: "", body: "CREATING_INIT_KEYS"});
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_SUBMIT:
                                modalService.updateSpinner({title: "", body: "CREATING_SUBMIT_WALLET"});
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_INIT:
                                modalService.updateSpinner({title: "", body: "CREATING_INIT_WALLET"});
                                break;
                            case blocktrailSDK.CREATE_WALLET_PROGRESS_DONE:
                                modalService.updateSpinner({title: "", body: "CREATING_DONE"});
                                break;
                        }
                    })
                    .spread(function(wallet, backupInfo) {
                        $log.debug("M:SETUP:SetupWalletPinCtrl: new wallet created in [" + ((new Date).getTime() - timestamp) + "ms]");

                        setupInfoService.updateSetupInfo({
                            backupInfo: backupInfo,
                            supportSecret: supportSecret
                        });

                        return $q.when(wallet);
                    })
                    .catch(function(e) {
                        modalService.hideSpinner();

                        return modalService.alert({
                                body: e.toString()
                            })
                            .then(function() {
                                $state.go("app.reset");
                            });
                    })
                // TODO Review this logic with Ruben !!!
                // TODO Change the password on blocktrail.com
            } else if (error.message && (error.message.match(/password/) || error instanceof blocktrailSDK.WalletDecryptError)) {
                // wallet exists but with different password
                $log.debug("M:SETUP:SetupWalletPinCtrl: wallet with identifier [" + $scope.setupInfo.identifier + "] already exists, prompting for old password");


                // TODO Continue HERE !!!

                return $cordovaDialogs.alert($translate.instant("MSG_WALLET_PASSWORD_MISMATCH"), $translate.instant("SETUP_EXISTING_WALLET"), $translate.instant("OK"))
                    .then(function() {
                        // prompt for old wallet password
                        $scope.message = {title_class: "text-neutral", body: "LOADING_WALLET"};
                        return promptWalletPassword();
                    });
            } else {
                $log.error("M:SETUP:SetupWalletPinCtrl: error encountered", error);
                return $q.reject(error);
            }
        }

        /**
         * Stash the wallet secret
         * @param wallet
         */
        function stashWalletSecret(wallet) {
            var secretHex = null;

            if (wallet.walletVersion === "v2") {
                secretHex = wallet.secret;
            } else {
                secretHex = wallet.secret.toString("hex");
            }

            // while logging in we stash the secret so we can decrypt the glidera access token
            launchService.stashWalletSecret(secretHex);

            wallet.lock();

            return wallet;
        }

        /**
         * Set to SDK main mobile wallet
         * @param wallet
         */
        function setSdkMainMobileWallet(wallet) {
            // set the wallet as the main wallet
            $log.debug("M:SETUP:SetupWalletPinCtrl: setting wallet as main wallet");
            modalService.updateSpinner({
                title: "",
                body: "SAVING_WALLET"
            });

            return wallet.sdk.setMainMobileWallet($scope.setupInfo.identifier);
        }

        /**
         * Store wallet info
         */
        function storeWalletInfoAndEncryptedPassword(wallet) {
            // store the identity and encrypted password
            var encryptedSecret = null;
            var encryptedPassword = null;

            // legacy wallets use password instead of secret,
            // using secret is a lot better since someone cracking a PIN won't get your much reused password xD
            if (wallet.secret) {
                encryptedSecret = CryptoJS.AES.encrypt(wallet.secret.toString("hex"), $scope.form.pin).toString();
            } else {
                encryptedPassword = CryptoJS.AES.encrypt($scope.setupInfo.password, $scope.form.pin).toString();
            }

            $log.debug("M:SETUP:SetupWalletPinCtrl: saving wallet info", $scope.setupInfo.identifier, $scope.setupInfo.networkType);
            return launchService.storeWalletInfo($scope.setupInfo.identifier, $scope.setupInfo.networkType, encryptedSecret, encryptedPassword);
        }

        /**
         * Store the backup info
         * @return {*}
         */
        function storeBackupInfo() {
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

                // store the backup info temporarily
                $log.debug("M:SETUP:SetupWalletPinCtrl: saving backup info");
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
            }

            return null;
        }

        /**
         * Hallelujah :)
         */
        function hallelujah() {
            $log.debug("All done. Onwards to victory!");

            modalService.hideSpinner();

            // save in settings that the user has started the setup process
            settingsService.$store()
                .then(function() {
                    return settingsService.$syncSettingsDown();
                })
                .then(function() {
                    return settingsService.$syncProfileDown();
                })
                .then(function() {
                    // TODO Replace with local storage settings


                    settingsService.setupStarted = true;
                    settingsService.$store();
                })
                .then(function() {
                    if ($scope.setupInfo.backupInfo) {
                        // if a new wallet has been created, go to the wallet backup page
                        $state.go("app.setup.backup");
                    } else {
                        // else continue to profile, phone, etc setup (mark backup as saved)
                        settingsService.$isLoaded()
                            .then(function() {
                                settingsService.backupSaved = true;
                                settingsService.$store();
                            });
                        $state.go("app.setup.phone");
                    }
                })
                .then(function() {
                    // TODO Reset setup info

                    // Reset password
                    $scope.setupInfo.password = null;
                });
            ;
        }

        /**
         * prompt for a correct wallet password - repeats on bad password
         * @param wallet
         * @returns {*}
         */
        // TODO CONTINUE HERE
        // TODO Review this part !!!
        // TODO remove $cordovaDialogs
        function promptWalletPassword(wallet) {
            //prompt for a correct wallet password and retry the wallet creation process
            return $cordovaDialogs.prompt(
                $translate.instant("MSG_WALLET_PASSWORD"),
                $translate.instant("SETUP_WALLET_PASSWORD"),
                [$translate.instant("OK"), $translate.instant("CANCEL")],
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
                        return $q.reject("CANCELLED");
                    }

                    $scope.setupInfo.password = dialogResult.input1.trim();

                    if (!$scope.setupInfo.password) {
                        return $cordovaDialogs.alert($translate.instant("MSG_BAD_PWD"), $translate.instant("MSG_TRY_AGAIN"), $translate.instant("OK"))
                            .then(function() {
                                return promptWalletPassword();
                            });
                    }

                    // try the new password
                    $log.debug("re-initialising wallet with new password: " + $scope.setupInfo.identifier);

                    $ionicLoading.show({
                        template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>",
                        hideOnStateChange: true
                    });

                    return $scope.sdk.initWallet({
                        identifier: $scope.setupInfo.identifier,
                        password: $scope.setupInfo.password
                    })
                        .then(function(wallet) {
                            //success, password is correct. We can continue
                            $ionicLoading.hide();
                            return $q.when(wallet);
                        }, function(error) {
                            $ionicLoading.hide();
                            if (error.message.match(/password/) || error instanceof blocktrailSDK.WalletDecryptError) {
                                //password still incorrect, try again
                                return $cordovaDialogs.alert($translate.instant("MSG_BAD_PWD"), $translate.instant("MSG_TRY_AGAIN"), $translate.instant("OK"))
                                    .then(function() {
                                        return promptWalletPassword();
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
