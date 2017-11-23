(function () {
    "use strict";

    angular.module("blocktrail.core")
        .factory("localSettingsService", function($log, CONFIG, helperService, storageService) {
            return new LocalSettingsService($log, CONFIG, helperService, storageService);
        }
    );

    function LocalSettingsService($log, CONFIG, helperService, storageService) {
        var self = this;

        self._$log = $log;
        self._CONFIG = CONFIG;
        self._helperService = helperService;

        // Local settings
        self._keyIdForLocalSettings = "localSettings";
        self._defaultLocalSettingsDoc = {
            _id: self._keyIdForLocalSettings,
            isSetupComplete: false,
            isPhoneVerified: false,
            isContactsSynchronized: false,
            // TODO Use it here
            pinOnOpen: false
        };
        self._pendingLocalSettings = [];
        self._promiseLocalSettings = null;

        // Init storage DB
        self._storage = storageService.db("localSettings");
    }

    /**
     * Get local settings
     * @return { promise<object> }
     */
    LocalSettingsService.prototype.getLocalSettings = function() {
        var self = this;

        self._$log.debug("M:CORE:LocalSettingsService:getLocalSettings");

        return self._storage.get(self._keyIdForLocalSettings)
            .then(function(doc) { return doc; }, function() { return self._defaultLocalSettingsDoc; });
    };

    /**
     * Set local settings
     * @return { promise<true> }
     */
    LocalSettingsService.prototype.setLocalSettings = function(data) {
        var self = this;

        self._$log.debug("M:CORE:LocalSettingsService:setLocalSettings");

        if(self._promiseLocalSettings) {
            self._helperService.pushPendingData(self._pendingLocalSettings, data);
            return self._promiseLocalSettings;
        } else {
            return self._promiseLocalSettings = self.getLocalSettings()
                .then(function(doc) {
                    // Use doc as a schema object
                    return self._storage.put(self._helperService.prepareObjectAccordingToSchema(doc, data))
                        .then(function() {
                            // Unset the promise, it's now safe for another update operation to happen
                            self._promiseLocalSettings = null;

                            var pendingData = self._helperService.getSquashedPendingData(self._pendingLocalSettings);

                            if (pendingData) {
                                return self.setLocalSettings(pendingData);
                            }

                            self._$log.debug("M:CORE:LocalSettingsService:setLocalSettings:success");

                            return true;
                        });
                });
        }
    };
})();



