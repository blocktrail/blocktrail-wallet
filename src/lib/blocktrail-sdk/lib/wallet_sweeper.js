var UnspentOutputFinder = require('./unspent_output_finder');
var bitcoin = require('bitcoinjs-lib');
var bip39 = require("bip39");
var CryptoJS = require('crypto-js');
var blocktrail = require('./blocktrail');
var EncryptionMnemonic = require('./encryption_mnemonic');
var Encryption = require('./encryption');
var walletSDK = require('./wallet');
var _ = require('lodash');
var q = require('q');
var async = require('async');

/**
 *
 * @param backupData
 * @param bitcoinDataClient
 * @param options
 * @constructor
 */
var WalletSweeper = function(backupData, bitcoinDataClient, options) {
    /* jshint -W071, -W074 */
    var self = this;
    this.defaultSettings = {
        network: 'btc',
        testnet: false,
        logging: false,
        bitcoinCash: false,
        sweepBatchSize: 200
    };
    this.settings = _.merge({}, this.defaultSettings, options);
    this.bitcoinDataClient = bitcoinDataClient;
    this.utxoFinder = new UnspentOutputFinder(bitcoinDataClient, this.settings);
    this.sweepData = null;

    // set the bitcoinlib network
    if (typeof options.network === "object") {
        this.network = options.network;
    } else {
        this.network = this.getBitcoinNetwork(this.settings.network, this.settings.testnet);
    }

    backupData.walletVersion = backupData.walletVersion || 2;   //default to version 2 wallets

    var usePassword = false;

    // validate backup data, cleanup input, and prepare seeds
    if (!Array.isArray(backupData.blocktrailKeys)) {
        throw new Error('blocktrail pub keys are required (must be type Array)');
    }

    switch (backupData.walletVersion) {
        case 1:
            if (typeof backupData.primaryMnemonic === "undefined" || !backupData.primaryMnemonic) {
                throw new Error('missing primary mnemonic for version 1 wallet');
            }
            if (typeof backupData.backupMnemonic === "undefined" || !backupData.backupMnemonic) {
                throw new Error('missing backup mnemonic for version 1 wallet');
            }
            if (typeof backupData.primaryPassphrase === "undefined") {
                throw new Error('missing primary passphrase for version 1 wallet');
            }

            // cleanup copy paste errors from mnemonics
            backupData.primaryMnemonic = backupData.primaryMnemonic.trim()
                .replace(new RegExp("\r\n", 'g'), " ")
                .replace(new RegExp("\n", 'g'), " ")
                .replace(/\s+/g, " ");
            backupData.backupMnemonic = backupData.backupMnemonic.trim()
                .replace(new RegExp("\r\n", 'g'), " ")
                .replace(new RegExp("\n", 'g'), " ")
                .replace(/\s+/g, " ");
        break;

        case 2:
        case 3:
            if (typeof backupData.encryptedPrimaryMnemonic === "undefined" || !backupData.encryptedPrimaryMnemonic) {
                throw new Error('missing encrypted primary seed for version 2 wallet');
            }
            if (typeof backupData.backupMnemonic === "undefined" || (!backupData.backupMnemonic && backupData.backupMnemonic !== false)) {
                throw new Error('missing backup seed for version 2 wallet');
            }
            //can either recover with password and password encrypted secret, or with encrypted recovery secret and a decryption key
            usePassword = typeof backupData.password !== "undefined" && backupData.password !== null;
            if (usePassword) {
                if (typeof backupData.passwordEncryptedSecretMnemonic === "undefined" || !backupData.passwordEncryptedSecretMnemonic) {
                    throw new Error('missing password encrypted secret for version 2 wallet');
                }
                if (typeof backupData.password === "undefined") {
                    throw new Error('missing primary passphrase for version 2 wallet');
                }
            } else {
                if (typeof backupData.encryptedRecoverySecretMnemonic === "undefined" || !backupData.encryptedRecoverySecretMnemonic) {
                    throw new Error('missing encrypted recovery secret for version 2 wallet (recovery without password)');
                }
                if (!backupData.recoverySecretDecryptionKey) {
                    throw new Error('missing recovery secret decryption key for version 2 wallet (recovery without password)');
                }
            }

            // cleanup copy paste errors from mnemonics
            backupData.encryptedPrimaryMnemonic = backupData.encryptedPrimaryMnemonic.trim()
                .replace(new RegExp("\r\n", 'g'), " ")
                .replace(new RegExp("\n", 'g'), " ")
                .replace(/\s+/g, " ");
            backupData.backupMnemonic = (backupData.backupMnemonic || "").trim()
                .replace(new RegExp("\r\n", 'g'), " ")
                .replace(new RegExp("\n", 'g'), " ")
                .replace(/\s+/g, " ");
            if (backupData.recoverySecretDecryptionKey) {
                backupData.recoverySecretDecryptionKey = backupData.recoverySecretDecryptionKey.trim()
                    .replace(new RegExp("\r\n", 'g'), " ")
                    .replace(new RegExp("\n", 'g'), " ")
                    .replace(/\s+/g, " ");
            }
            if (usePassword) {
                backupData.passwordEncryptedSecretMnemonic = backupData.passwordEncryptedSecretMnemonic.trim()
                    .replace(new RegExp("\r\n", 'g'), " ").replace(new RegExp("\n", 'g'), " ").replace(/\s+/g, " ");
            } else {
                backupData.encryptedRecoverySecretMnemonic = backupData.encryptedRecoverySecretMnemonic.trim()
                    .replace(new RegExp("\r\n", 'g'), " ").replace(new RegExp("\n", 'g'), " ").replace(/\s+/g, " ");
            }

        break;

        default:
            throw new Error('Wrong version [' + backupData.walletVersion + ']');
    }


    // create BIP32 HDNodes for the Blocktrail public keys
    this.blocktrailPublicKeys = {};
    _.each(backupData.blocktrailKeys, function(blocktrailKey) {
        self.blocktrailPublicKeys[blocktrailKey['keyIndex']] = bitcoin.HDNode.fromBase58(blocktrailKey['pubkey'], self.network);
    });

    // convert the primary and backup mnemonics to seeds (using BIP39)
    var primarySeed, backupSeed, secret;
    switch (backupData.walletVersion) {
        case 1:
            primarySeed = bip39.mnemonicToSeed(backupData.primaryMnemonic, backupData.primaryPassphrase);
            backupSeed = bip39.mnemonicToSeed(backupData.backupMnemonic, "");
        break;

        case 2:
            // convert mnemonics to hex (bip39) and then base64 for decryption
            backupData.encryptedPrimaryMnemonic = blocktrail.convert(bip39.mnemonicToEntropy(backupData.encryptedPrimaryMnemonic), 'hex', 'base64');
            if (usePassword) {
                backupData.passwordEncryptedSecretMnemonic = blocktrail.convert(
                    bip39.mnemonicToEntropy(backupData.passwordEncryptedSecretMnemonic), 'hex', 'base64');
            } else {
                backupData.encryptedRecoverySecretMnemonic = blocktrail.convert(
                    bip39.mnemonicToEntropy(backupData.encryptedRecoverySecretMnemonic), 'hex', 'base64');
            }

            // decrypt encryption secret
            if (usePassword) {
                secret = CryptoJS.AES.decrypt(backupData.passwordEncryptedSecretMnemonic, backupData.password).toString(CryptoJS.enc.Utf8);
            } else {
                secret = CryptoJS.AES.decrypt(backupData.encryptedRecoverySecretMnemonic, backupData.recoverySecretDecryptionKey).toString(CryptoJS.enc.Utf8);
            }

            if (!secret) {
                throw new Error("Could not decrypt secret with " + (usePassword ? "password" : "decryption key"));
            }

            // now finally decrypt the primary seed and convert to buffer (along with backup seed)
            primarySeed = new Buffer(CryptoJS.AES.decrypt(backupData.encryptedPrimaryMnemonic, secret).toString(CryptoJS.enc.Utf8), 'base64');

            if (backupData.backupMnemonic) {
                backupSeed = new Buffer(bip39.mnemonicToEntropy(backupData.backupMnemonic), 'hex');
            }

        break;

        case 3:
            // convert mnemonics to hex (bip39) and then base64 for decryption
            backupData.encryptedPrimaryMnemonic = EncryptionMnemonic.decode(backupData.encryptedPrimaryMnemonic);
            if (usePassword) {
                backupData.passwordEncryptedSecretMnemonic = EncryptionMnemonic.decode(backupData.passwordEncryptedSecretMnemonic);
            } else {
                backupData.encryptedRecoverySecretMnemonic = EncryptionMnemonic.decode(backupData.encryptedRecoverySecretMnemonic);
            }

            // decrypt encryption secret
            if (usePassword) {
                secret = Encryption.decrypt(backupData.passwordEncryptedSecretMnemonic, new Buffer(backupData.password));
            } else {
                secret = Encryption.decrypt(backupData.encryptedRecoverySecretMnemonic, new Buffer(backupData.recoverySecretDecryptionKey, 'hex'));
            }

            if (!secret) {
                throw new Error("Could not decrypt secret with " + (usePassword ? "password" : "decryption key"));
            }

            // now finally decrypt the primary seed and convert to buffer (along with backup seed)
            primarySeed = Encryption.decrypt(backupData.encryptedPrimaryMnemonic, secret);
            if (backupData.backupMnemonic) {
                backupSeed = new Buffer(bip39.mnemonicToEntropy(backupData.backupMnemonic), 'hex');
            }

        break;

        default:
            throw new Error('Wrong version [' + backupData.walletVersion + ']');
    }

    // convert the primary and backup seeds to private keys (using BIP32)
    this.primaryPrivateKey = bitcoin.HDNode.fromSeedBuffer(primarySeed, this.network);

    if (backupSeed) {
        this.backupPrivateKey = bitcoin.HDNode.fromSeedBuffer(backupSeed, this.network);
        this.backupPublicKey = this.backupPrivateKey.neutered();
    } else {
        this.backupPrivateKey = false;
        this.backupPublicKey = bitcoin.HDNode.fromBase58(backupData.backupPublicKey, this.network);
    }

    if (this.settings.logging) {
        console.log('using password method: ' + usePassword);
        console.log("Primary Prv Key: " + this.primaryPrivateKey.toBase58());
        console.log("Primary Pub Key: " + this.primaryPrivateKey.neutered().toBase58());
        console.log("Backup Prv Key: " + (this.backupPrivateKey ? this.backupPrivateKey.toBase58() : null));
        console.log("Backup Pub Key: " + this.backupPublicKey.toBase58());
    }
};


