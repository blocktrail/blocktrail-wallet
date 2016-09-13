var bitcoin = require('bitcoinjs-lib');
var request = require('request');
var network = bitcoin.networks.testnet;

var VISIT = false;

var clientId = "9074010d6e573bd7b06645735ba315c8";
var returnuri = "urn:ietf:wg:oauth:2.0:oob";

var privKey = bitcoin.ECPair.fromWIF("cSyCFJPohazSx2e2Mj98TLxa6PReMDhd3Z9rQwaLDef7dNvjErWe", network);
var address = privKey.getAddress();

[
    [
        "bitid://sandbox.glidera.io/bitid/auth?x=" + Math.ceil((new Date).getTime() / 1000),
        function(bitidUri) { return "bitid://" + encodeURIComponent(bitidUri.replace("bitid://", "")); }
    ]
].forEach(function(test) {
    console.log('===============================');

    var bitidUri = test[0];
    var encodeBitidUri = test[1];

    console.log(bitidUri);

    var bitidSig = bitcoin.message.sign(privKey, bitidUri, network).toString('base64');

    var qs = [
        'client_id=' + clientId,
        'redirect_uri=' + encodeURIComponent(returnuri),
        'bitid_address=' + address,
        'bitid_signature=' + encodeURIComponent(bitidSig),
        'bitid_uri=' + encodeURIComponentBitIDURI(bitidUri)
    ];

    var glideraUrl = "https://sandbox.glidera.io/bitid/auth?" + qs.join("&");

    console.log(qs);
    console.log('-------------------------------');
    console.log(glideraUrl);

    if (VISIT) {
        request({url: glideraUrl, followRedirect: false}, function(err, response, body) {
            console.log('-------------------------------');
            // console.log(err);
            console.log(response.statusCode);
            console.log(response.headers);
            // console.log(body);
            console.log(response.headers['location']);
        });
    }
});

