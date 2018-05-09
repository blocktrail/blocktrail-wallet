var ProtoBuf = require('./protobuf');

/**
 *
 * @param txOut
 */
function checkOutput(txOut) {
    if (typeof txOut.amount === "undefined") {
        throw new Error("Missing Output `value`");
    }
    if (typeof txOut.script === "undefined") {
        throw new Error("Missing Output `script`");
    }
    if (!(txOut.script instanceof Buffer)) {
        throw new Error("Output `script` must be a Buffer");
    }
}

/**
 *
 * @constructor
 */
function RequestBuilder() {
    this.network = null;
    this.outputs = [];
    this.time = null;
    this.expires = null;
    this.memo = null;
    this.paymentUrl = null;
    this.merchantData = null;
}

/**
 *
 * @param {string} memo
 */
RequestBuilder.prototype.setMemo = function(memo) {
    this.memo = memo;
};

/**
 *
 * @param {string} network
 */
RequestBuilder.prototype.setNetwork = function(network) {
    this.network = network;
};

/**
 *
 * @param {array} txOutArray
 */
RequestBuilder.prototype.setOutputs = function(txOutArray) {
    txOutArray.map(checkOutput);
    this.outputs = txOutArray;
};

/**
 *
 * @param {object} txOut
 */
RequestBuilder.prototype.addOutput = function(txOut) {
    checkOutput(txOut);
    this.outputs.push(txOut);
};

/**
 *
 * @param {number} time
 */
RequestBuilder.prototype.setTime = function(time) {
    this.time = time;
};

/**
 *
 * @param {number} expireTime
 */
RequestBuilder.prototype.setExpires = function(expireTime) {
    this.expires = expireTime;
};

/**
 *
 * @param {string} url
 */
RequestBuilder.prototype.setPaymentUrl = function(url) {
    this.paymentUrl = url;
};

/**
 *
 * @param {string} merchantData
 */
RequestBuilder.prototype.setMerchantData = function(merchantData) {
    this.merchantData = merchantData;
};

/**
 * @return ProtoBuf.PaymentDetails
 */
RequestBuilder.prototype.buildDetails = function() {
    if (null === this.time) {
        throw new Error("Missing `time` for PaymentDetails");
    }
    if (this.outputs.length < 1) {
        throw new Error("Missing `outputs` for PaymentDetails");
    }

    return ProtoBuf.PaymentDetails.create(this);
};

/**
 *
 */
RequestBuilder.prototype.buildRequest = function() {
    var details = this.buildDetails();

    return ProtoBuf.PaymentRequest.create({
        serialized_payment_details: ProtoBuf.PaymentDetails.encode(details).finish()
    });
};

exports = module.exports = RequestBuilder;