/**
 * returns an appropriate bitcoin-js lib network
 *
 * @param network
 * @param testnet
 * @returns {*[]}
 */
WalletSweeper.prototype.getBitcoinNetwork =  function(network, testnet) {
    switch (network.toLowerCase()) {
        case 'btc':
        case 'bitcoin':
            if (testnet) {
                return bitcoin.networks.testnet;
            } else {
                return bitcoin.networks.bitcoin;
            }
        break;
        case 'tbtc':
        case 'bitcoin-testnet':
            return bitcoin.networks.testnet;
        default:
            throw new Error("Unknown network " + network);
    }
};

/**
 * gets the blocktrail pub key for the given path from the stored array of pub keys
 *
 * @param path
 * @returns {boolean}
 */
WalletSweeper.prototype.getBlocktrailPublicKey = function(path) {
    path = path.replace("m", "M");
    var keyIndex = path.split("/")[1].replace("'", "");

    if (!this.blocktrailPublicKeys[keyIndex]) {
        throw new Error("Wallet.getBlocktrailPublicKey keyIndex (" + keyIndex + ") is unknown to us");
    }

    return this.blocktrailPublicKeys[keyIndex];
};

/**
 * generate multisig address and redeem script for given path
 *
 * @param path
 * @returns {{address: *, redeemScript: *}}
 */
