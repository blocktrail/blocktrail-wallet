(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("WalletSummaryCtrl", WalletSummaryCtrl);

    function WalletSummaryCtrl($rootScope, $scope, $q, activeWallet, settingsService,
                               buyBTCService, CurrencyConverter, modalService) {

        var walletData = activeWallet.getReadOnlyWalletData();
        var settings = settingsService.getReadOnlySettingsData();
        var transactionsListLimitStep = 7;
        var lastDateHeader = 0; // used to keep track of the last date header added

        $scope.walletData = walletData;

        $scope.isShowNoMoreTransactions = true;
        $scope.showBCCSweepWarning = false;
        $scope.lastDateHeader = lastDateHeader;
        $scope.buyBtcPendingOrders = []; // Glidera transactions
        $scope.transactionsListLimit = transactionsListLimitStep;

        $scope.isHeader = isHeader;
        $scope.getTransactionHeader = getTransactionHeader;
        $scope.onShowTransaction = onShowTransaction;
        $scope.onShowMoreTransactions = onShowMoreTransactions;

        $scope.onScroll = angular.noop;

        initData();

        if ($scope.walletData.networkType === "BCC") {
            activeWallet.isReady.then(function() {
                $scope.showBCCSweepWarning = !$scope.walletData.transactions.length && !settings.hideBCCSweepWarning;
            });
        }

        /**
         * Init data
         */
        function initData() {
            modalService.showSpinner();

            return $q.all([
                $q.when($rootScope.getPrice()),
                $q.when(getGlideraTransactions())
            ]).then(function() {
                modalService.hideSpinner();
            }, function (err) {
                modalService.hideSpinner();
                console.log('err', err);
            });
        }

        /**
         * Get glidera transactions
         *
         * TODO move this logic to Wallet class
         */
        function getGlideraTransactions() {
            return settingsService.initSettings()
                .then(function(settings) {
                    $scope.buyBtcPendingOrders = [];

                    settings.glideraTransactions.forEach(function(glideraTxInfo) {
                        // don't display completed TXs, they will be part of our normal transaction history
                        if (glideraTxInfo.transactionHash || glideraTxInfo.status === "COMPLETE") {
                            return;
                        }

                        // only display TXs that are related to this wallet
                        if (glideraTxInfo.walletIdentifier !== $scope.walletData.identifier) {
                            return;
                        }

                        var order = {
                            transactionUuid: glideraTxInfo.transactionUuid,
                            qty: CurrencyConverter.toSatoshi(glideraTxInfo.qty, 'BTC'),
                            qtyBTC: glideraTxInfo.qty,
                            currency: glideraTxInfo.currency,
                            price: glideraTxInfo.price,
                            total: (glideraTxInfo.price * glideraTxInfo.qty).toFixed(2),
                            time: glideraTxInfo.time,
                            avatarUrl: buyBTCService.BROKERS.glidera.avatarUrl,
                            displayName: buyBTCService.BROKERS.glidera.displayName
                        };

                        $scope.buyBtcPendingOrders.push(order);
                    });

                    // latest first
                    $scope.buyBtcPendingOrders.reverse();
                });
        }


        /**
         * On show more transactions
         *
         * Handler for "infinite-scroll" directive
         */
        function onShowMoreTransactions() {
            if($scope.transactionsListLimit < $scope.walletData.transactions.length) {
                $scope.transactionsListLimit = $scope.transactionsListLimit + transactionsListLimitStep;
            } else if ($scope.walletData.transactions.length && $scope.transactionsListLimit >= $scope.walletData.transactions.length) {
                $scope.isShowNoMoreTransactions = false;
            }

            $scope.$broadcast('scroll.infiniteScrollComplete');
        }

        /**
         * Is header
         *
         * @param transaction
         * @return {boolean}
         */
        function isHeader(transaction) {
            var isHeader = false;
            var date = new Date(transaction.time * 1000);

            date.setHours(0);
            date.setMinutes(0);
            date.setSeconds(0);
            date.setMilliseconds(0);

            if (lastDateHeader !== date.valueOf()) {
                lastDateHeader = date.valueOf();
                isHeader = true;
            }

            return isHeader;
        }

        /**
         * Get transaction header
         *
         * @return {number}
         */
        function getTransactionHeader() {
            return lastDateHeader;
        }

        /**
         * On show transaction
         *
         * @param transaction
         */
        function onShowTransaction(transaction) {
            modalService.show("js/modules/wallet/controllers/modal-wallet-transaction-info/modal-wallet-transaction-info.tpl.html", "ModalWalletTransactionInfo", {
                transaction: transaction,
                walletData: walletData,
                localCurrency: settings.localCurrency
            });
        }
    }
})();
