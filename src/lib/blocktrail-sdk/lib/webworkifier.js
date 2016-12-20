/* global URL */
var q = require('q');
var webworkify = require('webworkify');

/**
 * wrapper around creating / using webworker that reuses webworker instance
 *
 * @param self
 * @param workerModuleFactory
 * @param message
 * @returns {*}
 */
module.exports = exports = {
    workify: function(self, workerModuleFactory, message) {
        // create promise for result
        var deferred = q.defer();

        try {
            // init worker if necessary
            if (typeof self.worker === "undefined") {
                self.worker = webworkify(workerModuleFactory());
                self.first = true;
                self.id = 0;
            }

            var worker = self.worker;

            // keep a unique id to distinguish between responses
            var id = self.id++;

            var onMessage = function(e) {
                if (self.first) {
                    self.first = false;
                    URL.revokeObjectURL(worker.objectURL);
                }

                // don't process messages that aren't for us
                if (e.data.id !== id) {
                    return;
                }

                deferred.resolve(e.data);
            };

            var onError = function(e) {
                deferred.reject(new Error(e.message.replace("Uncaught Error: ", '')));
            };

            var unsub = function() {
                worker.removeEventListener("message", onMessage);
                worker.removeEventListener("error", onError);
            };

            // register event listeners
            worker.addEventListener('message', onMessage, false);
            worker.addEventListener('error', onError, false);

            // submit message to worker to init work
            message.id = id;
            worker.postMessage(message);

            // return promise
            return deferred.promise.then(function(r) {
                unsub();
                return r;
            }, function(e) {
                unsub();
                throw e;
            });
        } catch (e) {
            deferred.reject(e);
            return deferred.promise;
        }
    }
};
