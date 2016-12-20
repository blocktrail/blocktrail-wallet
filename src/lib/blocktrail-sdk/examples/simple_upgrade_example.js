var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project

var client = blocktrail.BlocktrailSDK({
    apiKey: process.env.BLOCKTRAIL_SDK_APIKEY || "EXAMPLE_BLOCKTRAIL_SDK_NODEJS_APIKEY",
    apiSecret: process.env.BLOCKTRAIL_SDK_APISECRET || "EXAMPLE_BLOCKTRAIL_SDK_NODEJS_APISECRET",
    testnet: true
});

var randi = (Math.random() * 10000).toFixed();

var passphrase = "example-strong-password";
var walletVersion = blocktrail.Wallet.WALLET_VERSION_V2;
var identifier = "example-wallet-" + randi;

console.log("identifier: " + identifier);

var getWallet = function() {
    return client.createNewWallet({
        identifier: identifier,
        passphrase: passphrase,
        walletVersion: walletVersion,
        keyIndex: 9999
    })
        .progress(function(p) {
            console.log('progress', p);
        })
        .then(function(r) {
            return r[0];
        }, function(e) {
            if (e.message.match(/already exists/)) {
                return client.initWallet({
                    identifier: identifier,
                    passphrase: passphrase
                });
            } else {
                throw e;
            }
        });
};

getWallet()
    .then(function(wallet) {
        console.log('got wallet');
        console.log(wallet.getAddressByPath("M/9999'/0/0"));

        return wallet;
    })
    .then(function(wallet) {
        return wallet.upgradeToV3(passphrase)
            .then(function() {
                return wallet;
            });
    })
    .then(function(wallet) {
        console.log('UPGRADED!');

        console.log(wallet.getAddressByPath("M/9999'/0/0"));
    })
    .catch(function(e) {
        console.log(e);
        throw e;
    })
    .done();
