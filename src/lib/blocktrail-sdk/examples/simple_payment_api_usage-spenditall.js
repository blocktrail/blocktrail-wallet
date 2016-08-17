var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project
var bitcoin = blocktrail.bitcoin;

var client = blocktrail.BlocktrailSDK({
    apiKey: "MY_APIKEY",
    apiSecret: "MY_APISECRET",
    testnet: true
});

client.initWallet({
    identifier: "example-wallet",
    readOnly: true
}, function(err, wallet) {
    if (err) {
        console.log(err);
        return;
    }

    wallet.getNewAddress(function(err, selfAddress) {
        if (err) {
            console.log(err);
            return;
        }

        var allowZeroConf = true;
        var allowZeroConfSelf = true;
        var feeStrategy = blocktrail.Wallet.FEE_STRATEGY_BASE_FEE;
        // var feeStrategy = blocktrail.Wallet.FEE_STRATEGY_OPTIMAL;
        var options = {
            allowZeroConfSelf: allowZeroConfSelf
        };

        wallet.maxSpendable(allowZeroConf, feeStrategy, options, function(err, maxSpendable) {
            if (err) {
                console.log(err);
                return;
            }

            console.log(maxSpendable);

            wallet.unlock({passphrase: "example-strong-password"}, function(err) {
                if (err) {
                    console.log(err);
                    return;
                }

                var pay = {};
                pay[selfAddress] = maxSpendable.max;

                wallet.pay(pay, function(err, txHash) {
                    if (err) {
                        console.log(err);
                        return;
                    }

                    console.log(txHash);
                });
            });
        });
    });
});
