var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project
var bitcoin = require('bitcoinjs-lib');
var bip39 = require('bip39');
var CryptoJS = require('crypto-js');

// either set encryptedPrimarySeedMnemonic recoveryEncryptedSecretMnemonic
var encryptedPrimarySeedMnemonic = 'library first sheriff supply orange exile dismiss upgrade team session abandon above will film predict chat basic convince mixed equip business balance road clever shaft reunion orbit pattern off number about cluster dynamic theme cook auction price bomb humor collect swamp volume horror door display jealous coach mind present utility tackle yellow tube service gas possible arrow target bomb index';
var recoveryEncryptedSecretMnemonic = "library female concert imitate excess order lesson settle keen session abandon absorb cliff cave spike family crowd satisfy satoshi chapter major marble divert sister slice brand hero permit poem stand client core egg wolf cluster caught ask ecology assist deliver assault great law curve second feature enrich cart citizen strong clarify lady senior prosper insect letter floor artwork fog tribe";

// or set backupSeedMnemonic
// var backupSeedMnemonic = "key frog tobacco accuse cigar special canal write develop edit across off chat popular name cupboard digital vapor maple weather point enact walnut bid";

var identifier = "nodejs-example-8f73b6725dc5a744edb03f11ad7391faf8c9ef548463fc05";
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

            var encryptedSecret = blocktrail.V3Crypt.Mnemonic.decode(recoveryEncryptedSecretMnemonic);
            var secret = blocktrail.V3Crypt.Encryption.decrypt(encryptedSecret, new Buffer(wallet.recoverySecret, 'hex'));

            var encryptedPrimarySeed = blocktrail.V3Crypt.Mnemonic.decode(encryptedPrimarySeedMnemonic);
            var primarySeedBuffer = blocktrail.V3Crypt.Encryption.decrypt(encryptedPrimarySeed, secret);

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
