var _ = require('lodash');
var assert = require('assert');
var q = require('q');
var async = require('async');
var bitcoin = require('bitcoinjs-lib');
var bitcoinMessage = require('bitcoinjs-message');
var blocktrail = require('./blocktrail');
var CryptoJS = require('crypto-js');
var Encryption = require('./encryption');
var EncryptionMnemonic = require('./encryption_mnemonic');
var SizeEstimation = require('./size_estimation');
var bip39 = require('bip39');

var SignMode = {
    SIGN: "sign",
    DONT_SIGN: "dont_sign"
};

/**
 *
 * @param sdk                   APIClient       SDK instance used to do requests
 * @param identifier            string          identifier of the wallet
 * @param walletVersion         string
 * @param primaryMnemonic       string          primary mnemonic
 * @param encryptedPrimarySeed
 * @param encryptedSecret
 * @param primaryPublicKeys     string          primary mnemonic
 * @param backupPublicKey       string          BIP32 master pubKey M/
 * @param blocktrailPublicKeys  array           list of blocktrail pubKeys indexed by keyIndex
 * @param keyIndex              int             key index to use
 * @param segwit                int             segwit toggle from server
 * @param testnet               bool            testnet
 * @param checksum              string
 * @param upgradeToKeyIndex     int
 * @param useNewCashAddr        bool            flag to opt in to bitcoin cash cashaddr's
 * @param bypassNewAddressCheck bool            flag to indicate if wallet should/shouldn't derive new address locally to verify api
 * @constructor
 * @internal
 */
var Wallet = function(
    sdk,
    identifier,
    walletVersion,
    primaryMnemonic,
    encryptedPrimarySeed,
    encryptedSecret,
    primaryPublicKeys,
    backupPublicKey,
    blocktrailPublicKeys,
    keyIndex,
    segwit,
    testnet,
    checksum,
    upgradeToKeyIndex,
    useNewCashAddr,
    bypassNewAddressCheck
) {
    /* jshint -W071 */
    var self = this;

    self.sdk = sdk;
    self.identifier = identifier;
    self.walletVersion = walletVersion;
    self.locked = true;
    self.bypassNewAddressCheck = !!bypassNewAddressCheck;
    self.bitcoinCash = self.sdk.bitcoinCash;
    self.segwit = !!segwit;
    self.useNewCashAddr = !!useNewCashAddr;
    assert(!self.segwit || !self.bitcoinCash);

    self.testnet = testnet;
    if (self.bitcoinCash) {
        if (self.testnet) {
            self.network = bitcoin.networks.bitcoincashtestnet;
        } else {
            self.network = bitcoin.networks.bitcoincash;
        }
    } else {
        if (self.testnet) {
            self.network = bitcoin.networks.testnet;
        } else {
            self.network = bitcoin.networks.bitcoin;
        }
    }

    assert(backupPublicKey instanceof bitcoin.HDNode);
    assert(_.every(primaryPublicKeys, function(primaryPublicKey) { return primaryPublicKey instanceof bitcoin.HDNode; }));
    assert(_.every(blocktrailPublicKeys, function(blocktrailPublicKey) { return blocktrailPublicKey instanceof bitcoin.HDNode; }));

    // v1
    self.primaryMnemonic = primaryMnemonic;

    // v2 & v3
    self.encryptedPrimarySeed = encryptedPrimarySeed;
    self.encryptedSecret = encryptedSecret;

    self.primaryPrivateKey = null;
    self.backupPrivateKey = null;

    self.backupPublicKey = backupPublicKey;
    self.blocktrailPublicKeys = blocktrailPublicKeys;
    self.primaryPublicKeys = primaryPublicKeys;
    self.keyIndex = keyIndex;

    if (!self.bitcoinCash) {
        if (self.segwit) {
            self.chain = Wallet.CHAIN_BTC_DEFAULT;
            self.changeChain = Wallet.CHAIN_BTC_SEGWIT;
        } else {
            self.chain = Wallet.CHAIN_BTC_DEFAULT;
            self.changeChain = Wallet.CHAIN_BTC_DEFAULT;
        }
    } else {
        self.chain = Wallet.CHAIN_BCC_DEFAULT;
        self.changeChain = Wallet.CHAIN_BCC_DEFAULT;
    }

    self.checksum = checksum;
    self.upgradeToKeyIndex = upgradeToKeyIndex;

    self.secret = null;
    self.seedHex = null;
};

Wallet.WALLET_VERSION_V1 = 'v1';
Wallet.WALLET_VERSION_V2 = 'v2';
Wallet.WALLET_VERSION_V3 = 'v3';

Wallet.WALLET_ENTROPY_BITS = 256;

Wallet.OP_RETURN = 'opreturn';
Wallet.DATA = Wallet.OP_RETURN; // alias

Wallet.PAY_PROGRESS_START = 0;
Wallet.PAY_PROGRESS_COIN_SELECTION = 10;
Wallet.PAY_PROGRESS_CHANGE_ADDRESS = 20;
Wallet.PAY_PROGRESS_SIGN = 30;
Wallet.PAY_PROGRESS_SEND = 40;
Wallet.PAY_PROGRESS_DONE = 100;

Wallet.CHAIN_BTC_DEFAULT = 0;
Wallet.CHAIN_BTC_SEGWIT = 2;
Wallet.CHAIN_BCC_DEFAULT = 1;

Wallet.FEE_STRATEGY_FORCE_FEE = blocktrail.FEE_STRATEGY_FORCE_FEE;
Wallet.FEE_STRATEGY_BASE_FEE = blocktrail.FEE_STRATEGY_BASE_FEE;
Wallet.FEE_STRATEGY_HIGH_PRIORITY = blocktrail.FEE_STRATEGY_HIGH_PRIORITY;
Wallet.FEE_STRATEGY_OPTIMAL = blocktrail.FEE_STRATEGY_OPTIMAL;
Wallet.FEE_STRATEGY_LOW_PRIORITY = blocktrail.FEE_STRATEGY_LOW_PRIORITY;
Wallet.FEE_STRATEGY_MIN_RELAY_FEE = blocktrail.FEE_STRATEGY_MIN_RELAY_FEE;

Wallet.prototype.isSegwit = function() {
    return !!this.segwit;
};

Wallet.prototype.unlock = function(options, cb) {
    var self = this;

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    // avoid modifying passed options
    options = _.merge({}, options);

    q.fcall(function() {
        switch (self.walletVersion) {
            case Wallet.WALLET_VERSION_V1:
                return self.unlockV1(options);

            case Wallet.WALLET_VERSION_V2:
                return self.unlockV2(options);

            case Wallet.WALLET_VERSION_V3:
                return self.unlockV3(options);

            default:
                return q.reject(new blocktrail.WalletInitError("Invalid wallet version"));
        }
    }).then(
        function(primaryPrivateKey) {
            self.primaryPrivateKey = primaryPrivateKey;

            // create a checksum of our private key which we'll later use to verify we used the right password
            var checksum = self.primaryPrivateKey.getAddress();

            // check if we've used the right passphrase
            if (checksum !== self.checksum) {
                throw new blocktrail.WalletChecksumError("Generated checksum [" + checksum + "] does not match " +
                    "[" + self.checksum + "], most likely due to incorrect password");
            }

            self.locked = false;

            // if the response suggests we should upgrade to a different blocktrail cosigning key then we should
            if (typeof self.upgradeToKeyIndex !== "undefined" && self.upgradeToKeyIndex !== null) {
                return self.upgradeKeyIndex(self.upgradeToKeyIndex);
            }
        }
    ).then(
        function(r) {
            deferred.resolve(r);
        },
        function(e) {
            deferred.reject(e);
        }
    );

    return deferred.promise;
};

