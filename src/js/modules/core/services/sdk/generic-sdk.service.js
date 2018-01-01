(function () {
    "use strict";

    // TODO Add later
    angular.module('blocktrail.core')
        .factory('genericSdkService', function(blocktrailSDK, CONFIG) {
            return new GenericSdkService(blocktrailSDK, CONFIG);
        }
    );

    /**
     * TODO here
     * @constructor
     */
    function GenericSdkService(blocktrailSDK, CONFIG) {
        var self = this;

        self._blocktrailSDK = blocktrailSDK;
        self._CONFIG = CONFIG;

        self._accountInfo = null;

        self._sdk = null;
    }

    GenericSdkService.prototype.getSdk = function() {
        var self = this;

        return self._sdk;
    };

    GenericSdkService.prototype.setAccountInfo = function(accountInfo) {
        var self = this;

        self._accountInfo = accountInfo;

        self._initSdk();
    };

    GenericSdkService.prototype._initSdk = function() {
        var self = this;

        self._sdk = new genericBlocktrailSDK({
            apiKey: self._accountInfo ? self._accountInfo.api_key : null,
            apiSecret: self._accountInfo ? self._accountInfo.api_secret : null,
            host: self._CONFIG.API_HOST || null,
            https: typeof self._CONFIG.API_HTTPS !== "undefined" ? self._CONFIG.API_HTTPS : true
        }, self._blocktrailSDK);
    };

    /**
     * @constructor
     */
    function genericBlocktrailSDK(sdkConfig, blocktrailSDK) {
        var self = this;

        self.client = blocktrailSDK.initRestClient(sdkConfig);
    }

    genericBlocktrailSDK.prototype.getAllWallets = function () {
        var self = this;

        return self.client.get("/mywallet/wallets");
    };

    genericBlocktrailSDK.prototype.syncContacts = function (data) {
        var self = this;

        return self.client.post("/mywallet/contacts", null, data);
    };

    genericBlocktrailSDK.prototype.deleteContacts = function () {
        var self = this;

        return self.client.delete("/mywallet/contacts");
    };

    genericBlocktrailSDK.prototype.getProfile = function () {
        var self = this;

        return self.client.get("/mywallet/profile");
    };

    genericBlocktrailSDK.prototype.syncProfile = function (data) {
        var self = this;

        return self.client.post("/mywallet/profile", null, data);
    };

    genericBlocktrailSDK.prototype.getSettings = function () {
        var self = this;

        return self.client.get("/mywallet/settings");
    };

    genericBlocktrailSDK.prototype.syncSettings = function (data) {
        var self = this;

        return self.client.post("/mywallet/settings", null, data);
    };

    genericBlocktrailSDK.prototype.updatePhone = function (data) {
        var self = this;

        return self.client.post("/mywallet/phone", null, data);
    };

    genericBlocktrailSDK.prototype.removePhone = function () {
        var self = this;

        return self.client.delete("/mywallet/phone", null, null);
    };

    genericBlocktrailSDK.prototype.verifyPhone = function (token) {
        var self = this;

        return self.client.post("/mywallet/phone/verify", null, {token: token});
    };

    genericBlocktrailSDK.prototype.setup2FA = function (password) {
        var self = this;

        return self.client.post("/mywallet/2fa/setup", null, {password: password});
    };

    genericBlocktrailSDK.prototype.enable2FA = function (twoFactorToken) {
        var self = this;

        return self.client.post("/mywallet/2fa/enable", null, {two_factor_token: twoFactorToken});
    };
    genericBlocktrailSDK.prototype.disable2FA = function (twoFactorToken) {
        var self = this;

        return self.client.post("/mywallet/2fa/disable", null, {two_factor_token: twoFactorToken});
    };

    genericBlocktrailSDK.prototype.contacts = function (lastSynced) {
        var self = this;

        return self.client.get("/mywallet/contacts", {last_synced: lastSynced});
    };

    genericBlocktrailSDK.prototype.sendFeedback = function (data) {
        var self = this;

        return self.client.post("/mywallet/feedback", null, data);
    };
})();
