(function() {
    "use strict";

    var POUCHDB_ERR_CONFLICT = 409;

    angular.module("blocktrail.core")
        .factory("walletService", function($q, $timeout, bitcoinJS, sdkService, storageService, launchService,
                                           settingsService, Contacts, cryptoJS, CONFIG) {
            return new WalletService($q, $timeout, bitcoinJS, sdkService, storageService, launchService,
                settingsService, Contacts, cryptoJS, CONFIG);
        });

    function WalletService($q, $timeout, bitcoinJS, sdkService, storageService, launchService,
                           settingsService, Contacts, cryptoJS, CONFIG) {
        var self = this;

        self._$q = $q;
        self._$timeout = $timeout;
        self._bitcoinJS = bitcoinJS;
        self._cryptoJS = cryptoJS;
        self._sdkService = sdkService;
        self._storageService = storageService;
        self._launchService = launchService;
        self._settingsService = settingsService;
        self._contactsService = Contacts;
        self._CONFIG = CONFIG;
    }

    WalletService.prototype.initWallet = function(networkType, identifier, uniqueIdentifier) {
        var self = this;

        return self._$q.when(self._sdkService.getSdkByNetworkType(networkType))
            .then(self._sdkInitWallet.bind(self, identifier, networkType), self._errorHandler.bind(self))
            .then(self._initWallet.bind(self, networkType, uniqueIdentifier));
    };

    WalletService.prototype._sdkInitWallet = function(identifier, networkType, sdk) {
        var useCashAddress = this._CONFIG.NETWORKS[networkType].CASHADDRESS;
        return sdk.initWallet({
            identifier: identifier,
            readOnly: true,
            bypassNewAddressCheck: true,
            useCashAddress: useCashAddress
        });
    };

    WalletService.prototype._initWallet = function(networkType, uniqueIdentifier, sdkWallet) {
        var self = this;
        var wallet = new Wallet(sdkWallet, networkType, uniqueIdentifier, self._CONFIG.NETWORKS[networkType].TX_FILTER_MIN_BLOCK_HEIGHT,
            self._$q, self._$timeout, self._bitcoinJS, self._cryptoJS, self._launchService, self._storageService, self._settingsService,
            self._contactsService);

        return wallet.isReady;
    };

    WalletService.prototype._errorHandler = function(e) {
        throw new Error(e);
    };

    /**
     * WALLET CLASS

     * @constructor
     */
    // TODO Remove glidera transactions form the settings service and remove 'settingsService' from wallet
    // TODO Create a method for updating contacts and and remove 'contactsService' from wallet
    // TODO Or try to handle this in the avatar directive
    function Wallet(sdkWallet, networkType, uniqueIdentifier, TX_FILTER_MIN_BLOCK_HEIGHT, $q, $timeout, bitcoinJS, cryptoJS, launchService,
                    storageService, settingsService, contactsService) {
        var self = this;

        console.log("new Wallet", sdkWallet.identifier);

        self._$q = $q;
        self._$timeout = $timeout;
        self._bitcoinJS = bitcoinJS;
        self._cryptoJS = cryptoJS;
        self._launchService = launchService;
        self._contactsService = contactsService;
        self._settingsService = settingsService;
        self._TX_FILTER_MIN_BLOCK_HEIGHT = TX_FILTER_MIN_BLOCK_HEIGHT;

        self._isInitData = false;

        // Flags with promises
        self._pollPromise = null;
        self._pollTimeout = null;

        self._pollingInterval = 15000;
        self._noPolling = false;

        // Access to SDK and Storage
        self._sdkWallet = sdkWallet;
        self._walletStore = storageService.db("wallet");

        // Wallet data
        self._walletData = {
            transactions: [],
            balance: 0,
            uncBalance: 0,
            blockHeight: 0,
            identifier: self._sdkWallet.identifier,
            networkType: networkType,
            uniqueIdentifier: uniqueIdentifier
        };

        self.isReady = self._initData();

        // Read only wallet data object
        // the object would be shared
        self._readonlyDoc = {
            readonly: true
        };

        angular.forEach(self._walletData, function(value, key) {
            Object.defineProperty(self._readonlyDoc, key, {
                set: function() {
                    throw new Error("Blocktrail core module, wallet service. Read only object.");
                },
                get: function() {
                    return self._walletData[key];
                },
                enumerable: true
            });
        });

        // TODO Check it
        self._amountOfOfflineAddresses = 30;
        self.isRefilling = null;
        self.addressRefillPromise = null;
    }

    Wallet.prototype.getReadOnlyWalletData = function() {
        var self = this;

        return self._readonlyDoc;
    };

    Wallet.prototype.getSdkWallet = function() {
        var self = this;

        return self._sdkWallet;
    };

    Wallet.prototype.getSdk = function() {
        var self = this;

        return self._sdkWallet.sdk;
    };

    Wallet.prototype._initData = function() {
        var self = this;

        if (self._isInitData) {
            return self._$q.when(self);
        } else {
            return self._$q.when(self._getBalance())
                .then(self._pollTransactionsAndGetBlockHeight.bind(self))
                .then(self._getTransactions.bind(self))
                .then(function() {
                    self._isInitData = true;
                    return self._$q.when(self);
                });
        }
    };

    /**
     * START polling
     */

    /**
     * Disable polling
     */
    Wallet.prototype.disablePolling = function() {
        var self = this;
        console.log("disablePolling");

        if (self._pollTimeout) {
            self._$timeout.cancel(self._pollTimeout);
        }

        self._noPolling = true;
    };

    /**
     * Enable polling
     */
    Wallet.prototype.enablePolling = function() {
        var self = this;
        console.log("enablePolling");

        self._noPolling = false;

        self._pollTransactionsAndGetBlockHeight();
    };

    /**
     * Force polling
     */
    Wallet.prototype.forcePolling = function() {
        var self = this;
        console.log("forcePolling");

        if (self._pollTimeout) {
            self._$timeout.cancel(self._pollTimeout);
        }

        return self._pollTransactionsAndGetBlockHeight();
    };

    /**
     * Setup a timeout
     * @return { boolean }
     * @private
     */
    Wallet.prototype._setupTimeout = function() {
        var self = this;

        if (!self._noPolling) {
            if (self._pollTimeout) {
                self._$timeout.cancel(self._pollTimeout);
            }

            self._pollTimeout = self._$timeout(self._pollTransactionsAndGetBlockHeight.bind(self), self._pollingInterval);
        }

        return true;
    };

    /**
     * Poll transactions and get the block height
     * @return { promise }
     * @private
     */
    Wallet.prototype._pollTransactionsAndGetBlockHeight = function() {
        var self = this;

        if (self._pollPromise) {
            return self._pollPromise;
        }

        // TODO Add 'self.refillOfflineAddresses(1);' to polling
        return self._pollPromise = self._$q.all([self._pollTransactions(), self._getBlockHeight()])
            .then(self._resetPollPromise.bind(self))
            .then(self._setupTimeout.bind(self));
    };

    /**
     * END polling
     */

    /**
     * START Reset wallet data
     */

    /**
     * Reset the wallet data
     * @return { promise }
     * @private
     */
    Wallet.prototype._resetWalletData = function() {
        var self = this;
        console.log("_resetWalletData");

        return self._walletStore.allDocs({
            include_docs: true,
            attachments: true,
            startkey: self._sdkWallet.identifier,
            endkey: self._sdkWallet.identifier + "\ufff0"
        })
            .then(self._getAllWalletDocumentsSuccessHandler.bind(self));
    };

    /**
     * Get all wallet documents, the success handler
     * @return { promise }
     * @private
     */
    Wallet.prototype._getAllWalletDocumentsSuccessHandler = function(result) {
        var self = this;
        var promises = [];

        result.rows.forEach(function(row) {
            promises.push(self._deleteDocumentFromStorage(row.doc));
        });

        return self._$q.all(promises);
    };

    /**
     * Delete a document from the storage
     * @return { promise }
     * @private
     */
    Wallet.prototype._deleteDocumentFromStorage = function(doc) {
        var self = this;
        console.log("_deleteDocumentFromStorage");

        return self._walletStore.remove(doc);
    };

    /**
     * END Reset wallet data
     */

    /**
     * START Wallet balance
     */

    /**
     * Get the wallet balance
     * @returns _walletData { promise }
     * @private
     */
    Wallet.prototype._getBalance = function() {
        var self = this;
        console.log("_getBalance");

        return self._getBalanceFromStorage()
            .then(self._getBalanceFromSdkAndUpdateBalanceDoc.bind(self))
            .then(self._setBalanceToStorage.bind(self))
            .then(self._updateBalanceInWalletDataObject.bind(self), self._errorHandler);
    };

    /**
     * Get the balance document from the storage
     * @returns balanceDoc { promise } {{ _id: string, balance: number, uncBalance: number }}
     * @private
     */
    Wallet.prototype._getBalanceFromStorage = function() {
        var self = this;

        return self._$q.when(self._walletStore.get(self._getUniqueIdentifier("balance")))
            .catch(function() {
                return {
                    _id: self._getUniqueIdentifier("balance"),
                    balance: 0,
                    uncBalance: 0
                };
            });
    };

    /**
     * Get the balance from SDK and update the balance document
     * @param balanceDoc {{ _id: string, balance: number, uncBalance: number }}
     * @returns balanceDoc { promise } {{ _id: string, balance: number, uncBalance: number }}
     * @private
     */
    Wallet.prototype._getBalanceFromSdkAndUpdateBalanceDoc = function(balanceDoc) {
        var self = this;

        return self._$q.when(self._sdkWallet.getBalance())
            .then(function(result) {
                balanceDoc.balance = result[0];
                balanceDoc.uncBalance = result[1];

                return balanceDoc;
            })
            .catch(function() {
                return balanceDoc;
            });
    };

    /**
     * Set the balance document to the storage
     * @param balanceDoc {{ _id: string, balance: number, uncBalance: number }}
     * @returns balanceDoc { promise } {{ _id: string, balance: number, uncBalance: number }}
     * @private
     */
    Wallet.prototype._setBalanceToStorage = function(balanceDoc) {
        var self = this;

        return self._$q.when(self._walletStore.put(balanceDoc))
            .then(function() {
                return balanceDoc;
            }, function(e) {
                if (e.status === POUCHDB_ERR_CONFLICT) {
                    console.error("_setBalanceToStorage CONFLICT");
                }

                throw e;
            });
    };

    /**
     * Update balance in the wallet data object
     * @param balanceDoc {{ _id: string, balance: number, uncBalance: number }}
     * @returns _walletData { object }
     * @private
     */
    Wallet.prototype._updateBalanceInWalletDataObject = function(balanceDoc) {
        var self = this;

        self._walletData.balance = balanceDoc.balance;
        self._walletData.uncBalance = balanceDoc.uncBalance;

        return self._walletData;
    };

    /**
     * END Wallet balance
     */

    /**
     * START Block height
     */

    /**
     * Get the block height
     * @returns _walletData { promise }
     * @private
     */
    Wallet.prototype._getBlockHeight = function() {
        var self = this;
        console.log("_getBlockHeight");

        return self._getBlockHeightFromStorage()
            .then(self._getBlockHeightFromSdkAndUpdateBlockHeightDoc.bind(self))
            .then(self._setBlockHeightToStorage.bind(self))
            .then(self._updateBlockHeightInWalletDataObject.bind(self), self._errorHandler);
    };

    /**
     * Get the block height document from the storage
     * @returns balanceDoc { promise } {{ _id: string, height: string|null }}
     * @private
     */
    Wallet.prototype._getBlockHeightFromStorage = function() {
        var self = this;

        return self._$q.when(self._walletStore.get(self._getUniqueIdentifier("block-height")))
            .catch(function() {
                return {
                    _id: self._getUniqueIdentifier("block-height"),
                    height: null
                };
            })
            .then(function(doc) {
                console.log("_getBlockHeightFromStorage", doc.height, doc._rev);
                return doc;
            });
    };

    /**
     * Get the block height from SDK
     * @param blockHeightDoc {{ _id: string, height: string }}
     * @returns blockHeightDoc { promise } {{ _id: string, height: string }}
     * @private
     */
    Wallet.prototype._getBlockHeightFromSdkAndUpdateBlockHeightDoc = function(blockHeightDoc) {
        var self = this;

        return self._$q.when(self._sdkWallet.sdk.blockLatest())
            .then(function(result) {
                blockHeightDoc.height = result.height;
                return blockHeightDoc;
            })
            .catch(function() {
                return blockHeightDoc;
            });
    };

    /**
     * Set the block height document to the storage
     * @param blockHeightDoc { object }
     * @returns blockHeightDoc { promise } {{ _id: string, height: string }}
     * @private
     */
    Wallet.prototype._setBlockHeightToStorage = function(blockHeightDoc) {
        var self = this;
        console.log("_setBlockHeightToStorage", blockHeightDoc.height, blockHeightDoc._rev);

        return self._$q.when(self._walletStore.put(blockHeightDoc))
            .then(function() {
                return blockHeightDoc;
            }, function(e) {
                if (e.status === POUCHDB_ERR_CONFLICT) {
                    console.error("_setBlockHeightToStorage CONFLICT");
                }

                throw e;
            });
    };

    /**
     * Update block height in the wallet data object
     * @param blockHeightDoc {{ _id: string, height: string }}
     * @returns _walletData { object }
     * @private
     */
    Wallet.prototype._updateBlockHeightInWalletDataObject = function(blockHeightDoc) {
        var self = this;

        self._walletData.blockHeight = blockHeightDoc.height;

        return self._walletData;
    };

    /**
     * END Block height
     */

    /**
     * START Last block hash
     */

    /**
     * Get the last block hash document from the storage
     * @return { promise } {{ _id: string, hash: string|null }}
     * @private
     */
    Wallet.prototype._getLastBlockHashFromStorage = function() {
        var self = this;

        return self._walletStore.get(self._getUniqueIdentifier("last-block-hash"))
            .catch(function() {
                return {
                    _id: self._getUniqueIdentifier("last-block-hash"),
                    hash: null
                };
            });
    };

    /**
     * Set the last block hash to the storage
     * @param lastBlockHashDoc
     * @return lastBlockHashDoc { promise } {{ _id: string, hash: string }}
     * @private
     */
    Wallet.prototype._setLastBlockHashToStorage = function(lastBlockHashDoc) {
        var self = this;

        return self._walletStore.put(lastBlockHashDoc)
            .then(function() {
                return lastBlockHashDoc;
            }, function(e) {
                if (e.status === POUCHDB_ERR_CONFLICT) {
                    console.error("_setLastBlockHashToStorage CONFLICT");
                }

                throw e;
            });
    };

    /**
     * END Last block hash
     */

    /**
     * START Transactions
     */

    /**
     * Get transactions
     * @returns { promise }
     */
    Wallet.prototype._getTransactions = function() {
        var self = this;

        return self._$q.when(self._getTransactionsHistoryFromStorage())
            .then(self._prepareTransactionsList.bind(self))
            .then(self._processTransactionDocs.bind(self), self._errorHandler)
            .then(self._updateTransactionsList.bind(self));
    };

    /**
     * Poll transactions
     * @return { promise }
     */
    Wallet.prototype._pollTransactions = function() {
        var self = this;
        console.log("_pollTransactions");

        return self._$q.when(self._getLastBlockHashFromStorage())
        // We reject the promise if we do not have new transactions and handle it in '_pollTransactionsCatchHandler'
        // TODO review logic with reject, replace it with done
            .then(self._getTransactionsHistoryFromStorageAndTransactionsFromSdk.bind(self))
            .then(self._processTransactionsAndGetBalance.bind(self))
            .then(self._setLastBlockHashToStorageAndTransactionHistoryToStorage.bind(self))
            .then(self._addNewTransactionsToList.bind(self))
            .catch(self._pollTransactionsCatchHandler.bind(self));
    };

    /**
     * Get the transactions history document from the storage
     * @return { promise } {{ _id: string, confirmed: Array, unconfirmed: Array }}
     * @private
     */
    Wallet.prototype._getTransactionsHistoryFromStorage = function() {
        var self = this;

        return self._walletStore.get(self._getUniqueIdentifier("transactions-history"))
            .catch(function() {
                return {
                    _id: self._getUniqueIdentifier("transactions-history"),
                    confirmed: [],
                    unconfirmed: []
                };
            });
    };

    /**
     * Set the transaction history document to the storage
     * @param transactionsHistoryDoc
     * @return transactionsHistoryDoc { promise } {{ _id: string, confirmed: Array, unconfirmed: Array }}
     * @private
     */
    Wallet.prototype._setTransactionHistoryToStorage = function(transactionsHistoryDoc) {
        var self = this;

        return self._walletStore.put(transactionsHistoryDoc)
            .then(function() {
                return transactionsHistoryDoc;
            }, function(e) {
                if (e.status === POUCHDB_ERR_CONFLICT) {
                    console.error("_setTransactionHistoryToStorage CONFLICT");
                }

                throw e;
            });
    };

    /**
     * Set the transaction document to the storage
     * @param transactionDoc
     * @return transactionDoc { promise } {{ _id: string, data: object }}
     * @private
     */
    Wallet.prototype._setTransactionToStorage = function(transactionDoc) {
        var self = this;

        return self._$q.when(self._walletStore.put(transactionDoc))
            .then(function() {
                return transactionDoc;
            }, function(e) {
                if (e.status === POUCHDB_ERR_CONFLICT) {
                    console.error("_setTransactionToStorage[" + transactionDoc.data.hash + "] CONFLICT");
                }

                throw e;
            });
    };

    /**
     * Get the transactions from the sdk
     * @return { promise } {{ lastBlockHash: string, data: Array }}
     * @private
     */
    Wallet.prototype._getTransactionsFromSdk = function(lastBlockHash) {
        var self = this;

        var params = {
            sort_dir: "desc",
            lastBlockHash: lastBlockHash
        };

        return self._$q.when(self._sdkWallet.transactions(params))
            .then(function(results) {
                // TODO review, remove "reject"
                if (!results.data.length) {
                    // no new transactions...break out
                    return self._$q.reject(new blocktrail.WalletPollError("NO_TX"));
                }

                return results;
            });
    };

    /**
     * Get the transaction history from the storage and the transactions from the sdk
     * @param lastBlockHashDoc
     * @return { promise } [lastBlockHashDoc, transactionHistoryDoc, transactionsFromSdkResult]
     * @private
     */
    Wallet.prototype._getTransactionsHistoryFromStorageAndTransactionsFromSdk = function(lastBlockHashDoc) {
        var self = this;
        console.log("_getTransactionsHistoryFromStorageAndTransactionsFromSdk");

        return self._$q.all([
            self._$q.when(lastBlockHashDoc),
            self._getTransactionsHistoryFromStorage(),
            self._getTransactionsFromSdk(lastBlockHashDoc.hash)
        ]);
    };

    /**
     * Process transactions and get balance
     * @return { promise } {{ newTransactions: array, confirmedTransactions: array, lastBlockHashDoc: object, transactionHistoryDoc: object }}
     * @private
     */
    Wallet.prototype._processTransactionsAndGetBalance = function(data) {
        var self = this;
        console.log("_processTransactionsAndGetBalance");

        return self._$q.all([self._processTransactions(data), self._getBalance()])
            .then(function(results) {
                return results[0];
            });
    };

    /**
     * Process transactions
     * @param data [lastBlockHashDoc, transactionsHistoryHistory, transactionsFromSdkResult]
     * @return { promise } {{ newTransactions: array, confirmedTransactions: array, lastBlockHashDoc: object, transactionHistoryDoc: object }}
     * @private
     */
    Wallet.prototype._processTransactions = function(data) {
        var self = this;
        console.log("_processTransactions");

        var lastBlockHashDoc = data[0];
        var transactionHistoryDoc = data[1];
        var transactions = data[2].data;

        var oldUnconfirmed = transactionHistoryDoc.unconfirmed;
        var newTransactions = [];
        var confirmedTransactions = [];
        var promises = [];

        // Update last block hash doc
        lastBlockHashDoc.hash = data[2].lastBlockHash;

        // Clear old list of unconfirmed transactions to update against current mempool
        transactionHistoryDoc.unconfirmed = [];

        // Add new transactions to the confirmed/unconfirmed historyDoc lists
        transactions.forEach(function(transaction) {
            if (transaction.block_height) {
                // Check if previously saved as unconfirmed and update is
                if (oldUnconfirmed.indexOf(transaction.hash) !== -1) {
                    transactionHistoryDoc.confirmed.unshift(transaction.hash);
                    confirmedTransactions.push(transaction);
                    promises.push(self._updateTransaction(transaction));
                    // Add new confirmed transaction to the list
                } else if (transactionHistoryDoc.confirmed.indexOf(transaction.hash) === -1) {
                    transactionHistoryDoc.confirmed.unshift(transaction.hash);
                    newTransactions.push(transaction);
                    promises.push(self._addTransaction(transaction));
                }
            } else {
                // Add to unconfirmed list
                if (transactionHistoryDoc.unconfirmed.indexOf(transaction.hash) === -1) {
                    transactionHistoryDoc.unconfirmed.unshift(transaction.hash);
                }

                // Check old unconfirmed to see if it's new
                if (oldUnconfirmed.indexOf(transaction.hash) === -1) {
                    newTransactions.push(transaction);
                    promises.push(self._addTransaction(transaction));
                }
            }
        });

        return self._$q.all(promises)
            .then(function() {
                return {
                    newTransactions: newTransactions,
                    confirmedTransactions: confirmedTransactions,
                    lastBlockHashDoc: lastBlockHashDoc,
                    transactionHistoryDoc: transactionHistoryDoc
                };
            });
    };

    /**
     * Get the transaction document from the storage
     * @param transactionHash
     * @param transaction (optional)
     * @return { promise } {{ _id: string, data: object }}
     * @private
     */
    Wallet.prototype._getTransactionFromStorageByHash = function(transactionHash, transaction) {
        var self = this;

        return self._$q.when(self._walletStore.get(self._getUniqueIdentifier("transaction", transactionHash)))
            .catch(function() {
                return {
                    _id: self._getUniqueIdentifier("transaction", transaction.hash),
                    data: transaction ? transaction : {}
                };
            });
    };

    /**
     * Add the new transaction
     * @param transaction
     * @return transactionDoc { promise } {{ _id: string, data: object }}
     * @private
     */
    Wallet.prototype._addTransaction = function(transaction) {
        var self = this;

        return self._setTransactionToStorage({
            _id: self._getUniqueIdentifier("transaction", transaction.hash),
            data: transaction
        });
    };

    /**
     * Update the saved transaction
     * @param transaction
     * @return transactionDoc { promise } {{ _id: string, data: object }}
     * @private
     */
    Wallet.prototype._updateTransaction = function(transaction) {
        var self = this;

        return self._getTransactionFromStorageByHash(transaction.hash, transaction)
            .then(self._updateTransactionDoc.bind(self, transaction))
            .then(self._setTransactionToStorage.bind(self));
    };

    /**
     * Update the transaction document
     * @param transactionData
     * @param transactionDoc
     * @return {*}
     * @private
     */
    Wallet.prototype._updateTransactionDoc = function(transactionData, transactionDoc) {
        transactionDoc.data = transactionData;

        return transactionDoc;
    };

    /**
     * Reset the pool promise flag
     * @return { boolean }
     * @private
     */
    Wallet.prototype._resetPollPromise = function() {
        var self = this;

        self._pollPromise = null;

        return true;
    };

    /**
     * Set the last block hash and the transactions history to the storage
     * @param data {{ newTransactions: array, confirmedTransactions: array, lastBlockHashDoc: object, transactionHistoryDoc: object }}
     * @return { promise } {{ newTransactions: array, confirmedTransactions: array, lastBlockHashDoc: object, transactionHistoryDoc: object }}
     * @private
     */
    Wallet.prototype._setLastBlockHashToStorageAndTransactionHistoryToStorage = function(data) {
        var self = this;
        console.log("_setLastBlockHashToStorageAndTransactionHistoryToStorage");

        return self._$q.all([self._setLastBlockHashToStorage(data.lastBlockHashDoc), self._setTransactionHistoryToStorage(data.transactionHistoryDoc)])
            .then(function() {
                return data.transactionHistoryDoc;
            });
    };

    /**
     * Poll transactions catch handler
     * @param e
     * @private
     */
    Wallet.prototype._pollTransactionsCatchHandler = function(e) {
        var self = this;
        console.log("_pollTransactionsCatchHandler", e.message);

        if (e.message === "NO_TX") {
            return self._$q.when(true);
        } else if (e.message === "ORPHAN") {
            console.error("ORPHAN");

            // ORPHAN means we need to resync (completely)
            return self._resetWalletData()
                .then(function() {
                    return self._$q.when(self._getBalance.bind(self))
                        .then(self._getBlockHeight.bind(self))
                        .then(self._pollTransactions.bind(self));
                });
        } else {
            self._errorHandler(e);
        }
    };

    /**
     * Broadcast new and confirmed transactions
     * @param transactionHistoryDoc
     * @return { promise }
     * @private
     */
    Wallet.prototype._addNewTransactionsToList = function(transactionHistoryDoc) {
        var self = this;

        return self._$q.when(self._prepareTransactionsList(transactionHistoryDoc))
            .then(self._processTransactionDocs.bind(self), self._errorHandler)
            .then(self._updateTransactionsList.bind(self));
    };

    /**
     * Prepare transactions list
     * @param transactionHistoryDoc
     * @returns { promise }
     * @private
     */
    Wallet.prototype._prepareTransactionsList = function(transactionHistoryDoc) {
        var self = this;
        var list = transactionHistoryDoc.unconfirmed.concat(transactionHistoryDoc.confirmed);
        var promises = [];

        list.forEach(function(transactionHash) {
            promises.push(self._getTransactionFromStorageByHash(transactionHash));
        });

        return self._$q.all(promises);
    };

    /**
     * Process the transaction documents list
     * @param transactionDocs
     * @returns transactionDoc.data { array }
     * @private
     */
    Wallet.prototype._processTransactionDocs = function(transactionDocs) {
        return transactionDocs.map(function(transactionDoc) {
            return transactionDoc.data;
        });
    };

    /**
     * Update the transaction list
     * @param transactions
     * @private
     */
    Wallet.prototype._updateTransactionsList = function(transactions) {
        var self = this;

        // TODO Create a method and call it on new contacts
        return self._extentTransactionsWithContactsAndGlideraData(transactions)
            .then(function() {
                if (self._TX_FILTER_MIN_BLOCK_HEIGHT) {
                    transactions = transactions.filter(function(transaction) {
                        return transaction.block_height === null || transaction.block_height >= self._TX_FILTER_MIN_BLOCK_HEIGHT;
                    });
                }

                self._walletData.transactions
                    .splice
                    .apply(self._walletData.transactions, [0, self._walletData.transactions.length]
                        .concat(transactions)
                    );

                return self._walletData;
            });
    };

    /**
     * Extent the transactions with contacts data and glidera data
     * TODO Move glidera transactions to the wallet and review this piece of hell
     * @param transactions
     * @private
     */
    Wallet.prototype._extentTransactionsWithContactsAndGlideraData = function(transactions) {
        var self = this;

        return self._settingsService.initSettings()
            .then(function(settings) {
                var promises = [];
                var completeGlideraTransactions = settings.glideraTransactions.filter(function(item) {
                    return !!item.transactionHash || item.status === "COMPLETE";
                });

                transactions.forEach(function(transaction) {
                    // Add contact data
                    if (transaction.contacts.length) {
                        // Take the first contact from contacts list
                        promises.push(self._addContactToTransaction(transaction, transaction.contacts[0]));
                    } else {
                        transaction.contact = null;
                    }

                    var updateGlideraTransactions = false;

                    // Add Glidera data
                    if (completeGlideraTransactions.length) {
                        completeGlideraTransactions.forEach(function(glideraTxInfo) {
                            // check if transaction hash matches
                            var isTxhash = glideraTxInfo.transactionHash && glideraTxInfo.transactionHash === transaction.hash;
                            // check if address matches
                            var isAddr = glideraTxInfo.address && transaction.self_addresses.indexOf(glideraTxInfo.address) !== -1;

                            // if address matches but there's no transactionHash then we 'fix' it
                            //  sometimes this happens when the glidera API is slow to update
                            if (!glideraTxInfo.transactionHash && isAddr) {
                                glideraTxInfo.transactionHash = transaction.hash;
                                isTxhash = true;
                            }

                            // add metadata if it's a match
                            if (isTxhash) {
                                transaction.buybtc = {
                                    broker: "glidera",
                                    qty: glideraTxInfo.qty,
                                    currency: glideraTxInfo.currency,
                                    price: glideraTxInfo.price
                                };

                                // set the walletIdentifier to our wallet if it wasn't already set (old TXs)
                                if (!glideraTxInfo.walletIdentifier) {
                                    glideraTxInfo.walletIdentifier = self._sdkWallet.identifier;
                                    updateGlideraTransactions = true;
                                }
                            }
                        });
                    }

                    // trigger update if we modified data
                    if (updateGlideraTransactions) {
                        return self._settingsService.updateGlideraTransactions(settings.glideraTransactions);
                    }
                });

                return self._$q.all(promises)
                    .then(function() {
                        return transactions;
                    });

            });
    };

    /**
     * Add contact to transaction
     * @param transaction
     * @param contactHash
     * @private
     */
    Wallet.prototype._addContactToTransaction = function(transaction, contactHash) {
        var self = this;

        return self._contactsService.findByHash(contactHash)
            .then(function(contact) {
                if (contact) {
                    transaction.contact = contact;
                } else {
                    transaction.contact = null;
                }
            }, function() {
                transaction.contact = null;
            });
    };

    /**
     * END Transactions
     */

    /**
     * Get a unique id
     * @param type { string }
     * @param id { string= } only for the transactions
     * @return { string }
     * @private
     */
    Wallet.prototype._getUniqueIdentifier = function(type, id) {
        var idWithPrefix;
        var self = this;

        switch (type) {
            // +++
            case "balance":
                idWithPrefix = self._walletData.uniqueIdentifier + ":bc";
                break;
            // +++
            case "block-height":
                idWithPrefix = self._walletData.uniqueIdentifier + ":bh";
                break;
            case "addresses":
                idWithPrefix = self._walletData.uniqueIdentifier + ":ad";
                break;
            // +++
            case "transaction":
                if (!id) {
                    self._errorHandler({
                        message: "method _addIdPrefix, id for transaction should be defined"
                    });
                }
                idWithPrefix = self._walletData.uniqueIdentifier + ":tx:" + id;
                break;
            // +++
            case "transactions-history":
                idWithPrefix = self._walletData.uniqueIdentifier + ":th";
                break;
            // +++
            case "last-block-hash":
                idWithPrefix = self._walletData.uniqueIdentifier + ":lh";
                break;
            default:
                self._errorHandler({
                    message: "method _addIdPrefix, type of prefix should be defined"
                });
        }

        return idWithPrefix;
    };

    /**
     * Error handler
     * @param e {error}
     * @private
     */
    Wallet.prototype._errorHandler = function(e) {
        throw new Error("Class Wallet : " + e.message ? e.message : "");
    };

    /**
     *
     * @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
     * @@@@     @@@@@@@@@@@@@@@@@@@@@@@     @@@@
     * @@@@@@@@@@@@@@  @@@@  @@@  @@@@@@@@@@@@@@
     * @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
     *
     * TODO Review later
     *
     */
    Wallet.prototype.validateAddress = function(address) {
        var self = this;

        return self._$q.when(self._sdkWallet)
            .then(function(wallet) {
                return wallet.decodeAddress(address).address
            });
    };

    Wallet.prototype.unlockDataWithPin = function(pin) {
        var self = this;

        return self._launchService.getWalletInfo()
            .then(function(walletInfo) {
                var password, secret;

                try {
                    if (walletInfo.encryptedSecret) {
                        secret = self._cryptoJS.AES.decrypt(walletInfo.encryptedSecret, pin).toString(self._cryptoJS.enc.Utf8);
                    } else {
                        password = self._cryptoJS.AES.decrypt(walletInfo.encryptedPassword, pin).toString(self._cryptoJS.enc.Utf8);
                    }
                } catch (e) {
                    throw new blocktrail.WalletPinError(e.message);
                }

                if (!password && !secret) {
                    throw new blocktrail.WalletPinError("Bad PIN");
                }

                return {
                    identifier: walletInfo.identifier,
                    networkType: walletInfo.networkType,
                    secret: secret,
                    password: password
                };
            });
    };

    Wallet.prototype.unlockWithPin = function(pin) {
        var self = this;

        return self._$q.when(self._sdkWallet)
            .then(function(wallet) {
                return self.unlockDataWithPin(pin)
                    .then(function(unlock) {
                        if (unlock.secret) {
                            // secret needs to be buffer for the SDK to unlock
                            unlock.secret = new blocktrailSDK.Buffer(unlock.secret, 'hex');
                        }

                        return wallet.unlock(unlock).then(function() {
                            // if we were still storing encrypted password we want to switch to storing encrypted secret
                            if (!unlock.secret) {
                                var secretHex = wallet.secret.toString('hex');

                                // store encrypted secret
                                return self._launchService.setWalletInfo({
                                        identifier: wallet.identifier,
                                        networkType: self._walletData.networkType,
                                        encryptedSecret: self._cryptoJS.AES.encrypt(secretHex, pin).toString(),
                                        encryptedPassword: null
                                    })
                                    .then(function () {
                                        return self._sdkWallet;
                                    });
                            } else {
                                return self._sdkWallet;
                            }
                        });
                });
        });
    };

    Wallet.prototype.unlockWithPassword = function(password) {
        var self = this;

        return self._$q.when(self._sdkWallet)
            .then(function(wallet) {
                return wallet.unlock({
                    password: password
                })
                    .then(function() {
                        return wallet;
                    });
            });
    };

    Wallet.prototype.refillOfflineAddresses = function(max) {
        var self = this;

        if (self.isRefilling) {
            // $log.debug('refill in progress');
            return self.addressRefillPromise;
        }

        self.isRefilling = true;

        return self.addressRefillPromise = self._walletStore.get(self._getUniqueIdentifier("addresses"))
            .then(function(addressesDoc) {
                return addressesDoc;
            }, function() {
                return {
                    _id: self._getUniqueIdentifier("addresses"),
                    available: []
                };
            })
            .then(function(addressesDoc) {
                var refill = self._amountOfOfflineAddresses - addressesDoc.available.length;
                var cappedRefill = Math.min(refill, max, 5);
                
                var chainIdx = null;
                if (self._walletData.networkType === "BCC") {
                    chainIdx = blocktrailSDK.Wallet.CHAIN_BCC_DEFAULT;
                } else if (self._walletData.networkType === "BTC") {
                    chainIdx = blocktrailSDK.Wallet.CHAIN_BTC_DEFAULT;
                }
                // $log.debug('refill address by ' + cappedRefill);
                if (cappedRefill > 0) {
                    return Q.all(repeat(cappedRefill, function(i) {
                        return self._sdkWallet.getNewAddress(chainIdx).then(function(result) {
                            addressesDoc.available.push(result[0]);
                        });
                    })).then(function() {
                        // fetch doc again, might have been modified!
                        self._walletStore.get(self._getUniqueIdentifier("addresses"))
                            .then(function(r) {
                                return r;
                            }, function(e) {
                                return {
                                    _id: self._getUniqueIdentifier("addresses"),
                                    available: []
                                };
                            })
                            .then(function(_addressesDoc) {
                                _addressesDoc.available = _addressesDoc.available.concat(addressesDoc.available).unique();
                                return self._walletStore.put(_addressesDoc)
                                    .catch(function(e) {
                                        if (e.status === POUCHDB_ERR_CONFLICT) {
                                            console.error("refillOfflineAddresses CONFLICT");
                                        }

                                        throw e;
                                    });
                            })
                            .then(function() {
                                self.isRefilling = false;
                                return true;
                            });
                    });
                } else {
                    self.isRefilling = false;
                    return true;
                }
            })
            .catch(function(err) {
                self.isRefilling = false;
                return self._$q.reject(e);
            });
    };

    Wallet.prototype.getNewAddress = function(chainIdx) {
        var self = this;

        return self.getNewOfflineAddress().then(
            function(address) {
                return address;
            },
            function() {
                return self._sdkWallet.getNewAddress(chainIdx).then(function(result) {
                    return result[0];
                });
            }
        );
    };

    Wallet.prototype.getNewOfflineAddress = function() {
        var self = this;

        return self._walletStore.get(self._getUniqueIdentifier("addresses"))
            .then(function(addressesDoc) {
                    var address = addressesDoc.available.shift();
                    if (!address) {
                        // $log.debug('no more offline address');
                        return self._$q.reject("no more offline addresses");
                    } else {
                        // $log.debug('offline address', address);
                        return self._walletStore.put(addressesDoc)
                            .then(function() {
                                return address;
                            }, function(e) {
                                if (e.status === POUCHDB_ERR_CONFLICT) {
                                    console.error("getNewOfflineAddress CONFLICT");
                                }

                                throw e;
                            });
                    }
                },
                function(e) {
                    // $log.error("no offline addresses available yet. " + e);
                    throw e;
                }
            );
    };

})();