Wallet.prototype.unlockV1 = function(options) {
    var self = this;

    options.primaryMnemonic = typeof options.primaryMnemonic !== "undefined" ? options.primaryMnemonic : self.primaryMnemonic;
    options.secretMnemonic = typeof options.secretMnemonic !== "undefined" ? options.secretMnemonic : self.secretMnemonic;

    return self.sdk.resolvePrimaryPrivateKeyFromOptions(options)
        .then(function(options) {
            self.primarySeed = options.primarySeed;

            return options.primaryPrivateKey;
        });
};

Wallet.prototype.unlockV2 = function(options, cb) {
    var self = this;

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    deferred.resolve(q.fcall(function() {
        /* jshint -W071, -W074 */
        options.encryptedPrimarySeed = typeof options.encryptedPrimarySeed !== "undefined" ? options.encryptedPrimarySeed : self.encryptedPrimarySeed;
        options.encryptedSecret = typeof options.encryptedSecret !== "undefined" ? options.encryptedSecret : self.encryptedSecret;

        if (options.secret) {
            self.secret = options.secret;
        }

        if (options.primaryPrivateKey) {
            throw new blocktrail.WalletDecryptError("specifying primaryPrivateKey has been deprecated");
        }

        if (options.primarySeed) {
            self.primarySeed = options.primarySeed;
        } else if (options.secret) {
            try {
                self.primarySeed = new Buffer(
                    CryptoJS.AES.decrypt(CryptoJS.format.OpenSSL.parse(options.encryptedPrimarySeed), self.secret).toString(CryptoJS.enc.Utf8), 'base64');
                if (!self.primarySeed.length) {
                    throw new Error();
                }
            } catch (e) {
                throw new blocktrail.WalletDecryptError("Failed to decrypt primarySeed");
            }

        } else {
            // avoid conflicting options
            if (options.passphrase && options.password) {
                throw new blocktrail.WalletCreateError("Can't specify passphrase and password");
            }
            // normalize passphrase/password
            options.passphrase = options.passphrase || options.password;

            try {
                self.secret = CryptoJS.AES.decrypt(CryptoJS.format.OpenSSL.parse(options.encryptedSecret), options.passphrase).toString(CryptoJS.enc.Utf8);
                if (!self.secret.length) {
                    throw new Error();
                }
            } catch (e) {
                throw new blocktrail.WalletDecryptError("Failed to decrypt secret");
            }
            try {
                self.primarySeed = new Buffer(
                    CryptoJS.AES.decrypt(CryptoJS.format.OpenSSL.parse(options.encryptedPrimarySeed), self.secret).toString(CryptoJS.enc.Utf8), 'base64');
                if (!self.primarySeed.length) {
                    throw new Error();
                }
            } catch (e) {
                throw new blocktrail.WalletDecryptError("Failed to decrypt primarySeed");
            }
        }

        return bitcoin.HDNode.fromSeedBuffer(self.primarySeed, self.network);
    }));

    return deferred.promise;
};

Wallet.prototype.unlockV3 = function(options, cb) {
    var self = this;

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    deferred.resolve(q.fcall(function() {
        return q.when()
            .then(function() {
                /* jshint -W071, -W074 */
                options.encryptedPrimarySeed = typeof options.encryptedPrimarySeed !== "undefined" ? options.encryptedPrimarySeed : self.encryptedPrimarySeed;
                options.encryptedSecret = typeof options.encryptedSecret !== "undefined" ? options.encryptedSecret : self.encryptedSecret;

                if (options.secret) {
                    self.secret = options.secret;
                }

                if (options.primaryPrivateKey) {
                    throw new blocktrail.WalletInitError("specifying primaryPrivateKey has been deprecated");
                }

                if (options.primarySeed) {
                    self.primarySeed = options.primarySeed;
                } else if (options.secret) {
                    return self.sdk.promisedDecrypt(new Buffer(options.encryptedPrimarySeed, 'base64'), self.secret)
                        .then(function(primarySeed) {
                            self.primarySeed = primarySeed;
                        }, function() {
                            throw new blocktrail.WalletDecryptError("Failed to decrypt primarySeed");
                        });
                } else {
                    // avoid conflicting options
                    if (options.passphrase && options.password) {
                        throw new blocktrail.WalletCreateError("Can't specify passphrase and password");
                    }
                    // normalize passphrase/password
                    options.passphrase = options.passphrase || options.password;
                    delete options.password;

                    return self.sdk.promisedDecrypt(new Buffer(options.encryptedSecret, 'base64'), new Buffer(options.passphrase))
                        .then(function(secret) {
                            self.secret = secret;
                        }, function() {
                            throw new blocktrail.WalletDecryptError("Failed to decrypt secret");
                        })
                        .then(function() {
                            return self.sdk.promisedDecrypt(new Buffer(options.encryptedPrimarySeed, 'base64'), self.secret)
                                .then(function(primarySeed) {
                                    self.primarySeed = primarySeed;
                                }, function() {
                                    throw new blocktrail.WalletDecryptError("Failed to decrypt primarySeed");
                                });
                        });
                }
            })
            .then(function() {
                return bitcoin.HDNode.fromSeedBuffer(self.primarySeed, self.network);
            })
        ;
    }));

    return deferred.promise;
};

Wallet.prototype.lock = function() {
    var self = this;

    self.secret = null;
    self.primarySeed = null;
    self.primaryPrivateKey = null;
    self.backupPrivateKey = null;

    self.locked = true;
};

/**
 * upgrade wallet to V3 encryption scheme
 *
 * @param passphrase is required again to reencrypt the data, important that it's the correct password!!!
 * @param cb
 * @returns {promise}
 */
Wallet.prototype.upgradeToV3 = function(passphrase, cb) {
    var self = this;

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    q.when(true)
        .then(function() {
            if (self.locked) {
                throw new blocktrail.WalletLockedError("Wallet needs to be unlocked to upgrade");
            }

            if (self.walletVersion === Wallet.WALLET_VERSION_V3) {
                throw new blocktrail.WalletUpgradeError("Wallet is already V3");
            } else if (self.walletVersion === Wallet.WALLET_VERSION_V2) {
                return self._upgradeV2ToV3(passphrase, deferred.notify.bind(deferred));
            } else if (self.walletVersion === Wallet.WALLET_VERSION_V1) {
                return self._upgradeV1ToV3(passphrase, deferred.notify.bind(deferred));
            }
        })
        .then(function(r) { deferred.resolve(r); }, function(e) { deferred.reject(e); });

    return deferred.promise;
};

Wallet.prototype._upgradeV2ToV3 = function(passphrase, notify) {
    var self = this;

    return q.when(true)
        .then(function() {
            var options = {
                storeDataOnServer: true,
                passphrase: passphrase,
                primarySeed: self.primarySeed,
                recoverySecret: false // don't create new recovery secret, V2 already has ones
            };

            return self.sdk.produceEncryptedDataV3(options, notify || function noop() {})
                .then(function(options) {
                    return self.sdk.updateWallet(self.identifier, {
                        encrypted_primary_seed: options.encryptedPrimarySeed.toString('base64'),
                        encrypted_secret: options.encryptedSecret.toString('base64'),
                        wallet_version: Wallet.WALLET_VERSION_V3
                    }).then(function() {
                        self.secret = options.secret;
                        self.encryptedPrimarySeed = options.encryptedPrimarySeed;
                        self.encryptedSecret = options.encryptedSecret;
                        self.walletVersion = Wallet.WALLET_VERSION_V3;

                        return self;
                    });
                });
        });

};

