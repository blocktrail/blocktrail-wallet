var protobuf = require("protobufjs");

var root = protobuf.Root.fromJSON(require("./protofile.json"));

module.exports = {
    Output: root.lookupType("Output"),
    PaymentDetails: root.lookupType("PaymentDetails"),
    PaymentRequest: root.lookupType("PaymentRequest"),
    Payment: root.lookupType("Payment"),
    PaymentACK: root.lookupType("PaymentACK"),
    X509Certificates: root.lookupType("X509Certificates")
};
