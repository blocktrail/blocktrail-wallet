(function () {
    "use strict";

    angular.module('blocktrail.setup')
        .factory('setupInfoService', function(CONFIG, randomBytesJS) {
            return new SetupInfoService(CONFIG, randomBytesJS);
        }
    );

    /**
     * Setup info service
     * @param CONFIG
     * @param randomBytesJS
     * @constructor
     */
    function SetupInfoService(CONFIG, randomBytesJS) {
        var self = this;
        var setupInfo = {
            // force uniqueness of the identifier to make it easier to force a
            identifier: CONFIG.DEFAULT_IDENTIFIER + "-" + randomBytesJS(8).toString('hex'),
            password: "",
            primaryMnemonic: "",
            backupMnemonic: "",
            blocktrailPublicKeys: null,
            networkType: null,
            backupInfo: null,
            supportSecret: null
        };

        /**
         * Get setup info
         * @return {{ object }} setupInfo
         */
        self.getSetupInfo = function() {
            return angular.copy({}, setupInfo);
        };

        self.getSetupInfoProperty = function(key) {
            return setupInfo[key];
        };

        /**
         * Update setup info
         * @param data
         */
        self.updateSetupInfo = function(data) {
            if(!angular.isObject(data)) {
                throw new Error("Blocktrail setup module, setup info service. Data is not an object");
            }

            for (var property in setupInfo) {
                if (setupInfo.hasOwnProperty(property) && data[property] !== "undefined") {
                    setupInfo[property] = data[property];
                }
            }
        }
    }
})();