Wallet.prototype._upgradeV1ToV3 = function(passphrase, notify) {
    var self = this;

    return q.when(true)
        .then(function() {
            var options = {
                storeDataOnServer: true,
                passphrase: passphrase,
                primarySeed: self.primarySeed
            };

            return self.sdk.produceEncryptedDataV3(options, notify || function noop() {})
                .then(function(options) {
                    // store recoveryEncryptedSecret for printing on backup sheet
                    self.recoveryEncryptedSecret = options.recoveryEncryptedSecret;

                    return self.sdk.updateWallet(self.identifier, {
                        primary_mnemonic: '',
                        encrypted_primary_seed: options.encryptedPrimarySeed.toString('base64'),
                        encrypted_secret: options.encryptedSecret.toString('base64'),
                        recovery_secret: options.recoverySecret.toString('hex'),
                        wallet_version: Wallet.WALLET_VERSION_V3
                    }).then(function() {
                        self.secret = options.secret;
                        self.encryptedPrimarySeed = options.encryptedPrimarySeed;
                        self.encryptedSecret = options.encryptedSecret;
                        self.walletVersion = Wallet.WALLET_VERSION_V3;

                        return self;
                    });
                });
        });
};

Wallet.prototype.doPasswordChange = function(newPassword) {
    var self = this;

    return q.when(null)
        .then(function() {

            if (self.walletVersion === Wallet.WALLET_VERSION_V1) {
                throw new blocktrail.WalletLockedError("Wallet version does not support password change!");
            }

            if (self.locked) {
                throw new blocktrail.WalletLockedError("Wallet needs to be unlocked to change password");
            }

            if (!self.secret) {
                throw new blocktrail.WalletLockedError("No secret");
            }

            var newEncryptedSecret;
            var newEncrypedWalletSecretMnemonic;
            if (self.walletVersion === Wallet.WALLET_VERSION_V2) {
                newEncryptedSecret = CryptoJS.AES.encrypt(self.secret, newPassword).toString(CryptoJS.format.OpenSSL);
                newEncrypedWalletSecretMnemonic = bip39.entropyToMnemonic(blocktrail.convert(newEncryptedSecret, 'base64', 'hex'));

            } else {
                if (typeof newPassword === "string") {
                    newPassword = new Buffer(newPassword);
                } else {
                    if (!(newPassword instanceof Buffer)) {
                        throw new Error('New password must be provided as a string or a Buffer');
                    }
                }

                newEncryptedSecret = Encryption.encrypt(self.secret, newPassword);
                newEncrypedWalletSecretMnemonic = EncryptionMnemonic.encode(newEncryptedSecret);

                // It's a buffer, so convert it back to base64
                newEncryptedSecret = newEncryptedSecret.toString('base64');
            }

            return [newEncryptedSecret, newEncrypedWalletSecretMnemonic];
        });
};

Wallet.prototype.passwordChange = function(newPassword, cb) {
    var self = this;

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    q.fcall(function() {
        return self.doPasswordChange(newPassword)
            .then(function(r) {
                var newEncryptedSecret = r[0];
                var newEncrypedWalletSecretMnemonic = r[1];

                return self.sdk.updateWallet(self.identifier, {encrypted_secret: newEncryptedSecret}).then(function() {
                    self.encryptedSecret = newEncryptedSecret;

                    // backupInfo
                    return {
                        encryptedSecret: newEncrypedWalletSecretMnemonic
                    };
                });
            })
            .then(
                function(r) {
                    deferred.resolve(r);
                },
                function(e) {
                    deferred.reject(e);
                }
            );
    });

    return deferred.promise;
};

/**
 * get address for specified path
 *
 * @param path
 * @returns string
 */
Wallet.prototype.getAddressByPath = function(path) {
    return this.getWalletScriptByPath(path).address;
};

/**
 * get redeemscript for specified path
 *
 * @param path
 * @returns {Buffer}
 */
Wallet.prototype.getRedeemScriptByPath = function(path) {
    return this.getWalletScriptByPath(path).redeemScript;
};

/**
 * Generate scripts, and address.
 * @param path
 * @returns {{witnessScript: *, redeemScript: *, scriptPubKey, address: *}}
 */
Wallet.prototype.getWalletScriptByPath = function(path) {
    var self = this;

    // get derived primary key
    var derivedPrimaryPublicKey = self.getPrimaryPublicKey(path);
    // get derived blocktrail key
    var derivedBlocktrailPublicKey = self.getBlocktrailPublicKey(path);
    // derive the backup key
    var derivedBackupPublicKey = Wallet.deriveByPath(self.backupPublicKey, path.replace("'", ""), "M");

    // sort the pubkeys
    var pubKeys = Wallet.sortMultiSigKeys([
        derivedPrimaryPublicKey.keyPair.getPublicKeyBuffer(),
        derivedBackupPublicKey.keyPair.getPublicKeyBuffer(),
        derivedBlocktrailPublicKey.keyPair.getPublicKeyBuffer()
    ]);

    var multisig = bitcoin.script.multisig.output.encode(2, pubKeys);
    var scriptType = parseInt(path.split("/")[2]);

    var ws, rs;
    if (this.network !== "bitcoincash" && scriptType === Wallet.CHAIN_BTC_SEGWIT) {
        ws = multisig;
        rs = bitcoin.script.witnessScriptHash.output.encode(bitcoin.crypto.sha256(ws));
    } else {
        ws = null;
        rs = multisig;
    }

    var spk = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(rs));
    var addr = bitcoin.address.fromOutputScript(spk, this.network, self.useNewCashAddr);

    return {
        witnessScript: ws,
        redeemScript: rs,
        scriptPubKey: spk,
        address: addr
    };
};

/**
 * get primary public key by path
 *  first level of the path is used as keyIndex to find the correct key in the dict
 *
 * @param path  string
 * @returns {bitcoin.HDNode}
 */
Wallet.prototype.getPrimaryPublicKey = function(path) {
    var self = this;

    path = path.replace("m", "M");

    var keyIndex = path.split("/")[1].replace("'", "");

    if (!self.primaryPublicKeys[keyIndex]) {
        if (self.primaryPrivateKey) {
            self.primaryPublicKeys[keyIndex] = Wallet.deriveByPath(self.primaryPrivateKey, "M/" + keyIndex + "'", "m");
        } else {
            throw new blocktrail.KeyPathError("Wallet.getPrimaryPublicKey keyIndex (" + keyIndex + ") is unknown to us");
        }
    }

    var primaryPublicKey = self.primaryPublicKeys[keyIndex];
    return Wallet.deriveByPath(primaryPublicKey, path, "M/" + keyIndex + "'");
};

/**
 * get blocktrail public key by path
 *  first level of the path is used as keyIndex to find the correct key in the dict
 *
 * @param path  string
 * @returns {bitcoin.HDNode}
 */
Wallet.prototype.getBlocktrailPublicKey = function(path) {
    var self = this;

    path = path.replace("m", "M");

    var keyIndex = path.split("/")[1].replace("'", "");

    if (!self.blocktrailPublicKeys[keyIndex]) {
        throw new blocktrail.KeyPathError("Wallet.getBlocktrailPublicKey keyIndex (" + keyIndex + ") is unknown to us");
    }

    var blocktrailPublicKey = self.blocktrailPublicKeys[keyIndex];

    return Wallet.deriveByPath(blocktrailPublicKey, path, "M/" + keyIndex + "'");
};

/**
 * upgrade wallet to different blocktrail cosign key
 *
 * @param keyIndex  int
 * @param [cb]      function
 * @returns {q.Promise}
 */