WalletSweeper.prototype.createAddress = function(path) {
    //ensure a public path is used
    path = path.replace("m", "M");
    var keyIndex = path.split("/")[1].replace("'", "");
    var scriptType = parseInt(path.split("/")[2]);

    //derive the primary pub key directly from the primary priv key
    var primaryPubKey = walletSDK.deriveByPath(this.primaryPrivateKey, path, "m");
    //derive the backup pub key directly from the backup priv key (unharden path)
    var backupPubKey = walletSDK.deriveByPath(this.backupPublicKey, path.replace("'", ""), "M");
    //derive a pub key for this path from the blocktrail pub key
    var blocktrailPubKey = walletSDK.deriveByPath(this.getBlocktrailPublicKey(path), path, "M/" + keyIndex + "'");

    //sort the keys and generate a multisig redeem script and address
    var multisigKeys = walletSDK.sortMultiSigKeys([
        primaryPubKey.keyPair.getPublicKeyBuffer(),
        backupPubKey.keyPair.getPublicKeyBuffer(),
        blocktrailPubKey.keyPair.getPublicKeyBuffer()
    ]);

    var multisig = bitcoin.script.multisig.output.encode(2, multisigKeys);
    var redeemScript, witnessScript;
    if (this.network !== "bitcoincash" && scriptType === walletSDK.CHAIN_BTC_SEGWIT) {
        witnessScript = multisig;
        redeemScript = bitcoin.script.witnessScriptHash.output.encode(bitcoin.crypto.sha256(witnessScript));
    } else {
        witnessScript = null;
        redeemScript = multisig;
    }
    var scriptHash = bitcoin.crypto.hash160(redeemScript);
    var scriptPubKey = bitcoin.script.scriptHash.output.encode(scriptHash);

    var network = this.network;
    if (typeof this.network !== "undefined") {
        network = this.network;
    }
    var address = bitcoin.address.fromOutputScript(scriptPubKey, network);

    //@todo return as buffers
    return {address: address.toString(), redeem: redeemScript, witness: witnessScript};
};

