var jsrsasign = require('jsrsasign');
var ProtoBuf = require('../protobuf');
var PKIType = require('./pkitype');
var X509Certificates = ProtoBuf.X509Certificates;

/**
 * Checks if certificate serial numbers match.
 * @param certA
 * @param certB
 * @returns {boolean}
 */
function hasEqualSerialNumber(certA, certB) {
    return certA.getSerialNumberHex() === certB.getSerialNumberHex();
}

/**
 * Checks if certificate subjects match
 * @param certA
 * @param certB
 * @returns {boolean}
 */
function hasEqualSubject(certA, certB) {
    return certA.getSubjectHex() === certB.getSubjectHex();
}

/**
 * Checks if certificate public keys match
 * @param certA
 * @param certB
 * @returns {boolean}
 */
function hasEqualPublicKey(certA, certB) {
    return certA.getPublicKeyHex() === certB.getPublicKeyHex();
}

/**
 * Checks if certificates are equal
 * @param certA
 * @param certB
 * @returns {boolean}
 */
function checkCertsEqual(certA, certB) {
    return hasEqualSerialNumber(certA, certB) &&
        hasEqualSubject(certA, certB) &&
        hasEqualPublicKey(certA, certB);
}

/**
 * Checks if the certificate is self issued
 * @param certificate
 * @returns {boolean}
 */
function isSelfSigned(certificate) {
    return certificate.getSubjectString() === certificate.getIssuerString();
}

/**
 * Returns a callback that filters by the
 * provided subject key identifier.
 * @param subjectKeyId
 * @returns {Function}
 */
function makeFilterBySubjectKey(subjectKeyId) {
    return function(certificate) {
        try {
            return certificate.getExtSubjectKeyIdentifier() === subjectKeyId;
        } catch (e) {}

        return false;
    };
}

/**
 * Look in bundle for certificates for the
 * issuer of `target`
 * @param target
 * @param bundle
 * @returns {Array}
 */
function findIssuers(target, bundle) {
    try {
        var authorityKeyIdentifier = target.getExtAuthorityKeyIdentifier();

        if (typeof authorityKeyIdentifier.kid === "string") {
            var issuerName = target.getIssuerString();
            return bundle
                .filter(makeFilterBySubjectKey(authorityKeyIdentifier.kid))
                .filter(function(issuerCert) {
                    return issuerName === issuerCert.getSubjectString();
                });
        }
    } catch (e) { }

    return [];
}

/**
 * ChainPathBuilder builds an unverified chain
 * of certificates by linking issuer<>subject
 * @param trustStore
 * @constructor
 */
function ChainPathBuilder(trustStore) {
    if (typeof trustStore === "undefined") {
        trustStore = [];
    }

    this.trustStore = trustStore;
}

/**
 * Returns all paths to the target. First checks if target
 * was issued by a trustStore certificate, then attempts
 * against issuers (if any)
 * @param target
 * @param intermediates
 * @returns {Array}
 * @private
 */
ChainPathBuilder.prototype._pathsToTarget = function(target, intermediates) {
    var paths = [];
    findIssuers(target, this.trustStore).map(function(issuer) {
        if (checkCertsEqual(target, issuer)) {
            paths.push(target);
        } else {
            paths.push([].concat(issuer, target));
        }
    });

    if (Array.isArray(intermediates)) {
        var self = this;
        findIssuers(target, intermediates)
            .map(function(issuer) {
                if (isSelfSigned(issuer)) {
                    return;
                }

                var subpaths = self._pathsToTarget(issuer, intermediates);
                subpaths.map(function(path) {
                    paths.push([].concat(path, target));
                });
            });
    }

    return paths;
};

/**
 * Searches for paths which qualify `target`,
 * and returns the shortest.
 * @param target
 * @param intermediates
 * @returns {*}
 */
ChainPathBuilder.prototype.shortestPathToTarget = function(target, intermediates) {
    var paths = this._pathsToTarget(target, intermediates);
    if (paths.length === 0) {
        throw new Error("No certificate paths found");
    }

    paths.sort(function(a, b) {
        if (a < b) {
            return -1;
        }
        if (b > a) {
            return 1;
        }

        return 0;
    });

    return paths[0];
};

/**
 * Encapsulation for some validation state
 * @param pubKey
 * @param issuerName
 * @constructor
 */
function WorkingData(pubKey, issuerName) {
    this.pubKey = pubKey;
    this.issuerName = issuerName;
    this.getPublicKey = function() {
        return this.pubKey;
    };
    this.getIssuerName = function() {
        return this.issuerName;
    };
}

/**
 *
 * @param {jsrsasign.Certificate} rootCert
 * @param {number} chainLength
 * @param {object} opts
 * @constructor
 */
