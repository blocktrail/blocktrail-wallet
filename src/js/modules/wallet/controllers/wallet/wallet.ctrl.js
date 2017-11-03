(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("WalletCtrl", WalletCtrl);

    function WalletCtrl($rootScope, $timeout, $scope, $state, $translate, $ionicNavBarDelegate, $cordovaSocialSharing, $cordovaToast, CONFIG,
                        modalService, settingsData, settingsService, activeWallet, walletsManagerService, Currencies, Contacts, glideraService,
                        trackingService, AppVersionService, blocktrailLocalisation, $cordovaDialogs, launchService) {
        var walletData = activeWallet.getReadOnlyWalletData();
        
        $timeout(function() {
            $rootScope.hideLoadingScreen = true;
            $timeout(function() {
                if (navigator.splashscreen) {
                    navigator.splashscreen.hide();
                }
            });
        });

        $scope.settings = settingsData;
        $scope.walletData = walletData;
        $scope.walletCount = walletsManagerService.getWalletsList().length;

        $scope.$watch('walletData.networkType', function() {
            glideraService.init();
        });

        $scope.sideNavList = [
            {
                stateHref: $state.href("app.wallet.summary"),
                activeStateName: "app.wallet.summary",
                linkText: "MY_WALLET",
                linkIcon: "icon-blocktrail-wallet",
                isHidden: false
            },
            {
                stateHref: $state.href("app.wallet.send"),
                activeStateName: "app.wallet.send",
                linkText: "SEND",
                linkIcon: "ion-ios-redo-outline",
                isHidden: false
            },
            {
                stateHref: $state.href("app.wallet.receive"),
                activeStateName: "app.wallet.receive",
                linkText: "RECEIVE",
                linkIcon: "ion-ios-undo-outline",
                isHidden: false
            },
            {
                stateHref: $state.href("app.wallet.buybtc.choose"),
                activeStateName: "app.wallet.buybtc",
                linkText: "BUYBTC_NAVTITLE",
                linkIcon: "ion-card",
                isHidden: !CONFIG.NETWORKS[$scope.walletData.networkType].BUYBTC
            },
            {
                stateHref: null,
                activeStateName: "",
                linkText: "TELL_A_FRIEND",
                linkIcon: "ion-ios-chatbubble-outline",
                isHidden: false
            },
            {
                stateHref: $state.href("app.wallet.settings"),
                activeStateName: "app.wallet.settings",
                linkText: "SETTINGS",
                linkIcon: "ion-ios-gear-outline",
                isHidden: false
            },
            {
                stateHref: $state.href("app.wallet.promo"),
                activeStateName: "app.wallet.promo",
                linkText: "PROMO_CODES",
                linkIcon: "ion-ios-heart-outline",
                isHidden: !CONFIG.NETWORKS[$scope.walletData.networkType].PROMOCODE
            }
        ];

        $scope.$on('$ionicView.enter', function() {
            $ionicNavBarDelegate.showBar(true);
        });

        // Methods
        $rootScope.getPrice = getPrice;
        $rootScope.syncProfile = syncProfile;
        $rootScope.syncContacts = syncContacts;
        $scope.onClickSetActiveWallet = onClickSetActiveWallet;
        $scope.navHandler = navHandler;

        function onClickSetActiveWallet() {
            modalService.show("js/modules/wallet/controllers/modal-select-wallet/modal-select-wallet.tpl.html", "ModalSelectWalletCtrl", {
                walletsListOptions: prepareWalletListOptions(walletsManagerService.getWalletsList())
            }).then(setActiveWalletHandler);
        }

        /**
         * Prepare wallet list options
         * @param walletsList
         * @return {Array}
         */
        function prepareWalletListOptions(walletsList) {
            var list = [];

            if (!$scope.settings.showArchived) {
                walletsList = walletsList.filter(function(wallet) {
                    return !wallet.archived;
                });
            }

            walletsList.forEach(function(wallet) {
                list.push({
                    value: wallet.uniqueIdentifier,
                    active: (wallet.uniqueIdentifier === walletData.uniqueIdentifier),
                    selected: (wallet.uniqueIdentifier === walletData.uniqueIdentifier),
                    wallet: wallet
                })
            });

            // copy original list for the order
            var originalList = list.slice();

            list.sort(function(a, b) {
                // always prioritize the selected value
                if (a.value === walletData.uniqueIdentifier) {
                    return -1;
                } else if (b.value === walletData.uniqueIdentifier) {
                    return 1;
                }

                // otherwise just sort
                return (originalList.indexOf(a) < originalList.indexOf(b)) ? -1 : 1;
            });

            return list;
        }

        /**
         * Set active wallet handler
         * @param uniqueIdentifier
         */
        function setActiveWalletHandler(uniqueIdentifier) {
            if(!uniqueIdentifier || uniqueIdentifier === $scope.walletData.uniqueIdentifier) {
                return;
            }

            modalService.showSpinner();

            $timeout(function() {
                walletsManagerService.setActiveWalletByUniqueIdentifier(uniqueIdentifier)
                    .then(function() {
                        $state.transitionTo("app.wallet.summary", null, {reload: true, inherit: false});

                        $timeout(function() {
                            modalService.hideSpinner();
                        }, 500);
                    });
            });
        }

        /**
         * Get price
         * @return {*}
         */
        function getPrice() {
            return Currencies.updatePrices(false)
                .then(function(prices) {
                    $rootScope.bitcoinPrices = prices;
                });
        }

        /**
         * Sync profile
         */
        function syncProfile() {
            // sync profile if a pending update is present, else check for upstream changes
            if (!settingsService.profileSynced) {
                settingsService.$syncProfileUp();
            } else {
                settingsService.$syncProfileDown();
            }
        }

        /**
         * Sync contacts
         */
        function syncContacts() {
            // sync any changes to contacts, if syncing enabled
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
        }

        /**
         * Nav handler, social share
         */
        function navHandler() {
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
        }

        // @TODO: review & bring back network specfic config values
        (function initWalletConfig() {
            launchService.getWalletConfig()
                .then(function(result) {
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
                                    if (preferredLanguage !== settingsService.language && newLanguages.indexOf(preferredLanguage) !== -1) {
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
                                                if (dialogResult === 2) {
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
                                });
                        }
                    });
                })
                .then(function() {}, function(e) { console.error('extraLanguages', e && (e.msg || e.message || "" + e)); });
        })();

        $timeout(function() { $rootScope.getPrice(); }, 1000);
        $timeout(function() { $rootScope.syncProfile(); }, 2000);
        $timeout(function() { $rootScope.syncContacts(); }, 4000);
        $timeout(function() { activeWallet.refillOfflineAddresses(1); }, 6000);
        $timeout(function() { settingsService.$syncSettingsDown(); }, 500);
    }
})();