/**
 * create a batch of multisig addresses
 *
 * @param start
 * @param count
 * @param keyIndex
 * @param chain
 * @returns {{}}
 */
WalletSweeper.prototype.createBatchAddresses = function(start, count, keyIndex, chain) {
    var self = this;
    var addresses = {};

    return q.all(_.range(0, count).map(function(i) {
        //create a path subsequent address
        var path =  "M/" + keyIndex + "'/" + chain + "/" + (start + i);
        var multisig = self.createAddress(path);
        addresses[multisig['address']] = {
            redeem: multisig['redeem'],
            witness: multisig['witness'],
            path: path
        };
    })).then(function() {
        return addresses;
    });
};

WalletSweeper.prototype.discoverWalletFunds = function(increment, cb) {
    var self = this;
    var totalBalance = 0;
    var totalUTXOs = 0;
    var totalAddressesGenerated = 0;
    var addressUTXOs = {};    //addresses and their utxos, paths and redeem scripts
    if (typeof increment === "undefined") {
        increment = this.settings.sweepBatchSize;
    }

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    var checkChain;
    if (this.network === "bitcoincash") {
        checkChain = [0, 1];
    } else {
        checkChain = [0, 1, 2];
    }

    async.nextTick(function() {
        //for each blocktrail pub key, do fund discovery on batches of addresses
        async.eachSeries(Object.keys(self.blocktrailPublicKeys), function(keyIndex, done) {
            async.eachSeries(checkChain, function(chain, done) {
                var i = 0;
                var hasTransactions = false;

                async.doWhilst(function(done) {
                    //do
                    if (self.settings.logging) {
                        console.log("generating addresses " + i + " -> " + (i + increment) + " using blocktrail key index: " + keyIndex + ", chain: " + chain);
                    }
                    deferred.notify({
                        message: "generating addresses " + i + " -> " + (i + increment) + "",
                        increment: increment,
                        btPubKeyIndex: keyIndex,
                        chain: chain,
                        //addresses: [],
                        totalAddresses: totalAddressesGenerated,
                        addressUTXOs: addressUTXOs,
                        totalUTXOs: totalUTXOs,
                        totalBalance: totalBalance
                    });

                    async.nextTick(function() {
                        self.createBatchAddresses(i, increment, keyIndex, chain)
                            .then(function(batch) {
                                totalAddressesGenerated += Object.keys(batch).length;

                                if (self.settings.logging) {
                                    console.log("starting fund discovery for " + increment + " addresses...");
                                }

                                deferred.notify({
                                    message: "starting fund discovery for " + increment + " addresses",
                                    increment: increment,
                                    btPubKeyIndex: keyIndex,
                                    //addresses: addresses,
                                    totalAddresses: totalAddressesGenerated,
                                    addressUTXOs: addressUTXOs,
                                    totalUTXOs: totalUTXOs,
                                    totalBalance: totalBalance
                                });

                                //get the unspent outputs for this batch of addresses
                                return self.bitcoinDataClient.batchAddressHasTransactions(_.keys(batch)).then(function(_hasTransactions) {
                                    hasTransactions = _hasTransactions;
                                    if (self.settings.logging) {
                                        console.log("batch " + (hasTransactions ? "has" : "does not have") + " transactions...");
                                    }

                                    return q.when(hasTransactions)
                                        .then(function(hasTransactions) {
                                            if (!hasTransactions) {
                                                return;
                                            }

                                            //get the unspent outputs for this batch of addresses
                                            return self.utxoFinder.getUTXOs(_.keys(batch)).then(function(utxos) {
                                                // save the address utxos, along with relevant path and redeem script
                                                _.each(utxos, function(outputs, address) {
                                                    var witnessScript = null;
                                                    if (typeof batch[address]['witness'] !== 'undefined') {
                                                        witnessScript = batch[address]['witness'];

                                                    }
                                                    addressUTXOs[address] = {
                                                        path: batch[address]['path'],
                                                        redeem: batch[address]['redeem'],
                                                        witness: witnessScript,
                                                        utxos: outputs
                                                    };

                                                    totalUTXOs += outputs.length;

                                                    //add up the total utxo value for all addresses
                                                    totalBalance = _.reduce(outputs, function(carry, output) {
                                                        return carry + output['value'];
                                                    }, totalBalance);

                                                    if (self.settings.logging) {
                                                        console.log("found " + outputs.length + " unspent outputs for address: " + address);
                                                    }
                                                });

                                                deferred.notify({
                                                    message: "discovering funds",
                                                    increment: increment,
                                                    btPubKeyIndex: keyIndex,
                                                    totalAddresses: totalAddressesGenerated,
                                                    addressUTXOs: addressUTXOs,
                                                    totalUTXOs: totalUTXOs,
                                                    totalBalance: totalBalance
                                                });
                                            });
                                        })
                                        ;
                                });
                            })
                            .then(
                                function() {
                                    //ready for the next batch
                                    i += increment;
                                    async.nextTick(done);
                                },
                                function(err) {
                                    done(err);
                                }
                            )
                        ;
                    });
                }, function() {
                    //while
                    return hasTransactions;
                }, function(err) {
                    //all done
                    if (err) {
                        console.log("batch complete, but with errors", err.message);

                        deferred.notify({
                            message: "batch complete, but with errors: " + err.message,
                            error: err,
                            increment: increment,
                            btPubKeyIndex: keyIndex,
                            totalAddresses: totalAddressesGenerated,
                            addressUTXOs: addressUTXOs,
                            totalUTXOs: totalUTXOs,
                            totalBalance: totalBalance
                        });
                    }
                    //ready for next Blocktrail pub key
                    async.nextTick(done);
                });
            }, function(err) {
                done(err);
            });
        }, function(err) {
            //callback
            if (err) {
                //perhaps we should also reject the promise, and stop everything?
                if (self.settings.logging) {
                    console.log("error encountered when discovering funds", err);
                }
            }

            if (self.settings.logging) {
                console.log("finished fund discovery: " + totalBalance + " Satoshi (in " + totalUTXOs + " outputs) " +
                    "found when searching " + totalAddressesGenerated + " addresses");
            }

            self.sweepData = {
                utxos: addressUTXOs,
                count: totalUTXOs,
                balance: totalBalance,
                addressesSearched: totalAddressesGenerated
            };

            //resolve the promise
            deferred.resolve(self.sweepData);
        });
    });

    return deferred.promise;
};