Wallet.prototype.upgradeKeyIndex = function(keyIndex, cb) {
    var self = this;

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    if (self.locked) {
        deferred.reject(new blocktrail.WalletLockedError("Wallet needs to be unlocked to upgrade key index"));
        return deferred.promise;
    }

    var primaryPublicKey = self.primaryPrivateKey.deriveHardened(keyIndex).neutered();

    deferred.resolve(
        self.sdk.upgradeKeyIndex(self.identifier, keyIndex, [primaryPublicKey.toBase58(), "M/" + keyIndex + "'"])
            .then(function(result) {
                self.keyIndex = keyIndex;
                _.forEach(result.blocktrail_public_keys, function(publicKey, keyIndex) {
                    self.blocktrailPublicKeys[keyIndex] = bitcoin.HDNode.fromBase58(publicKey[0], self.network);
                });

                self.primaryPublicKeys[keyIndex] = primaryPublicKey;

                return true;
            })
    );

    return deferred.promise;
};

/**
 * generate a new derived private key and return the new address for it
 *
 * @param [chainIdx] int
 * @param [cb]  function        callback(err, address)
 * @returns {q.Promise}
 */
Wallet.prototype.getNewAddress = function(chainIdx, cb) {
    var self = this;

    // chainIdx is optional
    if (typeof chainIdx === "function") {
        cb = chainIdx;
        chainIdx = null;
    }

    var deferred = q.defer();
    deferred.promise.spreadNodeify(cb);

    // Only enter if it's not an integer
    if (chainIdx !== parseInt(chainIdx, 10)) {
        // deal with undefined or null, assume defaults
        if (typeof chainIdx === "undefined" || chainIdx === null) {
            chainIdx = self.chain;
        } else {
            // was a variable but not integer
            deferred.reject(new Error("Invalid chain index"));
            return deferred.promise;
        }
    }

    deferred.resolve(
        self.sdk.getNewDerivation(self.identifier, "M/" + self.keyIndex + "'/" + chainIdx)
            .then(function(newDerivation) {
                var path = newDerivation.path;
                var addressFromServer = newDerivation.address;
                var decodedFromServer;

                try {
                    // Decode the address the serer gave us
                    decodedFromServer = self.decodeAddress(addressFromServer);
                    if ("cashAddrPrefix" in self.network && self.useNewCashAddr && decodedFromServer.type === "base58") {
                        self.bypassNewAddressCheck = false;
                    }
                } catch (e) {
                    throw new blocktrail.WalletAddressError("Failed to decode address [" + newDerivation.address + "]");
                }

                if (!self.bypassNewAddressCheck) {
                    // We need to reproduce this address with the same path,
                    // but the server (for BCH cashaddrs) uses base58?
                    var verifyAddress = self.getAddressByPath(newDerivation.path);

                    // If this occasion arises:
                    if ("cashAddrPrefix" in self.network && self.useNewCashAddr && decodedFromServer.type === "base58") {
                        // Decode our the address we produced for the path
                        var decodeOurs;
                        try {
                            decodeOurs = self.decodeAddress(verifyAddress);
                        } catch (e) {
                            throw new blocktrail.WalletAddressError("Error while verifying address from server [" + e.message + "]");
                        }

                        // Peek beyond the encoding - the hashes must match at least
                        if (decodeOurs.decoded.hash.toString('hex') !== decodedFromServer.decoded.hash.toString('hex')) {
                            throw new blocktrail.WalletAddressError("Failed to verify legacy address [hash mismatch]");
                        }

                        var matchedP2PKH = decodeOurs.decoded.version === bitcoin.script.types.P2PKH &&
                            decodedFromServer.decoded.version === self.network.pubKeyHash;
                        var matchedP2SH = decodeOurs.decoded.version === bitcoin.script.types.P2SH &&
                            decodedFromServer.decoded.version === self.network.scriptHash;

                        if (!(matchedP2PKH || matchedP2SH)) {
                            throw new blocktrail.WalletAddressError("Failed to verify legacy address [prefix mismatch]");
                        }

                        // We are satisfied that the address is for the same
                        // destination, so substitute addressFromServer with our
                        // 'reencoded' form.
                        addressFromServer = decodeOurs.address;
                    }

                    // debug check
                    if (verifyAddress !== addressFromServer) {
                        throw new blocktrail.WalletAddressError("Failed to verify address [" + newDerivation.address + "] !== [" + addressFromServer + "]");
                    }
                }

                return [addressFromServer, path];
            })
    );

    return deferred.promise;
};

/**
 * get the balance for the wallet
 *
 * @param [cb]  function        callback(err, confirmed, unconfirmed)
 * @returns {q.Promise}
 */
Wallet.prototype.getBalance = function(cb) {
    var self = this;

    var deferred = q.defer();
    deferred.promise.spreadNodeify(cb);

    deferred.resolve(
        self.sdk.getWalletBalance(self.identifier)
            .then(function(result) {
                return [result.confirmed, result.unconfirmed];
            })
    );

    return deferred.promise;
};

/**
 * get the balance for the wallet
 *
 * @param [cb]  function        callback(err, confirmed, unconfirmed)
 * @returns {q.Promise}
 */
Wallet.prototype.getInfo = function(cb) {
    var self = this;

    var deferred = q.defer();
    deferred.promise.spreadNodeify(cb);

    deferred.resolve(
        self.sdk.getWalletBalance(self.identifier)
    );

    return deferred.promise;
};

/**
 * do wallet discovery (slow)
 *
 * @param [gap] int             gap limit
 * @param [cb]  function        callback(err, confirmed, unconfirmed)
 * @returns {q.Promise}
 */
Wallet.prototype.doDiscovery = function(gap, cb) {
    var self = this;

    if (typeof gap === "function") {
        cb = gap;
        gap = null;
    }

    var deferred = q.defer();
    deferred.promise.spreadNodeify(cb);

    deferred.resolve(
        self.sdk.doWalletDiscovery(self.identifier, gap)
            .then(function(result) {
                return [result.confirmed, result.unconfirmed];
            })
    );

    return deferred.promise;
};

/**
 *
 * @param [force]   bool            ignore warnings (such as non-zero balance)
 * @param [cb]      function        callback(err, success)
 * @returns {q.Promise}
 */
Wallet.prototype.deleteWallet = function(force, cb) {
    var self = this;

    if (typeof force === "function") {
        cb = force;
        force = false;
    }

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    if (self.locked) {
        deferred.reject(new blocktrail.WalletDeleteError("Wallet needs to be unlocked to delete wallet"));
        return deferred.promise;
    }

    var checksum = self.primaryPrivateKey.getAddress();
    var privBuf = self.primaryPrivateKey.keyPair.d.toBuffer(32);
    var signature = bitcoinMessage.sign(checksum, self.network.messagePrefix, privBuf, true).toString('base64');

    deferred.resolve(
        self.sdk.deleteWallet(self.identifier, checksum, signature, force)
            .then(function(result) {
                return result.deleted;
            })
    );

    return deferred.promise;
};

/**
 * create, sign and send a transaction
 *
 * @param pay                   array       {'address': (int)value}     coins to send
 * @param [changeAddress]       bool        change address to use (auto generated if NULL)
 * @param [allowZeroConf]       bool        allow zero confirmation unspent outputs to be used in coin selection
 * @param [randomizeChangeIdx]  bool        randomize the index of the change output (default TRUE, only disable if you have a good reason to)
 * @param [feeStrategy]         string      defaults to Wallet.FEE_STRATEGY_OPTIMAL
 * @param [twoFactorToken]      string      2FA token
 * @param options
 * @param [cb]                  function    callback(err, txHash)
 * @returns {q.Promise}
 */
