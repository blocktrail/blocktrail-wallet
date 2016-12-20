var crypto = require('crypto');
var pbkdf2Sha512 = function(pw, salt, iterations, keySizeBytes) {
    return crypto.pbkdf2Sync(pw, salt, iterations, keySizeBytes, 'sha512');
};

module.exports = {
    digest: pbkdf2Sha512
};
