var jsrsasign = require('jsrsasign');

function parseCertFrom(string, encoding) {
    var cert = new jsrsasign.X509();
    cert.readCertHex(Buffer.from(string, encoding).toString('hex'));
    return cert;
}

function parseCertFromBase64(string) {
    return parseCertFrom(string, 'base64');
}

var certificates = require('./ca-certificates.json');
var store = [];
Object.keys(certificates).map(function(key) {
    store.push(parseCertFromBase64(certificates[key]));
});

module.exports = store;
