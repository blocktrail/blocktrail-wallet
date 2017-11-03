(function () {
    "use strict";

    // TODO Add later
    angular.module('blocktrail.core')
        .factory('sdkService', function(blocktrailSDK, CONFIG) {
            extendBlocktrailSDK(blocktrailSDK);

            return new SdkService(blocktrailSDK, CONFIG);
        }
    );

    /**
     * TODO here
     * @constructor
     */
    function SdkService(blocktrailSDK, CONFIG) {
        var self = this;

        self._blocktrailSDK = blocktrailSDK;
        self._CONFIG = CONFIG;

        self._accountInfo = null;

        self._sdkList = {};

        self._sdkData = {
            networkType: CONFIG.NETWORKS_ENABLED[0]
        };

        // Read only settings object
        // the object would be shared
        self._readonlyDoc = {
            readonly: true
        };

        angular.forEach(self._sdkData, function(value, key) {
            Object.defineProperty(self._readonlyDoc, key, {
                set: function() {
                    throw new Error("Read only object. Blocktrail core module, SDK service.");
                },
                get: function() {
                    return self._sdkData[key];
                }
            });
        });


        self.activeNetworkType = null;
    }

    SdkService.prototype.getReadOnlySdkData = function() {
        var self = this;

        return self._readonlyDoc;
    };

    SdkService.prototype.getNetworkType = function() {
        var self = this;

        return self._sdkData.networkType;
    };

    SdkService.prototype.setNetworkType = function(networkType) {
        var self = this;

        if(self._CONFIG.NETWORKS_ENABLED.indexOf(networkType) === -1) {
            throw new Error("Blocktrail core module, sdk service. Network type " + networkType + "is not enable.");
        }

        self._sdkData.networkType = networkType;

        return self._readonlyDoc;
    };

    SdkService.prototype.getSdkByActiveNetwork = function() {
        var self = this;

        if(self._sdkData.networkType === null) {
            throw new Error("Blocktrail core module, sdk service. Network type is not set up");
        }

        return self._sdkList[self._sdkData.networkType];
    };

    SdkService.prototype.getSdkByNetworkType = function(networkType) {
        var self = this;

        if(!self._accountInfo) {
            throw new Error("Blocktrail core module, sdk service. Can't get the SDK without accountInfo.");
        }

        if(!self._sdkList[networkType]) {
            throw new Error("Blocktrail core module, sdk service. The type is not exist " + type + ".");
        }

        return self._sdkList[networkType];
    };

    SdkService.prototype.setAccountInfo = function(accountInfo) {
        var self = this;

        self._accountInfo = accountInfo;

        self._initSdkList();
    };

    SdkService.prototype.getBackupGenerator = function(identifier, backupInfo, extraInfo) {
        var self = this;

        return new self._blocktrailSDK.BackupGenerator(
            identifier,
            backupInfo,
            extraInfo,
            { network: self._CONFIG.NETWORKS[self.getNetworkType()].NETWORK_LONG }
        );
    };

    SdkService.prototype._initSdkList = function() {
        var self = this;

        self._CONFIG.NETWORKS_ENABLED.forEach(function(networkType) {
            var isTestNet = (networkType.substr(0, 1) === 't');
            var sdkNetwork = self._CONFIG.NETWORKS[networkType].NETWORK;
            if (isTestNet) {
                sdkNetwork = sdkNetwork.substr(1);
            }

            var sdkConfiguration = {
                apiKey: self._accountInfo ? self._accountInfo.api_key : null,
                apiSecret: self._accountInfo ? self._accountInfo.api_secret : null,
                testnet: isTestNet,
                host: self._CONFIG.API_HOST || null,
                network: sdkNetwork,
                https: typeof self._CONFIG.API_HTTPS !== "undefined" ? self._CONFIG.API_HTTPS : true
            };

            self._sdkList[networkType] = new self._blocktrailSDK(sdkConfiguration);
        });
    };

    function extendBlocktrailSDK(blocktrailSDK) {
        blocktrailSDK.prototype.updateMetadata = function (data, cb) {
            var self = this;

            return self.client.post("/metadata", null, data, cb);
        };

        blocktrailSDK.prototype.getAllWallets = function () {
            var self = this;

            return self.client.get("/mywallet/wallets");
        };

        blocktrailSDK.prototype.syncContacts = function (data, cb) {
            var self = this;

            return self.client.post("/contacts", null, data, cb);
        };

        blocktrailSDK.prototype.getProfile = function () {
            var self = this;

            return self.client.get("/mywallet/profile");
        };

        blocktrailSDK.prototype.syncProfile = function (data) {
            var self = this;

            return self.client.post("/mywallet/profile", null, data);
        };

        blocktrailSDK.prototype.getSettings = function (data) {
            var self = this;

            return self.client.get("/mywallet/settings");
        };

        blocktrailSDK.prototype.syncSettings = function (data) {
            var self = this;

            return self.client.post("/mywallet/settings", null, data);
        };

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

        blocktrailSDK.prototype.glideraOauth = function (code, redirect_uri) {
            var self = this;

            return self.client.post("/mywallet/glidera/oauth", {platform: 'web'}, {code: code, redirect_uri: redirect_uri});
        };

        blocktrailSDK.prototype.glideraBuyPrices = function (qty, fiat) {
            var self = this;

            return self.client.get("/mywallet/glidera/prices/buy", {qty: qty, fiat: fiat, platform: 'web'});
        };

        blocktrailSDK.prototype.passwordChange = function (oldPassword, newPassword, encryptedSecret, twoFactorToken, walletsData) {
            var self = this;

            return self.client.post(
                "/mywallet/password-change",
                null,
                {
                    password: oldPassword,
                    new_password: newPassword,
                    encrypted_secret: encryptedSecret,
                    two_factor_token: twoFactorToken,
                    wallets: walletsData
                }
            );
        };

        blocktrailSDK.prototype.setMainMobileWallet = function (identifier, cb) {
            var self = this;

            return self.client.post("/mywallet/main", null, {identifier: identifier}, cb);
        };

        blocktrailSDK.prototype.getSignedBitonicUrl = function (identifier, params) {
            var self = this;

            return self.client.post("/mywallet/" + identifier + "/bitonic/oauth", null, params);
        };

        blocktrailSDK.prototype.setup2FA = function (password, cb) {
            var self = this;

            return self.client.post("/mywallet/2fa/setup", null, {password: password}, cb);
        };

        blocktrailSDK.prototype.enable2FA = function (twoFactorToken, cb) {
            var self = this;

            return self.client.post("/mywallet/2fa/enable", null, {two_factor_token: twoFactorToken}, cb);
        };

        blocktrailSDK.prototype.redeemPromoCode = function (data, cb) {
            var self = this;

            return self.client.post("/promo/redeem", null, data, cb);
        };

        blocktrailSDK.prototype.disable2FA = function (twoFactorToken, cb) {
            var self = this;

            return self.client.post("/mywallet/2fa/disable", null, {two_factor_token: twoFactorToken}, cb);
        };

        blocktrailSDK.prototype.contacts = function (lastSynced, cb) {
            var self = this;

            return self.client.get("/mywallet/contacts", {last_synced: lastSynced}, cb);
        };

        blocktrailSDK.prototype.walletTransaction = function (identifier, txHash) {
            var self = this;

            return self.client.get("/wallet/" + identifier + "/transaction/" + txHash);
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
    }
})();
