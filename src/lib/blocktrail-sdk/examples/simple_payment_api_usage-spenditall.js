var blocktrail = require('blocktrail-sdk');
var bitcoin = blocktrail.bitcoin;

var client = blocktrail.BlocktrailSDK({
    apiKey : "MY_APIKEY",
    apiSecret : "MY_APISECRET",
    testnet : true
});

console.log(blocktrail.Wallet.estimateFee(193, 1));

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

        wallet.unlock({passphrase: "example-strong-password"}, function(err) {
            if (err) {
                console.log(err);
                return;
            }
            
            wallet.getInfo(function(err, walletInfo) {
                var estFee = blocktrail.Wallet.estimateFee(walletInfo.confirmed_utxos + walletInfo.unconfirmed_utxos, 1);

                var pay = {};
                pay[selfAddress] = walletInfo.confirmed + walletInfo.unconfirmed - estFee;

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
