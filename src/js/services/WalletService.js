angular.module('blocktrail.wallet').factory(
    'Wallet',
    function($rootScope, $state, $interval, $q, $log, sdkService, launchService, storageService, Contacts, CONFIG, $timeout) {
        var Wallet = function() {
            var self = this;

            self.initDB();

            self.poll = null;
            self.interval = null;
            self.noPolling = true;
            self.isRefilling = null;
            self.addressRefillPromise = null;

            self.sdk = sdkService.sdk();

            self.wallet = self.sdk.then(function(sdk) {
                return launchService.getWalletInfo().then(
                    function(walletInfo) {
                        return sdk.initWallet({
                            identifier: walletInfo.identifier,
                            readOnly: true,
                            bypassNewAddressCheck: true
                        });
                    },
                    function(e) {
                        $state.go('app.launch');
                        throw e;
                    });
            })
            // use a .then because a .done would break the promise chains that rely on self.wallet
            .then(function(wallet) { $log.debug('initWallet'); return wallet; }, function(e) { $log.debug('initWallet.ERR'); throw e; });

            // attempt a small refill every 3 minutes
            $interval(function() {
                self.refillOfflineAddresses(1);
            }, 3 * 60 * 1000);
        };

        Wallet.OFFLINE_ADDRESSES = 30;

        Wallet.prototype.validateAddress = function(address) {
            var self = this;

            /* @TODO: use this once added to the SDK
            return self.sdk.then(function(sdk) {
                return sdk.validateAddress(address);
            });
            */

            return self.sdk.then(function(sdk) {
                var addr, err;
                try {
                    addr = bitcoinjs.Address.fromBase58Check(address);
                    if (addr.version !== sdk.network.pubKeyHash && addr.version !== sdk.network.scriptHash) {
                        err = new blocktrail.InvalidAddressError("Invalid network");
                    }
                } catch (_err) {
                    err = _err;
                }

                if (!addr || err) {
                    throw new blocktrail.InvalidAddressError("Invalid address [" + address + "]" + (err ? " (" + err.message + ")" : ""));
                }

                return address;
            });
        };

        Wallet.prototype.unlockData = function(pin) {
            var self = this;

            return launchService.getWalletInfo().then(function(walletInfo) {
                var password, secret;

                try {
                    // legacy; storing encrypted password instead of secret
                    if (walletInfo.encryptedPassword) {
                        password = CryptoJS.AES.decrypt(walletInfo.encryptedPassword, pin).toString(CryptoJS.enc.Utf8);
                    } else {
                        secret = CryptoJS.AES.decrypt(walletInfo.encryptedSecret, pin).toString(CryptoJS.enc.Utf8);
                    }
                } catch (e) {
                    throw new blocktrail.WalletPinError(e.message);
                }

                if (!password && !secret) {
                    throw new blocktrail.WalletPinError("Bad PIN");
                }

                var unlockData = {};
                if (password) {
                    unlockData.password = password;
                } else {
                    unlockData.secret = secret;
                }

                return unlockData;
            });
        };

        Wallet.prototype.unlock = function(pin) {
            var self = this;

            return self.wallet.then(function(wallet) {
                return self.unlockData(pin).then(function(unlock) {
                    switch (wallet.walletVersion) {
                        case 'v2':
                            break;

                        case 'v3':
                            unlock.secret = new blocktrailSDK.Buffer(unlock.secret, 'hex');
                            break;

                        default:
                            throw new Error("Unsupported wallet version [" + wallet.walletVersion + "]")
                            break;
                    }

                    return wallet.unlock(unlock).then(function() {
                        return wallet;
                    });
                });
            });
        };

        Wallet.prototype.unlockWithPassword = function(password) {
            var self = this;

            return self.wallet.then(function(wallet) {
                return wallet.unlock({password: password}).then(function() {
                    return wallet;
                });
            });
        };

        Wallet.prototype.initDB = function() {
            var self = this;

            self.historyCache = storageService.db('history');
            self.walletCache = storageService.db('wallet-cache');
        };

        Wallet.prototype.reset = function() {
            var self = this;

            return self.historyCache.destroy()
                .then(function() {
                    self.historyCache = null;
                })
                .then(function() {
                    self.initDB();
                })
                .then(function() {
                    return self.pollTransactions();
                });
        };

        Wallet.prototype.disablePolling = function(){
            $interval.cancel(this.interval);
            this.interval = null;
            this.noPolling = true;
            $log.debug('disable wallet polling');
        };

        Wallet.prototype.enablePolling = function(){
            this.noPolling = false;
            if (!this.interval) {
                this.setupInterval();
            }
            $log.debug('enable wallet polling');
        };

        Wallet.prototype.setupInterval = function() {
            var self = this;

            if(self.noPolling || !CONFIG.POLL_INTERVAL_TRANSACTIONS) {
                return false;
            }

            self.interval = $interval(function() {
                $log.debug('Wallet.interval', $rootScope.STATE.ACTIVE);

                if ($rootScope.STATE.ACTIVE) {
                    self.pollTransactions();
                }
            }, CONFIG.POLL_INTERVAL_TRANSACTIONS);
        };

        /**
         * refill the offline address cache
         * @param max
         * @returns {*}
         */
        Wallet.prototype.refillOfflineAddresses = function(max) {
            var self = this;

            $log.debug('refill offline addresses');

            if (self.isRefilling) {
                $log.debug('refill in progress');
                return self.addressRefillPromise;
            }

            self.isRefilling = true;
            return self.addressRefillPromise = self.walletCache.get('addresses')
                .then(function(addressesDoc) {
                    return addressesDoc;
                }, function(e) {
                    return {_id: "addresses", available: []}
                })
                .then(function(addressesDoc) {
                    var refill = Wallet.OFFLINE_ADDRESSES - addressesDoc.available.length;
                    var cappedRefill = Math.min(refill, max, 5);

                    $log.debug('refill address by ' + cappedRefill);
                    if (cappedRefill > 0) {
                        return self.wallet.then(function(wallet) {
                            return Q.all(repeat(cappedRefill, function(i) {
                                return wallet.getNewAddress().then(function(result) {
                                    addressesDoc.available.push(result[0]);
                                });
                            })).then(function() {
                                // fetch doc again, might have been modified!
                                self.walletCache.get('addresses')
                                    .then(function(r) { return r; }, function(e) { return {_id: "addresses", available: []} })
                                    .then(function(_addressesDoc) {
                                        _addressesDoc.available = _addressesDoc.available.concat(addressesDoc.available).unique();
                                        return self.walletCache.put(_addressesDoc);
                                    })
                                    .then(function() {
                                        self.isRefilling = false;
                                        return true;
                                    });
                            })
                        });
                    } else {
                        self.isRefilling = false;
                        return true;
                    }
                })
                .catch(function(err) {
                    self.isRefilling = false;
                    return $q.reject(e);
                });
        };

        Wallet.prototype.getNewAddress = function() {
            var self = this;

            return self.getNewOfflineAddress().then(
                function(address) {
                    return address;
                },
                function(e) {
                    return self.wallet.then(function(wallet) {
                        return wallet.getNewAddress().then(
                            function(result) {
                                return result[0];
                            }
                        )
                    });
                }
            );
        };

        Wallet.prototype.getNewOfflineAddress = function() {
            var self = this;

            return self.walletCache.get('addresses')
                .then(function(addressesDoc) {
                    var address = addressesDoc.available.shift();
                    if (!address) {
                        $log.debug('no more offline address');
                        return $q.reject('no more offline addresses');
                    } else {
                        $log.debug('offline address', address);
                        return self.walletCache.put(addressesDoc)
                            .then(function() {
                                return address;
                            });
                    }
                },
                function(e) {
                    $log.error("no offline addresses available yet. " + e);
                    throw e;
                }
            );
        };

        Wallet.prototype.pollTransactions = function() {
            var self = this;
            var asyncData = {
                lastBlockHashDoc: null,         //last block hash checked
                newTransactions: null,          //list of new transactions since last block hash check
                confirmedTransactions: [],      //list of transactions that have just been confirmed
                historyDoc: null                //holds a list of all cached tx hashes
            };


            if (self.poll) {
                $log.debug('isPolling');
                return self.poll;
            }

            $log.debug('Wallet.pollTransactions');

            var t = (new Date).getTime();

            return self.poll = $q.when(self.wallet)
                .then(function(wallet) {
                    return self.historyCache.get('lastBlockHash')
                        .then(function(lastBlockHashDoc) {
                            return $q.when(lastBlockHashDoc);
                        }, function(err) {  //@TODO should we check the type of error (only 404 is relevant, anything else is baaaaad)
                            return $q.when({_id: "lastBlockHash", hash: null});
                        })
                        .then(function(lastBlockHashDoc) {
                            $log.debug('retrieve transactions ... lastBlockHash[' + lastBlockHashDoc.lastBlockHash + ']');
                            asyncData.lastBlockHashDoc = lastBlockHashDoc;
                            return wallet.transactions({sort_dir: 'desc', lastBlockHash: lastBlockHashDoc.lastBlockHash});
                        })
                        .then(function(results) {
                            asyncData.newTransactions = results.data;
                            asyncData.lastBlockHashDoc.lastBlockHash = results.lastBlockHash;
                            $log.debug("[" + (asyncData.newTransactions.length) + "] new transactions found");

                            if (!asyncData.newTransactions.length) {
                                //no new transactions...break out
                                return $q.reject(new blocktrail.WalletPollError('NO_TX'));
                            }

                            //get the cached list of all tx hashes (confirmed and unconfirmed)
                            return self.historyCache.get('history').then(function(historyDoc) {
                                return $q.when(historyDoc);
                            }, function(err) {
                                return $q.when({_id: "history", confirmed: [], unconfirmed: []});
                            });
                        })
                        .then(function(historyDoc) {
                            asyncData.historyDoc = historyDoc;
                            asyncData.historyDoc.old_unconfirmed = asyncData.historyDoc.unconfirmed || [];
                            asyncData.historyDoc.unconfirmed = [];  //clear old list of unctxs to update against current mempool

                            var newTransactions = [];

                            // add the new txs to the confirmed/unconfirmed historyDoc lists
                            //  using .forEach to make sure it's in chronological order
                            asyncData.newTransactions.forEach(function(transaction) {
                                var isNew = false;
                                var isUpdated = false;

                                if (transaction.block_height) {
                                    // add to confirmed list
                                    if (asyncData.historyDoc.confirmed.indexOf(transaction.hash) === -1) {
                                        asyncData.historyDoc.confirmed.unshift(transaction.hash);
                                        isNew = true;
                                    }

                                    // check if previously saved as unconfirmed and mark for "updating"
                                    var uncIdx = asyncData.historyDoc.old_unconfirmed.indexOf(transaction.hash);
                                    if (uncIdx !== -1) {
                                        isUpdated = true;
                                        isNew = false;
                                    }

                                    $log.debug('tx '+transaction.hash + " isNew: " + isNew + " isUpdated: " + isUpdated);
                                } else {
                                    // add to unconfirmed list
                                    if (asyncData.historyDoc.unconfirmed.indexOf(transaction.hash) === -1) {
                                        asyncData.historyDoc.unconfirmed.unshift(transaction.hash);
                                    }
                                    isNew = asyncData.historyDoc.old_unconfirmed.indexOf(transaction.hash) === -1;

                                    $log.debug('tx '+transaction.hash + " isNew: " + isNew + " isUnconfirmed: true");
                                }

                                if (isNew) {
                                    newTransactions.push(transaction);
                                }

                                if (isUpdated) {
                                    asyncData.confirmedTransactions.push(transaction);
                                }

                                // set properties for next loop
                                transaction.isNew = isNew;
                                transaction.isUpdated = isUpdated;
                            });

                            // use QforEachLimit to avoid blocking when storing docs
                            return QforEachLimit(
                                asyncData.newTransactions,
                                function(transaction) {
                                    var isNew = transaction.isNew;
                                    var isUpdated = transaction.isUpdated;

                                    // strip isNew/isUpdated properties because we don't want to store them
                                    delete transaction.isNew;
                                    delete transaction.isUpdated;

                                    return $q.when(transaction)
                                        .then(function(transaction) {
                                            if (isUpdated && !isNew) {
                                                // if the tx was previously unconfirmed, update the cache data and add to separate list of updated txs
                                                return self.historyCache.get(transaction.hash)
                                                    .then(function(txRow) {
                                                        txRow.data = transaction;   //will update the block height
                                                        return self.historyCache.put(txRow);
                                                    }, function(err) {
                                                        return self.historyCache.put({
                                                            _id: transaction.hash,
                                                            data: transaction
                                                        });
                                                    })
                                                    .then(function() {
                                                        return self.mergeContact(transaction);
                                                    });
                                            } else if (isNew) {
                                                // add the new tx data to the cache and return the tx merged with contact info
                                                return self.historyCache.get(transaction.hash)
                                                    .then(function(txRow) {
                                                        return $q.when(transaction);
                                                    }, function(err) {
                                                        return self.historyCache.put({
                                                            _id: transaction.hash,
                                                            data: transaction
                                                        });
                                                    })
                                                    .then(function() {
                                                        return self.mergeContact(transaction);
                                                    });
                                            } else {
                                                // this tx is old and will be cleaned out in the next step
                                                return null;
                                            }
                                        })
                                        .then(function() {
                                            // put properties back on
                                            transaction.isNew = isNew;
                                            transaction.isUpdated = isUpdated;
                                        })
                                    ;
                                })
                                .then(function() {
                                    return newTransactions;
                                })
                            ;
                        })
                        .then(function(newTransactions) {
                            // clean out null values (txs that are not new)
                            asyncData.historyDoc.unconfirmed = asyncData.historyDoc.unconfirmed.clean();
                            asyncData.newTransactions = newTransactions.clean();

                            //broadcast any new txs and update the caches
                            if (asyncData.newTransactions.length) {
                                $rootScope.$broadcast('new_transactions', asyncData.newTransactions);
                            }
                            if (asyncData.confirmedTransactions.length) {
                                $rootScope.$broadcast('confirmed_transactions', asyncData.confirmedTransactions);
                            }
                            return self.historyCache.put(asyncData.historyDoc);
                        })
                        .then(function() {
                            //save the last checked block hash
                            return self.historyCache.put(asyncData.lastBlockHashDoc);
                        })
                        .then(function(result) {
                            $log.debug('TX polling done in [' + ((new Date).getTime() - t) + 'ms]');
                            self.poll = null;
                            return $q.when(result);
                        });
                })
                .catch(function(err) {
                    $log.debug('TX polling stopped', err);
                    self.poll = null;

                    if (err.message === 'NO_TX') {
                        return $q.when(false);
                    } else if (err.message === 'ORPHAN') {
                        // ORPHAN means we need to resync (completely)
                        $rootScope.$broadcast('ORPHAN');
                        return self.reset();
                    } else {
                        throw err;
                    }
                });
        };

        Wallet.prototype.mergeContact = function(transaction) {
            var self = this;

            transaction.contact = null;

            if (transaction.contacts) {
                return Q.any(transaction.contacts.map(function(hash) {
                    return Contacts.findByHash(hash);
                })).then(
                    function(contact) {
                        transaction.contact = contact;
                        return transaction;
                    },
                    function() {
                        return transaction;
                    }
                );
            } else {
                return Q.when(transaction);
            }
        };

        /**
         * get cached transactions
         * @param from
         * @param limit
         * @returns {Promise}
         */
        Wallet.prototype.transactions = function(from, limit) {
            var self = this;

            var t = (new Date).getTime();
            $log.debug('Wallet.transactions');

            //default pagination
            if (!from) {
                from = 0;
            }
            if (!limit) {
                limit = 20;
            }
            var to = from + limit;

            //get all the transaction hashes
            return $q.when(self.historyCache.get('history'))
                .then(function(historyDoc) { return historyDoc; }, function() { return {_id: "history", confirmed: [], unconfirmed: []}; })
                .then(function(historyDoc) {
                    historyDoc.unconfirmed = historyDoc.unconfirmed || []; // tmp to migrate without errs

                    $log.debug('Wallet.transactions.history[' + historyDoc.confirmed.length + '][' + historyDoc.unconfirmed.length + ']');
                    //combine the un/confirmed txs, get their full data and merge contact info for each
                    return Q.all(historyDoc.unconfirmed.concat(historyDoc.confirmed).slice(from, to).map(function(hash) {
                        return self.historyCache.get(hash).then(function(row) {
                            return self.mergeContact(row.data);
                        });
                    }));
                })
                .then(function(transactions) {
                    $log.debug('Wallet.transactions.done', transactions.length, ((new Date).getTime() - t) / 1000);
                    return transactions;
                });
        };

        /**
         * get the wallet balance (defaults to live, can force getting a cached version)
         * @param getCached
         * @returns {*}
         */
        Wallet.prototype.balance = function(getCached) {
            var self = this;

            var forceFetch = !getCached;

            return self.walletCache.get('balance')
                .then(function(b) { return b; }, function() { forceFetch = true; return {_id: "balance", balance: 0, uncBalance: 0}; })
                .then(function(balanceDoc) {
                    if (forceFetch) {
                        return self.wallet.then(function(wallet) {
                            return wallet.getBalance().then(function(result) {
                                balanceDoc.balance = result[0];
                                balanceDoc.uncBalance = result[1];

                                return self.walletCache.put(balanceDoc).then(function() {
                                    return balanceDoc;
                                });
                            });
                        });
                    } else {
                        return balanceDoc;
                    }
                })
                // use a .then because a .done would break the promise chains that rely on self.wallet
                .then(function(balanceDoc) { return balanceDoc; }, function(e) { $log.error("balance ERR" + e); throw e; });
        };

        /**
         * get the current btc prices (defaults to live, can force getting a cached version)
         * @param getCached
         * @returns {*}
         */
        Wallet.prototype.price = function(getCached) {
            var self = this;

            var forceFetch = !getCached;

            return self.walletCache.get('price')
                .then(function(b) { return b; }, function() { forceFetch = true; return {_id: "price"}; })
                .then(function(pricesDoc) {
                    if (forceFetch) {
                        return self.sdk.then(function(sdk) {
                            return sdk.price().then(function(result) {
                                angular.extend(pricesDoc, result);

                                //store in cache and then return
                                return self.walletCache.put(pricesDoc).then(function() {
                                    return pricesDoc;
                                });
                            });
                        });
                    } else {
                        return pricesDoc;
                    }
                })
                // use a .then because a .done would break the promise chains that rely on self.wallet
                .then(function(pricesDoc) { return pricesDoc; }, function(e) { $log.error('prices ERR ' + e); throw e; });
        };

        /**
         * get the current block height (defaults to live, can force getting a cached version)
         * @param getCached
         * @returns {*}
         */
        Wallet.prototype.blockHeight = function(getCached) {
            var self = this;

            var forceFetch = !getCached;

            return self.walletCache.get('block_height')
                .then(function(b) { return b; }, function() { forceFetch = true; return {_id: "block_height", height: null}; })
                .then(function(blockHeightDoc) {
                    if (forceFetch) {
                        return self.sdk.then(function(sdk) {
                            return sdk.blockLatest().then(function(blockData) {
                                blockHeightDoc.height = blockData.height;

                                //store in cache and then return
                                return self.walletCache.put(blockHeightDoc).then(function() {
                                    return blockHeightDoc;
                                });
                            });
                        });
                    } else {
                        return blockHeightDoc;
                    }
                })
                // use a .then because a .done would break the promise chains that rely on self.wallet
                .then(function(blockHeightDoc) { return blockHeightDoc; }, function(e) { $log.error('height ERR' + e); throw e; });
        };

        var wallet = new Wallet();

        wallet.setupInterval();

        return wallet;
    }
);
