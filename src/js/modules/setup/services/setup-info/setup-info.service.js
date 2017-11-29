(function () {
    "use strict";

    angular.module("blocktrail.setup")
        .factory("setupInfoService", function(CONFIG, randomBytesJS, helperService) {
            return new SetupInfoService(CONFIG, randomBytesJS, helperService);
        }
    );

    function SetupInfoService(CONFIG, randomBytesJS, helperService) {
        var self = this;

        var defaultSetupinfo = {
            // force uniqueness of the identifier to make it easier to force a
            identifier: CONFIG.DEFAULT_IDENTIFIER + "-" + randomBytesJS(8).toString("hex"),
            password: null,
            blocktrailPublicKeys: null,
            networkType: CONFIG.DEBUG_DEFAULT_NETWORK || null,
            backupInfo: null,
            supportSecret: null
        };

        var setupInfo = helperService.prepareObjectAccordingToSchema(defaultSetupinfo, {
            // force uniqueness of the identifier to make it easier to force a
            identifier: CONFIG.DEFAULT_IDENTIFIER + "-" + randomBytesJS(8).toString("hex"),
            networkType: CONFIG.DEBUG_DEFAULT_NETWORK || null
        });

        var walletSecret = null;

        /**
         * Get setup info
         * @return {{ object }} setupInfo
         */
        self.getSetupInfo = function() {
            return angular.copy({}, setupInfo);
        };

        /**
         * Get setup info property
         * @param key
         * @return { * }
         */
        self.getSetupInfoProperty = function(key) {
            return setupInfo[key];
        };

        /**
         * Update setup info
         * @param data
         */
        self.setSetupInfo = function(data) {
            setupInfo = helperService.prepareObjectAccordingToSchema(setupInfo, data);
        };

        /**
         * Reset setup info
         * @return { object }
         */
        self.resetSetupInfo = function() {
            setupInfo = helperService.prepareObjectAccordingToSchema(defaultSetupinfo, {
                // force uniqueness of the identifier to make it easier to force a
                identifier: CONFIG.DEFAULT_IDENTIFIER + "-" + randomBytesJS(8).toString("hex"),
                networkType: CONFIG.DEBUG_DEFAULT_NETWORK || null
            });

            return setupInfo;
        };

        /**
         * Stash wallet secret
         * @param secret
         */
        self.stashWalletSecret = function(secret) {
            if (typeof secret !== "string") {
                throw new Error("wallet secret should be stashed as string");
            }

            walletSecret = secret;
        };

        /**
         * Unstash wallet secret
         * @return { string }
         */
        self.unstashWalletSecret = function() {
            var secret = walletSecret;
            walletSecret = null;

            return secret;
        };
    }
})();
