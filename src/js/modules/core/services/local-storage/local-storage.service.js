(function () {
    "use strict";

    angular.module("blocktrail.core")
        .factory("localStorageService", function($log, CONFIG, helperService, storageService) {
            return new LocalStorageService($log, CONFIG, helperService, storageService);
        }
    );

    function LocalStorageService($log, CONFIG, helperService, storageService) {
        var self = this;

        self._$log = $log;
        self._CONFIG = CONFIG;
        self._helperService = helperService;
        self._storageService = storageService;

        self._storages = {};
    }

    /**
     *
     * @param keyId
     * @param props
     * @returns { LocalStorage }
     */
    LocalStorageService.prototype.init = function(keyId, props) {
        var self = this;

        // init storage if it doesn't exist yet, reuse if it does
        if (!self._storages[keyId]) {
            // @TODO: should we prefix the name of the storage DB?
            self._storages[keyId] = new LocalStorage(keyId, props, self._storageService.db(keyId), self._$log, self._helperService);
        }

        return self._storages[keyId];
    };

    function LocalStorage(keyId, props, storage, $log, helperService) {
        var self = this;

        self._$log = $log;
        self._helperService = helperService;

        self._keyId = keyId;
        self._defaults = angular.extend({}, { _id: keyId }, props);
        self._pending = [];
        self._pendingPromise = null;
        self._storage = storage;
    }

    /**
     * @return { promise<object> }
     */
    LocalStorage.prototype.getData = function() {
        var self = this;

        self._$log.debug("M:CORE:LocalStorage:" + self._keyId + ":getData");

        return self._storage.get(self._keyId)
            // TODO updateDocAccordingToSchema we need to update it ones when we change the schema
            .then(function(doc) { return self._helperService.updateDocAccordingToSchema(self._defaults, doc); }, function() { return self._defaults; });
    };

    /**
     *
     * @param data
     * @return { promise<bool> }
     */
    LocalStorage.prototype.setData = function(data) {
        var self = this;

        self._$log.debug("M:CORE:LocalStorage:" + self._keyId + ":setData");

        if(self._pendingPromise) {
            self._helperService.pushPendingData(self._pending, data);
            return self._pendingPromise;
        } else {
            return self._pendingPromise = self.getData()
                .then(function(doc) {
                    // Use doc as a schema object
                    return self._storage.put(self._helperService.prepareObjectAccordingToSchema(doc, data))
                        .then(function() {
                            // Unset the promise, it's now safe for another update operation to happen
                            self._pendingPromise = null;

                            var pendingData = self._helperService.getSquashedPendingData(self._pending);

                            if (pendingData) {
                                return self.setData(pendingData);
                            }


                            self._$log.debug("M:CORE:LocalStorage:" + self._keyId + ":setData:success");

                            return true;
                        });
                });
        }
    };

    /**
     *
     * @return { promise<bool> }
     */
    LocalStorage.prototype.clearData = function() {
        var self = this;

        self._$log.debug("M:CORE:LocalStorage:" + self._keyId + ":clearData");

        return self._storage.get(self._keyId)
            .then(function(doc) {
                return self._storage.remove(doc);
            }, function() {
                return true;
            });
    }
})();
