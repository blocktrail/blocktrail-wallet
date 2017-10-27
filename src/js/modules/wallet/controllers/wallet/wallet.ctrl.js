(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("WalletCtrl", WalletCtrl);

    function WalletCtrl($rootScope, $scope, $state, $ionicNavBarDelegate, CONFIG, modalService, settingsData,
                        activeWallet, walletsManagerService, Currencies) {
        var walletData = activeWallet.getReadOnlyWalletData();

        $scope.$on('$ionicView.enter', function(e) {
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

            walletsManagerService.setActiveWalletByUniqueIdentifier(uniqueIdentifier)
                .then(function() {
                    modalService.hideSpinner();
                    // $state.reload();
                    // window.location.reload();
                    $state.transitionTo("app.wallet.summary", null, { reload: true, inherit: false });

                });
        };


        $rootScope.getPrice = function() {
            return Currencies.updatePrices(false)
                .then(function(prices) {
                    $rootScope.bitcoinPrices = prices;
                });
        };
    }
})();
