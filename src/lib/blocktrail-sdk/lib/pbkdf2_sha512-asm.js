var asmCrypto = require('../vendor/asmcrypto.js/asmcrypto.js');

var pbkdf2Sha512 = function(pw, salt, iterations, keySizeBytes) {
    return new Buffer(new asmCrypto.PBKDF2_HMAC_SHA512.bytes(pw, salt, iterations, keySizeBytes).buffer);
};

module.exports = {
    digest: pbkdf2Sha512
};
