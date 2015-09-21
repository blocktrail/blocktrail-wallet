var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project

var client = blocktrail.BlocktrailSDK({
    apiKey : "MY_APIKEY",
    apiSecret : "MY_APISECRET",
    testnet : true
});

client.initWallet({
    identifier: "example-wallet",
    readOnly: true
}, function(err, wallet) {
    if (err) {
        return console.log('initWallet ERR', err);
    }

    wallet.getBalance(function(err, confirmed, unconfirmed) {
        if (err) {
            return console.log("getBalance ERR", err);
        }

        console.log('confirmed balance', confirmed);
        console.log('unconfirmed balance', unconfirmed);
    });
});
