(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("WalletCtrl", WalletCtrl);

    function WalletCtrl($rootScope, $timeout, $scope, $state, $filter, $translate, $ionicNavBarDelegate, $cordovaSocialSharing, $cordovaToast,
                        CONFIG, modalService, localSettingsService, settingsService, activeWallet, walletsManagerService, Currencies, Contacts, glideraService,
                        trackingService, $ionicLoading, $log, $stateParams) {

        var walletData = walletsManagerService.getActiveWalletReadOnlyData();
        var localSettingsData = localSettingsService.getReadOnlyLocalSettingsData();

        function hideSplashscreen() {
            $timeout(function() {
                $rootScope.hideLoadingScreen = true;

                $timeout(function () {
                    if (navigator.splashscreen) {
                        navigator.splashscreen.hide();
                    }
                });
            });
        }

        hideSplashscreen();

        $scope.$on('$ionicView.enter', function() {
            hideSplashscreen();
            $ionicNavBarDelegate.showBar(true);
        });

        $scope.settings = settingsService.getReadOnlySettingsData();
        $scope.walletData = walletData;
        $scope.walletCount = walletsManagerService.getWalletsList().length;

        // default to false (then overwritten in initWalletConfig)
        $rootScope.PRIOBOOST_ENABLED = false;

        // init glidera service
        glideraService.init();

        var buyBTCNavItem = {
            stateHref: $state.href("app.wallet.buybtc.choose"),
            activeStateName: "app.wallet.buybtc",
            linkText: "BUYBTC",
            linkIcon: "ion-card",
            isHidden: !CONFIG.NETWORKS[$scope.walletData.networkType].BUYBTC
        };
        var promocodeNavItem = {
            stateHref: $state.href("app.wallet.promo"),
            activeStateName: "app.wallet.promo",
            linkText: "PROMO_CODES",
            linkIcon: "ion-ios-heart-outline",
            isHidden: !CONFIG.NETWORKS[$scope.walletData.networkType].PROMOCODE
        };

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
            buyBTCNavItem,
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
            promocodeNavItem
        ];

        // Subscriptions for active wallet check
        var subscriptionOnBalance = $scope.$watch("walletData.balance", checkOnActiveWallet);
        var subscriptionOnUncBalance = $scope.$watch("walletData.uncBalance", checkOnActiveWallet);
        var subscriptionOnWalletActivated = $scope.$watch("settings.walletActivated", checkOnActiveWallet);
        var isCheckOnWalletActivated = false;

        // On scope destroy
        $scope.$on("$destroy", onScopeDestroy);

        // Methods
        $rootScope.getPrice = getPrice;
        $rootScope.syncContacts = syncContacts;
        $scope.onClickSetActiveWallet = onClickSetActiveWallet;
        $scope.navHandler = navHandler;

        function onClickSetActiveWallet() {
            modalService.select({
                    options: prepareWalletListOptions(walletsManagerService.getWalletsList())
                })
                .then(setActiveWalletHandler)
                // hide loading
                .then(function() {
                    $ionicLoading.hide();
                }, function(e) {
                    $ionicLoading.hide();
                    throw e;
                });
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

            if(walletsList.length > 2) {
                walletsList.forEach(function(wallet) {
                    var label;
                    if (CONFIG.DEBUG) {
                        label = CONFIG.NETWORKS[wallet.network].TICKER + " " + $filter("satoshiToCoin")(wallet.balance, wallet.network, 4) + " " + wallet.identifier;
                    } else {
                        label = CONFIG.NETWORKS[wallet.network].TICKER + " " + wallet.identifier;
                    }

                    list.push({
                        value: wallet.uniqueIdentifier,
                        selected: walletData.uniqueIdentifier === wallet.uniqueIdentifier,
                        label: label
                    })
                });
            } else {
                walletsList.forEach(function(wallet) {
                    list.push({
                        value: wallet.uniqueIdentifier,
                        selected: walletData.uniqueIdentifier === wallet.uniqueIdentifier,
                        label: CONFIG.NETWORKS[wallet.network].NETWORK_LONG
                    });
                });
            }

            // copy original list for the order
            var originalList = list.slice();
            list.sort(function(a, b) {
                // always prioritize the selected value
                if (a.value === $scope.walletData.uniqueIdentifier) {
                    return -1;
                } else if (b.value === $scope.walletData.uniqueIdentifier) {
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

            $ionicLoading.show();

            return walletsManagerService.setActiveWalletByUniqueIdentifier(uniqueIdentifier)
                .then(function() {
                    $state.transitionTo("app.wallet.summary", { networkChange: true }, { reload: true, inherit: false });
                }).catch(function (err) {
                    var bodyMessage = "MSG_FAILED_UNKNOWN";
                    if (err.name == "web_sql_went_bad" || err.name == "indexeddb_went_bad") {
                       bodyMessage = "MSG_STORAGE_EXCEEDED";
                    }

                    modalService.alert({
                        body: bodyMessage
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
         * Sync contacts
         */
        function syncContacts() {
            // sync any changes to contacts, if syncing enabled (and it is not a network change)
            if (localSettingsData.isEnableContacts && !$stateParams.networkChange) {
                Contacts.sync()
                    .then(function() {
                        //rebuild the cached contacts list
                        return Contacts.list(true);
                    })
                    .then(function() {
                        var data = {
                            // TODO Review the logic related to 'contactsLastSync'
                            // TODO we do not use it right no
                            contactsLastSync: new Date().valueOf(),
                            isPermissionContacts: true
                        };

                        return localSettingsService.setLocalSettings(data);
                    })
                    .catch(function(err) {
                        // check if permission related error happened and update settings accordingly
                        if (err instanceof blocktrail.ContactsPermissionError) {
                            var data = {
                                enableContacts: false,
                                isPermissionContacts: false
                            };

                            // alert user that contact syncing is disabled
                            return localSettingsService.setLocalSettings(data);
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

        /**
         * Check on active wallet
         * @return {*}
         */
        function checkOnActiveWallet() {
            if(!isCheckOnWalletActivated) {
                if(!$scope.settings.walletActivated && ($scope.walletData.balance > 0 || $scope.walletData.uncBalance > 0)) {
                    isCheckOnWalletActivated = true;
                    settingsService.updateSettingsUp({ walletActivated: true })
                        .then(function() {
                            trackingService.trackEvent(trackingService.EVENTS.ACTIVATED);
                            unsubscribe();
                        });
                } else if($scope.settings.walletActivated) {
                    unsubscribe();
                }
            }
        }

        /**
         * On scope destroy
         */
        function onScopeDestroy() {
            unsubscribe()
        }

        /**
         * Unsubscribe
         */
        function unsubscribe() {
            subscriptionOnBalance();
            subscriptionOnUncBalance();
            subscriptionOnWalletActivated();
        }

        $timeout(function() { $rootScope.getPrice(); }, 1000);
        $timeout(function() { $rootScope.syncContacts(); }, 40000);
        $timeout(function() { activeWallet.refillOfflineAddresses(1); }, 6000);
    }
})();
