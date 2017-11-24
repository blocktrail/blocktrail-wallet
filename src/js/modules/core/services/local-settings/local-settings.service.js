(function () {
    "use strict";

    angular.module("blocktrail.core")
        .factory("localSettingsService", function($log, CONFIG, helperService, localStorageFactory) {
            return new LocalSettingsService($log, CONFIG, helperService, localStorageFactory);
        }
    );

    function LocalSettingsService($log, CONFIG, helperService, localStorageFactory) {
        var self = this;

        self._$log = $log;
        self._CONFIG = CONFIG;
        self._helperService = helperService;

        // Local settings
        self._localSettingsStorage = localStorageFactory.init("localSettings", {
            isSetupComplete: false,
            isPhoneVerified: false,
            isContactsSynchronized: false,
            // TODO Use it here
            pinOnOpen: false
        });
    }

    /**
     * Get account info
     * @return { promise<object> }
     */
    LocalSettingsService.prototype.getLocalSettings = function() {
        var self = this;

        return self._localSettingsStorage.getData();
    };

    /**
     * Set account info
     * @return { promise<true> }
     */
    LocalSettingsService.prototype.setLocalSettings = function(data) {
        var self = this;

        return self._localSettingsStorage.setData(data);
    };
})();



