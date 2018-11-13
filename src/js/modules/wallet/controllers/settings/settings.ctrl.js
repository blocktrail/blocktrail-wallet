(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsCtrl", SettingsCtrl);

    function SettingsCtrl($rootScope, $scope, $state, $btBackButtonDelegate, $translate, modalService, walletsManagerService, launchService,
                          settingsService, localSettingsService, storageService, Currencies, Contacts, blocktrailLocalisation, cryptoJS, sdkService, CONFIG) {
        // Enable back button
        enableBackButton();

        var activeWallet = walletsManagerService.getActiveWallet();

        $scope.walletData = walletsManagerService.getActiveWalletReadOnlyData();
        $scope.settingsData = settingsService.getReadOnlySettingsData();
        $scope.localSettingsData = localSettingsService.getReadOnlyLocalSettingsData();
        $scope.languageName = blocktrailLocalisation.languageName($translate.use());
        $scope.formLocalSettings = {
            btcPrecision: $scope.localSettingsData.btcPrecision,
            isPinOnOpen: $scope.localSettingsData.isPinOnOpen
        };
        $scope.isWalletBackupSaved = true;

        var watchBtcPrecision = $scope.$watch("formLocalSettings.btcPrecision", onSetBtcPrecision);
        var watchIsPinOnOpen = $scope.$watch("formLocalSettings.isPinOnOpen", onSetIsPinOnOpen);

        // On scope destroy
        $scope.$on("$destroy", onScopeDestroy);

        // Methods
        $scope.onSetCurrency = onSetCurrency;
        $scope.onSetLanguage = onSetLanguage;
        $scope.onSetContacts = onSetContacts;
        $scope.onWalletBackupSaved = onWalletBackupSaved;
        $scope.onChangePin = onChangePin;
        $scope.onForgotPin = onForgotPin;
        $scope.onLogout = onLogout;

        init();

        /**
         * Initialize
         */
        function init() {
            launchService.getWalletBackup()
                .then(function(walletBackup) {
                    if(walletBackup.identifier) {
                        $scope.isWalletBackupSaved = false;
                    }
                });
        }

        /**
         * On click set currency
         */
        function onSetCurrency() {
            modalService.select({
                options: prepareCurrencyListOptions(Currencies.getFiatCurrencies() || [])
            })
                .then(setCurrencyHandler);
        }

        /**
         * Prepare the currency list options
         * @param currencies
         * @return {Array}
         */
        function prepareCurrencyListOptions(currencies) {
            var list = [];

            currencies.forEach(function(item) {
                list.push({
                    value: item.code,
                    selected: $scope.settingsData.localCurrency === item.code,
                    label: item.code + " " + "(" + item.symbol + ")"
                });
            });

            return list;
        }

        /**
         * Set currency handler
         * @param currency
         */
        function setCurrencyHandler(currency) {
            if (currency) {
                disableBackButton();
                modalService.showSpinner();

                settingsService.updateSettingsUp({ localCurrency: currency })
                    .then(successHandler)
                    .catch(errorHandler);
            }
        }

        /**
         * On click set language
         */
        function onSetLanguage() {
            modalService.select({
                options: prepareLanguageListOptions(blocktrailLocalisation.getLanguages() || [])
            })
                .then(setLanguageHandler);
        }

        /**
         * Prepare the language list options
         * @param languages
         * @return {Array}
         */
        function prepareLanguageListOptions(languages) {
            var list = [];

            languages.forEach(function(item) {
                list.push({
                    value: item,
                    selected: item === $translate.use(),
                    label: $translate.instant(blocktrailLocalisation.languageName(item))
                });
            });

            return list;
        }

        /**
         * Set language handler
         * @param language
         */
        function setLanguageHandler(language) {
            if (language) {
                disableBackButton();
                modalService.showSpinner();

                settingsService.updateSettingsUp({ language: language })
                    .then(function() {
                        $scope.languageName = blocktrailLocalisation.languageName($scope.settingsData.language);
                        $rootScope.changeLanguage($scope.settingsData.language);
                    })
                    .then(successHandler)
                    .catch(errorHandler);
            }
        }

        /**
         * On click wallet backup saved
         */
        function onWalletBackupSaved() {
            modalService.message({
                title: "",
                body: "MSG_BACKUP_SAVED_ALREADY"
            })
        }

        /**
         * On set is pin on open
         * @param newValue
         * @param oldValue
         */
        function onSetIsPinOnOpen(newValue, oldValue) {
            if(newValue !== oldValue) {
                var data = {
                    isPinOnOpen: $scope.formLocalSettings.isPinOnOpen
                };

                localSettingsService.setLocalSettings(data)
                    .then(angular.noop, errorHandler);
            }
        }

        /**
         * On change the pin
         */
        function onChangePin() {
            modalService.show("js/modules/wallet/controllers/modal-pin/modal-pin.tpl.html", "ModalPinCtrl", {
                title: "SETTINGS_CHANGE_PIN",
                body: "MSG_ENTER_PIN",
                placeholderPin: "SETTINGS_CURRENT_PIN",
                isPinRepeat: false,
                preFill: CONFIG.DEBUG_PIN_PREFILL
            }).then(function(dialogResult) {
                if(dialogResult && dialogResult.pin) {
                    unlockData(false, dialogResult.pin);
                }
            });
        }

        /**
         * On forgot the pin
         */
        function onForgotPin() {
            modalService.prompt({
                title: "SETTINGS_FORGOT_PIN",
                body: "ENTER_CURRENT_PASSWORD",
                placeholder: "SETUP_PASSWORD_PLACEHOLDER",
                preFill: CONFIG.DEBUG_PASSWORD_PREFILL
            }).then(function(dialogResult) {
                if(dialogResult) {
                    unlockData(true, dialogResult);
                }
            });
        }

        /**
         * Unlock the data
         * @param isPassword
         * @param key
         */
        function unlockData(isPassword, key) {
            disableBackButton();
            modalService.showSpinner({
                title: "WORKING"
            });

            if(isPassword) {
                activeWallet.unlockWithPassword(key)
                    .then(function(wallet) {
                        enableBackButton();
                        modalService.hideSpinner();
                        promptNewPin({
                            secret: wallet.secret.toString('hex')
                        });
                    })
                    .catch(unlockDataErrorHandler);
            } else {
                activeWallet.unlockDataWithPin(key)
                    .then(function(data) {
                        enableBackButton();
                        modalService.hideSpinner();
                        promptNewPin(data);
                    })
                    .catch(unlockDataErrorHandler);
            }
        }


        /**
         * Unlock the data error handler
         * @param e
         */
        function unlockDataErrorHandler(e) {
            enableBackButton();
            modalService.hideSpinner();

            if (e instanceof blocktrail.WalletPinError) {
                // incorrect PIN...try again
                modalService.alert({
                    title: "MSG_BAD_PIN",
                    body: "MSG_TRY_AGAIN"
                });
            } else {
                modalService.alert({body: e.message ? e.message : e.toString()});
            }
        }

        /**
         * Prompt the new pin
         * @param data
         */
        function promptNewPin(data) {
            modalService.show("js/modules/wallet/controllers/modal-pin/modal-pin.tpl.html", "ModalPinCtrl", {
                title: "SETTINGS_NEW_PIN",
                body: "MSG_ENTER_NEW_PIN",
                placeholderPin: "SETUP_PIN_PLACEHOLDER",
                placeholderRepeatPin: "SETUP_PIN_REPEAT_PLACEHOLDER",
                isRepeatPin: true,
                preFill: CONFIG.DEBUG_PIN_PREFILL
            }).then(function(dialogResult) {
                if(dialogResult) {
                    // Check on numbers, pattern="[0-9]*" is in html
                    if (!dialogResult.pin) {
                        modalService.alert({
                            body: "MSG_BAD_ONLY_NUMBERS"
                        });
                        return false;
                    }

                    // Check on length
                    if (dialogResult.pin.toString().length < 4) {
                        modalService.alert({
                            body: "MSG_BAD_PIN_LENGTH"
                        });
                        return false;
                    }

                    // Check on match
                    if (dialogResult.pin !== dialogResult.pinRepeat) {
                        modalService.alert({
                            body: "MSG_BAD_PIN_REPEAT"
                        });
                        return false;
                    }

                    updatePin(data, dialogResult.pinRepeat);
                }
            });
        }

        /**
         * Update the pin
         * @param data
         * @param pin
         * @return {*}
         */
        function updatePin(data, pin) {
            disableBackButton();
            modalService.showSpinner({
                title: "WORKING"
            });

            var update = {
                encryptedPassword: null,
                encryptedSecret: null
            };

            if (data.secret) {
                update.encryptedSecret = CryptoJS.AES.encrypt(data.secret, pin).toString();
            } else {
                update.encryptedPassword = CryptoJS.AES.encrypt(data.password, pin).toString();
            }

            return launchService.setWalletInfo(update)
                .then(function() {
                    enableBackButton();
                    modalService.hideSpinner();
                    modalService.message({
                        title: "SUCCESS",
                        body: "MSG_PIN_CHANGED"
                    });
                }, unlockDataErrorHandler);

        }

        /**
         * On set BTC precision
         * @param newValue
         * @param oldValue
         */
        function onSetBtcPrecision(newValue, oldValue) {
            if(newValue !== oldValue) {
                var data = {
                    btcPrecision: $scope.formLocalSettings.btcPrecision
                };

                localSettingsService.setLocalSettings(data)
                    .then(angular.noop, errorHandler);
            }
        }

        /**
         * On set the contacts
         */
        function onSetContacts() {
            if ($scope.localSettingsData.isEnableContacts) {
                disableContacts();
            } else {
                enableContacts();
            }
        }

        /**
         * Enable the contacts
         */
        function enableContacts() {
            if (!$scope.localSettingsData.isPhoneVerified) {
                modalService.message({
                    title: "MSG_PHONE_REQUIRE_VERIFY",
                    body: "SETTINGS_PHONE_REQUIRE_VERIFY"
                }).then(function() {
                    $state.go(".phone");
                });

                return;
            }

            modalService.confirm({
                title: "SETTINGS_ENABLE_CONTACTS",
                body: "MSG_ENABLE_CONTACTS"
            }).then(function(dialogResult) {
                if(dialogResult) {
                    syncContacts();
                }
            });
        }

        function disableContacts() {
            modalService.confirm({
                title: "MSG_ARE_YOU_SURE",
                body: "MSG_DISABLE_CONTACTS"
            }).then(function(dialogResult) {
                if(dialogResult) {
                    modalService.showSpinner({ title: "WORKING" });
                    // disable back button
                    disableBackButton();

                    sdkService.getGenericSdk()
                        .deleteContacts()
                        .then(function() {
                            var data = {
                                isEnableContacts: false,
                                isContactsWebSync: false,
                                contactsLastSync: null
                            };

                            localSettingsService.setLocalSettings(data)
                                .then(successHandler, errorHandler);
                        })
                        .catch(errorHandler);
                }
            });
        }

        /**
         * Synchronise the contacts with the Blocktrail service
         */
        function syncContacts() {
            modalService.showSpinner({
                title: "SETTINGS_CONTACTS_SYNC"
            });

            // disable back button
            disableBackButton();

            return Contacts.sync(true, true)
                .then(function() {
                    // rebuild the cached contacts list
                    return Contacts.list(true);
                })
                .then(function() {
                    var data = {
                        isEnableContacts: true,
                        isPermissionContacts: true,
                        isContactsWebSync: true,
                        contactsLastSync: new Date().valueOf()
                    };

                    localSettingsService.setLocalSettings(data)
                        .then(successHandler, errorHandler);
                })
                .catch(function(e) {
                    // check if permission related error happened and update settings accordingly
                    if (e instanceof blocktrail.ContactsPermissionError) {
                        var data = {
                            enableContacts: false,
                            contactsWebSync: false,
                            contactsLastSync: null
                        };

                        localSettingsService.setLocalSettings(data)
                            .then(successHandler, errorHandler)
                            .then(function() {
                                modalService.alert({
                                    title: "MSG_CONTACTS_PERMISSIONS",
                                    body: "PERMISSION_REQUIRED_CONTACTS"
                                });
                            });
                    } else {
                        errorHandler(e)
                    }
                });
        }

        /**
         * Success handler
         */
        function successHandler() {
            enableBackButton();
            modalService.hideSpinner();
        }

        /**
         * Error handler
         * @param e
         */
        function errorHandler(e) {
            enableBackButton();
            modalService.hideSpinner();
            modalService.alert({body: e.message ? e.message : e.toString()});
        }

        /**
         * Enable the back button
         */
        function enableBackButton() {
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        }

        /**
         * Disable the back button
         */
        function disableBackButton() {
            $btBackButtonDelegate.setBackButton(angular.noop);
            $btBackButtonDelegate.setHardwareBackButton(angular.noop);
        }

        /**
         * On scope destroy
         */
        function onScopeDestroy() {
            watchBtcPrecision();
            watchIsPinOnOpen();
        }

        /**
         * On logout
         */
        function onLogout() {
            modalService.confirm({
                title: "MSG_ARE_YOU_SURE",
                body: "MSG_RESET_WALLET"
            }).then(function(dialogResult) {
                if(dialogResult) {
                    if(!$scope.isWalletBackupSaved) {
                        modalService.confirm({
                            title: "MSG_ARE_YOU_SURE",
                            body: "MSG_BACKUP_UNSAVED"
                        }).then(function(dialogResult) {
                            if(dialogResult) {
                                resetApp();
                            }
                        })
                    } else {
                        resetApp();
                    }
                }
            });
        }

        /**
         * Reset the app
         */
        function resetApp() {
            modalService.showSpinner({
                title: "LOGOUT"
            });

            storageService.resetAll()
                .then(function() {
                    window.location.replace("");
                });
        }
    }

})();
