(function () {
    "use strict";

    angular.module("blocktrail.core")
        .factory("localSettingsService", function($log, CONFIG, helperService, localStorageService) {
            return new LocalSettingsService($log, CONFIG, helperService, localStorageService);
        }
    );

    function LocalSettingsService($log, CONFIG, helperService, localStorageService) {
        var self = this;

        var localSettingsDataSchema = {
            // Phone
            isPhoneVerified: false,
            phoneNumber: null,
            phoneCountry: null,
            phoneCountryCode: null,
            phoneHash: null,
            // Contacts
            isEnableContacts: false,
            isPermissionContacts: true,
            isContactsWebSync: false,
            contactsLastSync: null,
            // BTC precision
            btcPrecision: 8,
            // TODO Update pinOnOpen
            // Pin
            isPinOnOpen: false,     // ask for pin on each wallet open // TODO Change to true as default
            pinFailureCount: 0,     // counter of pin input failures
            pinLastFailure: null,    // last pin input failure
            // App rate
            appRateStatus: null
        };

        self._$log = $log;
        self._CONFIG = CONFIG;
        self._helperService = helperService;

        // We only load from local storage once, after that this is set to TRUE
        self._isReady = false;

        // Local settings
        self._localSettingsStorage = localStorageService.init("localSettings", localSettingsDataSchema);

        // Data object
        self._localSettingsData = angular.extend({}, localSettingsDataSchema);

        // Read only settings data object
        // the object would be shared
        self._readonlyDoc = {
            readonly: true
        };

        angular.forEach(self._localSettingsData, function(value, key) {
            Object.defineProperty(self._readonlyDoc, key, {
                set: function() {
                    throw new Error("Blocktrail core module, local settings service. Read only object.");
                },
                get: function() {
                    return self._localSettingsData[key];
                },
                enumerable: true
            });
        });
    }

    LocalSettingsService.prototype.initLocalSettings = function() {
        var self = this;
        var promise;

        if (self._isReady === false) {
            promise = self.getLocalSettings()
                .then(self._updateLocalSettingsData.bind(self))
        } else {
            promise = self._isReady;
        }

        return promise;
    };

    LocalSettingsService.prototype.getReadOnlyLocalSettingsData = function() {
        var self = this;

        return self._readonlyDoc;
    };


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

        return self._localSettingsStorage.setData(data)
            .then(self.getLocalSettings.bind(self))
            .then(self._updateLocalSettingsData.bind(self))
    };

    LocalSettingsService.prototype._updateLocalSettingsData = function(data) {
        var self = this;

        angular.forEach(data, function(value, key) {
            if(angular.isDefined(self._localSettingsData[key])) {
                self._localSettingsData[key] = value;
            }
        });
    }
})();



