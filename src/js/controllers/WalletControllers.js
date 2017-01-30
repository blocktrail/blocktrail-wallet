angular.module('blocktrail.wallet')
    .controller('WalletCtrl', function($q, $log, $scope, $rootScope, $interval, storageService, sdkService, $translate,
                                       Wallet, Contacts, CONFIG, settingsService, $timeout, $analytics, $cordovaVibration,
                                       $cordovaToast, trackingService, $http, $cordovaDialogs, blocktrailLocalisation, launchService, buyBTCService) {

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
        launchService.getWalletConfig()
            .then(function(result) {
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

                                            return settingsService.$store();
                                        })
                                        ;
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
                $rootScope.balance = balanceData.balance;
                $rootScope.uncBalance = balanceData.uncBalance;

                settingsService.$isLoaded().then(function() {
                    // track activation when balance > 0 and we haven't tracked it yet
                    if (!settingsService.walletActivated && ($rootScope.balance + $rootScope.uncBalance) > 0) {
                        settingsService.walletActivated = true;

                        // only track it for wallets newer than DEFAULT_ACCOUNT_CREATED
                        if (settingsService.accountCreated >= settingsService.DEFAULT_ACCOUNT_CREATED) {
                            trackingService.trackEvent(trackingService.EVENTS.ACTIVATED);
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
                $q.when($rootScope.getPrice()),
                $q.when($rootScope.getBlockHeight()),
                $q.when(Wallet.pollTransactions())
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

        $scope.getTransactions = function(from, limit, reset) {
            //get cached transactions
            console.log('getTransactions', from, limit);
            return Wallet.transactions(from, limit).then(function(result) {
                console.log('getTransactions.result', result);

                if (reset) {
                    $scope.lastDateHeader = 0;
                    $scope.transactionsData = [];
                    $scope.transactionList = [];
                }

                $scope.transactionsData = $scope.transactionsData.concat(result);
                $scope.transactionList = $scope.groupTransactions($scope.transactionsData);
                $scope.paginationOptions.from += result.length;
                $scope.canLoadMoreTransactions = result.length >= limit;

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

                    if (!transaction.contact && transaction.buybtc) {
                        transaction.contact = {
                            displayName: transaction.buybtc.broker.sentenceCase(),
                            avatarUrl: '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'
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
                        transaction.altDisplay = $translate.instant('TX_INFO_RECEIVED');
                    } else if (transaction.is_internal) {
                        // sent to self
                        transaction.altDisplay = $translate.instant('INTERNAL_TRANSACTION_TITLE');
                    } else {
                        // sent to anonymous
                        transaction.altDisplay = $translate.instant('TX_INFO_SENT');
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

    });
