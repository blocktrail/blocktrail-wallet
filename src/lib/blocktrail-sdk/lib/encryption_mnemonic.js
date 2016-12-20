var assert = require('assert'),
    bip39 = require('bip39');

if (!String.prototype.repeat) {
    /*jshint -W121 */
    String.prototype.repeat = function(count) {
        'use strict';
        if (this === null) {
            throw new TypeError('can\'t convert ' + this + ' to object');
        }
        var str = '' + this;
        count = +count;
        if (count !== count) {
            count = 0;
        }
        if (count < 0) {
            throw new RangeError('repeat count must be non-negative');
        }
        if (count === Infinity) {
            throw new RangeError('repeat count must be less than infinity');
        }
        count = Math.floor(count);
        if (str.length === 0 || count === 0) {
            return '';
        }
        // Ensuring count is a 31-bit integer allows us to heavily optimize the
        // main part. But anyway, most current (August 2014) browsers can't handle
        // strings 1 << 28 chars or longer, so:
        if (str.length * count >= 1 << 28) {
            throw new RangeError('repeat count must not overflow maximum string size');
        }
        var rpt = '';
        for (;;) {
            if ((count & 1) === 1) {
                rpt += str;
            }
            count >>>= 1;
            if (count === 0) {
                break;
            }
            str += str;
        }
        // Could we try:
        // return Array(count + 1).join(this);
        return rpt;
    };
}

var EncryptionMnemonic = {
    chunkSize: 4,
    paddingDummy: 0x81 /* because salts with length > 128 should be forbidden? */
};

var derivePadding = function(data) {
    if (data[0] > 0x80) {
        throw new Error('Mnemonic sanity check - first byte can never be above 0x80');
    }

    return EncryptionMnemonic.paddingDummy.toString(16).repeat(EncryptionMnemonic.chunkSize - data.length % EncryptionMnemonic.chunkSize);
};

EncryptionMnemonic.encode = function(data) {
    assert(data instanceof Buffer, 'Data must be provided as a Buffer');

    var padding = derivePadding(data);
    var mnemonic = bip39.entropyToMnemonic(padding + data.toString('hex'));

    try {
        bip39.mnemonicToEntropy(mnemonic);
    } catch (e) {
        throw new Error('BIP39 library produced an invalid mnemonic');
    }

    return mnemonic;
};

EncryptionMnemonic.decode = function(mnemonic) {
    assert(typeof mnemonic === 'string', 'Mnemonic must be provided as a string');

    var decoded = new Buffer(bip39.mnemonicToEntropy(mnemonic), 'hex');
    var padFinish = 0;
    while (decoded[padFinish] === this.paddingDummy) {
        padFinish++;
    }

    var data = decoded.slice(padFinish, decoded.length);
    if (derivePadding(data) !== decoded.slice(0, padFinish).toString('hex')) {
        throw new Error('There is only one way to pad a string');
    }

    return data;
};

module.exports = EncryptionMnemonic;