function ChainValidationState(rootCert, chainLength, opts) {
    this.workingData = new WorkingData(rootCert.getPublicKey(), rootCert.getIssuerString());
    this.index = 1;
    this.chainLength = chainLength;

    if (opts.currentTime) {
        this.currentTime = opts.currentTime;
    } else {
        this.currentTime = Date.now();
    }

    var self = this;
    this.updateState = function(cert) {
        self.workingData = new WorkingData(cert.getPublicKey(), cert.getSubjectString());
    };
    this.isFinal = function() {
        return this.chainLength === self.index;
    };
}

/**
 * Constructor for ChainPathValidator. Takes a list of
 * certificates, starting from the root, ending with
 * the entity certificate.
 *
 * @param {object} config
 * @param {jsrsasign.Certificate[]} certificates
 * @constructor
 */
function ChainPathValidator(config, certificates) {
    this._certificates = certificates;
    this._config = config;
    this._trustAnchor = certificates[0];
}

/**
 *
 * @param {ChainValidationState} state
 * @param {KJUR.asn1.x509.Certificate} cert
 */
function checkSignature(state, cert) {
    if (!cert.verifySignature(state.workingData.getPublicKey())) {
        throw new Error("Failed to verify signature");
    }
}

/**
 *
 * @param {ChainValidationState} state
 * @param {KJUR.asn1.x509.Certificate} cert
 */
function checkValidity(state, cert) {
    var notBefore = jsrsasign.zulutodate(cert.getNotBefore());
    var notAfter = jsrsasign.zulutodate(cert.getNotAfter());

    if (notBefore > Date.parse(state.currentTime) || notAfter < Date.parse(state.currentTime)) {
        throw new Error("Certificate is not valid");
    }
}
function checkRevocation(cert) {

}
function checkIssuer(state, cert) {
    if (state.workingData.getIssuerName() !== cert.getIssuerString()) {
        throw new Error("Certificate issuer doesn't match");
    }
}
function processCertificate(state, cert) {
    checkSignature(state, cert);
    checkValidity(state, cert);
    // crl handling
    checkIssuer(state, cert);
}

ChainPathValidator.prototype.validate = function() {
    var state = new ChainValidationState(this._trustAnchor, this._certificates.length, this._config);
    for (var i = 0; i < this._certificates.length; i++) {
        state.index = i + 1;
        var cert = this._certificates[i];
        processCertificate(state, cert);
        if (!state.isFinal()) {
            state.updateState(cert);
        }
    }
};

var RequestValidator = function(opts) {
    if (typeof opts === "undefined") {
        opts = {};
    }
    opts.trustStore = opts.trustStore ? opts.trustStore : [];
    this.opts = opts;
};

RequestValidator.prototype.verifyX509Details = function(paymentRequest) {
    var x509 = X509Certificates.decode(paymentRequest.pkiData);

    function certFromDER(derBuf) {
        var cert = new jsrsasign.X509();
        cert.readCertHex(new Buffer(derBuf).toString('hex'));
        return cert;
    }

    var entityCert = certFromDER(x509.certificate[0]);
    var intermediates = x509.certificate.slice(1).map(certFromDER);
    var path = this.validateCertificateChain(entityCert, intermediates);

    if (!this.validateSignature(paymentRequest, entityCert)) {
        throw new Error("Invalid signature on request");
    }

    return path;
};

RequestValidator.prototype.validateCertificateChain = function(entityCert, intermediates) {
    var builder = new ChainPathBuilder(this.opts.trustStore);
    var path = builder.shortestPathToTarget(entityCert, intermediates);
    var validator = new ChainPathValidator(this.opts, path);
    validator.validate();
    return path;
};

RequestValidator.prototype.validateSignature = function(request, entityCert) {
    var sig = new jsrsasign.Signature({alg: getSignatureAlgorithm(entityCert, request.pkiType)});
    sig.init(entityCert.getPublicKey());
    sig.updateHex(getDataToSign(request).toString('hex'));
    return sig.verify(Buffer.from(request.signature).toString('hex'));
};

function getDataToSign(request) {
    var tmp = request.signature;
    request.signature = '';
    var encoded = new Buffer(ProtoBuf.PaymentRequest.encode(request).finish());
    request.signature = tmp;
    return encoded;
}

function getSignatureAlgorithm(entityCert, pkiType) {
    var publicKey = entityCert.getPublicKey();

    var keyType;
    if (publicKey.type === "ECDSA") {
        keyType = "ECDSA";
    } else if (publicKey.type === "RSA") {
        keyType = "RSA";
    } else {
        throw new Error("Unknown public key type");
    }

    var hashAlg;
    if (pkiType === PKIType.X509_SHA1) {
        hashAlg = "SHA1";
    } else if (pkiType === PKIType.X509_SHA256) {
        hashAlg = "SHA256";
    } else {
        throw new Error("Unknown PKI type or no signature algorithm specified.");
    }

    return hashAlg + "with" + keyType;
}

module.exports = {
    ChainPathBuilder: ChainPathBuilder,
    ChainPathValidator: ChainPathValidator,
    RequestValidator: RequestValidator,
    GetSignatureAlgorithm: getSignatureAlgorithm
};
