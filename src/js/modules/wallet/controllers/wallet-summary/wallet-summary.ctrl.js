(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("WalletSummaryCtrl", WalletSummaryCtrl);

    function WalletSummaryCtrl($scope, $rootScope, $log, $ionicScrollDelegate, $q,
                               $timeout, Wallet, $translate, $stateParams, AppRateService, CurrencyConverter,
                               settingsService, buyBTCService, $ionicPopover, notificationService) {
        AppRateService.init();
        notificationService.backupNotification();

        // update balance from cache
        $scope.transactionsData = [];   //original list of transactions
        $scope.transactionList = [];    //transactions with "date headers" inserted
        $scope.buybtcPendingOrders = [];
        $scope.transactionInfo = null;
        $scope.canLoadMoreTransactions = true;
        $scope.isActive = true;
        $scope.paginationOptions = {
            from: 0,
            limit: 25
        };
        $scope.lastDateHeader = 0;      //used to keep track of the last date header added
        $scope.appControl = {
            hideLeft: false,
            showTransactionInfo: false
        };
        $scope.txInfoTemplate = "templates/wallet/partials/wallet.partial.tx-info.html";

        $scope.refreshTransactions = function() {
            $log.debug('refreshTransactions');

            //refresh transactions, block height and wallet balance
            $q.all([
                $q.when($rootScope.getBalance()),
                $q.when($rootScope.getPrice()),
                $q.when($rootScope.getBlockHeight()),
                $q.when(Wallet.pollTransactions()),
                $scope.refreshBuybtcPendingOrders()
            ]).then(function(result) {
                $scope.paginationOptions.from = 0;
                $scope.canLoadMoreTransactions = true;
                return $scope.getTransactions($scope.paginationOptions.from, $scope.paginationOptions.limit, true)
                    .then(function() {
                        $scope.$broadcast('scroll.refreshComplete');
                    }, function(err) {
                        $scope.$broadcast('scroll.refreshComplete');
                    });
            }).catch(function (err) {
                //should probably alert user...
                $scope.$broadcast('scroll.refreshComplete');
            });
        };

        $scope.refreshBuybtcPendingOrders = function() {
            Wallet.wallet.then(function(wallet) {
                return settingsService.$isLoaded().then(function () {
                    $scope.buybtcPendingOrders = [];

                    settingsService.glideraTransactions.forEach(function (glideraTxInfo) {
                        if (glideraTxInfo.transactionHash || glideraTxInfo.status === "COMPLETE") {
                            return;
                        }

                        // only display TXs that are related to this wallet
                        if (glideraTxInfo.walletIdentifier !== wallet.identifier) {
                            return;
                        }

                        var order = {
                            isBuyBtcPendingOrder: true,
                            qty: CurrencyConverter.toSatoshi(glideraTxInfo.qty, 'BTC'),
                            qtyBTC: glideraTxInfo.qty,
                            currency: glideraTxInfo.currency,
                            price: glideraTxInfo.price,
                            total: (glideraTxInfo.price * glideraTxInfo.qty).toFixed(2),
                            time: glideraTxInfo.time,
                            avatarUrl: buyBTCService.BROKERS.glidera.avatarUrl,
                            displayName: buyBTCService.BROKERS.glidera.displayName,
                            estimatedDeliveryDate: glideraTxInfo.estimatedDeliveryDate
                        };

                        $scope.buybtcPendingOrders.push(order);
                    });

                    if ($scope.buybtcPendingOrders.length > 0) {
                        // add header row
                        $scope.buybtcPendingOrders.push({isBuyBtcPendingOrder: true, isHeader: true});

                        // latest first
                        $scope.buybtcPendingOrders.reverse();
                    }
                });
            });
        };

        $scope.getTransactions = function(from, limit, reset) {
            //get cached transactions
            console.log('getTransactions', from, limit);
            return Wallet.transactions(from, limit).then(function(result) {
                console.log('getTransactions.result', result);

                if ($rootScope.TX_FILTER_MIN_BLOCK_HEIGHT) {
                    result = result.filter(function (tx) {
                        return tx.block_height === null || tx.block_height >= $rootScope.TX_FILTER_MIN_BLOCK_HEIGHT;
                    });
                }

                if (reset) {
                    $scope.lastDateHeader = 0;
                    $scope.transactionsData = [];
                    $scope.transactionList = [];
                }


                $scope.transactionsData = $scope.transactionsData.concat(result);
                $scope.transactionList = $scope.buybtcPendingOrders.concat($scope.groupTransactions($scope.transactionsData));
                $scope.paginationOptions.from += result.length;
                $scope.canLoadMoreTransactions = result.length >= limit;

                console.log("transactionList", $scope.transactionList);
            })
                .catch(function(e) { console.log('getTransactions ERR', e); })
        };

        $scope.loadMoreTransactions = function() {
            $log.debug('loadMoreTransactions');
            //may need to merge existing data set when getting more results?
            // or else check for existing entries so they aren't added more than once when grouping data
            $scope.getTransactions($scope.paginationOptions.from, $scope.paginationOptions.limit).then(function(result) {
                $scope.$broadcast('scroll.infiniteScrollComplete');
            });
        };

        $scope.groupTransactions = function(data) {
            $scope.lastDateHeader = 0;

            var groupedList = [];

            data.forEach(function(transaction) {
                var date = null;

                if (transaction.hash) {
                    date = new Date(transaction.time*1000);
                    date.setHours(0);
                    date.setMinutes(0);
                    date.setSeconds(0);
                    date.setMilliseconds(0);
                    date = date.valueOf();

                    //create the header object
                    if (date < $scope.lastDateHeader || $scope.lastDateHeader == 0) {
                        $scope.lastDateHeader = date;
                        var headerObj = {isHeader: true, date: date};
                        groupedList.push(headerObj);
                    }

                    if (!transaction.contact && transaction.buybtc) {
                        var broker = buyBTCService.BROKERS[transaction.buybtc.broker];

                        transaction.contact = {
                            displayName: broker.displayName,
                            avatarUrl: broker.avatarUrl
                        };
                    }

                    //add a contact token
                    if (transaction.contact) {
                        if (!transaction.contact.lastName && transaction.contact.firstName) {
                            transaction.contactInitials = transaction.contact.firstName.substr(0, 2);
                        } else if (!transaction.contact.firstName && transaction.contact.lastName) {
                            transaction.contactInitials = transaction.contact.lastName.substr(0, 2);
                        } else if (transaction.contact.firstName && transaction.contact.lastName) {
                            transaction.contactInitials = transaction.contact.firstName.substr(0, 1) + transaction.contact.lastName.substr(0, 1);
                        }
                    } else if (transaction.wallet_value_change > 0) {
                        // received from anonymous
                        transaction.altDisplay = $translate.instant('TX_INFO_RECEIVED', {network: $rootScope.NETWORK_LONG});
                    } else if (transaction.is_internal) {
                        // sent to self
                        transaction.altDisplay = $translate.instant('INTERNAL_TRANSACTION_TITLE');
                    } else {
                        // sent to anonymous
                        transaction.altDisplay = $translate.instant('TX_INFO_SENT', {network: $rootScope.NETWORK_LONG});
                    }

                    groupedList.push(transaction);
                }
            });

            return groupedList;
        };

        $scope.showTransaction = function(transaction) {
            transaction.amount = Math.abs(transaction.wallet_value_change);
            if (transaction.wallet_value_change < 0) {
                //subtract fee from amount
                transaction.amount = transaction.amount - transaction.fee;
            }
            $scope.transactionInfo = transaction;
            $scope.appControl.showTransactionInfo = true;
        };

        $scope.showBuyBtcPendingOrder = function(order) {
            var modalScope = $rootScope.$new(true);
            modalScope.order = order;
            modalScope.popoverSizeCls = "large-popover";

            return $ionicPopover.fromTemplateUrl('templates/wallet/popover.buybtc-pendingorder.html', {
                scope: modalScope,
                hardwareBackButtonClose: true
            }).then(function(popover) {
                modalScope.popover = popover;
                popover.hideDelay = 1000;
                popover.show();
            });
        };

        $scope.onHideTransaction = function() {
            $timeout(function() {$scope.appControl.hideLeft = false;}, 800);
        };

        $scope.onScroll = angular.noop;

        $scope.$on('new_transactions', function(event, transactions) {
            $log.debug('new_transactions', transactions);

            // remove all previously unconfirmed txs
            $scope.transactionsData.forEach(function(tx, index) {
                if (!tx.block_height) {
                    delete $scope.transactionsData[index];
                }
            });

            // add the updated list of unconfirmed txs
            transactions.forEach(function(transaction) {
                $scope.transactionsData.unshift(transaction);
            });

            $scope.$apply(function() {
                //update balance now
                $rootScope.getBalance();

                $scope.refreshBuybtcPendingOrders();

                $scope.transactionList = $scope.groupTransactions($scope.transactionsData);
                $scope.$broadcast('scroll.infiniteScrollComplete');
            });
        });

        $scope.$on('confirmed_transactions', function(event, confirmedTxs) {
            $log.debug('confirmed_transactions', confirmedTxs);
            //refresh the txs that have changed (just update the block heights)
            $scope.$apply(function() {
                //update balance now
                $rootScope.getBalance();

                $scope.refreshBuybtcPendingOrders();

                $scope.transactionList.forEach(function(transaction) {
                    $log.debug('checking tx: ' + transaction.hash + ' against ' + confirmedTxs.length);
                    if (!confirmedTxs.length) {
                        return;
                    }
                    confirmedTxs.forEach(function(confirmedTx, index) {
                        if (confirmedTx.hash == transaction.hash) {
                            $log.debug('found and updated!');
                            transaction.block_height = confirmedTx.block_height;
                            //remove from array to speed things up
                            delete confirmedTxs[index];
                        }
                    });
                });
            });
        });

        $scope.$on('ORPHAN', function() {
            if ($scope.isActive) {
                $timeout(function() {
                    $log.debug('WalletCtrl.ORPHAN');

                    $scope.refreshTransactions();
                });
            }
        });

        $scope.$on('$ionicView.leave', function() {
            $scope.isActive = false;
        });

        $scope.$on("$stateChangeStart", function() {
            $scope.appControl.showTransactionInfo = false;
        });

        $scope.$on('$ionicView.enter', function() {
            // force refresh with spinner, only if scope has been initialised and cached already
            if ($stateParams.refresh && !$scope.isActive) {
                $scope.refreshTransactions();

                $scope.displaySpinner = true;
            } else {
                // when not forced give it a slight offset to allow rendering first
                $timeout(function() {
                    $log.debug('$ionicView.enter -> refreshTransactions');
                    $scope.refreshTransactions();
                }, 300);
            }

            $scope.isActive = true;
            $timeout(function() {
                $ionicScrollDelegate.scrollTop();
            });

        });

        $scope.$on('scroll.refreshComplete', function() {
            $scope.displaySpinner = false;
        });

    }
})();
