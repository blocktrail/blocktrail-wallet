var _ = require('lodash');
var Request = require('./request');
var q = require('q');

/**
 * Intermediate class to create HTTP requests
 *
 *
 * @param options       object{
 *                          host: '',
 *                          endpoint: '', // base url for .request
 *                          apiKey: 'API_KEY',
 *                          apiSecret: 'API_SECRET'
 *                      }
 * @constructor
 * @constructor
 */
var RestClient = function(options) {
    var self = this;

    self.apiKey = options.apiKey;
    self.apiSecret = options.apiSecret;
    self.https = options.https;
    self.host = options.host;
    self.port = options.port;
    self.endpoint = options.endpoint;

    self.btccom = !!options.btccom;
    if (typeof options.throttleRequestsTimeout !== "undefined") {
        self.throttleRequestsTimeout = options.throttleRequestsTimeout;
    } else if (self.btccom) {
        self.throttleRequestsTimeout = 350;
    } else {
        self.throttleRequestsTimeout = 0;
    }
    self.throttleRequests = self.throttleRequestsTimeout > 0;
    self.nextRequest = null;

    self.defaultParams = {};

    if (self.apiKey) {
        self.defaultParams['api_key'] = self.apiKey;
    }

    self.defaultHeaders = _.defaults({}, {
        'X-SDK-Version': 'blocktrail-sdk-nodejs/' + require('./pkginfo').VERSION
    }, options.defaultHeaders);
};

RestClient.prototype.throttle = function() {
    var self = this;
    var deferred = q.defer();

    if (this.throttleRequests) {
        if (this.nextRequest) {
            // chain onto the previous delay
            this.nextRequest = this.nextRequest.then(function() {
                deferred.resolve();

                return q.delay(self.throttleRequestsTimeout);
            });
        } else {
            // first time we just resolve and setup the delay for the next request
            this.nextRequest = q.delay(self.throttleRequestsTimeout);
            deferred.resolve();
        }
    } else {
        deferred.resolve();
    }

    return deferred.promise;
};

RestClient.prototype.create_request = function(options) {
    var self = this;

    options = _.defaults({}, options, {
        https: self.https,
        host: self.host,
        port: self.port,
        endpoint: self.endpoint,
        apiKey: self.apiKey,
        apiSecret: self.apiSecret,
        params: _.defaults({}, self.defaultParams),
        headers: _.defaults({}, self.defaultHeaders)
    });

    return new Request(options);
};

RestClient.prototype.post = function(path, params, data, fn, requireAuth) {
    var self = this;

    requireAuth = typeof requireAuth === "undefined" ? true : requireAuth;

    var options = {};
    if (requireAuth) {
        options['auth'] = 'http-signature';
    }

    return self.throttle().then(function() {
        return self.create_request(options).request('POST', path, params, data, fn);
    });
};

RestClient.prototype.put = function(path, params, data, fn, requireAuth) {
    var self = this;

    requireAuth = typeof requireAuth === "undefined" ? true : requireAuth;

    var options = {};
    if (requireAuth) {
        options['auth'] = 'http-signature';
    }

    return self.throttle().then(function() {
        return self.create_request(options).request('PUT', path, params, data, fn);
    });
};

RestClient.prototype.get = function(path, params, doHttpSignature, fn) {
    var self = this;

    if (typeof doHttpSignature === "function") {
        fn = doHttpSignature;
        doHttpSignature = false;
    }

    var options = {};

    if (doHttpSignature) {
        options['auth'] = 'http-signature';
    }

    if (self.btccom && typeof fn !== "undefined") {
        throw new Error("we should be using callbackify!");
    }

    return self.throttle().then(function() {
        return self.create_request(options).request('GET', path, params, null, fn);
    });
};

RestClient.prototype.delete = function(path, params, data, fn, requireAuth) {
    var self = this;

    requireAuth = typeof requireAuth === "undefined" ? true : requireAuth;

    var options = {};
    if (requireAuth) {
        options['auth'] = 'http-signature';
    }

    return self.throttle().then(function() {
        return self.create_request(options).request('DELETE', path, params, data, fn);
    });
};

module.exports = function(options) {
    return new RestClient(options);
};
