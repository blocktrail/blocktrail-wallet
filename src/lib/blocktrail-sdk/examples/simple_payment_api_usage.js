var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project

var client = blocktrail.BlocktrailSDK({
    apiKey : process.env.BLOCKTRAIL_SDK_APIKEY || "MY_APIKEY",
    apiSecret : process.env.BLOCKTRAIL_SDK_APISECRET || "MY_APISECRET",
    testnet : true
});

var ALLOW_ZERO_CONF = true;

var sendTransaction = function(wallet) {
    wallet.getNewAddress(function(err, address, path) {
        if (err) {
            return console.log("getNewAddress ERR", err);
        }

        console.log('new address', address, path);

        var pay = {};
        pay[address] = blocktrail.toSatoshi(0.001);

        wallet.pay(pay, null, ALLOW_ZERO_CONF, function(err, result) {
        // wallet.pay(pay, null, true, true, blocktrail.Wallet.FEE_STRATEGY_LOW_PRIORITY, function(err, result) {
            if (err) {
                return console.log("pay ERR", err);
            }

            console.log('transaction', result);
        });
    });
};

var action = 'default';

if (action === 'create') {
    client.createNewWallet({
        identifier: "example-wallet",
        passphrase: "example-strong-password",
        keyIndex: 9999
    }, function(err, wallet, primaryMnemonic, backupMnemonic, blocktrailPubKeys) {
        if (err) {
            return console.log("createNewWallet ERR", err);
        }

        console.log('primary mnemonic', primaryMnemonic);
        console.log('backup mnemonic', backupMnemonic);
        console.log('blocktrail pubkeys', blocktrailPubKeys);
    });
} else {
    client.initWallet({
        identifier: "example-wallet",
        readOnly: true
    }, function(err, wallet) {
        if (err) {
            console.log('initWallet ERR', err);
            throw err;
        }

        wallet.getBalance(function(err, confirmed, unconfirmed) {
            if (err) {
                return console.log("getBalance ERR", err);
            }

            console.log('confirmed balance', confirmed);
            console.log('unconfirmed balance', unconfirmed);

            wallet.getNewAddress(function(err, address) {
                if (err) {
                    return console.log("getNewAddress ERR", err);
                }

                console.log('address', address);

                wallet.unlock({passphrase: "example-strong-password"}, function(err) {
                    if (err) {
                        return console.log("unlock ERR", err);
                    }

                    sendTransaction(wallet);
                });
            });
        });
    });
}