Wallet.prototype.pay = function(pay, changeAddress, allowZeroConf, randomizeChangeIdx, feeStrategy, twoFactorToken, options, cb) {

    /* jshint -W071 */
    var self = this;

    if (typeof changeAddress === "function") {
        cb = changeAddress;
        changeAddress = null;
    } else if (typeof allowZeroConf === "function") {
        cb = allowZeroConf;
        allowZeroConf = false;
    } else if (typeof randomizeChangeIdx === "function") {
        cb = randomizeChangeIdx;
        randomizeChangeIdx = true;
    } else if (typeof feeStrategy === "function") {
        cb = feeStrategy;
        feeStrategy = null;
    } else if (typeof twoFactorToken === "function") {
        cb = twoFactorToken;
        twoFactorToken = null;
    } else if (typeof options === "function") {
        cb = options;
        options = {};
    }

    randomizeChangeIdx = typeof randomizeChangeIdx !== "undefined" ? randomizeChangeIdx : true;
    feeStrategy = feeStrategy || Wallet.FEE_STRATEGY_OPTIMAL;
    options = options || {};
    var checkFee = typeof options.checkFee !== "undefined" ? options.checkFee : true;

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    if (self.locked) {
        deferred.reject(new blocktrail.WalletLockedError("Wallet needs to be unlocked to send coins"));
        return deferred.promise;
    }

    q.nextTick(function() {
        deferred.notify(Wallet.PAY_PROGRESS_START);
        self.buildTransaction(pay, changeAddress, allowZeroConf, randomizeChangeIdx, feeStrategy, options)
            .then(
            function(r) { return r; },
            function(e) { deferred.reject(e); },
            function(progress) {
                deferred.notify(progress);
            }
        )
            .spread(
            function(tx, utxos) {

                deferred.notify(Wallet.PAY_PROGRESS_SEND);

                var data = {
                    signed_transaction: tx.toHex(),
                    base_transaction: tx.__toBuffer(null, null, false).toString('hex')
                };

                return self.sendTransaction(data, utxos.map(function(utxo) { return utxo['path']; }), checkFee, twoFactorToken, options.prioboost)
                    .then(function(result) {
                        deferred.notify(Wallet.PAY_PROGRESS_DONE);

                        if (!result || !result['complete'] || result['complete'] === 'false') {
                            deferred.reject(new blocktrail.TransactionSignError("Failed to completely sign transaction"));
                        } else {
                            return result['txid'];
                        }
                    });
            },
            function(e) {
                throw e;
            }
        )
            .then(
            function(r) { deferred.resolve(r); },
            function(e) { deferred.reject(e); }
        )
        ;
    });

    return deferred.promise;
};

Wallet.prototype.decodeAddress = function(address) {
    return Wallet.getAddressAndType(address, this.network, this.useNewCashAddr);
};

function readBech32Address(address, network) {
    var addr;
    var err;
    try {
        addr = bitcoin.address.fromBech32(address, network);
        err = null;

    } catch (_err) {
        err = _err;
    }

    if (!err) {
        // Valid bech32 but invalid network immediately alerts
        if (addr.prefix !== network.bech32) {
            throw new blocktrail.InvalidAddressError("Address invalid on this network");
        }
    }

    return [err, addr];
}

function readCashAddress(address, network) {
    var addr;
    var err;
    try {
        addr = bitcoin.address.fromCashAddress(address);
        err = null;
    } catch (_err) {
        err = _err;
    }

    if (!err) {
        // Valid base58 but invalid network immediately alerts
        if (addr.prefix !== network.cashAddrPrefix) {
            throw new Error(address + ' has an invalid prefix');
        }
    }

    return [err, addr];
}

function readBase58Address(address, network) {
    var addr;
    var err;
    try {
        addr = bitcoin.address.fromBase58Check(address);
        err = null;
    } catch (_err) {
        err = _err;
    }

    if (!err) {
        // Valid base58 but invalid network immediately alerts
        if (addr.version !== network.pubKeyHash && addr.version !== network.scriptHash) {
            throw new blocktrail.InvalidAddressError("Address invalid on this network");
        }
    }

    return [err, addr];
}

Wallet.getAddressAndType = function(address, network, allowCashAddress) {
    var addr;
    var type;
    var err;

    function readAddress(reader, readType) {
        var decoded = reader(address, network);
        if (decoded[0] === null) {
            addr = decoded[1];
            type = readType;
        } else {
            err = decoded[0];
        }
    }

    if (network === bitcoin.networks.bitcoin || network === bitcoin.networks.testnet) {
        readAddress(readBech32Address, "bech32");
    }

    if (!addr && 'cashAddrPrefix' in network && allowCashAddress) {
        readAddress(readCashAddress, "cashaddr");
    }

    if (!addr) {
        readAddress(readBase58Address, "base58");
    }

    if (addr) {
        return {
            address: address,
            decoded: addr,
            type: type
        };
    } else {
        throw new blocktrail.InvalidAddressError(err.message);
    }
};

Wallet.convertPayToOutputs = function(pay, network, allowCashAddr) {
    var send = [];

    var readFunc;

    // Deal with two different forms
    if (Array.isArray(pay)) {
        // output[]
        readFunc = function(i, output, obj) {
            if (typeof output !== "object") {
                throw new Error("Invalid transaction output for numerically indexed list [1]");
            }

            var keys = Object.keys(output);
            if (keys.indexOf("scriptPubKey") !== -1 && keys.indexOf("value") !== -1) {
                obj.scriptPubKey = output["scriptPubKey"];
                obj.value = output["value"];
            } else if (keys.indexOf("address") !== -1 && keys.indexOf("value") !== -1) {
                obj.address = output["address"];
                obj.value = output["value"];
            } else if (keys.length === 2 && output.length === 2 && keys[0] === '0' && keys[1] === '1') {
                obj.address = output[0];
                obj.value = output[1];
            } else {
                throw new Error("Invalid transaction output for numerically indexed list [2]");
            }
        };
    } else if (typeof pay === "object") {
        // map[addr]amount
        readFunc = function(address, value, obj) {
            obj.address = address.trim();
            obj.value = value;
            if (obj.address === Wallet.OP_RETURN) {
                var datachunk = Buffer.isBuffer(value) ? value : new Buffer(value, 'utf-8');
                obj.scriptPubKey = bitcoin.script.nullData.output.encode(datachunk).toString('hex');
                obj.value = 0;
                obj.address = null;
            }
        };
    } else {
        throw new Error("Invalid input");
    }

    Object.keys(pay).forEach(function(key) {
        var obj = {};
        readFunc(key, pay[key], obj);

        if (parseInt(obj.value, 10).toString() !== obj.value.toString()) {
            throw new blocktrail.WalletSendError("Values should be in Satoshis");
        }

        // Remove address, replace with scriptPubKey
        if (typeof obj.address === "string") {
            try {
                var addrAndType = Wallet.getAddressAndType(obj.address, network, allowCashAddr);
                obj.scriptPubKey = bitcoin.address.toOutputScript(addrAndType.address, network, allowCashAddr).toString('hex');
                delete obj.address;
            } catch (e) {
                throw new blocktrail.InvalidAddressError("Invalid address [" + obj.address + "] (" + e.message + ")");
            }
        }

        // Extra checks when the output isn't OP_RETURN
        if (obj.scriptPubKey.slice(0, 2) !== "6a") {
            if (!(obj.value = parseInt(obj.value, 10))) {
                throw new blocktrail.WalletSendError("Values should be non zero");
            } else if (obj.value <= blocktrail.DUST) {
                throw new blocktrail.WalletSendError("Values should be more than dust (" + blocktrail.DUST + ")");
            }
        }

        // Value fully checked now
        obj.value = parseInt(obj.value, 10);

        send.push(obj);
    });

    return send;
};

