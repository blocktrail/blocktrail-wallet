(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsCtrl", SettingsCtrl);

    // TODO For Language use self._$translate.use()

    function SettingsCtrl($rootScope, $scope, $btBackButtonDelegate, $translate, modalService, activeWallet, settingsService,
                          trackingService, Currencies, blocktrailLocalisation) {
        // Enable back button
        enableBackButton();

        $scope.walletData = activeWallet.getReadOnlyWalletData();
        $scope.settingsData = settingsService.getReadOnlySettingsData();
        $scope.languageName = blocktrailLocalisation.languageName($translate.use());

        // Methods
        $scope.onClickSetCurrency = onClickSetCurrency;
        $scope.onClickSetLanguage = onClickSetLanguage;

        /**
         * On click set currency
         */
        function onClickSetCurrency() {
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
                })
            });

            return list;
        }

        /**
         * Set currency handler
         * @param currency
         */
        function setCurrencyHandler(currency) {
            disableBackButton();
            modalService.showSpinner();

            settingsService.updateSettingsUp({
                    localCurrency: currency
                })
                .then(function() {
                    enableBackButton();
                    modalService.hideSpinner();
                })
                .catch(function(e) {
                    enableBackButton();
                    modalService.hideSpinner();
                    modalService.alert({ body: e.message ? e.message : e.toString() });
                });
        }
        
        
        function onClickSetLanguage() {
            modalService.select({
                    options: prepareLanguageListOptions(blocktrailLocalisation.getLanguages() || [])
                })
                .then(setLanguageHandler);
        }
        
        function prepareLanguageListOptions(languages) {
            var list = [];

            languages.forEach(function(item) {
                list.push({
                    value: item,
                    selected: item === $translate.use(),
                    label:  $translate.instant(blocktrailLocalisation.languageName(item))
                })
            });

            return list;
        }

        function setLanguageHandler(language) {
            disableBackButton();
            modalService.showSpinner();

            settingsService.updateSettingsUp({
                language: language
            })
                .then(function() {
                    enableBackButton();
                    modalService.hideSpinner();
                    $scope.languageName = blocktrailLocalisation.languageName($scope.settingsData.language);
                    $rootScope.changeLanguage($scope.settingsData.language);
                })
                .catch(function(e) {
                    enableBackButton();
                    modalService.hideSpinner();
                    modalService.alert({ body: e.message ? e.message : e.toString() });
                });
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
    }

    function old($scope, $rootScope, $q, launchService, settingsService,
                 activeWallet, Contacts, storageService, $cordovaDialogs, $ionicLoading, $cordovaFile,
                 $translate, $timeout, $state, $log, $analytics, AppRateService, $cordovaToast,
                 sdkService) {
        $scope.appControl = {
            syncing: false,
            syncingAll: false,
            syncComplete: false
        };





        $scope.$on('$ionicView.enter', function() {
            // reset app state control
            $scope.appControl = {
                syncing: false,
                syncingAll: false,
                syncComplete: false
            };
        });

        $scope.allData = $q.all([
            launchService.getWalletInfo()
        ]).then(function(data){
            $log.debug('data loaded', data);
            $scope.defaultWallet = data[0].identifier;
            return data;
        });

        /**
         * initiate change of pin
         */
        $scope.forgotPin = function() {
            return $cordovaDialogs.prompt(
                $translate.instant('ENTER_CURRENT_PASSWORD'),
                $translate.instant('SETTINGS_FORGOT_PIN'),
                [$translate.instant('OK'), $translate.instant('CANCEL')],
                "",
                true   //isPassword
            )
                .then(function(dialogResult) {
                    if (dialogResult.buttonIndex == 2) {
                        return $q.reject('CANCELLED');
                    }
                    //decrypt password with the provided PIN
                    $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});

                    return activeWallet.unlockWithPassword(dialogResult.input1).then(function(wallet) {
                        $ionicLoading.hide();

                        var secret = wallet.secret.toString('hex');

                        return {secret: secret};
                    });
                })
                .then(function(unlockData) {
                    //prompt for a new PIN
                    return $scope.promptNewPin().then(function(newPIN) {
                        return $scope.updatePin(newPIN, unlockData);
                    });
                })
                .catch(function(err) {
                    $log.error('PIN change error: ' + err);

                    $ionicLoading.hide();

                    if (err instanceof blocktrail.WalletDecryptError) {
                        //incorrect PIN...try again Mr. user
                        $cordovaDialogs.alert($translate.instant('MSG_TRY_AGAIN'), $translate.instant('MSG_INCORRECT_PASSWORD'), $translate.instant('OK')).then(function() {
                            $scope.forgotPin();
                        });
                    } else if (err === 'CANCELLED') {
                        return false;
                    } else {
                        $cordovaDialogs.alert(err.toString(), $translate.instant('FAILED'), $translate.instant('OK'))
                    }
                });
        };

        /**
         * initiate change of pin
         */
        $scope.changePin = function() {
            return $cordovaDialogs.prompt(
                $translate.instant('MSG_ENTER_PIN'),
                $translate.instant('SETTINGS_CHANGE_PIN'),
                [$translate.instant('OK'), $translate.instant('CANCEL')],
                "",
                true,   //isPassword
                "tel"   //input type (uses html5 style)
            )
                .then(function(dialogResult) {
                    if (dialogResult.buttonIndex == 2) {
                        return $q.reject('CANCELLED');
                    }
                    //decrypt password with the provided PIN
                    $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});

                    return activeWallet.unlockDataWithPin(dialogResult.input1).then(function(unlockData) {
                        $ionicLoading.hide();

                        return unlockData;
                    });
                })
                .then(function(unlockData) {
                    //prompt for a new PIN
                    return $scope.promptNewPin().then(function(newPIN) {
                        return $scope.updatePin(newPIN, unlockData);
                    });
                })
                .catch(function(err) {
                    $log.error('PIN change error: ' + err);

                    $ionicLoading.hide();

                    if (err instanceof blocktrail.WalletPinError) {
                        //incorrect PIN...try again Mr. user
                        $cordovaDialogs.alert($translate.instant('MSG_TRY_AGAIN'), $translate.instant('MSG_BAD_PIN'), $translate.instant('OK')).then(function() {
                            $scope.changePin();
                        });
                    } else if (err === 'CANCELLED') {
                        return false;
                    } else {
                        $cordovaDialogs.alert(err.toString(), $translate.instant('FAILED'), $translate.instant('OK'))
                    }
                });
        };

        $scope.updatePin = function(newPIN, unlockData) {
            return $q.when(true)
                .then(function() {
                    console.log(unlockData);
                    console.log(newPIN);

                    var encryptedSecret = CryptoJS.AES.encrypt(unlockData.secret, newPIN).toString();

                    // TODO Check this part
                    // return launchService.storeWalletInfo($scope.defaultWallet, encryptedPassword, encryptedSecret);
                    return launchService.setWalletInfo({
                        identifier: $scope.defaultWallet,
                        networkType: "", // TODO add network type
                        encryptedSecret: encryptedSecret
                    });
                })
                .then(function() {
                    // success
                    return $cordovaDialogs.alert($translate.instant('MSG_PIN_CHANGED'), $translate.instant('SUCCESS'), $translate.instant('OK'));
                });
        };

        $scope.apprate = function() {
            AppRateService.popover();
        };

        /**
         * prompts for new pin and repeat, and then sets the new pin for the wallet
         * @returns {*}
         */
        $scope.promptNewPin = function() {
            //prompt for new PIN and save
            var newPIN = null;
            var repeatPIN = null;
            //prompt for new PIN
            return $cordovaDialogs.prompt(
                $translate.instant('MSG_ENTER_NEW_PIN'),
                $translate.instant('SETTINGS_NEW_PIN'),
                [$translate.instant('OK'), $translate.instant('CANCEL')],
                "",
                true,   //isPassword
                "tel"   //input type (uses html5 style)
            )
                .then(function(dialogResult) {
                    if (dialogResult.buttonIndex == 2) {
                        return $q.reject('CANCELLED');
                    }

                    newPIN = dialogResult.input1.trim();
                    //prompt for repeat of new PIN
                    return $cordovaDialogs.prompt(
                        $translate.instant('MSG_REPEAT_PIN'),
                        $translate.instant('SETTINGS_REPEAT_PIN'),
                        [$translate.instant('OK'), $translate.instant('CANCEL')],
                        "",
                        true,   //isPassword
                        "tel"   //input type (uses html5 style)
                    );
                })
                .then(function(dialogResult) {
                    if (dialogResult.buttonIndex == 2) {
                        return $q.reject('CANCELLED');
                    }

                    repeatPIN = dialogResult.input1.trim();
                    //check PINs match and are valid
                    if (newPIN !== repeatPIN) {
                        //no match, try again Mr. user
                        return $cordovaDialogs.alert($translate.instant('MSG_BAD_PIN_REPEAT'), $translate.instant('MSG_TRY_AGAIN'), $translate.instant('OK'))
                            .then(function() {
                                return $scope.promptNewPin();
                            });
                    } else if (newPIN.length < 4) {
                        //PIN must be at least 4 chrs, try again Mr. user
                        return $cordovaDialogs.alert($translate.instant('MSG_BAD_PIN_LENGTH'), $translate.instant('MSG_TRY_AGAIN'), $translate.instant('OK'))
                            .then(function() {
                                return $scope.promptNewPin();
                            });

                    } else {
                        return newPIN;
                    }
                })
                ;
        };

        $scope.enableContacts = function() {
            if (!settingsService.phoneVerified) {
                $cordovaDialogs.alert($translate.instant('MSG_PHONE_REQUIRE_VERIFY'), $translate.instant('SETTINGS_PHONE_REQUIRE_VERIFY'), $translate.instant('OK'))
                    .then(function() {
                        $state.go('.phone');
                    });
                return false;
            }

            //confirm with user first
            $cordovaDialogs.confirm(
                $translate.instant('MSG_ENABLE_CONTACTS').sentenceCase(),
                $translate.instant('SETTINGS_ENABLE_CONTACTS').sentenceCase(),
                [$translate.instant('OK').sentenceCase(), $translate.instant('CANCEL').sentenceCase()]
            )
                .then(function(dialogResult) {
                    if (dialogResult == 2) {
                        return $q.reject('CANCELLED');
                    }

                    //update settings
                    settingsService.enableContacts = true;
                    settingsService.contactsWebSync = true;
                    return settingsService.$store()
                })
                .then(function() {
                    //force a complete contacts sync
                    $scope.syncContacts(true);
                })
                .catch(function(error) {
                    settingsService.enableContacts = false;
                    settingsService.contactsWebSync = false;
                    settingsService.$store();

                    if (error !== 'CANCELLED') {
                        $cordovaDialogs.alert(error.toString(), $translate.instant('FAILED').sentenceCase(), $translate.instant('OK'));
                    }
                });
        };

        $scope.disableContacts = function() {
            //confirm with user first
            $cordovaDialogs.confirm(
                $translate.instant('MSG_DISABLE_CONTACTS').sentenceCase(),
                $translate.instant('MSG_ARE_YOU_SURE').sentenceCase(),
                [$translate.instant('OK').sentenceCase(), $translate.instant('CANCEL').sentenceCase()]
            )
                .then(function(dialogResult) {
                    if (dialogResult == 2) {
                        return $q.reject('CANCELLED');
                    }

                    $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});
                    return $q.when(sdkService.getGenericSdk());
                })
                .then(function(sdk) {
                    //delete contacts from server
                    return sdk.deleteContacts();
                })
                .then(function() {
                    //delete cache from local storage
                    return Contacts.clearCache();
                })
                .then(function(result) {
                    //disable
                    settingsService.enableContacts = false;
                    settingsService.contactsWebSync = false;
                    settingsService.contactsLastSync = null;
                    settingsService.$store();

                    $ionicLoading.hide();
                })
                .catch(function(error) {
                    if (error !== 'CANCELLED') {
                        $cordovaDialogs.alert(error.toString(), $translate.instant('FAILED').sentenceCase(), $translate.instant('OK'));
                    }

                    $ionicLoading.hide();
                });
        };

        /**
         * synchronise contacts with the Blocktrail service
         * @returns {boolean}
         */
        $scope.syncContacts = function(forceAll) {
            if ($scope.appControl.syncing) {
                return false;
            }

            $scope.appControl.syncing = true;
            $scope.appControl.syncingAll = !!forceAll;

            $q.when(Contacts.sync(!!forceAll))
                .then(function() {
                    //rebuild the cached contacts list
                    return Contacts.list(!!forceAll);
                })
                .then(function() {
                    settingsService.contactsLastSync = new Date().valueOf();
                    settingsService.permissionContacts = true;
                    return settingsService.$store();
                })
                .then(function() {
                    $scope.appControl.syncing = false;
                    $scope.appControl.syncComplete = true;

                    $timeout(function() {
                        $scope.appControl.syncComplete = false;
                    }, 5000);
                })
                .catch(function(err) {
                    $log.error(err);
                    //check if permission related error happened and update settings accordingly
                    if (err instanceof blocktrail.ContactsPermissionError) {
                        settingsService.enableContacts = false;
                        settingsService.contactsWebSync = false;
                        settingsService.permissionContacts = false;
                        settingsService.$store();
                        $cordovaDialogs.alert(
                            $translate.instant('MSG_CONTACTS_PERMISSIONS'),
                            $translate.instant('PERMISSION_REQUIRED_CONTACTS'),
                            $translate.instant('OK')
                        );
                    }
                    $scope.appControl.syncing = false;
                    $scope.appControl.syncComplete = false;
                });
        };

        /**
         * if user has skipped wallet backup in setup, let them confirm their PIN and then navigate to backup state
         */
        $scope.walletBackup = function() {
            if (!settingsService.backupSaved) {
                //confirm PIN...
                return $cordovaDialogs.prompt(
                    $translate.instant('MSG_ENTER_PIN'),
                    $translate.instant('WALLET_PIN'),
                    [$translate.instant('OK'), $translate.instant('CANCEL')],
                    "",
                    true,   //isPassword
                    "tel"   //input type (uses html5 style)
                )
                    .then(function(dialogResult) {
                        if (dialogResult.buttonIndex == 2) {
                            return $q.reject('CANCELLED');
                        }
                        // decrypt password with the provided PIN
                        $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});

                        return activeWallet.unlockDataWithPin(dialogResult.input1).then(function() {
                            $ionicLoading.hide();
                            return true;
                        });
                    })
                    .then(function() {
                        //password correct, go to backup state
                        $state.go(".backup");
                    })
                    .catch(function(err) {
                        $log.error('Wallet reset error: ' + err);
                        $ionicLoading.hide();
                        if (err instanceof blocktrail.WalletPinError) {
                            //incorrect PIN...try again Mr. user
                            $cordovaDialogs.alert($translate.instant('MSG_TRY_AGAIN'), $translate.instant('MSG_BAD_PIN'), $translate.instant('OK'))
                                .then(function() {
                                    $scope.walletBackup();
                                });
                        } else if (err === 'CANCELLED') {
                            return false;
                        } else {
                            $cordovaDialogs.alert(err.toString(), $translate.instant('FAILED').sentenceCase(), $translate.instant('OK'));
                        }
                    });
            } else { // If backup has not been saved
                settingsService.$isLoaded().then(function() {

                    var dialogMessage = 'MSG_BACKUP_SAVED_ALREADY';

                    var backupSettings = {
                        path: window.cordova ? (ionic.Platform.isAndroid() ? cordova.file.externalDataDirectory : cordova.file.documentsDirectory) : null,
                        filename: 'btc-wallet-backup-' + $scope.defaultWallet + '.pdf'
                    };

                    // Check if backup.pdf is still on the phone, notify accordingly
                    $cordovaFile.checkFile(backupSettings.path, backupSettings.filename).then(function (success) {
                        if (ionic.Platform.isIOS()) {
                            dialogMessage = 'MSG_BACKUP_SAVED_PERSISTENT_IOS';
                        } else {
                            dialogMessage = 'MSG_BACKUP_SAVED_PERSISTENT_ANDROID';
                        }

                        return Promise.resolve();
                    }).catch(function() {
                        $log.log("checking for backup PDF failed");
                    }).then(function () {
                        return $cordovaDialogs.alert(
                            $translate.instant(dialogMessage).sentenceCase(),
                            $translate.instant('SETTINGS_BACKUP_COMPLETE').sentenceCase(),
                            $translate.instant('OK')
                        )
                    }).then(function() {
                        $btBackButtonDelegate.goBack();
                        return false;
                    });
                });
            }
        };

        /**
         * delete all local data and start again from scratch. Requires PIN to do
         */
        $scope.resetWallet = function() {
            //ask the user to finally confirm their action
            return $cordovaDialogs.confirm(
                $translate.instant('MSG_RESET_WALLET'),
                $translate.instant('MSG_ARE_YOU_SURE'),
                [$translate.instant('OK'), $translate.instant('CANCEL')]
            )
                .then(function(dialogResult) {
                    if (dialogResult == 1) {
                        //if the backup hasn't been saved yet, warn user
                        if (!settingsService.backupSaved) {
                            return $cordovaDialogs.confirm(
                                $translate.instant('MSG_BACKUP_UNSAVED'),
                                $translate.instant('MSG_ARE_YOU_SURE'),
                                [$translate.instant('OK'), $translate.instant('CANCEL')]
                            );
                        } else {
                            return dialogResult;
                        }
                    } else {
                        return $q.reject('CANCELLED');
                    }
                })
                .then(function(dialogResult) {
                    if (dialogResult == 1) {
                        //destroy EVERYTHING!!!!
                        $log.debug('Resetting wallet');
                        $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});
                        storageService.resetAll()
                            .then(function() {
                                window.location.replace('');
                            });
                    } else {
                        return $q.reject('CANCELLED');
                    }
                })
                .catch(function(err) {
                    $log.error('Wallet reset error: ' + err);
                    $ionicLoading.hide();
                    if (err instanceof blocktrail.WalletPinError) {
                        //incorrect PIN...try again Mr. user
                        $cordovaDialogs.alert($translate.instant('MSG_TRY_AGAIN'), $translate.instant('MSG_BAD_PIN'), $translate.instant('OK')).then(function() {
                            $scope.resetWallet();
                        });
                    } else if (err === 'CANCELLED') {
                        return false;
                    } else {
                        $cordovaDialogs.alert(err.toString(), $translate.instant('FAILED'), $translate.instant('OK'))
                    }
                });
        };

        /**
         * enable/disable sending anonymous usage data
         */
        $scope.updateSettingsPrivacy = function() {
            $scope.updateSettings();

            if (!settingsService.permissionUsageData) {
                $analytics.eventTrack('DisableUsageData', {category: 'Events'});
            }
        };

        /**
         * enable/disable PIN on wallet open
         */
        // TODO SWITCH to localSettingsService
        $scope.updateSettingsPinOnOpen = function() {
            // $scope.updateSettings();
        };

        var tapEnableDevCnt = 0;
        $scope.tapEnableDev = function() {
            if (tapEnableDevCnt++ > 5) {
                $scope.enableDev();
            }
        };

        $scope.enableDev = function() {
            $cordovaToast.showShortCenter("DEV MODE");
            $rootScope.devEnabled = true;
            $state.reload();
        };

        $scope.updateSettings = function() {
            settingsService.$store();
        };

        $scope.resetApp = function($event) {
            storageService.resetAll().then(
                function() {
                    alert('reset!');
                    window.location.replace('');
                }
            );
        };
    }

})();
