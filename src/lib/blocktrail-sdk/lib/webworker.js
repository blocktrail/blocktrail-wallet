var bip39 = require("bip39");
var Encryption = require('./encryption');

module.exports = function(self) {
    self.addEventListener('message', function(e) {
        var data = e.data || {};

        switch (data.method) {
            case 'mnemonicToSeedHex':
                (function() {
                    try {
                        var mnemonic = data.mnemonic;
                        var passphrase = data.passphrase;

                        if (!bip39.validateMnemonic(mnemonic)) {
                            e = new Error('Invalid passphrase');
                            e.id = data.id;
                            throw e;
                        }
                        var seed = bip39.mnemonicToSeedHex(mnemonic, passphrase);

                        self.postMessage({id: data.id, seed: seed, mnemonic: mnemonic});
                    } catch (e) {
                        e.id = data.id;
                        throw e;
                    }
                })();
            break;

            case 'Encryption.encryptWithSaltAndIV':
                (function() {
                    try {
                        if (!data.pt || !data.pw || !data.saltBuf || !data.iv || !data.iterations) {
                            throw new Error("Invalid input");
                        }

                        var pt = Buffer.from(data.pt.buffer);
                        var pw = Buffer.from(data.pw.buffer);
                        var saltBuf = Buffer.from(data.saltBuf.buffer);
                        var iv = Buffer.from(data.iv.buffer);
                        var iterations = data.iterations;

                        var cipherText = Encryption.encryptWithSaltAndIV(pt,  pw, saltBuf, iv, iterations);

                        self.postMessage({id: data.id, cipherText: cipherText});
                    } catch (e) {
                        e.id = data.id;
                        throw e;
                    }
                })();
            break;

            case 'Encryption.decrypt':
                (function() {
                    try {
                        if (!data.ct || !data.pw) {
                            throw new Error("Invalid input");
                        }

                        var ct = Buffer.from(data.ct.buffer);
                        var pw = Buffer.from(data.pw.buffer);

                        var plainText = Encryption.decrypt(ct,  pw);

                        self.postMessage({id: data.id, plainText: plainText});
                    } catch (e) {
                        e.id = data.id;
                        throw e;
                    }
                })();
            break;

            default:
                e = new Error('Invalid method [' + e.method + ']');
                e.id = data.id;
                throw e;
        }
    }, false);
};
