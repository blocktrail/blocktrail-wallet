var axios = require('axios');
var PKIType = require('./x509/pkitype');
var ProtoBuf = require('./protobuf');
var PaymentRequest = ProtoBuf.PaymentRequest;

function checkContentType(response, expecting) {
    if (!("content-type" in response.headers)) {
        throw new Error("Missing content-type header in response");
    }
    if (response.headers["content-type"] !== expecting) {
        throw new Error("Invalid content-type header set by server, request failed");
    }
}

/**
 *
 * @constructor
 */
var HttpClient = function() {
};

/**
 *
 * @param {string} url
 * @param {Validator} validator
 * @param {NetworkConfig} networkConfig
 * @return Promise of PaymentRequest
 */
HttpClient.prototype.getRequest = function(url, validator, networkConfig) {
    return axios({
        method: 'get',
        headers: {
            "Accept": networkConfig.getMimeTypes().PAYMENT_REQUEST
        },
        url: url,
        responseType: 'arraybuffer'
    })
        .then(function(response) {
            checkContentType(response, networkConfig.getMimeTypes().PAYMENT_REQUEST);

            var buf = Buffer.from(response.data);
            var paymentRequest = PaymentRequest.decode(buf);

            var path = null;
            if (paymentRequest.pkiType !== PKIType.NONE) {
                path = validator.verifyX509Details(paymentRequest);
            }

            return [paymentRequest, path];
        });
};

/**
 *
 * @param {ProtoBuf.PaymentDetails} details
 * @param {string[]} txs - list of transactions fulfilling request
 * @param {string|null} memo - optional memo for merchant
 * @returns {{transactions: Array}} - Payment object
 */
HttpClient.prototype.preparePayment = function(details, txs, memo) {
    var detailKeys = Object.keys(details);
    if (detailKeys.indexOf("paymentUrl") === -1) {
        throw new Error("Not payment url on details");
    }

    var payment = {
        transactions: []
    };

    txs.map(function(tx) {
        if (typeof tx === "string") {
            payment.transactions.push(tx);
        } else {
            throw new Error("txs must be a list of raw transactions");
        }
    });

    if (detailKeys.indexOf("merchantData") !== -1) {
        payment.merchantData = details.merchantData;
    }

    if (typeof memo === "string") {
        payment.memo = details.memo;
    }

    return payment;
};

/**
 *
 * @param {ProtoBuf.PaymentDetails} details
 * @param {string[]} txs
 * @param {string|null} memo
 * @param {NetworkConfig} networkConfig
 * @returns Promise of PaymentACK
 */
HttpClient.prototype.sendPayment = function(details, txs, memo, networkConfig) {
    var payment = this.preparePayment(details, txs, memo);
    var paymentData = ProtoBuf.Payment.encode(payment).final();

    return axios({
        method: 'post',
        headers: {
            "Accept": networkConfig.getMimeTypes().PAYMENT_ACK,
            "Content-Type": networkConfig.getMimeTypes().PAYMENT
        },
        url: details.paymentUrl,
        data: paymentData,
        responseType: 'arraybuffer'
    })
        .then(function(response) {
            checkContentType(response, networkConfig.getMimeTypes().PAYMENT_ACK);
            var buf = Buffer.from(response.data);
            return ProtoBuf.PaymentACK.decode(buf);
        });
};

module.exports = HttpClient;
