/* globals window, self */

var pbkdf2Sha512 = function(pw, salt, iterations, keySizeBytes) {
    // assumes asmCrypto is made available
    var asmCrypto = typeof window !== "undefined" ? window.asmCrypto : self.asmCrypto;

    return new Buffer(new asmCrypto.PBKDF2_HMAC_SHA512.bytes(pw, salt, iterations, keySizeBytes).buffer);
};

module.exports = {
    digest: pbkdf2Sha512
};