WalletSweeper.prototype.sweepWallet = function(destinationAddress, cb) {
    var self = this;
    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    if (self.settings.logging) {
        console.log("starting wallet sweeping to address " + destinationAddress);
    }

    q.when(true)
        .then(function() {
            if (!self.sweepData) {
                //do wallet fund discovery
                return self.discoverWalletFunds()
                    .progress(function(progress) {
                        deferred.notify(progress);
                    });
            }
        })
        .then(function() {
            return self.bitcoinDataClient.estimateFee();
        })
        .then(function(feePerKb) {
            if (self.sweepData['balance'] === 0) {
                //no funds found
                deferred.reject("No funds found after searching through " + self.sweepData['addressesSearched'] + " addresses");
                return deferred.promise;
            }

            //create and sign the transaction
            return self.createTransaction(destinationAddress, null, feePerKb, deferred);
        })
        .then(function(r) {
            deferred.resolve(r);
        }, function(e) {
            deferred.reject(e);
        });

    return deferred.promise;
};

/**
 * creates a raw transaction from the sweep data
 * @param destinationAddress        the destination address for the transaction
 * @param fee                       a specific transaction fee to use (optional: if null, fee will be estimated)
 * @param feePerKb                  fee per kb (optional: if null, use default value)
 * @param deferred                  a deferred promise object, used for giving progress updates (optional)
 */
