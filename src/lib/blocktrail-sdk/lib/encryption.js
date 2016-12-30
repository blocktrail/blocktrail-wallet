var assert = require('assert');
var sjcl = require('sjcl');
var KeyDerivation = require('./keyderivation');
var randomBytes = require('randombytes');

var Encryption = {
    defaultSaltLen: 10, /* can permit changes, no more than 512 bit (128 bytes) */
    tagLenBits: 128, /* can permit changes */
    ivLenBits: 128,  /* fixed */
    ivLenWords: 128 / 32
};

Encryption.generateSalt = function() {
    return randomBytes(this.defaultSaltLen);
};

Encryption.generateIV = function() {
    return randomBytes(this.ivLenBits / 8);
};

Encryption.encrypt = function(pt, pw, iterations) {
    var salt = this.generateSalt();
    var iv = this.generateIV();

    iterations = typeof iterations === 'undefined' ? KeyDerivation.defaultIterations : iterations;
    return this.encryptWithSaltAndIV(pt, pw, salt, iv, iterations);
};

Encryption.encryptWithSaltAndIV = function(pt, pw, saltBuf, iv, iterations) {
    assert(pt instanceof Buffer, 'pt must be provided as a buffer');
    assert(pw instanceof Buffer, 'pw must be provided as a buffer');
    assert(iv instanceof Buffer, 'IV must be provided as a buffer');
    assert(saltBuf instanceof Buffer, 'saltBuff must be provided as a buffer');
    assert(iv.length === 16, 'IV must be exactly 16 bytes');

    var SL = (new Buffer(1));
    var S = saltBuf;
    var I = new Buffer(4);
    SL.writeUInt8(saltBuf.length);
    I.writeUInt32LE(iterations);
    var header = SL.toString('hex') + S.toString('hex') + I.toString('hex');

    var key = sjcl.codec.hex.toBits(KeyDerivation.compute(pw, saltBuf, iterations).toString('hex'));
    var ct_t = sjcl.mode.gcm.encrypt(
      new sjcl.cipher.aes(key),
      sjcl.codec.hex.toBits(pt.toString('hex')),
      sjcl.codec.hex.toBits(iv.toString('hex')),
      sjcl.codec.hex.toBits(header),
      this.tagLenBits
    );

    // iter || saltLen8 || salt || iv || tag || ct
    return new Buffer([header, iv.toString('hex'), sjcl.codec.hex.fromBits(ct_t)].join(''), 'hex');
};

Encryption.decrypt = function(ct, pw) {
    assert(ct instanceof Buffer, 'cipherText must be provided as a Buffer');
    assert(pw instanceof Buffer, 'password must be provided as a Buffer');
    var copy = new Buffer(ct, 'hex');
    var c = 0;

    var saltLen = copy.readUInt8(c)      ; c += 1;
    var salt = copy.slice(1, c + saltLen); c += saltLen;
    var iterations = copy.readUInt32LE(c); c += 4;
    var header = copy.slice(0, c);

    var iv = copy.slice(c, 16 + c); c += 16;
    var ct_t = copy.slice(c);

    // SaltBuf is required for KeyDerivation. Convert to sjcl where required.
    var key = KeyDerivation.compute(pw, salt, iterations);
    var plainText = sjcl.mode.gcm.decrypt(
      new sjcl.cipher.aes(sjcl.codec.hex.toBits(key.toString('hex'))),
      sjcl.codec.hex.toBits(ct_t.toString('hex')),
      sjcl.codec.hex.toBits(iv.toString('hex')),
      sjcl.codec.hex.toBits(header.toString('hex')),
      this.tagLenBits
    );
    return new Buffer(sjcl.codec.hex.fromBits(plainText), 'hex');
};

module.exports = Encryption;
