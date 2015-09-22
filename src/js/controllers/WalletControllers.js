angular.module('blocktrail.wallet')
    .controller('WalletCtrl', function($q, $log, $scope, $rootScope, $interval, storageService, $ionicUser, sdkService,
                                       Wallet, Contacts, CONFIG, settingsService, $timeout, $ionicAnalytics) {

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

        if (!$rootScope.settings.enablePolling) {
            Wallet.disablePolling();
        }

        $rootScope.getPrice = function() {
            //get a live prices update
            return $q.when(Wallet.price(false).then(function(data) {
                return $rootScope.bitcoinPrices = data;
            }));
        };

        $rootScope.getBlockHeight = function() {
            //get a live block height update (used to calculate confirmations)
            return $q.when(Wallet.blockHeight(false).then(function(data) {
                return $rootScope.blockHeight = data.height;
            }));
        };

        $rootScope.getBalance = function() {
            //get a live balance update
            return $q.when(Wallet.balance(false).then(function(balanceData) {
                if ((balanceData.balance > 0 || balanceData.uncBalance > 0) && !$ionicUser.get().isActive) {
                    $ionicUser.identify({user_id: $ionicUser.get().user_id, isActive: 1});
                    $ionicAnalytics.track('Actived', {});
                }

                $rootScope.balance = balanceData.balance;
                $rootScope.uncBalance = balanceData.uncBalance;
                return {balance: balanceData.balance, uncBalance: balanceData.uncBalance};
            }));
        };

        $rootScope.syncProfile = function() {            
            //sync profile if a pending update is present
            if (!settingsService.profileSynced) {
                settingsService.$syncProfileUp();
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

        // do initial updates then poll for changes, all with small offsets to reducing blocking / slowing down of rendering
        $timeout(function() { $rootScope.getPrice(); }, 1000);
        $timeout(function() { $rootScope.syncProfile(); }, 2000);
        $timeout(function() { $rootScope.syncContacts(); }, 4000);
        $timeout(function() { Wallet.refillOfflineAddresses(1); }, 6000);

        var pricePolling = $interval(function() {
            if ($rootScope.STATE.ACTIVE) {
                $rootScope.getPrice();
            }
        }, 20000);

        var balancePolling = $interval(function() {
            if ($rootScope.STATE.ACTIVE) {
                $rootScope.getBalance();
            }
        }, 10000);

        var blockheightPolling = $interval(function() {
            if ($rootScope.STATE.ACTIVE) {
                $rootScope.getBlockHeight();
            }
        }, 11000); // small offset form balance polling to avoid 2 requests at the same time

        var contactSyncPolling = $interval(function() {
            if ($rootScope.STATE.ACTIVE) {
                $rootScope.syncContacts();
            }
        }, 150000); // 2.5 mins

        var profileSyncPolling = $interval(function() {
            if ($rootScope.STATE.ACTIVE) {
                $rootScope.syncProfile();
            }
        }, 300500); // 5 mins
    }
);

angular.module('blocktrail.wallet')
    .controller('WalletSummaryCtrl', function($scope, $rootScope, $state, $log, $ionicScrollDelegate, $filter, $http, $q,
                                              $timeout, Wallet, $translate, $stateParams) {
        // update balance from cache
        $scope.transactionsData = [];   //original list of transactions
        $scope.transactionList = [];    //transactions with "date headers" inserted
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
                $q.when($rootScope.getBlockHeight()),
                $q.when(Wallet.pollTransactions())
            ]).then(function(result) {
                $scope.paginationOptions.from = 0;
                return $scope.getTransactions($scope.paginationOptions.from, $scope.paginationOptions.limit, true)
                    .then(function() {
                        $scope.$broadcast('scroll.refreshComplete');
                    }, function(err) {
                        $scope.$broadcast('scroll.refreshComplete');
                    });
            });
        };

        $scope.getTransactions = function(from, to, reset) {
            //get cached transactions
            return Wallet.transactions(from, to).then(function(result) {
                $scope.transactionsData = result;

                if (reset) {
                    $scope.lastDateHeader = 0;
                    $scope.transactionList = [];
                }
                var processedTxs = $scope.groupTransactions($scope.transactionsData);
                $scope.transactionList = $scope.transactionList.concat(processedTxs);
                $scope.paginationOptions.from += result.length;
                $scope.canLoadMoreTransactions = result.length > 0;

                $log.debug("transactionList", $scope.transactionList);
            });
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
                        //received from anonymous
                        transaction.altDisplay = transaction.txin_other_addresses.length >= 1 && transaction.txin_other_addresses[0];
                    } else if (transaction.is_internal) {
                        //sent to self
                        transaction.altDisplay = $translate.instant('INTERNAL_TRANSACTION_TITLE');
                    } else {
                        //sent to anonymous
                        transaction.altDisplay = transaction.txout_other_addresses.length >= 1 && transaction.txout_other_addresses[0];
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

        $scope.onHideTransaction = function() {
            $timeout(function() {$scope.appControl.hideLeft = false;}, 800);
        };

        $scope.onScroll = angular.noop;

        $scope.$on('new_transactions', function(event, transactions) {
            $log.debug('new_transactions', transactions);


            transactions.forEach(function(transaction) {
                $scope.transactionsData.unshift(transaction);
            });
            $scope.$apply(function() {
                //update balance now
                $rootScope.getBalance();

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
                $scope.$apply(function() {
                    $log.debug('WalletCtrl.ORPHAN');

                    //update balance now
                    $rootScope.getBalance();

                    $scope.transactions = [];
                    $scope.paginationOptions.from = 0;
                    $scope.getTransactions($scope.paginationOptions.from, $scope.paginationOptions.limit);
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

    });
