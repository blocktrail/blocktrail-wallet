(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("WalletCtrl", WalletCtrl);

    function WalletCtrl($rootScope, $timeout, $scope, $state, $ionicNavBarDelegate, CONFIG, modalService, settingsData, settingsService,
                        activeWallet, walletsManagerService, Currencies, Contacts) {
        var walletData = activeWallet.getReadOnlyWalletData();

        $scope.$on('$ionicView.enter', function() {
            $ionicNavBarDelegate.showBar(true);
        });

        $rootScope.hideLoadingScreen = true;

        $scope.settings = settingsData;
        $scope.walletData = walletData;
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
            // TODO Add handler
            {
                stateHref: "",
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
            // TODO Check on promocede
            {
                stateHref: $state.href("app.wallet.promo"),
                activeStateName: "app.wallet.promo",
                linkText: "PROMO_CODES",
                linkIcon: "ion-ios-heart-outline",
                isHidden: false
            }
        ];

        $scope.onClickSetActiveWallet = onClickSetActiveWallet;

        function onClickSetActiveWallet() {
            modalService.show("js/modules/wallet/controllers/modal-select-wallet/modal-select-wallet.tpl.html", "ModalSelectWalletCtrl", {
                walletsListOptions: prepareWalletListOptions(walletsManagerService.getWalletsList())
            }).then(setActiveWalletHandler);
        }

        function prepareWalletListOptions(walletsList) {
            var list = [];

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

        function setActiveWalletHandler(uniqueIdentifier) {
            if(!uniqueIdentifier || uniqueIdentifier === $scope.walletData.uniqueIdentifier) {
                return;
            }

            modalService.showSpinner();

            $timeout(function() {
                walletsManagerService.setActiveWalletByUniqueIdentifier(uniqueIdentifier)
                    .then(function() {
                        // $state.reload();
                        // window.location.reload();
                        $state.transitionTo("app.wallet.summary", null, {reload: true, inherit: false});

                        $timeout(function() {
                            modalService.hideSpinner();
                        }, 500);
                    });
            });
        }

        $rootScope.getPrice = function() {
            return Currencies.updatePrices(false)
                .then(function(prices) {
                    $rootScope.bitcoinPrices = prices;
                });
        };

        $rootScope.syncProfile = function() {
            // sync profile if a pending update is present, else check for upstream changes
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

        // TODO Add call back to nav
        /*$scope.socialShare = function () {
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
        };*/

        $timeout(function() { $rootScope.getPrice(); }, 1000);
        $timeout(function() { $rootScope.syncProfile(); }, 2000);
        $timeout(function() { $rootScope.syncContacts(); }, 4000);
        // TODO Apply to new wallet
        // $timeout(function() { Wallet.refillOfflineAddresses(1); }, 6000);
        $timeout(function() { settingsService.$syncSettingsDown(); }, 500);


        /*if (CONFIG.POLL_INTERVAL_PRICE) {
            var pricePolling = $interval(function() {
                if ($rootScope.STATE.ACTIVE) {
                    $rootScope.getPrice();
                }
            }, CONFIG.POLL_INTERVAL_PRICE);
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
        }*/
    }
})();
