var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project

var client = blocktrail.BlocktrailSDK({
    apiKey : "MY_APIKEY",
    apiSecret : "MY_APISECRET",
    testnet : true
});

var sendTransaction = function(wallet) {
    wallet.getNewAddress(function(err, address, path) {
        if (err) {
            return console.log("getNewAddress ERR", err);
        }

        console.log('new address', address, path);

        var pay = {};
        pay[address] = blocktrail.toSatoshi(0.001);

        var options = {
            forcefee: blocktrail.toSatoshi(0.00054321)
        };

        wallet.pay(pay, null, true, true, blocktrail.Wallet.FEE_STRATEGY_FORCE_FEE, null, options, function(err, result) {
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

        wallet.getNewAddress(function(err, address, path) {
            if (err) {
                return console.log("getNewAddress ERR", err);
            }

            console.log('new address', address, path);
        });
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

            wallet.unlock({passphrase: "example-strong-password"}, function(err) {
                if (err) {
                    return console.log("unlock ERR", err);
                }

                sendTransaction(wallet);
            });
        });
    });
}
