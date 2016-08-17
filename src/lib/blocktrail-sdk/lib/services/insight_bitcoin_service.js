var blocktrail = require('../blocktrail');
var request = require('superagent');
var _ = require('lodash');
var q = require('q');

/**
 *
 * @param options
 * @constructor
 */
var InsightBitcoinService = function(options) {
    this.defaultSettings = {
        testnet:    false,

        retryLimit: 5,
        retryDelay:  20
    };
    this.settings = _.merge({}, this.defaultSettings, options);
};

/**
 * gets unspent outputs for a batch of addresses, returning an array of outputs with hash, index, value,
 * and script pub hex mapped to each corresponding address
 *
 * @param {array} addresses array of addresses
 * @returns {q.Promise}     promise resolves with array of unspent outputs mapped to addresses as
 *                          { address: [{"hash": hash, "index": index, "value": value, "script_hex": scriptHex}]}
 */
InsightBitcoinService.prototype.getBatchUnspentOutputs = function(addresses) {
    var self = this;
    var deferred = q.defer();

    //get unspent outputs for the chunk of addresses - required data: hash, index, value, and script hex,
    var data = {"addrs": addresses.join(',')};
    self.postRequest("https://" + (self.settings.testnet ? 'test-' : '') + 'insight.bitpay.com/api/addrs/utxo', data).then(function(results) {
        var batchResults = {};  //utxos mapped to addresses

        //reduce the returned data into the values we're interested in, and map to the relevant addresses
        results.forEach(function(utxo) {
            var address = utxo['address'];

            if (typeof batchResults[address] === "undefined") {
                batchResults[address] = [];
            }

            batchResults[address].push({
                'hash': utxo['txid'],
                'index': utxo['vout'],
                'value': blocktrail.toSatoshi(utxo['amount']),
                'script_hex': utxo['scriptPubKey']
            });
        });
        deferred.resolve(batchResults);

    }, function(err) {
        deferred.reject(err);
    });


    return deferred.promise;
};

/**
 * gets transactions for a batch of addresses
 *
 * @param {array} addresses   array of addresses
 * @returns {q.Promise}
 */
InsightBitcoinService.prototype.batchAddressHasTransactions = function(addresses) {
    var self = this;

    var data = {"addrs": addresses.join(',')};
    return self.postRequest("https://" + (self.settings.testnet ? 'test-' : '') + 'insight.bitpay.com/api/addrs/txs', data)
        .then(function(results) {
            return results.items.length > 0;
        })
    ;
};

InsightBitcoinService.prototype.postRequest = function(url, data) {
    var deferred = q.defer();
    request
        .post(url)
        .send(data)
        .set('Content-Type', 'application/json')
        .end(function(error, res) {
            if (error) {
                deferred.reject(error);
                return;
            }
            if (res.ok) {
                if (res.headers['content-type'].indexOf('application/json') >= 0) {
                    try {
                        var body = JSON.parse(res.text);
                        return deferred.resolve(body);

                    } catch (e) {
                        return deferred.reject(error);
                    }
                } else {
                    return deferred.resolve(res.body);
                }
            } else {
                return deferred.reject(res.text);
            }
        });

    return deferred.promise;
};

module.exports = InsightBitcoinService;
