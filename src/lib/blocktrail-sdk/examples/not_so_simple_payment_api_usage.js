/* jshint -W101 */
var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project
var bitcoin = require('bitcoinjs-lib');

var client = blocktrail.BlocktrailSDK({
    apiKey : "YOUR_APIKEY_HERE",
    apiSecret : "YOUR_APISECRET_HERE",
    testnet : true
});

/*
 * this example is for when you're storing the primary private and backup public key yourself
 */
var primaryPrivateKey = bitcoin.HDNode.fromBase58("tprv8ZgxMBicQKsPdMD2AYgpezVQZNi5kxsRJDpQWc5E9mxp747KgzekJbCkvhqv6sBTDErTjkWqZdY14rLP1YL3cJawEtEp2dufHxPhr1YUoeS", bitcoin.networks.testnet);
var backupPublicKey = bitcoin.HDNode.fromBase58("tpubD6NzVbkrYhZ4Y6Ny2VF2o5wkBGuZLQAsGPn88Y4JzKZH9siB85txQyYq3sDjRBFwnE1YhdthmHWWAurJu7EetmdeJH9M5jz3Chk7Ymw2oyf", bitcoin.networks.testnet);

var sendTransaction = function(wallet) {
    wallet.getNewAddress(function(err, address, path) {
        if (err) {
            return console.log("getNewAddress ERR", err);
        }

        console.log('new address', address, path);

        var pay = {};
        pay[address] = blocktrail.toSatoshi(0.001);

        wallet.pay(pay, function(err, result) {
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
        keyIndex: 9999,
        primaryPrivateKey: primaryPrivateKey,
        backupPublicKey: backupPublicKey
    }, function(err, wallet, primaryMnemonic, backupMnemonic, blocktrailPubKeys) {
            if (err) {
                return console.log("createNewWallet ERR", err);
            }

            console.log('primary mnemonic', primaryMnemonic);
            console.log('backup mnemonic', backupMnemonic);
            console.log('blocktrail pubkeys', blocktrailPubKeys);

            wallet.doDiscovery(function(err, confirmed, unconfirmed) {
                if (err) {
                    return console.log("doDiscovery ERR", err);
                }

                console.log('confirmed balance', confirmed);
                console.log('unconfirmed balance', unconfirmed);

                sendTransaction(wallet);
            });
        }
    );
} else {
    client.initWallet({
        identifier: "example-wallet",
        keyIndex: 9999,
        primaryPrivateKey: primaryPrivateKey,
        primaryMnemonic: false
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

                sendTransaction(wallet);
            });
        }
    );
}
