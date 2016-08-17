var _ = require('lodash');
var q = require('q');
var async = require('async');

/**
 * @param bitcoinDataClient
 * @param options
 * @constructor
 */
var UnspentOutputFinder = function(bitcoinDataClient, options) {
    this.defaultSettings = {
        logging: false,
        batchChunkSize: 200
    };
    this.settings = _.merge({}, this.defaultSettings, options);
    this.client = bitcoinDataClient;
};

/**
 * get unspent outputs for an array of addresses
 *
 * @param addresses         an array of addresses to find unspent output for
 * @returns {q.Promise}     resolves with an object (associative array) of unspent outputs for each address with a spendable balance
 */
UnspentOutputFinder.prototype.getUTXOs = function(addresses) {
    var self = this;
    var results = {};

    var deferred = q.defer();

    //do batch if the bitcoin service supports it...
    async.eachSeries(_.chunk(addresses, self.settings.batchChunkSize), function(addressBatch, done) {
        if (self.settings.logging) {
            console.log("checking batch of " + addressBatch.length + " addresses for UTXOs", addressBatch.join(","));
        }

        //get the utxos for this address
        self.client.getBatchUnspentOutputs(addressBatch).done(function(batchResults) {
            _.each(batchResults, function(utxos, address) {
                //add the found utxos to the final result
                if (utxos.length > 0) {
                    results[address] = utxos;
                }
            });
            //this iteration is complete
            done();
        }, function(err) {
            done(err);
        });

    }, function(err) {
        //callback
        if (err) {
            //perhaps we should also reject the promise, and stop everything?
            console.log("error encountered", err);
        }

        //resolve the promise
        deferred.resolve(results);
    });

    return deferred.promise;
};

module.exports = UnspentOutputFinder;
