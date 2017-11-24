var _ = require('lodash');
var blocktrail = require('../');
var q = require('q');
var crypto = require('crypto');
var async = require('async');
var bitcoin = require('bitcoinjs-lib');
var bip39 = require("bip39");

/**
 * @type APIClient
 */
var client = blocktrail.BlocktrailSDK({
    apiKey : process.env.BLOCKTRAIL_SDK_APIKEY || "EXAMPLE_BLOCKTRAIL_SDK_NODEJS_APIKEY",
    apiSecret : process.env.BLOCKTRAIL_SDK_APISECRET || "EXAMPLE_BLOCKTRAIL_SDK_NODEJS_APISECRET",
    testnet : true
});

// aggregate TXs will try to have N outputs
var SPLITNOUTS = 5;
// don't go below MINVALUE when trying to send
var MINVALUE = 10000;
// don't glo below MINSPLITVALUE for outputs (nouts will be rounded down to match this)
var MINSPLITVALUE = 10000;
var ONEBTC = 1e8;

client.initWallet({
    identifier: "unittest-transaction",
    password: "password"
})
    .then(function(wallet) {
        // @DBEUG
        // return wallet.utxos().then(function(utxos) {
        //     console.log(utxos);
        // });

        return wallet.maxSpendable(false).then(function(maxSpendable) {
            console.log(maxSpendable);

            // get the address to aggregate the coins to
            var addr = wallet.getAddressByPath("M/9999'/0/0");
            console.log(addr);

            var splitSend = function(value) {
                var pay = [];
                var splitValue = Math.max(MINSPLITVALUE, Math.floor(value / SPLITNOUTS)).toFixed(0);
                var nouts = Math.floor(value / splitValue);

                for (var i = 0; i < nouts; i++) {
                    pay.push({address: addr, value: splitValue});
                }

                return wallet.pay(pay, null, false, false, blocktrail.Wallet.FEE_STRATEGY_MIN_RELAY_FEE, false, {allowZeroConfSelf: false}).then(function(txId) {
                    console.log(txId);
                });
            };

            // start at 20 BTC, * 0.5 every time we can't send such a large amount anymore
            var value = 20 * ONEBTC;
            // track retries
            var retries = 0;

            var keepSpending = function() {
                return wallet.getBalance().then(function(b) {
                    console.log(b);

                    // do a split send
                    return splitSend(Math.min(b[0], value))
                        .then(function() {
                            // keep sending for as long as possible
                            return keepSpending()
                                .then(function() {
                                    // reset retries on success
                                    retries = 0;
                                });
                        }, function(e) {
                            console.error(e.message || e);

                            // if TX is too big (or MrSign times out cuz TX is too big to sign)
                            if (e.message.match(/too big/) || e.message.match(/MrSign/)) {
                                // if value reaches <= MINVALUE then we're done(ish)
                                if (value <= MINVALUE) {
                                    retries++;

                                    // retry 3 more times, otherwise done
                                    if (retries >= 3) {
                                        throw new Error("DONE");
                                    }

                                    // keep trying
                                    return keepSpending();
                                } else {
                                    // halve the value and try again
                                    value *= 0.5;
                                    console.log('too big, new value:', blocktrail.toBTC(value));

                                    return keepSpending();
                                }
                            } else if (e.message.match(/too low/)) {
                                // halve the value and try again
                                value *= 0.5;
                                console.log('too big, new value:', blocktrail.toBTC(value));

                                return keepSpending();
                            } else if (e.message.match(/All usable unspent/)) {
                                // halve the value and try again, but with a timeout
                                value *= 0.5;
                                console.log('too big, new value:', blocktrail.toBTC(value));

                                var deferred = q.defer();

                                setTimeout(function() {
                                    deferred.resolve();
                                }, 11000);

                                return deferred.promise.then(function() {
                                    return keepSpending();
                                });
                            }

                            throw e;
                        });
                });
            };

            return keepSpending();
        });
    })
    .catch(function(e) {
        console.error(e);
    });
