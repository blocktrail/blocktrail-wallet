var blocktrail = require('../blocktrail');
var request = require('superagent');
var _ = require('lodash');
var q = require('q');

var InsightEndpointMainnet = 'https://insight.bitpay.com/api';
var InsightEndpointTestnet = 'https://test-insight.bitpay.com/api';

/**
 *
 * @param options
 * @constructor
 */
var InsightBitcoinService = function(options) {
    this.defaultSettings = {
        host: InsightEndpointMainnet,
        testnet: false,

        retryLimit: 5,
        retryDelay: 20
    };

    // Backwards compatibility: change default host to bitpay
    // if host not set but testnet requested.
    if (typeof options.host === 'undefined' && options.testnet) {
        this.defaultSettings.host = InsightEndpointTestnet;
    }

    this.settings = _.merge({}, this.defaultSettings, options);
    this.DEFAULT_ENDPOINT_MAINNET = InsightEndpointMainnet;
    this.DEFAULT_ENDPOINT_TESTNET = InsightEndpointTestnet;
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
    self.postEndpoint('addrs/utxo', data).then(function(results) {
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
    return self.postEndpoint('addrs/txs', data)
        .then(function(results) {
            return results.items.length > 0;
        })
        ;
};

/**
 * get estimated fee/kb
 *
 * @returns {q.Promise}
 */
InsightBitcoinService.prototype.estimateFee = function() {
    var self = this;

    var nBlocks = "2";

    return self.getEndpoint('utils/estimatefee?nbBlocks=' + nBlocks)
        .then(function(results) {
            return parseInt(results[nBlocks] * 1e8, 10);
        })
    ;
};

/**
 * Submit a raw transaction hex to the tx/send endpoint
 * @param hex
 * @returns {*}
 */
InsightBitcoinService.prototype.sendTx = function(hex) {
    return this.postEndpoint('tx/send', {rawtx: hex});
};

/**
 * Makes a URL from the endpoint and issues a GET request.
 * @param endpoint
 */
InsightBitcoinService.prototype.getEndpoint = function(endpoint) {
    return this.getRequest(this.settings.host + '/' + endpoint);
};

/**
 * Makes URL from endpoint and issues a POST request.
 *
 * @param endpoint
 * @param data
 * @returns {promise|Function|*}
 */
InsightBitcoinService.prototype.postEndpoint = function(endpoint, data) {
    return this.postRequest(this.settings.host + '/' + endpoint, data);
};

/**
 * Makes a GET request to url
 * @param url
 * @returns {promise|Function|*}
 */
InsightBitcoinService.prototype.getRequest = function(url) {
    var deferred = q.defer();
    request
        .get(url)
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

/**
 * Makes a POST request given the url and data
 *
 * @param url
 * @param data
 * @returns {promise|Function|*}
 */
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
