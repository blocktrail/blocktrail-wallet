(function () {
    "use strict";

    angular.module('blocktrail.core')
        .factory('sdkService', function(genericSdkService, blocktrailSDK, CONFIG) {
            extendBlocktrailSDK(blocktrailSDK);

            return new SdkService(genericSdkService, blocktrailSDK, CONFIG);
        }
    );

    /**
     * Sdk service
     * @param genericSdkService
     * @param blocktrailSDK
     * @param CONFIG
     * @constructor
     */
    function SdkService(genericSdkService, blocktrailSDK, CONFIG) {
        var self = this;

        self._genericSdkService = genericSdkService;

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

        // @TODO: move out of here // @roman
        self._genericSdkService.setAccountInfo(accountInfo);

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

        // set testnet flag from config
        var isTestNet = !!self._CONFIG.TESTNET;

        // Network SDKs
        self._CONFIG.NETWORKS_ENABLED.forEach(function(networkType) {
            if (isTestNet && networkType.charAt(0) !== 't') {
                throw new Error("Blocktrail core module, sdk service. Only test networks are available (tBTC, tBCC ...).");
            } else if (!isTestNet && networkType.charAt(0) === 't') {
                throw new Error("Blocktrail core module, sdk service. Only regular networks are available (BTC, BCC ...).");
            }

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
        blocktrailSDK.prototype.requestContactAddress = function (phoneHash) {
            var self = this;

            return self.client.get("/contact/" + phoneHash + "/new-address", null, false);
        };

        blocktrailSDK.prototype.glideraOauth = function (code, redirect_uri) {
            var self = this;

            return self.client.post("/mywallet/glidera/oauth", {platform: 'web'}, {code: code, redirect_uri: redirect_uri});
        };

        blocktrailSDK.prototype.glideraBuyPrices = function (qty, fiat) {
            var self = this;

            return self.client.get("/mywallet/glidera/prices/buy", {qty: qty, fiat: fiat, platform: 'web'});
        };

        blocktrailSDK.prototype.redeemPromoCode = function (data) {
            var self = this;

            return self.client.post("/promo/redeem", null, data);
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

        blocktrailSDK.prototype.setMainMobileWallet = function (identifier) {
            var self = this;

            return self.client.post("/mywallet/main", null, {identifier: identifier});
        };

        blocktrailSDK.prototype.getSignedBitonicUrl = function (identifier, params) {
            var self = this;

            return self.client.post("/mywallet/" + identifier + "/bitonic/oauth", null, params);
        };

        blocktrailSDK.prototype.walletTransaction = function (identifier, txHash) {
            var self = this;

            return self.client.get("/wallet/" + identifier + "/transaction/" + txHash);
        };
    }
})();
