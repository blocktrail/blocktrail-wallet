angular.module('blocktrail.wallet')
    .controller('SettingsCtrl', function($scope, $rootScope, $q, sdkService, launchService, settingsService,
                                         Wallet, Contacts, storageService, $cordovaDialogs, $ionicLoading,
                                         $translate, $timeout, $state, $log, $ionicAnalytics, CONFIG) {
        $scope.appControl = {
            syncing: false,
            syncingAll: false,
            syncComplete: false
        };
        $scope.$on('$ionicView.enter', function() {
            //reset app state control
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
            //$scope.settings = data[0];
            $scope.defaultWallet = data[0].identifier;
            return data;
        });
        $scope.translations = null;

        $scope.getTranslations = function() {
            if ($scope.translations) {
                return $q.when($scope.translations);
            } else {
                var requiredTranslations = [
                    'OK',
                    'CANCEL',
                    'SUCCESS',
                    'FAILED',
                    'WORKING',
                    'WALLET_PIN',
                    'SETTINGS_CHANGE_PIN',
                    'SETTINGS_NEW_PIN',
                    'SETTINGS_REPEAT_PIN',
                    'SETTINGS_PHONE_REQUIRE_VERIFY',
                    'MSG_ENTER_PIN',
                    'MSG_ENTER_NEW_PIN',
                    'MSG_REPEAT_PIN',
                    'MSG_BAD_PIN',
                    'MSG_BAD_PIN_REPEAT',
                    'MSG_BAD_PIN_LENGTH',
                    'MSG_TRY_AGAIN',
                    'MSG_PIN_CHANGED',
                    'MSG_RESET_WALLET',
                    'MSG_BACKUP_UNSAVED',
                    'MSG_ARE_YOU_SURE',
                    'MSG_PHONE_REQUIRE_VERIFY',
                    'PERMISSION_REQUIRED_CONTACTS',
                    'MSG_CONTACTS_PERMISSIONS'
                ];
                return $translate(requiredTranslations).then(function(translations) {
                    $scope.translations = translations;
                    return $q.when(translations);
                });
            }
        };

        /**
         * initiate change of pin
         */
        $scope.changePin = function() {
            $scope.getTranslations()
                .then(function() {
                    return $cordovaDialogs.prompt(
                        $scope.translations['MSG_ENTER_PIN'].sentenceCase(),
                        $scope.translations['SETTINGS_CHANGE_PIN'].capitalize(),
                        [$scope.translations['OK'], $scope.translations['CANCEL'].sentenceCase()],
                        "",
                        true,   //isPassword
                        "tel"   //input type (uses html5 style)
                    );
                })
                .then(function(dialogResult) {
                    if (dialogResult.buttonIndex == 2) {
                        return $q.reject('CANCELLED');
                    }
                    //decrypt password with the provided PIN
                    $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});

                    return Wallet.unlockData(dialogResult.input1).then(function(unlockData) {
                        $ionicLoading.hide();

                        return unlockData;
                    });
                })
                .then(function(unlockData) {
                    //prompt for a new PIN
                    return $scope.promptNewPin().then(function(newPIN) {
                        return {newPIN: newPIN, unlockData: unlockData};
                    });
                })
                .then(function(result) {
                    var encryptedPassword = null, encryptedSecret = null;

                    // still gotta support legacy wallet where we encrypted the password isntead of secret
                    if (result.unlockData.secret) {
                        encryptedSecret = CryptoJS.AES.encrypt(result.unlockData.secret, result.newPIN).toString();
                    } else {
                        encryptedPassword = CryptoJS.AES.encrypt(result.unlockData.password, result.newPIN).toString();
                    }

                    return launchService.storeWalletInfo($scope.defaultWallet, encryptedPassword, encryptedSecret);
                })
                .then(function(result) {
                    //success
                    return $cordovaDialogs.alert($scope.translations['MSG_PIN_CHANGED'].sentenceCase(), $scope.translations['SUCCESS'].capitalize(), $scope.translations['OK']);
                })
                .catch(function(err) {
                    $log.error('PIN change error: ' + err);

                    if (err instanceof blocktrail.WalletPinError) {
                        //incorrect PIN...try again Mr. user
                        $cordovaDialogs.alert($scope.translations['MSG_TRY_AGAIN'].sentenceCase(), $scope.translations['MSG_BAD_PIN'].capitalize(), $scope.translations['OK']).then(function() {
                            $scope.changePin();
                        });
                    } else if (err === 'CANCELLED') {
                        return false;
                    } else {
                        $cordovaDialogs.alert(err.toString(), $scope.translations['FAILED'].capitalize(), $scope.translations['OK'])
                    }
                });
        };

        /**
         * prompts for new pin and repeat, and then sets the new pin for the wallet
         * @returns {*}
         */
        $scope.promptNewPin = function() {
            //prompt for new PIN and save
            var newPIN = null;
            var repeatPIN = null;
            return $scope.getTranslations()
                .then(function(translations) {
                    //prompt for new PIN
                    return $cordovaDialogs.prompt(
                        $scope.translations['MSG_ENTER_NEW_PIN'].sentenceCase(),
                        $scope.translations['SETTINGS_NEW_PIN'].capitalize(),
                        [$scope.translations['OK'], $scope.translations['CANCEL'].sentenceCase()],
                        "",
                        true,   //isPassword
                        "tel"   //input type (uses html5 style)
                    );
                })
                .then(function(dialogResult) {
                    if (dialogResult.buttonIndex == 2) {
                        return $q.reject('CANCELLED');
                    }

                    newPIN = dialogResult.input1.trim();
                    //prompt for repeat of new PIN
                    return $cordovaDialogs.prompt(
                        $scope.translations['MSG_REPEAT_PIN'].sentenceCase(),
                        $scope.translations['SETTINGS_REPEAT_PIN'].capitalize(),
                        [$scope.translations['OK'], $scope.translations['CANCEL'].sentenceCase()],
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
                        return $cordovaDialogs.alert($scope.translations['MSG_BAD_PIN_REPEAT'].sentenceCase(), $scope.translations['MSG_TRY_AGAIN'].capitalize(), $scope.translations['OK'])
                            .then(function() {
                                return $scope.promptNewPin();
                            });
                    } else if (newPIN.length < 4) {
                        //PIN must be at least 4 chrs, try again Mr. user
                        return $cordovaDialogs.alert($scope.translations['MSG_BAD_PIN_LENGTH'].sentenceCase(), $scope.translations['MSG_TRY_AGAIN'].capitalize(), $scope.translations['OK'])
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
                $scope.getTranslations()
                    .then(function() {
                        return $cordovaDialogs.alert($scope.translations['MSG_PHONE_REQUIRE_VERIFY'].sentenceCase(), $scope.translations['SETTINGS_PHONE_REQUIRE_VERIFY'].capitalize(), $scope.translations['OK']);
                    })
                    .then(function() {
                        $state.go('.phone');
                    });
                return false;
            }

            //confirm with user first
            $cordovaDialogs.confirm(
                $translate.instant('MSG_ENABLE_CONTACTS').sentenceCase(),
                $translate.instant('SETTINGS_ENABLE_CONTACTS').capitalize(),
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
                        $cordovaDialogs.alert(error.toString(), $translate.instant('FAILED').capitalize(), $translate.instant('OK'));
                    }
                });
        };

        $scope.disableContacts = function() {
            //confirm with user first
            $cordovaDialogs.confirm(
                $translate.instant('MSG_DISABLE_CONTACTS').sentenceCase(),
                $translate.instant('MSG_ARE_YOU_SURE').capitalize(),
                [$translate.instant('OK').sentenceCase(), $translate.instant('CANCEL').sentenceCase()]
                )
                .then(function(dialogResult) {
                    if (dialogResult == 2) {
                        return $q.reject('CANCELLED');
                    }

                    $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});
                    return $q.when(sdkService.sdk());
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
                        $cordovaDialogs.alert(error.toString(), $translate.instant('FAILED').capitalize(), $translate.instant('OK'));
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
                        $scope.getTranslations()
                            .then(function() {
                                $cordovaDialogs.alert(
                                    $scope.translations['MSG_CONTACTS_PERMISSIONS'].sentenceCase(),
                                    $scope.translations['PERMISSION_REQUIRED_CONTACTS'].capitalize(),
                                    $scope.translations['OK']
                                );
                            });
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
                $scope.getTranslations()
                    .then(function() {
                        return $cordovaDialogs.prompt(
                            $scope.translations['MSG_ENTER_PIN'].sentenceCase(),
                            $scope.translations['WALLET_PIN'].capitalize(),
                            [$scope.translations['OK'], $scope.translations['CANCEL'].sentenceCase()],
                            "",
                            true,   //isPassword
                            "tel"   //input type (uses html5 style)
                        );
                    })
                    .then(function(dialogResult) {
                        if (dialogResult.buttonIndex == 2) {
                            return $q.reject('CANCELLED');
                        }
                        // decrypt password with the provided PIN
                        $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});

                        return Wallet.unlockData(dialogResult.input1).then(function() {
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
                            $cordovaDialogs.alert($scope.translations['MSG_TRY_AGAIN'].sentenceCase(), $scope.translations['MSG_BAD_PIN'].capitalize(), $scope.translations['OK']).then(function() {
                                $scope.walletBackup();
                            });
                        } else if (err === 'CANCELLED') {
                            return false;
                        } else {
                            $cordovaDialogs.alert(err.toString(), $scope.translations['FAILED'].capitalize(), $scope.translations['OK']);
                        }
                    });
            } else {
                $cordovaDialogs.alert(
                    $translate.instant('MSG_BACKUP_SAVED_ALREADY').sentenceCase(),
                    $translate.instant('SETTINGS_BACKUP_COMPLETE').capitalize(),
                    $translate.instant('OK')
                );
            }
        };

        /**
         * delete all local data and start again from scratch. Requires PIN to do
         */
        $scope.resetWallet = function() {
            $scope.getTranslations()
                .then(function() {
                    //ask the user to finally confirm their action
                    return $cordovaDialogs.confirm(
                        $scope.translations['MSG_RESET_WALLET'].sentenceCase(),
                        $scope.translations['MSG_ARE_YOU_SURE'].capitalize(),
                        [$scope.translations['OK'].sentenceCase(), $scope.translations['CANCEL'].sentenceCase()]
                    );
                })
                .then(function(dialogResult) {
                    if (dialogResult == 1) {
                        //if the backup hasn't been saved yet, warn user
                        if (!settingsService.backupSaved) {
                            return $cordovaDialogs.confirm(
                                $scope.translations['MSG_BACKUP_UNSAVED'].sentenceCase(),
                                $scope.translations['MSG_ARE_YOU_SURE'].capitalize(),
                                [$scope.translations['OK'].sentenceCase(), $scope.translations['CANCEL'].sentenceCase()]
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
                        $cordovaDialogs.alert($scope.translations['MSG_TRY_AGAIN'].sentenceCase(), $scope.translations['MSG_BAD_PIN'].capitalize(), $scope.translations['OK']).then(function() {
                            $scope.resetWallet();
                        });
                    } else if (err === 'CANCELLED') {
                        return false;
                    } else {
                        $cordovaDialogs.alert(err.toString(), $scope.translations['FAILED'].capitalize(), $scope.translations['OK'])
                    }
                });
        };

        /**
         * enable/disable sending anonymous usage data
         */
        $scope.updateSettingsPrivacy = function() {
            $scope.updateSettings();

            if (!settingsService.permissionUsageData) {
                $ionicAnalytics.track('DisableUsageData', {});
            }

            // can't completely unregister anymore, dryRun=true will suffice to prevent any futher tracking
            //  and on app restart it won't register anymore
            $ionicAnalytics.register({
                silent: !CONFIG.DEBUG,
                dryRun: !settingsService.permissionUsageData
            });
        };

        $scope.enableDev = function() {
            $scope.devEnabled = true;
            $scope.getTranslations().then(function() {
                $cordovaDialogs.alert("Developer mode enabled", $scope.translations['SUCCESS'].capitalize(), $scope.translations['OK']);
            });
        };

        $scope.updateSettings = function() {
            settingsService.$store();
        };

        $scope.toggleWalletPolling = function(enable) {
            if (enable) {
                Wallet.enablePolling();
            } else {
                Wallet.disablePolling();
            }
            $scope.updateSettings();
        };

        $scope.toggleTestnet = function(enable) {
            launchService.getAccountInfo()
                .then(function(accountInfo) {
                    accountInfo.testnet = enable;
                    return launchService.storeAccountInfo(accountInfo);
                })
                .then(function() {
                    $scope.updateSettings();
                })
                .then(function() {
                    //reset the wallet txs and balance, and resync
                    return $q.all([
                        Wallet.historyCache.destroy(),
                        Wallet.txCache.destroy(),
                        Wallet.walletCache.destroy()
                    ]);
                })
                .then(function() {
                    if (enable) {
                        return $cordovaDialogs.alert(
                            "Please ensure you have a testnet wallet created with the same identifier and password." +
                            "\nYou can do this through the developer dashboard at www.blocktrail.com" +
                            "\nYour testnet wallet will now load.",
                            "Testnet Mode Enabled",
                            "OK"
                        );
                    } else {
                        return $cordovaDialogs.alert("Your Mainnet wallet will now reload...", "Testnet Mode Disabled", "OK");
                    }
                })
                .then(function() {
                    //hard refresh to re-init the sdk and re-load data
                    window.location.replace('');
                })
                .catch(function(err) {
                    $log.error(err);
                    alert(err);
                });

        };

        $scope.resetApp = function($event) {
            storageService.resetAll().then(
                function() {
                    alert('reset!');
                    window.location.replace('');
                }
            );
        };

    })
    .controller('ProfileSettingsCtrl', function($scope, settingsService, $btBackButtonDelegate, $ionicActionSheet, $q, $translate, $cordovaImagePicker, $cordovaCamera, $timeout, $log) {
        $scope.translations = null;
        $scope.appControl = {
            showImageCrop: false
        };
        $scope.photoSelectOptions = {
            maximumImagesCount: 1,
            width: 800,
            height: 0,
            quality: 80
        };
        $scope.photoTakeOptions = {
            quality: 80,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: Camera.PictureSourceType.CAMERA,
            allowEdit: false,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 800,
            targetHeight: 800,
            popoverOptions: (typeof CameraPopoverOptions == "undefined") ? null : CameraPopoverOptions,
            saveToPhotoAlbum: true
        };
        $scope.newProfileImage = '';
        $scope.croppedProfileImage = '';

        $scope.getTranslations = function() {
            if ($scope.translations) {
                return $q.when($scope.translations);
            } else {
                var requiredTranslations = [
                    'CANCEL',
                    'SETTINGS_TAKE_PHOTO',
                    'SETTINGS_CHOOSE_PHOTO',
                    'SETTINGS_REMOVE_PHOTO',
                ];
                return $translate(requiredTranslations).then(function(translations) {
                    $scope.translations = translations;
                    return $q.when(translations);
                });
            }
        };

        $scope.showPhotoCrop = function() {
            $scope.appControl.showImageCrop = true;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                    $scope.dismissPhotoCrop();
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.dismissPhotoCrop();
                });
            }, true);
        };

        $scope.dismissPhotoCrop = function() {
            $scope.appControl.showImageCrop = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };

        $scope.updatePicture = function() {
            // Show the action sheet after resolving translations
            $scope.getTranslations().then(function(translations) {
                $ionicActionSheet.show({
                    buttons: [
                        { text: translations['SETTINGS_TAKE_PHOTO'].sentenceCase() },
                        { text: translations['SETTINGS_CHOOSE_PHOTO'].sentenceCase() }
                    ],
                    cancelText: translations['CANCEL'].sentenceCase(),
                    cancel: function() {},
                    buttonClicked: function(index) {
                        $scope.newProfileImage = '';
                        $scope.croppedProfileImage = '';

                        if (index == 0) {
                            //take photo
                            $cordovaCamera.getPicture($scope.photoTakeOptions).then(function(imageData) {
                                $scope.newProfileImage = "data:image/jpeg;base64," + imageData;
                                $scope.showPhotoCrop();
                            }, function(err) {
                                $log.error(err);
                            });
                        }
                        else if (index == 1) {
                            //select picture
                            $cordovaImagePicker.getPictures($scope.photoSelectOptions)
                                .then(function(results) {
                                    if (results[0]) {
                                        //convert image URL into data URL
                                        var img = new Image();
                                        img.crossOrigin = 'Anonymous';
                                        img.onload = function() {
                                            var canvas = document.createElement('CANVAS');
                                            var ctx = canvas.getContext('2d');
                                            canvas.height = this.height;
                                            canvas.width = this.width;
                                            ctx.drawImage(this, 0, 0);
                                            $timeout(function() {
                                                $scope.newProfileImage = canvas.toDataURL('image/jpeg');
                                                canvas = null;
                                            });
                                        };
                                        img.src = results[0];

                                        $scope.showPhotoCrop();
                                    }
                                }, function(err) {
                                    $log.error(err);
                                });
                        }
                        return true;
                    }
                });
            });
        };

        $scope.assignProfileImage = function(dataURL) {
            settingsService.profilePic = dataURL;
            settingsService.$store().then(function() {
                //try to update the server with the new profile
                settingsService.$syncProfileUp();
            });

            $scope.dismissPhotoCrop();
        };

        $scope.removePicture = function() {
            // Show the action sheet
            $scope.getTranslations().then(function(translations) {
                $ionicActionSheet.show({
                    destructiveText: translations['SETTINGS_REMOVE_PHOTO'].sentenceCase(),
                    cancelText: translations['CANCEL'].sentenceCase(),
                    cancel: function() {},
                    destructiveButtonClicked: function() {
                        settingsService.profilePic = null;
                        settingsService.$store().then(function() {
                            //try to update the server with the new profile
                            settingsService.$syncProfileUp();
                        });
                        return true;
                    }
                });
            });
        };

        $scope.updateSettings = function(){
            settingsService.$store();
        };
    })
    .controller('CurrencySettingsCtrl', function($scope, settingsService, $btBackButtonDelegate) {
        $scope.currencies = [
            {code: 'USD', symbol: '$'},
            {code: 'EUR', symbol: '€'},
            {code: 'GBP', symbol: '£'}
        ];
        $scope.form = {selected: ''};

        $scope.updateSettings = function(){
            settingsService.$store().then(function(){
                $btBackButtonDelegate.goBack();
            });
        };
    })
    .controller('LanguageSettingsCtrl', function($scope, $rootScope, settingsService, $btBackButtonDelegate, $translate) {
        $scope.languages = [
            {code: 'nl-NL', name: 'DUTCH'},
            {code: 'en-GB', name: 'ENGLISH'},
            {code: 'en-US', name: 'ENGLISH_US'},
            {code: 'fr-FR', name: 'FRENCH'},
            //{code: 'de-DE', name: 'GERMAN'}
        ];
        $scope.form = {selected: ''};

        $scope.updateSettings = function(){
            settingsService.$store().then(function(data) {
                $rootScope.changeLanguage(data.language);
                $btBackButtonDelegate.goBack();
            });
        };
    })
    .controller('PhoneSettingsCtrl', function($scope, $stateParams, settingsService, $btBackButtonDelegate, sdkService, $q, $log, $timeout, $filter, $cordovaGlobalization) {
        $scope.allCountries = allCountries;
        $scope.formInput = {
            newPhoneNumber: !settingsService.phoneVerified ? settingsService.phoneNationalNumber : null,
            selectedCountry: null,
            verifyToken: null
        };
        $scope.appControl = {
            working: false,
            showMessage: false,
            showCountrySelect: false,
            showPhoneInput: true
        };
        $scope.message = {
            title: "",
            title_class: "",
            body: "",
            body_class: ""
        };
        $scope.dismissAndGoBack = false;

        //hide the phone input if verification pending
        if (settingsService.phoneNumber && !settingsService.phoneVerified) {
            $scope.appControl.showPhoneInput = false;
        }

        //set the selected country
        if (settingsService.phoneRegionCode) {
            $scope.formInput.selectedCountry = $filter('filter')(allCountries, function(val, index) {
                return val.dialCode == settingsService.phoneRegionCode;
            })[0];
        } else {
            //try and determine the user's country (use SIM info on android, or guess from locale)
            $cordovaGlobalization.getLocaleName().then(
                function(result) {
                    var country = result.value.substr(-2, 2).toLowerCase();
                    $scope.formInput.selectedCountry = $filter('filter')(allCountries, function(val, index) {
                        return val.iso2 == country;
                    })[0];
                },
                function(error) { console.error(error);});
        }

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
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);

            if ($scope.dismissAndGoBack) {
                //go back to previous state
                $btBackButtonDelegate.goBack();
            }
        };

        $scope.showCountrySelect = function() {
            $scope.appControl.showCountrySelect = true;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                    $scope.dismissCountrySelect();
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.dismissCountrySelect();
                });
            }, true);
        };

        $scope.dismissCountrySelect = function() {
            $scope.appControl.showCountrySelect = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };

        $scope.updatePhone = function() {
            if ($scope.appControl.working || !$scope.formInput.newPhoneNumber) {
                return false;
            }

            //send new phone number to be normalised and validated
            $scope.message = {title: 'WORKING', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();
            $q.when(sdkService.sdk())
                .then(function(sdk) {
                    return sdk.updatePhone({phone_number: $scope.formInput.newPhoneNumber, 'country_code': $scope.formInput.selectedCountry.dialCode});
                })
                .then(function(result) {
                    //success, update settings with returned hash and normalised number
                    settingsService.phoneVerified = false;
                    settingsService.phoneHash = result.hash;
                    settingsService.phoneNumber = result.phone;
                    settingsService.phoneNationalNumber = result.phone_national;
                    settingsService.phoneRegionCode = result.country_code;
                    $scope.formInput.newPhoneNumber = null;//result.phone;
                    settingsService.$store();

                    $scope.message = {title: 'SUCCESS', title_class: 'text-good', body: ''};
                    $scope.appControl.working = false;
                    $scope.appControl.showPhoneInput = false;
                    $scope.dismissMessage();
                }, function(err) {
                    $log.error(err);
                    $scope.message = {title: 'ERROR_TITLE_3', title_class: 'text-bad', body: err};
                    $scope.showMessage();
                    $scope.appControl.working = false;
                });
        };

        $scope.removePhone = function() {
            if ($scope.appControl.working) {
                return false;
            }
            if (!settingsService.phoneNumber) {
                $scope.formInput.newPhoneNumber = null;
                return false;
            }

            $scope.message = {title: 'WORKING', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();
            $q.when(sdkService.sdk())
                .then(function(sdk) {
                    return sdk.removePhone();
                })
                .then(function(result) {
                    //success, update settings with returned hash and normalised number
                    settingsService.phoneVerified = false;
                    settingsService.phoneHash = null;
                    settingsService.phoneNumber = null;
                    //settingsService.phoneNationalNumber = result.phone_national;  //leave this phone number for display, so they can add it again
                    $scope.formInput.newPhoneNumber = null;
                    settingsService.$store();

                    $scope.message = {title: 'SUCCESS', title_class: 'text-good', body: ''};
                    $scope.appControl.working = false;
                    $timeout(function() {$scope.dismissMessage();}, 1000);
                }, function(err) {
                    $log.error(err);
                    $scope.message = {title: 'ERROR_TITLE_3', title_class: 'text-bad', body: err};
                    $scope.showMessage();
                    $scope.appControl.working = false;
                });
        };

        $scope.verifyPhone = function() {
            if ($scope.appControl.working || !$scope.formInput.verifyToken) {
                return false;
            }

            $scope.message = {title: 'VERIFYING', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();
            $q.when(sdkService.sdk())
                .then(function(sdk) {
                    return sdk.verifyPhone($scope.formInput.verifyToken);
                })
                .then(function(result) {
                    //success, update status locally
                    settingsService.phoneVerified = true;
                    $scope.formInput.verifyToken = null;
                    $scope.formInput.newPhoneNumber = null;

                    $scope.message = {title: 'SUCCESS', title_class: 'text-good', body: 'MSG_PHONE_VERIFIED'};
                    $scope.showMessage();
                    $scope.appControl.working = false;
                    $scope.dismissAndGoBack = true;
                    //push the provided state into the history if indicated in the url
                    if ($stateParams.goBackTo) {
                        $btBackButtonDelegate.addHistory($stateParams.goBackTo);
                    }

                    settingsService.$store().then(function() {
                        //$btBackButtonDelegate.goBack();
                    });
                }, function(err) {
                    $log.error(err);
                    $scope.message = {title: 'ERROR_TITLE_2', title_class: 'text-bad', body: 'MSG_BAD_TOKEN'};
                    $scope.showMessage();
                    $scope.appControl.working = false;
                });
        };
    })
    .controller('WalletSettingsCtrl', function($scope, settingsService, $btBackButtonDelegate, $cordovaVibration) {
        //...
        $cordovaVibration.vibrate(150);
    })
    .controller('SettingsWalletBackupCtrl', function($scope, backupInfo, $state, $q, $btBackButtonDelegate, $translate, $cordovaDialogs,
                                                  $ionicActionSheet, $log, $cordovaFileOpener2, $cordovaFile, sdkService, $cordovaEmailComposer,
                                                  launchService, settingsService, $timeout) {
        if (!backupInfo) {
            $cordovaDialogs.alert(
                $translate.instant('MSG_BACKUP_SAVED_ALREADY').sentenceCase(),
                $translate.instant('SETTINGS_BACKUP_COMPLETE').capitalize(),
                $translate.instant('OK')
            ).then(function() {
                $btBackButtonDelegate.goBack();
            });
            return false;
        }

        $scope.appControl = {
            working: false,
            saveButtonClicked: false,
            backupSaved: false
        };
        $scope.setupInfo = {
            identifier: backupInfo.identifier,
            password: "",
            primaryMnemonic: "",
            backupMnemonic: "",
            blocktrailPublicKeys: null
        };
        //$scope.setupInfo.identifier = backupInfo.identifier;
        $scope.setupInfo.backupInfo = {
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

        $scope.qrSettings = {
            correctionLevel: 7,
            SIZE: 150,
            inputMode: 'M',
            image: true
        };
        $scope.backupSettings = {
            //NB: on android fileOpener2 only works with SD storage (i.e. non-private storage)
            path: window.cordova ? (ionic.Platform.isAndroid() ? cordova.file.externalDataDirectory : cordova.file.dataDirectory) : null,
            filename: 'blocktrail-wallet-backup.pdf',
            replace: true
        };
        $scope.translations = null;

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
                                                    $translate.instant('SORRY').capitalize(), 
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
                        //end $timeout
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
                    $cordovaDialogs.alert($scope.translations['MSG_SAVE_BACKUP'].sentenceCase(), $scope.translations['SETUP_WALLET_BACKUP'].capitalize(), $scope.translations['OK'])
                });
            } else {
                //delete all temp backup info
                launchService.clearBackupInfo()
                    .then(function() {
                        settingsService.$isLoaded().then(function() {
                            settingsService.backupSaved = true;
                            settingsService.backupSkipped = false;
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
                        $btBackButtonDelegate.goBack();
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
                $translate.instant('MSG_ARE_YOU_SURE').capitalize(),
                [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
            )
                .then(function(dialogResult) {
                    if (dialogResult == 1) {
                        settingsService.$isLoaded().then(function() {
                            settingsService.backupSkipped = true;
                            settingsService.$store();
                        });

                        $btBackButtonDelegate.goBack();
                    } else {
                        //canceled
                    }
                });
        };
    })
    .controller('AboutSettingsCtrl', function($scope, settingsService, $btBackButtonDelegate, $cordovaAppRate) {
        $scope.rateApp = function() {
            $cordovaAppRate.navigateToAppStore()
                .then(function (result) {
                    // success
                });
        };
    });
