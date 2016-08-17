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

    var allowZeroConf = true;
    var allowZeroConfSelf = true;
    var options = {
        allowZeroConfSelf: allowZeroConfSelf
    };

    wallet.maxSpendable(allowZeroConf, blocktrail.Wallet.FEE_STRATEGY_BASE_FEE, options, function(err, maxSpendable) {
        if (err) {
            console.log(err);
            return;
        }

        console.log('BASE_FEE', maxSpendable);
    });

    wallet.maxSpendable(allowZeroConf, blocktrail.Wallet.FEE_STRATEGY_OPTIMAL, options, function(err, maxSpendable) {
        if (err) {
            console.log(err);
            return;
        }

        console.log('OPTIMAL', maxSpendable);
    });

    wallet.maxSpendable(allowZeroConf, blocktrail.Wallet.FEE_STRATEGY_LOW_PRIORITY, options, function(err, maxSpendable) {
        if (err) {
            console.log(err);
            return;
        }

        console.log('LOW_PRIORITY', maxSpendable);
    });
});
