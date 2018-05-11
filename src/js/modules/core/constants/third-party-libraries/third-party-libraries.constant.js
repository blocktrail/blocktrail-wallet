(function() {
    "use strict";

    // TODO Review all the dependencies remove access from the global scope
    angular.module("blocktrail.core")
        .constant("blocktrailSDK", window.blocktrailSDK)
        .constant("bip70", window.bip70)
        .constant("_", window.blocktrailSDK.lodash)
        .constant("cryptoJS", window.blocktrailSDK.CryptoJS)
        .constant("bitcoinJS", window.blocktrailSDK.bitcoin)
        .constant("randomBytesJS", window.blocktrailSDK.randomBytes)
        .constant("PouchDB", window.PouchDB)
        .constant("zxcvbn", window.zxcvbn);
})();
