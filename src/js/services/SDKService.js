angular.module('blocktrail.wallet').factory(
    'sdkService',
    function($state, launchService, CONFIG, $log) {

        blocktrailSDK.prototype.updateMetadata = function (data, cb) {
            var self = this;

            return self.client.post("/metadata", null, data, cb);
        };

        /**
         * sync contact data to discover contacts' wallets
         * @param data
         * @param cb
         */
        blocktrailSDK.prototype.syncContacts = function (data, cb) {
            var self = this;

            return self.client.post("/contacts", null, data, cb);
        };

        /**
         * remove all synced contact data
         * @param data
         * @param cb
         */
        blocktrailSDK.prototype.deleteContacts = function (cb) {
            var self = this;

            return self.client.delete("/contacts", null, null, cb);
        };

        /**
         * get the server copy of this user's profile info
         * @param data
         * @param cb
         * @returns {*}
         */
        blocktrailSDK.prototype.getProfile = function (data, cb) {
            var self = this;

            return self.client.get("/mywallet/profile", null, data, cb);
        };

        /**
         * update the server with this user's profile info
         * @param data
         * @param cb
         * @returns {*}
         */
        blocktrailSDK.prototype.syncProfile = function (data, cb) {
            var self = this;

            return self.client.post("/mywallet/profile", null, data, cb);
        };

        blocktrailSDK.prototype.syncSettings = function (data) {
            var self = this;

            return self.client.post("/mywallet/settings", null, data);
        };

        blocktrailSDK.prototype.getSettings = function (data) {
            var self = this;

            return self.client.get("/mywallet/settings");
        };

        /**
         * request a new receiving address for a known contact by their phone number
         *
         * @param phoneHash   string      the hash of a contact's normalised phone number
         * @param cb
         * @returns {*}
         */
        blocktrailSDK.prototype.requestContactAddress = function (phoneHash, cb) {
            var self = this;

            return self.client.get("/contact/" + phoneHash + "/new-address", null, false, cb);
        };

        blocktrailSDK.prototype.updatePhone = function (data, cb) {
            var self = this;

            return self.client.post("/mywallet/phone", null, data, cb);
        };

        blocktrailSDK.prototype.removePhone = function (cb) {
            var self = this;

            return self.client.delete("/mywallet/phone", null, null, cb);
        };

        blocktrailSDK.prototype.verifyPhone = function (token, cb) {
            var self = this;

            return self.client.post("/mywallet/phone/verify", null, {token: token}, cb);
        };

        blocktrailSDK.prototype.setMainMobileWallet = function (identifier, cb) {
            var self = this;

            return self.client.post("/mywallet/main", null, {identifier: identifier}, cb);
        };

        blocktrailSDK.prototype.redeemPromoCode = function (data, cb) {
            var self = this;

            return self.client.post("/promo/redeem", null, data, cb);
        };

        blocktrailSDK.prototype.syncSettings = function (data) {
            var self = this;

            return self.client.post("/mywallet/settings", null, data);
        };

        blocktrailSDK.prototype.getSettings = function (data) {
            var self = this;

            return self.client.get("/mywallet/settings");
        };

        blocktrailSDK.prototype.glideraOauth = function (code, redirect_uri) {
            var self = this;

            return self.client.post("/mywallet/glidera/oauth", {platform: 'mobile'}, {code: code, redirect_uri: redirect_uri});
        };

        blocktrailSDK.prototype.glideraBuyPrices = function (qty, fiat) {
            var self = this;

            return self.client.get("/mywallet/glidera/prices/buy", {qty: qty, fiat: fiat, platform: 'mobile'});
        };

        /**
         * send feedback
         * @param identifier
         * @param cb
         * @returns {*}
         */
        blocktrailSDK.prototype.sendFeedback = function (data, cb) {
            var self = this;

            return self.client.post("/mywallet/feedback", null, data, cb);
        };

        var _accountInfo = null;
        var accountInfo = function() {
            if (!_accountInfo) {
                _accountInfo = launchService.getAccountInfo().then(
                    function(accountInfo) {
                        return accountInfo;
                    },
                    function(e) {
                        _accountInfo = null;
                        throw e;
                    }
                );
            }

            return _accountInfo;
        };

        var _sdk = null;
        var sdk = function() {
            if (!_sdk) {
                _sdk = accountInfo()
                    .then(function(accountInfo) {
                        return new blocktrailSDK({
                            apiKey: accountInfo.api_key,
                            apiSecret: accountInfo.api_secret,
                            // apiKey: CONFIG.API_KEY,
                            // apiSecret: CONFIG.API_SECRET,
                            testnet: CONFIG.TESTNET || accountInfo.testnet,
                            host: CONFIG.API_HOST || null,
                            https: typeof CONFIG.API_HTTPS !== "undefined" ? CONFIG.API_HTTPS : true
                        });
                    }, function(e) {
                        $log.error('Missing account info for SDK');
                        $state.go('app.reset');
                        throw e;
                    })
                    .then(function(sdk) {
                        return sdk;
                    }, function(e) {
                        _sdk = null;
                        throw e;
                    });
            }

            return _sdk;
        };

        return {
            sdk : sdk,
            BackupGenerator: blocktrailSDK.BackupGenerator
        };
    }
);
