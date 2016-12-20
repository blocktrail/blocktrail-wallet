var sjcl = require('sjcl');

var hmacSha512 = function(key) {
    var hasher = new sjcl.misc.hmac(key, sjcl.hash.sha512);
    this.encrypt = function() {
        return hasher.encrypt.apply(hasher, arguments);
    };
};

var pbkdf2Sha512 = function(pw, salt, iterations, keySizeBytes) {
    salt = sjcl.codec.hex.toBits(salt.toString('hex'));
    var data = sjcl.codec.hex.toBits(pw.toString('hex'));
    return new Buffer(sjcl.codec.hex.fromBits(sjcl.misc.pbkdf2(data, salt, iterations, keySizeBytes * 8, hmacSha512)), 'hex');
};

module.exports = {
    digest: pbkdf2Sha512
};