Wallet.prototype.buildTransaction = function(pay, changeAddress, allowZeroConf, randomizeChangeIdx, feeStrategy, options, cb) {
    /* jshint -W071 */
    var self = this;

    if (typeof changeAddress === "function") {
        cb = changeAddress;
        changeAddress = null;
    } else if (typeof allowZeroConf === "function") {
        cb = allowZeroConf;
        allowZeroConf = false;
    } else if (typeof randomizeChangeIdx === "function") {
        cb = randomizeChangeIdx;
        randomizeChangeIdx = true;
    } else if (typeof feeStrategy === "function") {
        cb = feeStrategy;
        feeStrategy = null;
    } else if (typeof options === "function") {
        cb = options;
        options = {};
    }

    randomizeChangeIdx = typeof randomizeChangeIdx !== "undefined" ? randomizeChangeIdx : true;
    feeStrategy = feeStrategy || Wallet.FEE_STRATEGY_OPTIMAL;
    options = options || {};

    var deferred = q.defer();
    deferred.promise.spreadNodeify(cb);

    q.nextTick(function() {
        var send;
        try {
            send = Wallet.convertPayToOutputs(pay, self.network, self.useNewCashAddr);
        } catch (e) {
            deferred.reject(e);
            return deferred.promise;
        }

        if (!send.length) {
            deferred.reject(new blocktrail.WalletSendError("Need at least one recipient"));
            return deferred.promise;
        }

        deferred.notify(Wallet.PAY_PROGRESS_COIN_SELECTION);

        deferred.resolve(
            self.coinSelection(send, true, allowZeroConf, feeStrategy, options)
            /**
             *
             * @param {Object[]} utxos
             * @param fee
             * @param change
             * @param randomizeChangeIdx
             * @returns {*}
             */
                .spread(function(utxos, fee, change) {
                    var tx, txb, outputs = [];

                    var deferred = q.defer();

                    async.waterfall([
                        /**
                         * prepare
                         *
                         * @param cb
                         */
                        function(cb) {
                            var inputsTotal = utxos.map(function(utxo) {
                                return utxo['value'];
                            }).reduce(function(a, b) {
                                return a + b;
                            });
                            var outputsTotal = send.map(function(output) {
                                return output.value;
                            }).reduce(function(a, b) {
                                return a + b;
                            });
                            var estimatedChange = inputsTotal - outputsTotal - fee;

                            if (estimatedChange > blocktrail.DUST * 2 && estimatedChange !== change) {
                                return cb(new blocktrail.WalletFeeError("the amount of change (" + change + ") " +
                                    "suggested by the coin selection seems incorrect (" + estimatedChange + ")"));
                            }

                            cb();
                        },
                        /**
                         * init transaction builder
                         *
                         * @param cb
                         */
                        function(cb) {
                            txb = new bitcoin.TransactionBuilder(self.network);
                            if (self.bitcoinCash) {
                                txb.enableBitcoinCash();
                            }

                            cb();
                        },
                        /**
                         * add UTXOs as inputs
                         *
                         * @param cb
                         */
                        function(cb) {
                            var i;

                            for (i = 0; i < utxos.length; i++) {
                                txb.addInput(utxos[i]['hash'], utxos[i]['idx']);
                            }

                            cb();
                        },
                        /**
                         * build desired outputs
                         *
                         * @param cb
                         */
                        function(cb) {
                            send.forEach(function(_send) {
                                if (_send.scriptPubKey) {
                                    outputs.push({scriptPubKey: new Buffer(_send.scriptPubKey, 'hex'), value: _send.value});
                                } else {
                                    throw new Error("Invalid send");
                                }
                            });
                            cb();
                        },
                        /**
                         * get change address if required
                         *
                         * @param cb
                         */
                        function(cb) {
                            if (change > 0) {
                                if (change <= blocktrail.DUST) {
                                    change = 0; // don't do a change output if it would be a dust output

                                } else {
                                    if (!changeAddress) {
                                        deferred.notify(Wallet.PAY_PROGRESS_CHANGE_ADDRESS);

                                        return self.getNewAddress(self.changeChain, function(err, address) {
                                            if (err) {
                                                return cb(err);
                                            }
                                            changeAddress = address;
                                            cb();
                                        });
                                    }
                                }
                            }

                            cb();
                        },
                        /**
                         * add change to outputs
                         *
                         * @param cb
                         */
                        function(cb) {
                            if (change > 0) {
                                var changeOutput = {
                                    scriptPubKey: bitcoin.address.toOutputScript(changeAddress, self.network, self.useNewCashAddr),
                                    value: change
                                };
                                if (randomizeChangeIdx) {
                                    outputs.splice(_.random(0, outputs.length), 0, changeOutput);
                                } else {
                                    outputs.push(changeOutput);
                                }
                            }

                            cb();
                        },
                        /**
                         * add outputs to txb
                         *
                         * @param cb
                         */
                        function(cb) {
                            outputs.forEach(function(outputInfo) {
                                txb.addOutput(outputInfo.scriptPubKey, outputInfo.value);
                            });

                            cb();
                        },
                        /**
                         * sign
                         *
                         * @param cb
                         */
                        function(cb) {
                            var i, privKey, path, redeemScript, witnessScript;

                            deferred.notify(Wallet.PAY_PROGRESS_SIGN);

                            for (i = 0; i < utxos.length; i++) {
                                var mode = SignMode.SIGN;
                                if (utxos[i].sign_mode) {
                                    mode = utxos[i].sign_mode;
                                }

                                redeemScript = null;
                                witnessScript = null;
                                if (mode === SignMode.SIGN) {
                                    path = utxos[i]['path'].replace("M", "m");

                                    // todo: regenerate scripts for path and compare for utxo (paranoid mode)
                                    if (self.primaryPrivateKey) {
                                        privKey = Wallet.deriveByPath(self.primaryPrivateKey, path, "m").keyPair;
                                    } else if (self.backupPrivateKey) {
                                        privKey = Wallet.deriveByPath(self.backupPrivateKey, path.replace(/^m\/(\d+)\'/, 'm/$1'), "m").keyPair;
                                    } else {
                                        throw new Error("No master privateKey present");
                                    }

                                    redeemScript = new Buffer(utxos[i]['redeem_script'], 'hex');
                                    if (typeof utxos[i]['witness_script'] === 'string') {
                                        witnessScript = new Buffer(utxos[i]['witness_script'], 'hex');
                                    }

                                    var sigHash = bitcoin.Transaction.SIGHASH_ALL;
                                    if (self.bitcoinCash) {
                                        sigHash |= bitcoin.Transaction.SIGHASH_BITCOINCASHBIP143;
                                    }

                                    txb.sign(i, privKey, redeemScript, sigHash, utxos[i].value, witnessScript);
                                }
                            }

                            tx = txb.buildIncomplete();

                            cb();
                        },
                        /**
                         * estimate fee to verify that the API is not providing us wrong data
                         *
                         * @param cb
                         */
                        function(cb) {
                            var estimatedFee = Wallet.estimateVsizeFee(tx, utxos);

                            if (self.sdk.feeSanityCheck) {
                                switch (feeStrategy) {
                                    case Wallet.FEE_STRATEGY_BASE_FEE:
                                        if (Math.abs(estimatedFee - fee) > blocktrail.BASE_FEE) {
                                            return cb(new blocktrail.WalletFeeError("the fee suggested by the coin selection (" + fee + ") " +
                                                "seems incorrect (" + estimatedFee + ") for FEE_STRATEGY_BASE_FEE"));
                                        }
                                    break;

                                    case Wallet.FEE_STRATEGY_HIGH_PRIORITY:
                                    case Wallet.FEE_STRATEGY_OPTIMAL:
                                    case Wallet.FEE_STRATEGY_LOW_PRIORITY:
                                        if (fee > estimatedFee * self.feeSanityCheckBaseFeeMultiplier) {
                                            return cb(new blocktrail.WalletFeeError("the fee suggested by the coin selection (" + fee + ") " +
                                                "seems awefully high (" + estimatedFee + ") for FEE_STRATEGY_OPTIMAL"));
                                        }
                                    break;
                                }
                            }

                            cb();
                        }
                    ], function(err) {
                        if (err) {
                            deferred.reject(new blocktrail.WalletSendError(err));
                            return;
                        }

                        deferred.resolve([tx, utxos]);
                    });

                    return deferred.promise;
                }
            )
        );
    });

    return deferred.promise;
};


/**
 * use the API to get the best inputs to use based on the outputs
 *
 * @param pay               array       {'address': (int)value}     coins to send
 * @param [lockUTXO]        bool        lock UTXOs for a few seconds to allow for transaction to be created
 * @param [allowZeroConf]   bool        allow zero confirmation unspent outputs to be used in coin selection
 * @param [feeStrategy]     string      defaults to FEE_STRATEGY_OPTIMAL
 * @param [options]         object
 * @param [cb]              function    callback(err, utxos, fee, change)
 * @returns {q.Promise}
 */
Wallet.prototype.coinSelection = function(pay, lockUTXO, allowZeroConf, feeStrategy, options, cb) {
    var self = this;

    if (typeof lockUTXO === "function") {
        cb = lockUTXO;
        lockUTXO = true;
    } else if (typeof allowZeroConf === "function") {
        cb = allowZeroConf;
        allowZeroConf = false;
    } else if (typeof feeStrategy === "function") {
        cb = feeStrategy;
        feeStrategy = null;
    } else if (typeof options === "function") {
        cb = options;
        options = {};
    }

    lockUTXO = typeof lockUTXO !== "undefined" ? lockUTXO : true;
    feeStrategy = feeStrategy || Wallet.FEE_STRATEGY_OPTIMAL;
    options = options || {};

    var send;
    try {
        send = Wallet.convertPayToOutputs(pay, self.network, self.useNewCashAddr);
    } catch (e) {
        var deferred = q.defer();
        deferred.promise.nodeify(cb);
        deferred.reject(e);
        return deferred.promise;
    }

    return self.sdk.coinSelection(self.identifier, send, lockUTXO, allowZeroConf, feeStrategy, options, cb);
};

/**
 * send the transaction using the API
 *
 * @param txHex             string      partially signed transaction as hex string
 * @param paths             array       list of paths used in inputs which should be cosigned by the API
 * @param checkFee          bool        when TRUE the API will verify if the fee is 100% correct and otherwise throw an exception
 * @param [twoFactorToken]  string      2FA token
 * @param prioboost         bool
 * @param [cb]              function    callback(err, txHash)
 * @returns {q.Promise}
 */
Wallet.prototype.sendTransaction = function(txHex, paths, checkFee, twoFactorToken, prioboost, cb) {
    var self = this;

    if (typeof twoFactorToken === "function") {
        cb = twoFactorToken;
        twoFactorToken = null;
        prioboost = false;
    } else if (typeof prioboost === "function") {
        cb = twoFactorToken;
        prioboost = false;
    }

    var deferred = q.defer();
    deferred.promise.nodeify(cb);

    self.sdk.sendTransaction(self.identifier, txHex, paths, checkFee, twoFactorToken, prioboost)
        .then(
            function(result) {
                deferred.resolve(result);
            },
            function(e) {
                if (e.requires_2fa) {
                    deferred.reject(new blocktrail.WalletMissing2FAError());
                } else if (e.message.match(/Invalid two_factor_token/)) {
                    deferred.reject(new blocktrail.WalletInvalid2FAError());
                } else {
                    deferred.reject(e);
                }
            }
        )
    ;

    return deferred.promise;
};

/**
 * setup a webhook for this wallet
 *
 * @param url           string      URL to receive webhook events
 * @param [identifier]  string      identifier for the webhook, defaults to WALLET- + wallet.identifier
 * @param [cb]          function    callback(err, webhook)
 * @returns {q.Promise}
 */
Wallet.prototype.setupWebhook = function(url, identifier, cb) {
    var self = this;

    if (typeof identifier === "function") {
        cb = identifier;
        identifier = null;
    }

    identifier = identifier || ('WALLET-' + self.identifier);

    return self.sdk.setupWalletWebhook(self.identifier, identifier, url, cb);
};

/**
 * delete a webhook that was created for this wallet
 *
 * @param [identifier]  string      identifier for the webhook, defaults to WALLET- + wallet.identifier
 * @param [cb]          function    callback(err, success)
 * @returns {q.Promise}
 */
Wallet.prototype.deleteWebhook = function(identifier, cb) {
    var self = this;

    if (typeof identifier === "function") {
        cb = identifier;
        identifier = null;
    }

    identifier = identifier || ('WALLET-' + self.identifier);

    return self.sdk.deleteWalletWebhook(self.identifier, identifier, cb);
};

/**
 * get all transactions for the wallet (paginated)
 *
 * @param [params]  object      pagination: {page: 1, limit: 20, sort_dir: 'asc'}
 * @param [cb]      function    callback(err, transactions)
 * @returns {q.Promise}
 */
Wallet.prototype.transactions = function(params, cb) {
    var self = this;

    return self.sdk.walletTransactions(self.identifier, params, cb);
};

Wallet.prototype.maxSpendable = function(allowZeroConf, feeStrategy, options, cb) {
    var self = this;

    if (typeof allowZeroConf === "function") {
        cb = allowZeroConf;
        allowZeroConf = false;
    } else if (typeof feeStrategy === "function") {
        cb = feeStrategy;
        feeStrategy = null;
    } else if (typeof options === "function") {
        cb = options;
        options = {};
    }

    if (typeof allowZeroConf === "object") {
        options = allowZeroConf;
        allowZeroConf = false;
    } else if (typeof feeStrategy === "object") {
        options = feeStrategy;
        feeStrategy = null;
    }

    options = options || {};

    if (typeof options.allowZeroConf !== "undefined") {
        allowZeroConf = options.allowZeroConf;
    }
    if (typeof options.feeStrategy !== "undefined") {
        feeStrategy = options.feeStrategy;
    }

    feeStrategy = feeStrategy || Wallet.FEE_STRATEGY_OPTIMAL;

    return self.sdk.walletMaxSpendable(self.identifier, allowZeroConf, feeStrategy, options, cb);
};

/**
 * get all addresses for the wallet (paginated)
 *
 * @param [params]  object      pagination: {page: 1, limit: 20, sort_dir: 'asc'}
 * @param [cb]      function    callback(err, addresses)
 * @returns {q.Promise}
 */
Wallet.prototype.addresses = function(params, cb) {
    var self = this;

    return self.sdk.walletAddresses(self.identifier, params, cb);
};

/**
 * @param address   string      the address to label
 * @param label     string      the label
 * @param [cb]      function    callback(err, res)
 * @returns {q.Promise}
 */
Wallet.prototype.labelAddress = function(address, label, cb) {
    var self = this;

    return self.sdk.labelWalletAddress(self.identifier, address, label, cb);
};

/**
 * get all UTXOs for the wallet (paginated)
 *
 * @param [params]  object      pagination: {page: 1, limit: 20, sort_dir: 'asc'}
 * @param [cb]      function    callback(err, addresses)
 * @returns {q.Promise}
 */
Wallet.prototype.utxos = function(params, cb) {
    var self = this;

    return self.sdk.walletUTXOs(self.identifier, params, cb);
};

Wallet.prototype.unspentOutputs = Wallet.prototype.utxos;

/**
 * sort list of pubkeys to be used in a multisig redeemscript
 *  sorted in lexicographical order on the hex of the pubkey
 *
 * @param pubKeys   {bitcoin.HDNode[]}
 * @returns string[]
 */
Wallet.sortMultiSigKeys = function(pubKeys) {
    pubKeys.sort(function(key1, key2) {
        return key1.toString('hex').localeCompare(key2.toString('hex'));
    });

    return pubKeys;
};

/**
 * determine how much fee is required based on the inputs and outputs
 *  this is an estimation, not a proper 100% correct calculation
 *
 * @todo: mark deprecated in favor of estimations where UTXOS are known
 * @param {bitcoin.Transaction} tx
 * @param {int} feePerKb when not null use this feePerKb, otherwise use BASE_FEE legacy calculation
 * @returns {number}
 */
Wallet.estimateIncompleteTxFee = function(tx, feePerKb) {
    var size = Wallet.estimateIncompleteTxSize(tx);
    var sizeKB = size / 1000;
    var sizeKBCeil = Math.ceil(size / 1000);

    if (feePerKb) {
        return parseInt(sizeKB * feePerKb, 10);
    } else {
        return parseInt(sizeKBCeil * blocktrail.BASE_FEE, 10);
    }
};

/**
 * Takes tx and utxos, computing their estimated vsize,
 * and uses feePerKb (or BASEFEE as default) to estimate
 * the number of satoshis in fee.
 *
 * @param {bitcoin.Transaction} tx
 * @param {Array} utxos
 * @param feePerKb
 * @returns {Number}
 */
Wallet.estimateVsizeFee = function(tx, utxos, feePerKb) {
    var vsize = SizeEstimation.estimateTxVsize(tx, utxos);
    var sizeKB = vsize / 1000;
    var sizeKBCeil = Math.ceil(vsize / 1000);

    if (feePerKb) {
        return parseInt(sizeKB * feePerKb, 10);
    } else {
        return parseInt(sizeKBCeil * blocktrail.BASE_FEE, 10);
    }
};

/**
 * determine how much fee is required based on the inputs and outputs
 *  this is an estimation, not a proper 100% correct calculation
 *
 * @param {bitcoin.Transaction} tx
 * @returns {number}
 */
Wallet.estimateIncompleteTxSize = function(tx) {
    var size = 4 + 4 + 4 + 4; // version + txinVarInt + txoutVarInt + locktime

    size += tx.outs.length * 34;

    tx.ins.forEach(function(txin) {
        var scriptSig = txin.script,
            scriptType = bitcoin.script.classifyInput(scriptSig);

        var multiSig = [2, 3]; // tmp hardcoded

        // Re-classify if P2SH
        if (!multiSig && scriptType === 'scripthash') {
            var sigChunks = bitcoin.script.decompile(scriptSig);
            var redeemScript = sigChunks.slice(-1)[0];
            scriptSig = bitcoin.script.compile(sigChunks.slice(0, -1));
            scriptType = bitcoin.script.classifyInput(scriptSig);

            if (bitcoin.script.classifyOutput(redeemScript) !== scriptType) {
                throw new blocktrail.TransactionInputError('Non-matching scriptSig and scriptPubKey in input');
            }

            // figure out M of N for multisig (code from internal usage of bitcoinjs)
            if (scriptType === 'multisig') {
                var rsChunks = bitcoin.script.decompile(redeemScript);
                var mOp = rsChunks[0];
                if (mOp === bitcoin.opcodes.OP_0 || mOp < bitcoin.opcodes.OP_1 || mOp > bitcoin.opcodes.OP_16) {
                    throw new blocktrail.TransactionInputError("Invalid multisig redeemScript");
                }

                var nOp = rsChunks[redeemScript.chunks.length - 2];
                if (mOp === bitcoin.opcodes.OP_0 || mOp < bitcoin.opcodes.OP_1 || mOp > bitcoin.opcodes.OP_16) {
                    throw new blocktrail.TransactionInputError("Invalid multisig redeemScript");
                }

                var m = mOp - (bitcoin.opcodes.OP_1 - 1);
                var n = nOp - (bitcoin.opcodes.OP_1 - 1);
                if (n < m) {
                    throw new blocktrail.TransactionInputError("Invalid multisig redeemScript");
                }

                multiSig = [m, n];
            }
        }

        if (multiSig) {
            size += (
                32 + // txhash
                4 + // idx
                3 + // scriptVarInt[>=253]
                1 + // OP_0
                ((1 + 72) * multiSig[0]) + // (OP_PUSHDATA[<75] + 72) * sigCnt
                (2 + 105) + // OP_PUSHDATA[>=75] + script
                4 // sequence
            );

        } else {
            size += 32 + // txhash
                4 + // idx
                73 + // sig
                34 + // script
                4; // sequence
        }
    });

    return size;
};

/**
 * determine how much fee is required based on the amount of inputs and outputs
 *  this is an estimation, not a proper 100% correct calculation
 *  this asumes all inputs are 2of3 multisig
 *
 * @todo: mark deprecated in favor of situations where UTXOS are known
 * @param txinCnt       {number}
 * @param txoutCnt      {number}
 * @returns {number}
 */
Wallet.estimateFee = function(txinCnt, txoutCnt) {
    var size = 4 + 4 + 4 + 4; // version + txinVarInt + txoutVarInt + locktime

    size += txoutCnt * 34;

    size += (
            32 + // txhash
            4 + // idx
            3 + // scriptVarInt[>=253]
            1 + // OP_0
            ((1 + 72) * 2) + // (OP_PUSHDATA[<75] + 72) * sigCnt
            (2 + 105) + // OP_PUSHDATA[>=75] + script
            4 // sequence
        ) * txinCnt;

    var sizeKB = Math.ceil(size / 1000);

    return sizeKB * blocktrail.BASE_FEE;
};

/**
 * create derived key from parent key by path
 *
 * @param hdKey     {bitcoin.HDNode}
 * @param path      string
 * @param keyPath   string
 * @returns {bitcoin.HDNode}
 */
Wallet.deriveByPath = function(hdKey, path, keyPath) {
    keyPath = keyPath || (!!hdKey.keyPair.d ? "m" : "M");

    if (path[0].toLowerCase() !== "m" || keyPath[0].toLowerCase() !== "m") {
        throw new blocktrail.KeyPathError("Wallet.deriveByPath only works with absolute paths. (" + path + ", " + keyPath + ")");
    }

    if (path[0] === "m" && keyPath[0] === "M") {
        throw new blocktrail.KeyPathError("Wallet.deriveByPath can't derive private path from public parent. (" + path + ", " + keyPath + ")");
    }

    // if the desired path is public while the input is private
    var toPublic = path[0] === "M" && keyPath[0] === "m";
    if (toPublic) {
        // derive the private path, convert to public when returning
        path[0] = "m";
    }

    // keyPath should be the parent parent of path
    if (path.toLowerCase().indexOf(keyPath.toLowerCase()) !== 0) {
        throw new blocktrail.KeyPathError("Wallet.derivePath requires path (" + path + ") to be a child of keyPath (" + keyPath + ")");
    }

    // remove the part of the path we already have
    path = path.substr(keyPath.length);

    // iterate over the chunks and derive
    var newKey = hdKey;
    path.replace(/^\//, "").split("/").forEach(function(chunk) {
        if (!chunk) {
            return;
        }

        if (chunk.indexOf("'") !== -1) {
            chunk = parseInt(chunk.replace("'", ""), 10) + bitcoin.HDNode.HIGHEST_BIT;
        }

        newKey = newKey.derive(parseInt(chunk, 10));
    });

    if (toPublic) {
        return newKey.neutered();
    } else {
        return newKey;
    }
};

module.exports = Wallet;
