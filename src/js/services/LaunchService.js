angular.module('blocktrail.wallet').factory(
    'launchService',
    function(storageService, $http, CONFIG) {
        var LaunchService = function() {
            var self = this;

            self.storage = storageService.db('launch');
        };

        var walletSecret = null;
        LaunchService.prototype.stashWalletSecret = function(secret) {
            walletSecret = secret;
        };

        LaunchService.prototype.getWalletSecret = function() {
            var secret = walletSecret;
            walletSecret = null;

            return secret;
        };

        LaunchService.prototype.getWalletConfig = function() {
            return $http.get(CONFIG.API_URL + "/v1/" + (CONFIG.TESTNET ? "tBTC" : "BTC") + "/mywallet/config?v=" + CONFIG.VERSION + "&platform=mobile")
                .then(function(result) {
                    return result.data;
                });
        };

        LaunchService.prototype.getAccountInfo = function() {
            var self = this;

            return self.storage.get('account_info')
                .then(function(doc) { return doc; });
        };

        LaunchService.prototype.storeAccountInfo = function(accountInfo) {
            var self = this;

            return self.storage.get('account_info')
                .then(function(doc) { return doc; }, function() { return {_id: "account_info"}; })
                .then(function(doc) {
                    doc.username = accountInfo.username;
                    doc.email = accountInfo.email;
                    doc.api_key = accountInfo.api_key;
                    doc.api_secret = accountInfo.api_secret;
                    doc.testnet = accountInfo.testnet;
                    doc.secret = accountInfo.secret;
                    doc.encrypted_secret = accountInfo.encrypted_secret;
                    doc.new_secret = accountInfo.new_secret;


                    return self.storage.put(doc).then(function() {
                        return doc;
                    });
                }
            );
        };

        LaunchService.prototype.updateAccountInfo = function(updateAccountInfo) {
            var self = this;

            return self.getAccountInfo().then(function(accountInfo) {
                Object.keys(updateAccountInfo).forEach(function(k) {
                    accountInfo[k] = updateAccountInfo[k];
                });

                return self.storeAccountInfo(accountInfo);
            });
        };

        LaunchService.prototype.getWalletInfo = function() {
            var self = this;

            return self.storage.get('wallet_info')
                .then(function(doc) { return doc; });
        };

        LaunchService.prototype.storeWalletInfo = function(identifier, encryptedPassword, encryptedSecret) {
            var self = this;

            return self.storage.get('wallet_info')
                .then(function(doc) { return doc; }, function() { return {_id: "wallet_info"}; })
                .then(function(doc) {
                    doc.identifier = identifier;
                    doc.encryptedPassword = encryptedPassword;
                    doc.encryptedSecret = encryptedSecret;

                    return self.storage.put(doc).then(function() {
                        return true;
                    });
                }
            );
        };

        LaunchService.prototype.getBackupInfo = function() {
            var self = this;

            return self.storage.get('wallet_backup')
                .then(function(doc) { return doc; });
        };

        LaunchService.prototype.storeBackupInfo = function(walletInfo) {
            var self = this;

            return self.storage.get('wallet_backup')
                .then(function(doc) { return doc; }, function() { return {_id: "wallet_backup"}; })
                .then(function(doc) {
                    doc.identifier = walletInfo.identifier;
                    doc.walletVersion = walletInfo.walletVersion;
                    doc.encryptedPassword = walletInfo.encryptedPassword || null;
                    doc.encryptedPrimarySeed = walletInfo.encryptedPrimarySeed;
                    doc.backupSeed = walletInfo.backupSeed;
                    doc.encryptedSecret = walletInfo.encryptedSecret;
                    doc.recoveryEncryptedSecret = walletInfo.recoveryEncryptedSecret;
                    doc.blocktrailPublicKeys = walletInfo.blocktrailPublicKeys;

                    return self.storage.put(doc).then(function() {
                        return doc;
                    });
                }
            );
        };

        LaunchService.prototype.clearBackupInfo = function() {
            var self = this;

            return self.storage.get('wallet_backup')
                .then(function(doc) {
                    return self.storage.remove(doc);
                }, function() {
                    return true;
                });
        };

        return new LaunchService();

    }
);
