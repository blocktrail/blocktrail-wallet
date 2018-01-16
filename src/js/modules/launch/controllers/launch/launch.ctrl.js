(function() {
    "use strict";

    angular.module("blocktrail.launch")
        .controller("LaunchCtrl", LaunchCtrl);

    function LaunchCtrl($window, $filter, $q, $rootScope, $state, $log, $ionicHistory, $ionicSideMenuDelegate, launchService, CONFIG, storageService, localSettingsService) {
        var storageVersionDB = storageService.db('_storage-version');

        // disable animation on transition from this state
        $ionicHistory.nextViewOptions({
            disableAnimate: true
        });

        checkStorageVersion()
            .then(function(continueLoading) {
                if (continueLoading) {
                    gotoNextState();
                }
            });

        /**
         * Check the storage version
         * @returns Promise<bool> true -> when we can continue loading
         */
        function checkStorageVersion() {
            var STORAGE_VERSION_DOC = "STORAGE_VERSION";

            return storageVersionDB.get(STORAGE_VERSION_DOC)
                .then(function(doc) {
                    console.log('checkStorageVersion storage=' + doc.STORAGE_VERSION + ' config=' + CONFIG.STORAGE_VERSION);

                    // if versions aren't the same action is required
                    if (doc.STORAGE_VERSION !== CONFIG.STORAGE_VERSION) {
                        // migration v2 to v3 storage instead of flushing it
                        if (doc.STORAGE_VERSION === "v2" && CONFIG.STORAGE_VERSION === "v3") {
                            return upgradeStorageV2toV3()
                                .then(function(continueLoading) {
                                    doc.STORAGE_VERSION = CONFIG.STORAGE_VERSION;
                                    if (continueLoading) {
                                        return updateStorageVersionDoc(doc)
                                            .then(function() {
                                                return true;
                                            });
                                    } else {
                                        return updateStorageVersionDocAndReset(doc);
                                    }
                                });
                        }

                        doc.STORAGE_VERSION = CONFIG.STORAGE_VERSION;
                        return updateStorageVersionDocAndReset(doc);
                    } else {
                        // continue loading normally
                        return true;
                    }
                }, function() {
                    // if there's no storage version doc yet it means either this is a brand new install or upgrade v1 -> v2
                    // check if there's a V1 account_info document in the launch DB
                    var oldLaunchStorage = storageService.db('launch');
                    return oldLaunchStorage.get('account_info')
                        .then(function() {
                            // if there's a doc then we want to reset
                            return updateStorageVersionDocAndReset({_id: STORAGE_VERSION_DOC, STORAGE_VERSION: CONFIG.STORAGE_VERSION});
                        }, function() {
                            // if there's no doc then we can just continue
                            return updateStorageVersionDoc({_id: STORAGE_VERSION_DOC, STORAGE_VERSION: CONFIG.STORAGE_VERSION})
                                .then(function() {
                                    return true;
                                });
                        });
                });
        }

        function updateStorageVersionDocAndReset(doc) {
            return updateStorageVersionDoc(doc)
                .catch(function(e) {
                    console.log('ERR', e.message || e, e);
                })
                .then(function() {
                    $state.go('app.reset');
                });
        }

        function updateStorageVersionDoc(doc) {
            return storageVersionDB.put(doc);
        }

        function supressMissingErr(e) {
            if (e.message === "missing") {
                //
            } else {
                throw e;
            }
        }

        function upgradeStorageV2toV3() {
            console.log('upgradeStorageV2toV3');
            var hasBackupData = false;

            return $q.all([
                // currency-rates-cache is just a cache, we delete it and it will get filled again
                storageService.deleteDB('currency-rates-cache'),
                // apprate we don't mind if it pops up again, easier to just delete
                storageService.deleteDB('apprate'),
                // legacy db, wasn't being used anymore anyway
                storageService.deleteDB('wallet_info')
            ])
                .then(function() {
                    console.log('upgradeStorageV2toV3 LAUNCH');
                    var oldLaunchStorage = storageService.db('launch');
                    var oldSettings = storageService.db('settings');

                    return $q.all([
                        oldLaunchStorage.get('wallet_backup')
                            .then(function(walletBackup) {
                                hasBackupData = !!walletBackup.identifier;

                                if (!walletBackup.identifier) {
                                    return;
                                }
                                
                                return launchService.setWalletBackup({
                                    identifier: walletBackup.identifier,
                                    walletVersion: walletBackup.walletVersion,
                                    encryptedPrimarySeed: walletBackup.encryptedPrimarySeed,
                                    backupSeed: walletBackup.backupSeed,
                                    encryptedSecret: walletBackup.encryptedSecret,
                                    recoveryEncryptedSecret: walletBackup.recoveryEncryptedSecret,
                                    blocktrailPublicKeys: walletBackup.blocktrailPublicKeys,
                                    supportSecret: walletBackup.supportSecret
                                });
                            }, supressMissingErr),
                        oldLaunchStorage.get('account_info')
                            .then(function(accountInfo) {
                                if (!accountInfo.api_key) {
                                    return;
                                }

                                return launchService.setAccountInfo({
                                    username: accountInfo.username,
                                    email: accountInfo.email,
                                    apiKey: accountInfo.api_key,
                                    apiSecret: accountInfo.api_secret,
                                    isTestNetwork: accountInfo.testnet,
                                    secret: accountInfo.secret,
                                    encryptedSecret: accountInfo.encrypted_secret,
                                    newSecret: accountInfo.new_secret
                                });
                            }, supressMissingErr),
                        oldLaunchStorage.get('wallet_info')
                            .then(function(walletInfo) {
                                if (!walletInfo.identifier) {
                                    return;
                                }

                                return launchService.setWalletInfo({
                                    identifier: walletInfo.identifier,
                                    networkType: walletInfo.networkType,
                                    encryptedSecret: walletInfo.encryptedSecret,
                                    encryptedPassword: walletInfo.encryptedPassword
                                });
                            }, supressMissingErr),
                        oldSettings.get('user_settings')
                            .then(function(settingsDoc) {
                                var country = null;

                                if(settingsDoc.phoneRegionCode) {
                                    var filteredCountry = $filter("filter")($window.allCountries, function(item) {
                                        return item.dialCode == settingsDoc.phoneRegionCode;
                                    })[0];

                                    if (filteredCountry) {
                                        country = filteredCountry.iso2;
                                    }
                                }

                                return localSettingsService.setLocalSettings({
                                    // Phone
                                    isPhoneVerified: settingsDoc.phoneVerified || false,
                                    phoneNumber: settingsDoc.phoneNationalNumber || null,
                                    phoneCountry: country,
                                    phoneCountryCode: settingsDoc.phoneRegionCode || null,
                                    phoneHash: settingsDoc.phoneVerified ? null : settingsDoc.phoneHash,
                                    // Contacts
                                    isEnableContacts: settingsDoc.enableContacts || false,
                                    isPermissionContacts: settingsDoc.permissionContacts || false,
                                    isContactsWebSync: settingsDoc.contactsWebSync || false,
                                    contactsLastSync: settingsDoc.contactsLastSync || null,
                                    // BTC precision
                                    btcPrecision: settingsDoc.btcPrecision || 4,
                                    // Pin
                                    isPinOnOpen: settingsDoc.pinOnOpen || false,
                                    pinFailureCount: settingsDoc.pinFailureCount || 0,
                                    pinLastFailure: settingsDoc.pinLastFailure || null,
                                    // App rate
                                    appRateStatus: settingsDoc.apprateStatus || null
                                })
                                    .then(function() {
                                        // We use the same DB name, that is why we have to clear settings
                                        oldSettings.remove(settingsDoc);
                                    })
                            }, supressMissingErr)
                    ])
                        .then(function() {
                            // delete the old storage
                            return storageService.deleteDB('launch')
                                .catch(supressMissingErr);
                        })

                })
                .then(function() {
                    return true;
                }, function(e) {
                    console.log('ERR', e.message || e, e);

                    if (hasBackupData) {
                        // @TODO: now what!?
                    } else {
                        return false;
                    }
                })
        }

        /**
         * Go to a next step
         * @return { promise }
         */
        function gotoNextState() {
            $log.debug("M:LAUNCH:LaunchCtrl:gotoNextState");

            return $q.all([
                launchService.getAccountInfo(),
                launchService.getWalletInfo()
            ])
                .then(function(data) {
                    var accountInfo = data[0];
                    var walletInfo = data[1];

                    var isLoggedIn = !!(accountInfo.apiKey && accountInfo.apiSecret);
                    var walletCreated = !!walletInfo.identifier;

                    navigator.splashscreen.hide();

                    // Order for setup process
                    // login -> init wallet & set PIN -> save backup -> phone verification -> contacts synchronization -> profile picture

                    // default step is reset, shouldn't happen unless something goes wrong terribly
                    var nextStep = "app.reset";

                    // when not logged in or when wallet is not created yet, we go back to start
                    // because the password is required to init/create wallet and we wouldn't have that if you're logged in already from a previous session
                    if(isLoggedIn && walletCreated) {
                        // TODO Discuss with Ruben
                        // TODO Review this part after the waller sent/receive controllers
                        if($rootScope.handleOpenURL) {
                            $log.log("launching app with uri: " + $rootScope.handleOpenURL);
                            $log.log("bitcoin? " + $rootScope.handleOpenURL.startsWith("bitcoin"));
                            $log.log("bitcoincash? " + ($rootScope.handleOpenURL.startsWith("bitcoincash") || $rootScope.handleOpenURL.startsWith("bitcoin cash")));
                            $log.log("glidera? " + $rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback"));
                            $log.log("simplex? " + $rootScope.handleOpenURL.startsWith("btccomwallet://simplexCallback"));

                            if($rootScope.handleOpenURL.startsWith("bitcoin") ||
                                $rootScope.handleOpenURL.startsWith("bitcoincash") ||
                                $rootScope.handleOpenURL.startsWith("bitcoin cash")) {
                                    $rootScope.bitcoinuri = $rootScope.handleOpenURL;
                                    nextStep = "app.wallet.send";
                                    $ionicSideMenuDelegate.toggleLeft(false);
                            } else if ($rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback/oauth2")) {
                                $rootScope.glideraCallback = $rootScope.handleOpenURL;
                                nextStep = "app.wallet.buybtc.glidera_oauth2_callback";
                                $ionicSideMenuDelegate.toggleLeft(false);
                            } else if ($rootScope.handleOpenURL.startsWith("btccomwallet://glideraCallback/return")) {
                                nextStep = "app.wallet.buybtc.choose";
                                $ionicSideMenuDelegate.toggleLeft(false);
                            } else if ($rootScope.handleOpenURL.startsWith("btccomwallet://simplexCallback")) {
                                // TODO: "Please wait for payment to confirm" - popup?
                                nextStep = 'app.wallet.summary';
                            } else {
                                nextStep = "app.wallet.summary";
                            }
                         } else {
                            nextStep = "app.wallet.summary";
                         }
                    } else {
                        nextStep = "app.setup.start";
                    }

                    $state.go(nextStep);
                });
        }
    }

})();
