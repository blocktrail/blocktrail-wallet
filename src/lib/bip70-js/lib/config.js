
function NetworkConfig(mimeTypes) {
    if (!['PAYMENT_REQUEST', 'PAYMENT', 'PAYMENT_ACK'].every(function(key) {
        return key in mimeTypes;
    })) {
        throw new Error("Missing MIME types");
    }

    this.mimeTypes = mimeTypes;
}

NetworkConfig.prototype.getMimeTypes = function() {
    return this.mimeTypes;
};

NetworkConfig.Bitcoin = function() {
    return new NetworkConfig({
        PAYMENT_REQUEST: "application/bitcoin-paymentrequest",
        PAYMENT: "application/bitcoin-payment",
        PAYMENT_ACK: "application/bitcoin-paymentack"
    });
};

module.exports = NetworkConfig;
