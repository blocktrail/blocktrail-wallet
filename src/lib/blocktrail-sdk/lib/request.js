/* jshint -W100, -W071 */
var blocktrail = require('./blocktrail'),
    _ = require("lodash"),
    url = require('url'),
    qs = require('querystring'),
    q = require('q'),
    createHash = require('create-hash'),
    superagent = require('superagent'),
    superagentHttpSignature = require('superagent-http-signature/index-hmac-only');

var debug = require('debug')('blocktrail-sdk:request');

var isNodeJS = !process.browser;

var noop = function() {};

/**
 * Helper for doing HTTP requests
 *
 * @param options       object{
 *                          host: '',
 *                          endpoint: '', // base url for .request
 *                          auth: null || 'http-signature',
 *                          apiKey: 'API_KEY',
 *                          apiSecret: 'API_SECRET',
 *                          params: {}, // defaults
 *                          headers: {} // defaults
 *                      }
 * @constructor
 */
function Request(options) {
    var self = this;

    self.https = options.https;
    self.host = options.host;
    self.endpoint = options.endpoint;
    self.auth = options.auth;
    self.port = options.port;
    self.apiKey = options.apiKey;
    self.apiSecret = options.apiSecret;
    self.contentMd5 = typeof options.contentMd5 !== "undefined" ? options.contentMd5 : true;

    self.params = _.defaults({}, options.params);
    self.headers = _.defaults({}, options.headers);
}

/**
 * helper to make sure the query string is sorted in lexical order
 *
 * @param params
 * @returns {string}
 */
Request.qs = function(params) {
    var query = [];
    var qsKeys = Object.keys(params);

    qsKeys.sort();
    qsKeys.forEach(function(qsKey) {
        var qsChunk = {};
        qsChunk[qsKey] = params[qsKey];
        query.push(qs.stringify(qsChunk));
    });

    return query.join("&");
};

/**
 * execute request
 *
 * @param method        string      GET|POST|DELETE
 * @param resource      string      URL
 * @param params        object      are added to the querystring
 * @param data          object      is POSTed
 * @param fn
 * @returns q.Promise
 */
Request.prototype.request = function(method, resource, params, data, fn) {
    var self = this;
    self.deferred = q.defer();

    self.callback = fn || noop;

    var endpoint = url.parse(resource, true);
    var query = Request.qs(_.defaults({}, (params || {}), (endpoint.query || {}), (self.params || {})));

    self.path = ''.concat(self.endpoint, endpoint.pathname);
    if (query) {
        self.path = self.path.concat('?', query);
    }

    if (data) {
        self.payload = JSON.stringify(data);
        self.headers['Content-Type'] = 'application/json';
    } else {
        self.payload = "";
    }

    if (isNodeJS) {
        self.headers['Content-Length'] = self.payload ? self.payload.length : 0;
    }

    if (self.contentMd5 === true) {
        if (method === 'GET' || method === 'DELETE') {
            self.headers['Content-MD5'] = createHash('md5').update(self.path).digest().toString('hex');
        } else {
            self.headers['Content-MD5'] = createHash('md5').update(self.payload).digest().toString('hex');
        }
    }

    debug('%s %s %s', method, self.host, self.path);

    var opts = {
        hostname: self.host,
        path: self.path,
        port: self.port,
        method: method,
        headers: self.headers,
        auth: self.auth,
        agent: false,
        withCredentials: false
    };

    self.performRequest(opts);

    return self.deferred.promise;
};

Request.prototype.performRequest = function(options) {
    var self = this;
    var method = options.method;
    var signHMAC = false;

    if (options.auth === 'http-signature') {
        signHMAC = true;
        delete options.auth;
    }

    var uri = (self.https ? 'https://' : 'http://') + options.hostname + options.path;

    var request = superagent(method, uri);

    if (self.payload && (method === 'DELETE' || method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        request.send(self.payload);
    }

    _.forEach(options.headers, function(value, header) {
        request.set(header, value);
    });

    if (signHMAC) {
        if (!self.apiSecret) {
            var error = new Error("Missing apiSecret! required to sign POST requests!");
            self.deferred.reject(error);
            return self.callback(error);
        }

        request.use(superagentHttpSignature({
            headers: ['(request-target)', 'content-md5'],
            algorithm: 'hmac-sha256',
            key: self.apiSecret,
            keyId: self.apiKey
        }));
    }

    request.end(function(error, res) {
        var body;

        if (error) {
            self.deferred.reject(error);
            return self.callback(error);
        }

        debug('response status code: %s content type: %s', res.status, res.headers['content-type']);

        if (!error && (res.headers['content-type'].indexOf('application/json') >= 0)) {
            try {
                body = JSON.parse(res.text);
            } catch (e) {
                error = e;
            }
        }

        if (!error && res.status !== 200) {
            error = Request.handleFailure(res.text, res.statusCode);
        }

        if (error) {
            self.deferred.reject(error);
        } else {
            self.deferred.resolve(body);
        }

        return self.callback(error, body);
    });

    return self.deferred;
};

Request.handleFailure = function(body, statusCode) {
    var data, error;
    if (typeof body === "object") {
        data = body;
    } else {
        try {
            data = JSON.parse(body);
        } catch (e) {}
    }

    if (data) {
        error = new Error(data.msg ? data.msg : null);

        Object.keys(data).forEach(function(k) {
            if (k !== "msg") {
                error[k] = data[k];
            }
        });
    } else if (body) {
        error = new Error(body);
    } else {
        error = new Error('Unknown Server Error');
    }

    if (statusCode) {
        error.statusCode = statusCode;
    }

    return Request.convertError(error);
};

Request.convertError = function(error) {
    if (error.requires_2fa) {
        return new blocktrail.WalletMissing2FAError();
    } else if (error.message.match(/Invalid two_factor_token/)) {
        return new blocktrail.WalletInvalid2FAError();
    }

    return error;
};



module.exports = Request;
