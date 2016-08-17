var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project
var bitcoin = require('bitcoinjs-lib');
var bip39 = require('bip39');
var CryptoJS = require('crypto-js');

// either set encryptedPrimarySeedMnemonic recoveryEncryptedSecretMnemonic
var encryptedPrimarySeedMnemonic = 'fat arena brown skull echo quit enhance useless essence sheriff utility loyal drum orange diagram oyster warfare live kiss zebra glare group dance announce identify fever fever note educate good cradle asset silver know viable much snap filter anxiety inspire wide grain thank void buffalo pitch wagon credit';
var recoveryEncryptedSecretMnemonic = "fat arena brown skull echo quick brass rude rent lyrics side symbol human tag hurdle own cost box auto warrior sentence reunion loyal disease barrel ivory six spread quarter job smoke finger atom venture open suspect ethics round still cactus oak autumn hire palace sell solid siren attitude volume duck burst sustain duck repeat swift tunnel anxiety card home drum gossip bacon arena bullet social tree hair pulse walnut announce erode diesel";

// or set backupSeedMnemonic
// var backupSeedMnemonic = "key frog tobacco accuse cigar special canal write develop edit across off chat popular name cupboard digital vapor maple weather point enact walnut bid";

var identifier = "example-wallet-with-password-lostv2";
var apiKey = "MY_APIKEY";
var apiSecret = "MY_APISECRET";
var testnet = true;
var sendTo = [
    "2MvtkBHKhEu9JjBkGDE9U6mApPYkBqViV7h"
];
var sendPercentage = 1;

var twoFactorToken = null;

var client = blocktrail.BlocktrailSDK({
    apiKey : apiKey,
    apiSecret : apiSecret,
    testnet: testnet
});

/* // put // at the start of this line to create a wallet
return client.createNewWallet({
    identifier: identifier,
    passphrase: "example-password-that-we-forgot",
    walletVersion: blocktrail.Wallet.WALLET_VERSION_V2,
    keyIndex: 9999
})
    .spread(
        function(wallet, backupInfo) {
            console.log(backupInfo);

            return wallet.getNewAddress().spread(function(address) {
                return client.faucetWithdrawl(address, blocktrail.toSatoshi(0.001)).then(function(result) {
                    console.log(result);

                    return wallet.getNewAddress().then(function(address) { console.log(address); });
                });
            });
    })
    .catch(function(err) {
        console.error(err);
        throw err;
    })
;
//*/

return client.initWallet({
    identifier: identifier,
    readOnly: true
})
    .then(function(wallet) {
        if (typeof recoveryEncryptedSecretMnemonic !== "undefined") {
            var encryptedSecret = blocktrail.convert(bip39.mnemonicToEntropy(recoveryEncryptedSecretMnemonic), 'hex', 'base64');
            var secret = CryptoJS.AES.decrypt(encryptedSecret, wallet.recoverySecret).toString(CryptoJS.enc.Utf8);

            var encryptedPrimarySeed = blocktrail.convert(bip39.mnemonicToEntropy(encryptedPrimarySeedMnemonic), 'hex', 'base64');
            var primarySeedBuffer = new Buffer(CryptoJS.AES.decrypt(encryptedPrimarySeed, secret).toString(CryptoJS.enc.Utf8), 'base64');

            wallet.primaryPrivateKey = bitcoin.HDNode.fromSeedBuffer(primarySeedBuffer, client.network);
        } else if (typeof backupSeedMnemonic !== "undefined") {
            var backupSeedHex = bip39.mnemonicToEntropy(backupSeedMnemonic);
            wallet.backupPrivateKey = bitcoin.HDNode.fromSeedHex(backupSeedHex, client.network);
        }
        wallet.locked = false;

        return wallet.maxSpendable({allowZeroConf: true, outputs: sendTo.length}).then(function(maxSpendable) {
            console.log(maxSpendable);

            var pay = {};
            var sendAmount = Math.floor(maxSpendable.max * sendPercentage);
            var spendable = sendAmount;

            console.log(blocktrail.toBTC(maxSpendable.max), blocktrail.toBTC(sendAmount));

            sendTo.forEach(function(address) {
                var value = Math.min(spendable, Math.ceil(sendAmount / sendTo.length));

                pay[address] = value;
                spendable -= value;
            });

            return wallet.pay(pay, null, true, true, null, twoFactorToken).then(function(result) {
                console.log(result);
            });
        });
    })
    .catch(function(err) {
        console.error(err);
        throw err;
    })
;
