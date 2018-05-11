var fs = require('fs');
var pkijs = require('pkijs');
var asn1js = require('asn1js');
var Validation = require('../lib/x509/validation.pkijs');
var Certificate = pkijs.Certificate;

var path = "/etc/ssl/certs/";

fs.readdir(path, function(err, items) {
    var trustFile = {};
    for (var i = 0; i < items.length; i++) {
        if (items[i].slice(-4) === ".pem") {
            var pem = fs.readFileSync(path + items[i]).toString();
            pem = pem.replace(/-----BEGIN CERTIFICATE-----/g, '');
            pem = pem.replace(/-----END CERTIFICATE-----/g, '');
            pem = pem.replace(/\s+/g, '');

            try {
                var der = Validation.stringToArrayBuffer(Buffer.from(pem, 'base64'));
                var asn = asn1js.fromBER(der);

            } catch (e) {
                throw new Error("Failed to decode certificate")
            }

            if (asn.offset === -1) {
                throw new Error("Failed to decode certificate")
            }

            try {
                var cert = new Certificate({schema: asn.result});
            } catch (e) {
                throw new Error("Failed to decode certificate")
            }

            var subject;
            cert.subject.typesAndValues.map(function(typeAndValue) {
                if (typeAndValue.type.toLowerCase() === "2.5.4.3") {
                    subject = typeAndValue.value.valueBlock.value;
                    trustFile[""+subject] = pem;
                }
            });
        }
    }

    console.log(JSON.stringify(trustFile, null, 2));
});
