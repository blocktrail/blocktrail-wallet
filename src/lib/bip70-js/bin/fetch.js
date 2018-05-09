var bip70 = require('../main');
var ProtoBuf = bip70.ProtoBuf;
var HttpClient = bip70.HttpClient;
var RequestValidator = bip70.X509.RequestValidator;
var TrustStore = require('../lib/x509/truststore');

if (process.argv.length < 3) {
    throw new Error("Expecting a url as an argument");
}

var url = process.argv[2];
var opts = {
    trustStore: TrustStore
};
var validator = new RequestValidator(opts);
var client = new HttpClient(validator);

client
    .getRequest(url, validator)
    .then(function(requestData) {
        var paymentRequest = requestData[0];
        //var path = requestData[1];
        console.log(paymentRequest);
        var details = ProtoBuf.PaymentDetails.decode(paymentRequest.serializedPaymentDetails);

        details.outputs.map(function(output,i) {
            console.log(" * " + i + " [value: " + output.amount + ", script: " + output.script.toString('hex'))
        });

    }, function(error) {
        console.log(error);
    });
