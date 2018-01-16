(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupWalletPinCtrl", SetupWalletPinCtrl);

    function SetupWalletPinCtrl($q, $rootScope, $scope, $state, $cordovaNetwork, $analytics, $log, $btBackButtonDelegate, CONFIG,
                                blocktrailSDK, sdkService, modalService, launchService, setupStepsService, setupInfoService) {

        // disable back button
        $btBackButtonDelegate.setBackButton(angular.noop);
        $btBackButtonDelegate.setHardwareBackButton(angular.noop);

        // Flag for submitting form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
        var isFormSubmit = false;

        $scope.form = {
            pin: CONFIG.DEBUG_PIN_PREFILL || "",
            pinRepeat: CONFIG.DEBUG_PIN_PREFILL || "",
            isSubmit: false
        };

        // Methods
        $scope.onSubmitFormPin = onSubmitFormPin;

        /**
         * On submit the form
         * @return { boolean }
         */
        function onSubmitFormPin(pin, pinRepeat) {
            // Submit the form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
            if(isFormSubmit) {
                return false;
            }

            // Check on numbers, pattern="[0-9]*" is in html
            if (!pin) {
                modalService.alert({
                    body: "MSG_BAD_PIN"
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

        /**
         * Create wallet
         */
        function createWallet() {
            if ($cordovaNetwork.isOnline()) {
                isFormSubmit = true;
                initWallet();
            } else {
                modalService.alert({
                    body: "MSG_BAD_NETWORK"
                });
            }
        }

        /**
         * Initialize a wallet
         * @return { promise }
         */
        function initWallet() {
            modalService.showSpinner({
                title: "",
                body: "CREATING_INIT_WALLET"
            });

            return $q.when(launchService.getAccountInfo())
                .then(function(accountInfo) {
                    sdkService.setAccountInfo(accountInfo);

                    return {
                        identifier: setupInfoService.getSetupInfoProperty("identifier"),
                        password: setupInfoService.getSetupInfoProperty("password")
                    };
                })
                .then(sdkInitWallet)
                // initWalletSuccessHandler for already exist wallet
                // initWalletErrorHandler if wallet is not exist we create new wallet or if wallet was created with other password
                .then(initWalletSuccessHandler, initWalletErrorHandler)
                .then(stashWalletSecret)
                .then(setSdkMainMobileWallet)
                .then(setWalletInfo)
                .then(lockWallet)
                .then(setWalletBackup)
                // God damn you've done it
                .then(hallelujah)
                .catch(function(e) {
                    $log.debug("M:SETUP:SetupWalletPinCtrl:initWallet:catch", e.toString());

                    modalService.hideSpinner();

                    // to make the form available for the repeat enter
                    isFormSubmit = false;

                    if (e === "CANCELLED") {
                        // user canceled action
                        return false;
                    } else {
                        modalService.alert({
                            body: e.toString()
                        })
                        .then(function() {
                            $state.go("app.reset");
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
            $log.debug("M:SETUP:SetupWalletPinCtrl:sdkInitWallet", options);

            var sdk = sdkService.getSdkByNetworkType(setupInfoService.getSetupInfoProperty("networkType"));

            return sdk.initWallet(options);
        }

        /**
         * SDK create new wallet
         * @param options
         * @return { promise }
         */
        function sdkCreateNewWallet(options) {
            $log.debug("M:SETUP:sdkCreateNewWallet:sdkCreateNewWallet", options);

            var sdk = sdkService.getSdkByNetworkType(setupInfoService.getSetupInfoProperty("networkType"));

            return sdk.createNewWallet(options);
        }

        /**
         * Initialize wallet success handler
         * @param wallet
         * @return { wallet }
         */
        function initWalletSuccessHandler(wallet) {
            $analytics.eventTrack("initWallet", { category: "Events" });

            // time to upgrade to V3 ppl!
            if (wallet.walletVersion !== blocktrailSDK.Wallet.WALLET_VERSION_V3) {
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

                return sdkCreateNewWallet({
                        identifier: setupInfoService.getSetupInfoProperty("identifier"),
                        password: setupInfoService.getSetupInfoProperty("password"),
                        walletVersion: CONFIG.WALLET_DEFAULT_VERSION,
                        support_secret: supportSecret,
                        keyIndex: CONFIG.DEVKEYINDEX || 0,
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
                        $log.debug("M:SETUP:SetupWalletPinCtrl:initWalletErrorHandler: New wallet created in [" + ((new Date).getTime() - timestamp) + "ms]");

                        setupInfoService.setSetupInfo({
                            backupInfo: backupInfo,
                            supportSecret: supportSecret
                        });

                        return $q.when(wallet);
                    });
            } else if (error.message && (error.message.match(/password/) || error instanceof blocktrailSDK.WalletDecryptError)) {
                // wallet exists but with different password
                $log.debug("M:SETUP:SetupWalletPinCtrl: wallet with identifier [" + $scope.setupInfo.identifier + "] already exists, prompting for old password");

                return modalService.alert({
                    title: "SETUP_EXISTING_WALLET",
                    body: "MSG_WALLET_PASSWORD_MISMATCH"
                }).then(function() {
                    return promptWalletPassword();
                });
            } else {
                $log.error("M:SETUP:SetupWalletPinCtrl: initWalletErrorHandler ERROR", error);
                return $q.reject(error);
            }
        }

        /**
         * Stash the wallet secret
         * @param wallet
         * @return wallet
         */
        function stashWalletSecret(wallet) {
            var secretHex = wallet.secret.toString("hex");

            // while logging in we stash the secret so we can decrypt the glidera access token
            setupInfoService.stashWalletSecret(secretHex);

            return wallet;
        }

        /**
         * Set to SDK main mobile wallet
         * @param wallet
         * @return { promise }
         */
        function setSdkMainMobileWallet(wallet) {
            // set the wallet as the main wallet
            $log.debug("M:SETUP:SetupWalletPinCtrl:setSdkMainMobileWallet");

            modalService.updateSpinner({
                title: "",
                body: "SAVING_WALLET"
            });

            setupInfoService.getSetupInfoProperty("identifier");

            return wallet.sdk.setMainMobileWallet(setupInfoService.getSetupInfoProperty("identifier"))
                .then(function() {
                    return wallet;
                });
        }

        /**
         * Set wallet info
         * @param wallet
         * @return { promise }
         */
        function setWalletInfo(wallet) {
            var encryptedSecret = CryptoJS.AES.encrypt(wallet.secret.toString("hex"), $scope.form.pin).toString();

            $log.debug("M:SETUP:SetupWalletPinCtrl:setWalletInfo",
                setupInfoService.getSetupInfoProperty("identifier"),
                setupInfoService.getSetupInfoProperty("networkType")
            );

            return launchService.setWalletInfo({
                identifier: setupInfoService.getSetupInfoProperty("identifier"),
                networkType: setupInfoService.getSetupInfoProperty("networkType"),
                encryptedSecret: encryptedSecret
            }).then(function() {
                return wallet;
            });
        }

        /**
         * Lock the wallet (unsets the secret, privkeys, etc)
         *
         * @param wallet
         * @return { promise }
         */
        function lockWallet(wallet) {
            wallet.lock();

            return wallet;
        }

        /**
         * Set a wallet backup
         * For new wallet we return a promise for created wallet return null
         * @return { null | promise }
         */
        function setWalletBackup() {
            var identifier = setupInfoService.getSetupInfoProperty("identifier");
            var backupInfo = setupInfoService.getSetupInfoProperty("backupInfo");
            var supportSecret = setupInfoService.getSetupInfoProperty("supportSecret");

            if (backupInfo && supportSecret) {
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

                var pubKeys = [];

                angular.forEach(backupInfo.blocktrailPublicKeys, function(pubKey, keyIndex) {
                    pubKeys.push({
                        keyIndex: keyIndex,
                        pubKey: pubKey.toBase58()
                    });
                });

                // store the backup info temporarily
                $log.debug("M:SETUP:SetupWalletPinCtrl:setWalletBackup", identifier);

                return launchService.setWalletBackup({
                    identifier: identifier,
                    walletVersion: backupInfo.walletVersion,
                    encryptedPrimarySeed: backupInfo.encryptedPrimarySeed,
                    encryptedSecret: backupInfo.encryptedSecret,
                    backupSeed: backupInfo.backupSeed,
                    recoveryEncryptedSecret: backupInfo.recoveryEncryptedSecret,
                    blocktrailPublicKeys: pubKeys,
                    supportSecret: supportSecret
                });
            }

            return null;
        }

        /**
         * Hallelujah :)
         */
        function hallelujah() {
            $log.debug("M:SETUP:SetupWalletPinCtrl:hallelujah");

            // Reset the setup info data
            setupInfoService.resetSetupInfo();

            // TODO Save this in local settings service, do not save it in the $rootScope
            // prevent PIN dialog
            $rootScope.STATE.INITIAL_PIN_DONE = true;

            modalService.hideSpinner();

            return setupStepsService.toNextStep();
        }

        /**
         * Prompt for a correct wallet password - repeats on bad password
         * @returns { promise }
         */
        function promptWalletPassword() {
            modalService.hideSpinner();

            return modalService.prompt({
                    title: "SETUP_WALLET_PASSWORD",
                    body: "MSG_WALLET_PASSWORD",
                    buttonConfirm: "OK"
                })
                .then(function(dialogResult) {
                    if(dialogResult === null) {
                        return $q.reject("CANCELLED");
                    } else {
                        var password = dialogResult.trim();

                        if(password === "") {
                            return promptWalletPassword();
                        } else {
                            modalService.showSpinner({
                                title: "",
                                body: "CREATING_INIT_WALLET"
                            });

                            setupInfoService.setSetupInfo({
                                password: password
                            });

                            return initWallet();
                        }
                    }
                });
        }
    }
})();
