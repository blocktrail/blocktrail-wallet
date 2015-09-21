var bip39 = require("bip39");

module.exports = function(self) {
    self.addEventListener('message', function(e) {
        var data = e.data || {};

        switch (data.method) {
            case 'mnemonicToSeedHex':
                (function() {
                    var mnemonic = data.mnemonic;
                    var passphrase = data.passphrase;

                    if (!bip39.validateMnemonic(mnemonic)) {
                        throw new Error('Invalid passphrase');
                    }
                    var seed = bip39.mnemonicToSeedHex(mnemonic, passphrase);

                    self.postMessage({seed: seed, mnemonic: mnemonic});
                })();
            break;

            default:
                throw new Error('Invalid method [' + e.method + ']');
        }
    }, false);
};
