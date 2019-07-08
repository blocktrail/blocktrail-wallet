(function () {
    "use strict";

    angular.module("blocktrail.core")
        .factory("launchService", function($http, $log, CONFIG, helperService, storageService, localStorageService) {
            return new LaunchService($http, $log, CONFIG, helperService, storageService, localStorageService);
        });

    function LaunchService($http, $log, CONFIG, helperService, storageService, localStorageService) {
        var self = this;

        self._$http = $http;
        self._$log = $log;
        self._CONFIG = CONFIG;
        self._helperService = helperService;

        // Account info
        self._accountInfoStorage = localStorageService.init("accountInfo", {
            username: null,
            email: null,
            apiKey: null, // api_key
            apiSecret: null, // api_secret
            isTestNetwork: self._CONFIG.TESTNET,
            secret: null,
            encryptedSecret: null,
            newSecret: null // new_secret
        });

        // Wallet info
        self._walletInfoStorage = localStorageService.init("walletInfo", {
            identifier: null,
            networkType: null,
            encryptedSecret: null,
            encryptedPassword: null
        });

        // Backup info
        self._walletBackupStorage = localStorageService.init("walletBackup", {
            identifier: null,
            backupSeed: null,
            encryptedSecret: null,
            encryptedPrimarySeed: null,
            blocktrailPublicKeys: null,
            recoveryEncryptedSecret: null,
            supportSecret: null,
            walletVersion: null
        });

        self._walletConfigTimestamps = null;
        self._walletConfigPromise = null;
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

        return self._accountInfoStorage.getData();
    };

    /**
     * Set account info
     * @return { promise<true> }
     */
    LaunchService.prototype.setAccountInfo = function(data) {
        var self = this;

        return self._accountInfoStorage.setData(data);
    };

    /**
     * Get account info
     * @return { promise<object> }
     */
    LaunchService.prototype.getWalletInfo = function() {
        var self = this;

        return self._walletInfoStorage.getData();
    };

    /**
     * Set account info
     * @return { promise<true> }
     */
    LaunchService.prototype.setWalletInfo = function(data) {
        var self = this;

        return self._walletInfoStorage.setData(data);
    };

    /**
     * Get account info
     * @return { promise<object> }
     */
    LaunchService.prototype.getWalletBackup = function() {
        var self = this;

        return self._walletBackupStorage.getData();
    };

    /**
     * Set account info
     * @return { promise<true> }
     */
    LaunchService.prototype.setWalletBackup = function(data) {
        var self = this;

        return self._walletBackupStorage.setData(data);
    };

    /**
     * Clear wallet backup
     * @return { promise<true> }
     */
    LaunchService.prototype.clearWalletBackup = function() {
        var self = this;

        return self._walletBackupStorage.clearData();
    };

})();



