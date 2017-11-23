(function () {
    "use strict";

    angular.module("blocktrail.core")
        .factory("launchService", function($http, $log, CONFIG, helperService, storageService) {
            return new LaunchService($http, $log, CONFIG, helperService, storageService);
        });

    function LaunchService($http, $log, CONFIG, helperService, storageService) {
        var self = this;

        self._$http = $http;
        self._$log = $log;
        self._CONFIG = CONFIG;
        self._helperService = helperService;

        // Account info
        self._keyIdForAccountInfo = "accountInfo";
        self._defaultAccountInfoDoc = {
            _id: self._keyIdForAccountInfo,
            username: null,
            email: null,
            apiKey: null, // api_key
            apiSecret: null, // api_secret
            isTestNetwork: self._CONFIG.TEST_NETWORK,
            secret: null,
            encryptedSecret: null,
            newSecret: null // new_secret
        };
        self._pendingAccountInfo = []; // @TODO: HelperService should get this as reference and use it instead of `type`
        self._promiseAccountInfo = null;

        // Wallet info
        self._keyIdForWalletInfo = "walletInfo";
        self._defaultWalletInfoDoc = {
            _id: self._keyIdForWalletInfo,
            identifier: null,
            networkType: null,
            encryptedPassword: null,
            encryptedSecret: null
        };
        self._pendingWalletInfo = [];
        self._promiseWalletInfo = null;

        // Wallet backup
        self._keyIdForWalletBackup = "walletBackup";
        self._defaultWalletBackupDoc = {
            _id: self._keyIdForWalletBackup,
            identifier: null,
            backupSeed: null,
            encryptedPassword: null,
            encryptedSecret: null,
            encryptedPrimarySeed: null,
            blocktrailPublicKeys: null,
            recoveryEncryptedSecret: null,
            supportSecret: null,
            walletVersion: null
        };
        self._pendingWalletBackup = [];
        self._promiseWalletBackup = null;

        self._walletConfigTimestamps = null;
        self._walletConfigPromise = null;

        // Init storage DB
        self._storage = storageService.db("launch");
    }

    /**
     * Get wallet config
     * @return { promise }
     */
    LaunchService.prototype.getWalletConfig = function(force) {
        var self = this;

        self._$log.debug("M:CORE:LaunchService:getWalletConfig");

        if(force) {
            self._walletConfigTimestamps = null;
        }

        if(!self._walletConfigPromise || (self._walletConfigTimestamps > (new Date()).getTime() + (600 * 1000))) {
            self._walletConfigPromise = self.getAccountInfo()
                .then(function(accountInfo) {
                    var url = self._CONFIG.API_URL + "/v1/mywallet/config?";
                    var params = [
                        "v=" + (self._CONFIG.VERSION || ""),
                        "platform=mobile",
                        "testnet=" + (self._CONFIG.TESTNET ? 1 : 0)
                    ];

                    if (accountInfo.apiKey) {
                        params.push("api_key=" + accountInfo.apiKey);
                    }

                    return self._$http.get(url + params.join("&"))
                        .then(function(result) {
                            // TODO Return data instead { data: ... } from server side, talk to Ruben
                            return result.data;
                        });
                });

            self._walletConfigTimestamps = (new Date()).getTime();
        }

        return self._walletConfigPromise;
    };

    /**
     * Get account info
     * @return { promise<object> }
     */
    LaunchService.prototype.getAccountInfo = function() {
        var self = this;

        self._$log.debug("M:CORE:LaunchService:getAccountInfo");

        return self._storage.get(self._keyIdForAccountInfo)
            .then(function(doc) { return doc; }, function() { return self._defaultAccountInfoDoc; });
    };

    /**
     * Set account info
     * @return { promise<true> }
     */
    LaunchService.prototype.setAccountInfo = function(data) {
        var self = this;

        self._$log.debug("M:CORE:LaunchService:setAccountInfo");

        if(self._promiseAccountInfo) {
            self._helperService.pushPendingData(self._pendingAccountInfo, data);
            return self._promiseAccountInfo;
        } else {
            return self._promiseAccountInfo = self.getAccountInfo()
                .then(function(doc) {
                    // Use doc as a schema object
                    return self._storage.put(self._helperService.prepareObjectAccordingToSchema(doc, data))
                        .then(function() {
                            // Unset the promise, it's now safe for another update operation to happen
                            self._promiseAccountInfo = null;

                            var pendingData = self._helperService.getSquashedPendingData(self._pendingAccountInfo);

                            if (pendingData) {
                                return self.setAccountInfo(pendingData);
                            }

                            self._$log.debug("M:CORE:LaunchService:setAccountInfo:success");

                            return true;
                        });
                });
        }
    };

    /**
     * Get wallet info
     * @return { promise<object> }
     */
    LaunchService.prototype.getWalletInfo = function() {
        var self = this;

        self._$log.debug("M:CORE:LaunchService:getWalletInfo");

        return self._storage.get(self._keyIdForWalletInfo)
            .then(function(doc) { return doc; }, function() { return self._defaultWalletInfoDoc; });
    };

    /**
     * Set wallet info
     * @param data
     * @return { promise<true> }
     */
    LaunchService.prototype.setWalletInfo = function(data) {
        var self = this;

        self._$log.debug("M:CORE:LaunchService:setWalletInfo");

        if(self._promiseWalletInfo) {
            self._helperService.pushPendingData(self._pendingWalletInfo, data);
            return self._promiseWalletInfo;
        } else {
            return self._promiseWalletInfo = self.getWalletInfo()
                .then(function(doc) {
                    // Use doc as a schema object
                    return self._storage.put(self._helperService.prepareObjectAccordingToSchema(doc, data))
                        .then(function() {
                            // Unset the promise, it's now safe for another update operation to happen
                            self._promiseWalletInfo = null;

                            var pendingData = self._helperService.getSquashedPendingData(self._pendingWalletInfo);

                            if (pendingData) {
                                return self.setWalletInfo(pendingData);
                            }

                            self._$log.debug("M:CORE:LaunchService:setWalletInfo:success");

                            return true;
                        });
                });
        }
    };

    /**
     * Get wallet backup
     * @return { promise<object> }
     */
    LaunchService.prototype.getWalletBackup = function() {
        var self = this;

        self._$log.debug("M:CORE:LaunchService:getWalletBackup");

        return self._storage.get(self._keyIdForWalletBackup)
            .then(function(doc) { return doc; }, function() { return self._defaultWalletBackupDoc; });
    };

    /**
     * Set wallet backup
     * @param data
     * @return { promise<true> }
     */
    LaunchService.prototype.setWalletBackup = function(data) {
        var self = this;

        self._$log.debug("M:CORE:LaunchService:setWalletBackup");

        if(self._promiseWalletBackup) {
            self._helperService.pushPendingData(self._pendingWalletBackup, data);
            return self._promiseWalletBackup;
        } else {
            return self._promiseWalletBackup = self.getWalletBackup()
                .then(function(doc) {
                    // Use doc as a schema object
                    return self._storage.put(self._helperService.prepareObjectAccordingToSchema(doc, data))
                        .then(function() {
                            // Unset the promise, it's now safe for another update operation to happen
                            self._promiseWalletBackup = null;

                            var pendingData = self._helperService.getSquashedPendingData(self._pendingWalletBackup);

                            if (pendingData) {
                                return self.setWalletBackup(pendingData);
                            }

                            self._$log.debug("M:CORE:LaunchService:setWalletBackup:success");

                            return true;
                        });
                });
        }
    };

    /**
     * Clear wallet backup
     * @return { promise<true> }
     */
    LaunchService.prototype.clearWalletBackup = function() {
        var self = this;

        self._$log.debug("M:CORE:LaunchService:clearWalletBackup");

        return self._storage.get(self._keyIdForWalletBackup)
            .then(function(doc) {
                return self._storage.remove(doc);
            }, function() {
                return true;
            });
    };

})();



