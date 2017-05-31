var util = require('util');
var assert = require('assert');
var CryptoJS = require('crypto-js');
var bip39 = require('bip39');

var blocktrail = {
    COIN: 100000000,
    PRECISION: 8,
    DUST: 2730,
    BASE_FEE: 10000
};

var convert = function(s, from, to) {
    return (new Buffer(s, from)).toString(to);
};

var aesDecryptMnemonic = function(mnemonic, passphrase) {
    var hex = bip39.mnemonicToEntropy(mnemonic);
    var base64 = convert(hex, 'hex', 'base64');
    var decrypted = CryptoJS.AES.decrypt(base64, passphrase).toString(CryptoJS.enc.Utf8);

    if (!decrypted.length) {
        throw new blocktrail.WalletDecryptError();
    }

    return decrypted;
};

var aesDecryptMnemonicToSeed = function(mnemonic, passphrase) {
    return aesDecryptMnemonic(mnemonic, passphrase).toString(CryptoJS.enc.Utf8);
};

var aesDecryptMnemonicToSeedHex = function(mnemonic, passphrase) {
    return convert(aesDecryptMnemonicToSeed(mnemonic, passphrase), 'base64', 'hex');
};

var aesDecryptMnemonicToSeedBuffer = function(mnemonic, passphrase) {
    return new Buffer(aesDecryptMnemonicToSeedHex(mnemonic, passphrase), 'hex');
};

var aesEncryptSeedToMnemonic = function(seed, passphrase) {
    var base64 = CryptoJS.AES.encrypt(seed, passphrase).toString(CryptoJS.format.OpenSSL);
    var hex = convert(base64, 'base64', 'hex');
    var mnemonic = bip39.entropyToMnemonic(hex);

    return mnemonic;
};

var aesEncryptSeedHexToMnemonic = function(seedHex, passphrase) {
    return aesEncryptSeedToMnemonic(convert(seedHex, 'hex', 'base64'), passphrase);
};

var aesEncryptSeedBufferToMnemonic = function(seedBuffer, passphrase) {
    return aesEncryptSeedToMnemonic(seedBuffer.toString('base64'), passphrase);
};

blocktrail.convert = convert;
blocktrail.aesDecryptMnemonicToSeed = aesDecryptMnemonicToSeed;
blocktrail.aesDecryptMnemonicToSeedBuffer = aesDecryptMnemonicToSeedBuffer;
blocktrail.aesDecryptMnemonicToSeedHex = aesDecryptMnemonicToSeedHex;
blocktrail.aesEncryptSeedToMnemonic = aesEncryptSeedToMnemonic;
blocktrail.aesEncryptSeedHexToMnemonic = aesEncryptSeedHexToMnemonic;
blocktrail.aesEncryptSeedBufferToMnemonic = aesEncryptSeedBufferToMnemonic;

blocktrail.V3Crypt = {
    KeyDerivation: require('./keyderivation'),
    Encryption: require('./encryption'),
    EncryptionMnemonic: require('./encryption_mnemonic')
};

/**
 * convert a BTC value to Satoshi
 *
 * @param btc   float       BTC value
 * @returns int             Satoshi value (int)
 */
blocktrail.toSatoshi = function(btc) {
    return parseInt((btc * blocktrail.COIN).toFixed(0), 10);
};

/**
 * convert a Satoshi value to BTC
 *
 * @param satoshi   int     Satoshi value
 * @returns {string}        BTC value (float)
 */
blocktrail.toBTC = function(satoshi) {
    return (satoshi / blocktrail.COIN).toFixed(blocktrail.PRECISION);
};

/**
 * patch the Q module to add spreadNodeify method to promises
 *  so that we can support multi parameter callbacks
 *
 * @param q
 */