WalletSweeper.prototype.createTransaction = function(destinationAddress, fee, feePerKb, deferred) {
    var self = this;
    if (this.settings.logging) {
        console.log("Creating transaction to address destinationAddress");
    }
    if (deferred) {
        deferred.notify({
            message: "creating raw transaction to " + destinationAddress
        });
    }

    // create raw transaction
    var rawTransaction = new bitcoin.TransactionBuilder(this.network);
    if (this.settings.bitcoinCash) {
        rawTransaction.enableBitcoinCash();
    }
    var inputs = [];
    _.each(this.sweepData['utxos'], function(data, address) {
        _.each(data.utxos, function(utxo) {
            rawTransaction.addInput(utxo['hash'], utxo['index']);
            inputs.push({
                txid:         utxo['hash'],
                vout:         utxo['index'],
                scriptPubKey: utxo['script_hex'],
                value:        utxo['value'],
                address:      address,
                path:         data['path'],
                redeemScript: data['redeem'],
                witnessScript: data['witness']
            });
        });
    });
    if (!rawTransaction) {
        throw new Error("Failed to create raw transaction");
    }

    var sendAmount = self.sweepData['balance'];
    var outputIdx = rawTransaction.addOutput(destinationAddress, sendAmount);

    if (typeof fee === "undefined" || fee === null) {
        //estimate the fee and reduce it's value from the output
        if (deferred) {
            deferred.notify({
                message: "estimating transaction fee, based on " + blocktrail.toBTC(feePerKb) + " BTC/kb"
            });
        }
        var calcUtxos = inputs.map(function(input) {
            return {
                txid: input.txid,
                vout: input.vout,
                address: input.vout,
                scriptpubkey_hex: input.vout,
                redeem_script: input.redeemScript,
                witness_script: input.witnessScript,
                path: input.path,
                value: input.value
            };
        });
        fee = walletSDK.estimateVsizeFee(rawTransaction.tx, calcUtxos, feePerKb);
    }
    rawTransaction.tx.outs[outputIdx].value -= fee;

    //sign and return the raw transaction
    if (deferred) {
        deferred.notify({
            message: "signing transaction"
        });
    }
    return this.signTransaction(rawTransaction, inputs);
};

WalletSweeper.prototype.signTransaction = function(rawTransaction, inputs) {
    var self = this;
    if (this.settings.logging) {
        console.log("Signing transaction");
    }

    var sigHash = bitcoin.Transaction.SIGHASH_ALL;
    if (this.settings.bitcoinCash) {
        sigHash |= bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143;
    }

    //sign the transaction with the private key for each input
    _.each(inputs, function(input, index) {
        //create private keys for signing
        var primaryPrivKey =  walletSDK.deriveByPath(self.primaryPrivateKey, input['path'].replace("M", "m"), "m").keyPair;
        rawTransaction.sign(index, primaryPrivKey, input['redeemScript'], sigHash, input['value'], input['witnessScript']);

        if (self.backupPrivateKey) {
            var backupPrivKey = walletSDK.deriveByPath(self.backupPrivateKey, input['path'].replace("'", "").replace("M", "m"), "m").keyPair;
            rawTransaction.sign(index, backupPrivKey, input['redeemScript'], sigHash, input['value'], input['witnessScript']);
        }
    });

    if (self.backupPrivateKey) {
        return rawTransaction.build().toHex();
    } else {
        return rawTransaction.buildIncomplete().toHex();
    }
};

module.exports = WalletSweeper;
