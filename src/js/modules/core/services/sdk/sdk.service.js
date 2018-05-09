(function () {
    "use strict";

    angular.module("blocktrail.core")
        .factory("sdkService", function(blocktrailSDK, CONFIG) {
            extendBlocktrailSDK(blocktrailSDK);

            return new SdkService(blocktrailSDK, CONFIG);
        }
    );

    /**
     * Sdk service
     * @param blocktrailSDK
     * @param CONFIG
     * @constructor
     */
    function SdkService(blocktrailSDK, CONFIG) {
        var self = this;

        self._blocktrailSDK = blocktrailSDK;
        self._CONFIG = CONFIG;

        self._accountInfo = null;

        self._keyForGenericSdk = "GENERIC";

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

    /**
     * Get the read only SDK service data
     * @return {{readonly: boolean}|*}
     */
    SdkService.prototype.getReadOnlySdkServiceData = function() {
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

    SdkService.prototype.getGenericSdk = function() {
        var self = this;

        return self._sdkList[self._keyForGenericSdk];
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

        if(self._accountInfo === null) {
            self._accountInfo = accountInfo;
            self._initSdkList();
        }

        return true;
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

        // Generic SDK
        self._sdkList[self._keyForGenericSdk] = new GenericBlocktrailSDK({
            apiKey: self._accountInfo ? self._accountInfo.apiKey : null,
            apiSecret: self._accountInfo ? self._accountInfo.apiSecret : null,
            host: self._CONFIG.API_HOST || null,
            https: typeof self._CONFIG.API_HTTPS !== "undefined" ? self._CONFIG.API_HTTPS : true
        }, self._blocktrailSDK);

        // Network SDKs
        self._CONFIG.NETWORKS_ENABLED.forEach(function(networkType) {
            var isTestNet = (networkType.substr(0, 1) === 't');
            var isRegtest = (networkType.substr(0, 1) === 'r');

            var sdkNetwork = self._CONFIG.NETWORKS[networkType].NETWORK;

            if (isTestNet || isRegtest) {
                sdkNetwork = sdkNetwork.substr(1);
            }

            var sdkConfiguration = {
                apiKey: self._accountInfo ? self._accountInfo.apiKey : null,
                apiSecret: self._accountInfo ? self._accountInfo.apiSecret : null,
                testnet: isTestNet,
                regtest: isRegtest,
                host: self._CONFIG.API_HOST || null,
                network: sdkNetwork,
                https: typeof self._CONFIG.API_HTTPS !== "undefined" ? self._CONFIG.API_HTTPS : true
            };

            self._sdkList[networkType] = new self._blocktrailSDK(sdkConfiguration);
        });
    };

    /**
     * Extend blocktrail SDK
     * @param blocktrailSDK
     */
    function extendBlocktrailSDK(blocktrailSDK) {
        // TODO Discuss with Ruben, why it depends on the network and why we can't move in into generic SDK?
        blocktrailSDK.prototype.requestContactAddress = function (phoneHash) {
            var self = this;

            return self.blocktrailClient.get("/contact/" + phoneHash + "/new-address", null, false);
        };

        blocktrailSDK.prototype.glideraOauth = function (code, redirect_uri) {
            var self = this;

            return self.blocktrailClient.post("/mywallet/glidera/oauth", {platform: "web"}, {code: code, redirect_uri: redirect_uri});
        };

        blocktrailSDK.prototype.glideraBuyPrices = function (qty, fiat) {
            var self = this;

            return self.blocktrailClient.get("/mywallet/glidera/prices/buy", {qty: qty, fiat: fiat, platform: "web"});
            return self.blocktrailClient.get("/mywallet/glidera/prices/buy", {qty: qty, fiat: fiat, platform: 'mobile'});
        };

        blocktrailSDK.prototype.simplexBuyPrices = function (data) {
            var self = this;

            return self.blocktrailClient.post("/mywallet/simplex/prices/quote", null, data);
        };

        blocktrailSDK.prototype.simplexPaymentRequest = function (data) {
            var self = this;

            return self.blocktrailClient.post("/mywallet/simplex/payment/request", null, data);
        };

        blocktrailSDK.prototype.redeemPromoCode = function (data) {
            var self = this;

            return self.blocktrailClient.post("/promo/redeem", null, data);
        };

        blocktrailSDK.prototype.passwordChange = function (oldPassword, newPassword, encryptedSecret, twoFactorToken, walletsData) {
            var self = this;

            return self.blocktrailClient.post(
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

        blocktrailSDK.prototype.setMainMobileWallet = function (identifier) {
            var self = this;

            return self.blocktrailClient.post("/mywallet/main", null, {identifier: identifier});
        };

        blocktrailSDK.prototype.getSignedBitonicUrl = function (identifier, params) {
            var self = this;

            return self.blocktrailClient.post("/mywallet/" + identifier + "/bitonic/oauth", null, params);
        };

        blocktrailSDK.prototype.walletTransaction = function (identifier, txHash) {
            var self = this;

            return self.blocktrailClient.get("/wallet/" + identifier + "/transaction/" + txHash);
        };
    }

    /**
     * Generic blocktrail SDK
     * @param sdkConfig
     * @param blocktrailSDK
     * @constructor
     */
    function GenericBlocktrailSDK(sdkConfig, blocktrailSDK) {
        var self = this;

        self.blocktrailClient = blocktrailSDK.initRestClient(sdkConfig);
    }

    /**
     * @param withbalances boolean
     */
    GenericBlocktrailSDK.prototype.getAllWallets = function (withbalances) {
        var self = this;

        var params = {};
        if (withbalances) {
            params.withbalances = 1;
        }

        return self.blocktrailClient.get("/mywallet/wallets", params);
    };

    GenericBlocktrailSDK.prototype.syncContacts = function (data) {
        var self = this;

        return self.blocktrailClient.post("/mywallet/contacts", null, data);
    };

    GenericBlocktrailSDK.prototype.deleteContacts = function () {
        var self = this;

        return self.blocktrailClient.delete("/mywallet/contacts");
    };

    GenericBlocktrailSDK.prototype.getProfile = function () {
        var self = this;

        return self.blocktrailClient.get("/mywallet/profile");
    };

    GenericBlocktrailSDK.prototype.syncProfile = function (data) {
        var self = this;

        return self.blocktrailClient.post("/mywallet/profile", null, data);
    };

    GenericBlocktrailSDK.prototype.getSettings = function () {
        var self = this;

        return self.blocktrailClient.get("/mywallet/settings");
    };

    GenericBlocktrailSDK.prototype.syncSettings = function (data) {
        var self = this;

        return self.blocktrailClient.post("/mywallet/settings", null, data);
    };

    GenericBlocktrailSDK.prototype.updatePhone = function (data) {
        var self = this;

        return self.blocktrailClient.post("/mywallet/phone", null, data);
    };

    GenericBlocktrailSDK.prototype.removePhone = function () {
        var self = this;

        return self.blocktrailClient.delete("/mywallet/phone", null, null);
    };

    GenericBlocktrailSDK.prototype.verifyPhone = function (token) {
        var self = this;

        return self.blocktrailClient.post("/mywallet/phone/verify", null, {token: token});
    };

    GenericBlocktrailSDK.prototype.setup2FA = function (password) {
        var self = this;

        return self.blocktrailClient.post("/mywallet/2fa/setup", null, {password: password});
    };

    GenericBlocktrailSDK.prototype.enable2FA = function (twoFactorToken) {
        var self = this;

        return self.blocktrailClient.post("/mywallet/2fa/enable", null, {two_factor_token: twoFactorToken});
    };

    GenericBlocktrailSDK.prototype.disable2FA = function (twoFactorToken) {
        var self = this;

        return self.blocktrailClient.post("/mywallet/2fa/disable", null, {two_factor_token: twoFactorToken});
    };

    GenericBlocktrailSDK.prototype.contacts = function (lastSynced) {
        var self = this;

        return self.blocktrailClient.get("/mywallet/contacts", {last_synced: lastSynced});
    };

    GenericBlocktrailSDK.prototype.sendFeedback = function (data) {
        var self = this;

        return self.blocktrailClient.post("/mywallet/feedback", null, data);
    };
})();