blocktrail.patchQ = function(q) {
    /* jshint -W003 */

    if (q.spreadNodeify && q.spreadDone) {
        return;
    }

    q.spreadDone = spreadDone;
    function spreadDone(value, fulfilled, rejected) {
        return q(value).spreadDone(fulfilled, rejected);
    }

    q.makePromise.prototype.spreadDone = function(fulfilled, rejected) {
        return this.all().done(function(array) {
            return fulfilled.apply(void 0, array);
        }, rejected);
    };

    q.spreadNodeify = spreadNodeify;
    function spreadNodeify(object, nodeback) {
        return q(object).spreadNodeify(nodeback);
    }

    q.makePromise.prototype.spreadNodeify = function(nodeback) {
        if (nodeback) {
            this.then(function(value) {
                q.nextTick(function() {
                    nodeback.apply(void 0, [null].concat(value));
                });
            }, function(error) {
                q.nextTick(function() {
                    nodeback(error);
                });
            });
        } else {
            return this;
        }
    };
};


/**
 * Add extend() method to Error type
 *
 * @param subTypeName
 * @param errorCode [optional]
 * @returns {SubType}
 */
Error.extend = function(subTypeName, errorCode /*optional*/) {
    assert(subTypeName, 'subTypeName is required');
    //define new error type
    var SubType = function(message) {

        //handle constructor call without 'new'
        if (!(this instanceof SubType)) {
            return new SubType(message);
        }

        //populate error details
        this.name = subTypeName;
        this.code = errorCode;
        this.message = message ? (message.message || message || '') : '';

        //include stack trace in error object (only supported in v8 browsers)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    };

    //inherit the base prototype chain
    util.inherits(SubType, this);

    //override the toString method to error type name and inspected message (to expand objects)
    SubType.prototype.toString = function() {
        return this.name + ': ' + util.inspect(this.message);
    };

    //attach extend() to the SubType to make it extendable further
    SubType.extend = this.extend;
    return SubType;
};



//Wallet Errors
blocktrail.WalletInitError = Error.extend("WalletInitError", 400);
blocktrail.WalletCreateError = Error.extend("WalletCreateError", 400);
blocktrail.WalletUpgradeError = Error.extend("WalletUpgradeError", 400);
blocktrail.WalletChecksumError = Error.extend("WalletChecksumError", 400);
blocktrail.WalletDeleteError = Error.extend("WalletDeleteError", 400);
blocktrail.WalletDecryptError = Error.extend("WalletDecryptError", 400);
blocktrail.WalletAddressError = Error.extend("WalletAddressError", 500);
blocktrail.WalletSendError = Error.extend("WalletSendError", 400);
blocktrail.WalletLockedError = Error.extend("WalletLockedError", 500);
blocktrail.WalletFeeError = Error.extend("WalletFeeError", 500);
blocktrail.WalletInvalid2FAError = Error.extend("WalletInvalid2FAError", 401);
blocktrail.WalletMissing2FAError = Error.extend("WalletMissing2FAError", 401);
blocktrail.TransactionSignError = Error.extend("TransactionSignError", 500);
blocktrail.TransactionInputError = Error.extend("TransactionInputError", 400);
blocktrail.TransactionOutputError = Error.extend("TransactionOutputError", 400);

blocktrail.KeyPathError = Error.extend("KeyPathError", 400);

blocktrail.InvalidAddressError = Error.extend("InvalidAddressError", 400);

//Other Errors
blocktrail.Error = Error.extend("Error", 500);

blocktrail.FEE_STRATEGY_FORCE_FEE = 'force_fee';
blocktrail.FEE_STRATEGY_BASE_FEE = 'base_fee';
blocktrail.FEE_STRATEGY_OPTIMAL = 'optimal';
blocktrail.FEE_STRATEGY_LOW_PRIORITY = 'low_priority';
blocktrail.FEE_STRATEGY_MIN_RELAY_FEE = 'min_relay_fee';

// apply patch to Q to add spreadNodeify for all dependants of this module
blocktrail.patchQ(require('q'));

module.exports = blocktrail;
