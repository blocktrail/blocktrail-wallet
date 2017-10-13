(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("WalletCtrl", WalletCtrl);

    function WalletCtrl($q, $log, $scope, $rootScope, $interval, storageService, sdkServiceIamOldKillMePLease, $translate,
                          Wallet, Contacts, CONFIG, settingsService, $timeout, $analytics, $cordovaVibration, Currencies,
                          $cordovaToast, trackingService, $http, $cordovaDialogs, blocktrailLocalisation, launchService,
                          $cordovaSocialSharing, AppVersionService, $state) {

        // wait 200ms timeout to allow view to render before hiding loadingscreen
        $timeout(function() {
            $rootScope.hideLoadingScreen = true;

            // allow for one more digest loop
            $timeout(function() {
                if (navigator.splashscreen) {
                    navigator.splashscreen.hide();
                }
            });
        }, 400);

        /*
         * check for extra languages to enable
         *  if one is preferred, prompt user to switch
         */
        $rootScope.PROMOCODE_IN_MENU = false;
        $rootScope.PRIOBOOST_ENABLED = false;
        launchService.getWalletConfig()
            .then(function(result) {
                // merge network specific config over the default config
                result = angular.extend({}, result, result.networks[$rootScope.NETWORK]);

                if (result.api_key && (result.api_key !== 'ok')) {
                    // alert user session is invalid
                    return $cordovaDialogs.alert(
                        $translate.instant('INVALID_SESSION_LOGOUT_NOW'),
                        $translate.instant('INVALID_SESSION'),
                        $translate.instant('OK'))
                        .finally(function() {
                            return $state.go('app.reset');
                        });
                }
                $rootScope.PROMOCODE_IN_MENU = $rootScope.PROMOCODE_SUPPORTED && (CONFIG.PROMOCODE_IN_MENU || result.promocodeInMenu);
                $rootScope.PRIOBOOST_ENABLED = $rootScope.PRIOBOOST_SUPPORTED && (CONFIG.PRIOBOOST || result.prioboost);

                settingsService.$isLoaded().then(function () {
                    AppVersionService.checkVersion(
                        settingsService.latestVersionMobile,
                        settingsService.latestOutdatedNoticeVersion,
                        result.versionInfo.mobile,
                        AppVersionService.CHECKS.LOGGEDIN
                    );

                    if (!settingsService.latestVersionMobile || semver.gt(CONFIG.VERSION, settingsService.latestVersionMobile) ||
                        !settingsService.latestOutdatedNoticeVersion ||
                        (result.versionInfo.mobile.latest && semver.gt(result.versionInfo.mobile.latest, settingsService.latestOutdatedNoticeVersion))) {
                        settingsService.latestOutdatedNoticeVersion = result.versionInfo.mobile.latest;
                        settingsService.latestVersionMobile = CONFIG.VERSION;
                        settingsService.$store().then(function () {
                            settingsService.$syncSettingsUp();
                        });
                    }
                });

                if (result.currencies) {
                    result.currencies.forEach(function (currency) {
                        Currencies.enableCurrency(currency);
                    });
                }

                return result.extraLanguages.concat(CONFIG.EXTRA_LANGUAGES).unique();
            })
            .then(function(extraLanguages) {
                return settingsService.$isLoaded().then(function() {
                    // determine (new) preferred language
                    var r = blocktrailLocalisation.parseExtraLanguages(extraLanguages);
                    if (r) {
                        var newLanguages = r[0];
                        var preferredLanguage = r[1];

                        // store extra languages
                        settingsService.extraLanguages = settingsService.extraLanguages.concat(newLanguages).unique();
                        return settingsService.$store()
                            .then(function () {
                                // check if we have a new preferred language
                                if (preferredLanguage != settingsService.language && newLanguages.indexOf(preferredLanguage) !== -1) {
                                    // prompt to enable
                                    return $cordovaDialogs.confirm(
                                        $translate.instant('MSG_BETTER_LANGUAGE', {
                                            oldLanguage: $translate.instant(blocktrailLocalisation.languageName(settingsService.language)),
                                            newLanguage: $translate.instant(blocktrailLocalisation.languageName(preferredLanguage))
                                        }).sentenceCase(),
                                        $translate.instant('MSG_BETTER_LANGUAGE_TITLE').sentenceCase(),
                                        [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
                                    )
                                        .then(function (dialogResult) {
                                            if (dialogResult == 2) {
                                                return;
                                            }

                                            // enable new language
                                            settingsService.language = preferredLanguage;
                                            $rootScope.changeLanguage(preferredLanguage);

                                            return settingsService.$store()
                                                .then(function() {
                                                    settingsService.$syncSettingsUp();
                                                });
                                        });
                                }
                            })
                            ;
                    }
                });
            })
            .then(function() {}, function(e) { console.error('extraLanguages', e && (e.msg || e.message || "" + e)); });

        if (!$rootScope.settings.enablePolling) {
            Wallet.disablePolling();
        }

        $rootScope.getPrice = function() {
            return Currencies.updatePrices(false)
                .then(function(prices) {
                    $rootScope.bitcoinPrices = prices;
                });
        };

        $rootScope.getBlockHeight = function() {
            //get a live block height update (used to calculate confirmations)
            return $q.when(Wallet.blockHeight(false).then(function(data) {
                return $rootScope.blockHeight = data.height;
            }));
        };

        var hasBalance = null;
        $rootScope.getBalance = function() {
            //get a live balance update
            return $q.when(Wallet.balance(false).then(function(balanceData) {
                $rootScope.balance = balanceData.balance;
                $rootScope.uncBalance = balanceData.uncBalance;

                settingsService.$isLoaded().then(function() {
                    var _hasBalance = ($rootScope.balance + $rootScope.uncBalance) > 0;
                    if (hasBalance !== _hasBalance) {
                        hasBalance = _hasBalance;
                        trackingService.setUserNetworkProperty(trackingService.USER_NETWORK_PROPERTIES.HAS_BALANCE, hasBalance);
                        trackingService.setUserNetworkProperty(trackingService.USER_NETWORK_PROPERTIES.ACTIVATED, settingsService.walletActivated || hasBalance);
                    }

                    // track activation when balance > 0 and we haven't tracked it yet
                    if (!settingsService.walletActivated && ($rootScope.balance + $rootScope.uncBalance) > 0) {
                        settingsService.walletActivated = true;

                        // only track it for wallets newer than DEFAULT_ACCOUNT_CREATED
                        if (settingsService.accountCreated >= settingsService.DEFAULT_ACCOUNT_CREATED) {
                            trackingService.trackEvent(trackingService.EVENTS.ACTIVATED);
                            facebookConnectPlugin.logEvent("fb_mobile_tutorial_completion");
                        }

                        return settingsService.$store().then(function() {
                            return settingsService.$syncSettingsUp();
                        })
                    }
                });

                return {balance: balanceData.balance, uncBalance: balanceData.uncBalance};
            }));
        };

        $rootScope.syncProfile = function() {
            //sync profile if a pending update is present, else check for upstream changes
            if (!settingsService.profileSynced) {
                settingsService.$syncProfileUp();
            } else {
                settingsService.$syncProfileDown();
            }
        };

        $rootScope.syncContacts = function() {
            //sync any changes to contacts, if syncing enabled
            if (settingsService.enableContacts) {
                Contacts.sync()
                    .then(function() {
                        //rebuild the cached contacts list
                        return Contacts.list(true);
                    })
                    .then(function() {
                        settingsService.contactsLastSync = new Date().valueOf();
                        settingsService.permissionContacts = true;
                        return settingsService.$store();
                    })
                    .catch(function(err) {
                        //check if permission related error happened and update settings accordingly
                        if (err instanceof blocktrail.ContactsPermissionError) {
                            settingsService.permissionContacts = false;
                            settingsService.enableContacts = false;
                            settingsService.$store();

                            //alert user that contact syncing is disabled
                        } else {
                            $log.error(err);
                        }
                    });
            }
        };

        $scope.$on('new_transactions', function(event, transactions) {
            //show popup and vibrate on new receiving tx
            $log.debug('New Transactions have been found!!!', transactions);
            transactions.forEach(function(transaction) {
                if (transaction.wallet_value_change > 0) {
                    $cordovaToast.showLongTop($translate.instant('MSG_NEW_TX').sentenceCase()).then(function(success) {
                        if (settingsService.vibrateOnTx) {
                            $cordovaVibration.vibrate(600);
                        }
                        // success
                    }, function(err) {
                        console.error(err);
                    });
                }
            });
        });

        $scope.socialShare = function () {
            trackingService.trackEvent(trackingService.EVENTS.TELLAFRIEND);

            var message = $translate.instant('MSG_INVITE_CONTACT');
            var subject = $translate.instant('APPNAME');
            var file = null;
            var link = null;

            // Share via native share sheet
            $cordovaSocialSharing
                .share(message, subject, file, link)
                .then(function(result) {
                    $cordovaToast.showShortCenter($translate.instant('THANKS_2'));
                    $log.debug("SocialSharing: " + result);
                }, function(err) {
                    $log.error("SocialSharing: " + err.message);
                });
        };

        $scope.$on('ORPHAN', function() {
            //show popup when an Orphan happens and wallet needs to resync
            $cordovaToast.showLongTop($translate.instant('MSG_ORPHAN_BLOCK').sentenceCase());
        });

        // do initial updates then poll for changes, all with small offsets to reducing blocking / slowing down of rendering
        $timeout(function() { $rootScope.getPrice(); }, 1000);
        $timeout(function() { $rootScope.syncProfile(); }, 2000);
        $timeout(function() { $rootScope.syncContacts(); }, 4000);
        $timeout(function() { Wallet.refillOfflineAddresses(1); }, 6000);
        $timeout(function() { settingsService.$syncSettingsDown(); }, 500);

        if (CONFIG.POLL_INTERVAL_PRICE) {
            var pricePolling = $interval(function() {
                if ($rootScope.STATE.ACTIVE) {
                    $rootScope.getPrice();
                }
            }, CONFIG.POLL_INTERVAL_PRICE);
        }

        if (CONFIG.POLL_INTERVAL_BALANCE) {
            var balancePolling = $interval(function() {
                if ($rootScope.STATE.ACTIVE) {
                    $rootScope.getBalance();
                }
            }, CONFIG.POLL_INTERVAL_BALANCE);
        }

        if (CONFIG.POLL_INTERVAL_BLOCKHEIGHT) {
            var blockheightPolling = $interval(function() {
                if ($rootScope.STATE.ACTIVE) {
                    $rootScope.getBlockHeight();
                }
            }, CONFIG.POLL_INTERVAL_BLOCKHEIGHT);
        }

        if (CONFIG.POLL_INTERVAL_CONTACTS) {
            var contactSyncPolling = $interval(function() {
                if ($rootScope.STATE.ACTIVE) {
                    $rootScope.syncContacts();
                }
            }, CONFIG.POLL_INTERVAL_CONTACTS);
        }

        if (CONFIG.POLL_INTERVAL_PROFILE) {
            var profileSyncPolling = $interval(function() {
                if ($rootScope.STATE.ACTIVE) {
                    $rootScope.syncProfile();
                }
            }, CONFIG.POLL_INTERVAL_PROFILE);
        }
    }
})();
