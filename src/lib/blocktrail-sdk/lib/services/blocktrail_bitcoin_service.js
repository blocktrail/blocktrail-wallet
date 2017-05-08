var BlocktrailSDK = require('../api_client');
var _ = require('lodash');
var q = require('q');
var async = require('async');

/**
 *
 * @param options
 * @constructor
 */
var BlocktrailBitcoinService = function(options) {
    this.defaultSettings = {
        apiKey:      null,
        apiSecret:   null,
        network:     'BTC',
        testnet:     false,
        apiVersion:  'v1',
        apiEndpoint: null,

        retryLimit: 5,
        retryDelay:  20,
        paginationLimit: 200   //max records to return per page
    };
    this.settings = _.merge({}, this.defaultSettings, options);
    //normalise the network settings
    var networkSettings = this.normaliseNetwork(this.settings.network, this.settings.testnet);
    this.settings.network = networkSettings.network;
    this.settings.testnet = networkSettings.testnet;

    this.client = new BlocktrailSDK(this.settings);
};

BlocktrailBitcoinService.prototype.normaliseNetwork =  function(network, testnet) {
    switch (network.toLowerCase()) {
        case 'btc':
        case 'bitcoin':
            if (testnet) {
                return {network: "BTC", testnet: true};
            } else {
                return {network: "BTC", testnet: false};
            }
        break;
        case 'tbtc':
        case 'bitcoin-testnet':
            return {network: "BTC", testnet: true};
        default:
            throw new Error("Unknown network " + network);
    }
};

BlocktrailBitcoinService.prototype.setPaginationLimit = function(limit) {
    this.settings.paginationLimit = limit;
};

BlocktrailBitcoinService.prototype.estimateFee = function() {
    var self = this;

    return self.client.feePerKB().then(function(r) {
        return r['optimal'];
    });
};

/**
 * gets unspent outputs for a batch of addresses, returning an array of outputs with hash, index,
 * value, and script pub hex mapped to each corresponding address
 *
 * @param {array} addresses array of addresses
 * @returns {q.Promise}     promise resolves with array of unspent outputs mapped to addresses as
 *                          { address: [{"hash": hash, "index": index, "value": value, "script_hex": scriptHex}]}
 */
BlocktrailBitcoinService.prototype.getBatchUnspentOutputs = function(addresses) {
    var self = this;
    var deferred = q.defer();

    var page = 1;
    var results = null;
    var utxos = [];

    //get unspent outputs for the current chunk of addresses - required data: hash, index, value, and script hex,
    async.doWhilst(function(done) {
        //do
        var params = {
            page: page,
            limit: self.settings.paginationLimit
        };
        self.client.batchAddressUnspentOutputs(addresses, params).then(function(results) {
            utxos = utxos.concat(results['data']);
            page++;
            done();
        }, function(err) {
            console.log('error happened:', err);
            done(err);
        });
    }, function() {
        //while
        return results && results['data'].length > 0;
    }, function(err) {
        //all done
        if (err) {
            console.log("complete, but with errors", err.message);
        }

        var batchResults = {};  //utxos mapped to addresses
        //reduce the returned data into the values we're interested in, and map to the relevant addresses
        utxos.forEach(function(utxo) {
            var address = utxo['address'];

            if (typeof batchResults[address] === "undefined") {
                batchResults[address] = [];
            }

            batchResults[address].push({
                'hash': utxo['hash'],
                'index': utxo['index'],
                'value': utxo['value'],
                'script_hex': utxo['script_hex']
            });
        });
        deferred.resolve(batchResults);
    });

    return deferred.promise;
};

/**
 * @param {array} addresses   array of addresses
 * @returns {q.Promise}
 */
BlocktrailBitcoinService.prototype.batchAddressHasTransactions = function(addresses) {
    var self = this;

    return self.client.batchAddressHasTransactions(addresses)
        .then(function(result) {
            return result.has_transactions;
        });
};

module.exports = BlocktrailBitcoinService;
