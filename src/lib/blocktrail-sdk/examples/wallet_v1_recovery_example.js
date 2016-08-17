var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project

var backupMnemonic = "canal shrimp family budget husband ceiling vital pole senior eagle ceiling silver melt exit boss error feature battle floor danger orphan prize give step";
var identifier = "example-wallet-with-password-lost";
var apiKey = "MY_APIKEY";
var apiSecret = "MY_APISECRET";
var testnet = true;
var sendTo = [
    "2NF2Urotmr39ESYp8sBxT6ZSEXwdfY78zU9"
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
    walletVersion: blocktrail.Wallet.WALLET_VERSION_V1,
    keyIndex: 9999
})
    .spread(
        function(wallet, backupInfo) {
            console.log(backupInfo.backupMnemonic);

            return wallet.getNewAddress().spread(function(address) {
                return client.faucetWithdrawl(address, blocktrail.toSatoshi(0.001)).then(function(result) {
                    console.log(result);
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
        // 'unlock' using backupMnemonic
        return client.mnemonicToPrivateKey(backupMnemonic, "").then(function(backupPrivateKey) {
            wallet.backupPrivateKey = backupPrivateKey;
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
        });
    })
    .catch(function(err) {
        console.error(err);
        throw err;
    })
;
