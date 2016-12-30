var assert = require('assert'),
    pbkdf2Sha512 = require('./pbkdf2_sha512');

var KeyDerivation = {
    defaultIterations: 35000,
    subkeyIterations: 1,
    keySizeBits: 256
};

KeyDerivation.compute = function(pw, salt, iterations) {
    iterations = iterations || this.defaultIterations;
    assert(pw instanceof Buffer, 'Password must be provided as a Buffer');
    assert(salt instanceof Buffer, 'Salt must be provided as a Buffer');
    assert(salt.length > 0, 'Salt must not be empty');
    assert(typeof iterations === 'number', 'Iterations must be a number');
    assert(iterations > 0, 'Iteration count should be at least 1');

    if (salt.length > 0x80) {
        throw new Error('Sanity check: Invalid salt, length can never be greater than 128');
    }

    return pbkdf2Sha512.digest(pw, salt, iterations, this.keySizeBits / 8);
};

module.exports = KeyDerivation;
