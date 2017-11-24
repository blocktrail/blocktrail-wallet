(function () {
    "use strict";

    angular.module('blocktrail.core')
        .factory('helperService', function(_) {
            return new HelperService(_);
        }
    );

    function HelperService(_) {
        var self = this;

        self._lodash = _;
    }

    /**
     * TODO Extend doc object according to a schema
     * @return {null}
     */
    HelperService.prototype.updateDocAccordingToSchema = function(schema, doc) {
        var self = this;

        if(!self._lodash.isObject(doc)) {
            throw new Error("Blocktrail core module, helper service: updateDocObjectAccordingToSchema. Doc is not an object");
        }

        if(!self._lodash.isObject(schema)) {
            throw new Error("Blocktrail core module, helper service: updateDocObjectAccordingToSchema. Schema is not an object");
        }

        var schemaKeys = self._lodash.keys(schema);

        if(!schemaKeys.length) {
            throw new Error("Blocktrail core module, helper service: updateDocObjectAccordingToSchema. Schema is empty");
        }

        // Add extra key, related to the local storage - revision id
        schemaKeys.push("_rev");

        var docAccordingSchema = self._lodash.pick(doc, schemaKeys);

        return self._lodash.assign({}, schema, docAccordingSchema);
    };

    /**
     * Prepare an object according to a schema
     * For storage
     * @param schema
     * @param data
     * @return { object }
     *
     * Schema object used as target object. Object.assign(target, ...sources)
     */
    HelperService.prototype.prepareObjectAccordingToSchema = function(schema, data) {
        var self = this;

        if(!self._lodash.isObject(data)) {
            throw new Error("Blocktrail core module, helper service: prepareObjectAccordingToSchema. Data is not an object");
        }

        if(!self._lodash.isObject(schema)) {
            throw new Error("Blocktrail core module, helper service: prepareObjectAccordingToSchema. Schema is not an object");
        }

        var schemaKeys = self._lodash.keys(schema);

        if(!schemaKeys.length) {
            throw new Error("Blocktrail core module, helper service: prepareObjectAccordingToSchema. Schema is empty");
        }

        var dataAccordingSchema = self._lodash.pick(data, schemaKeys);

        if(self._lodash.isEmpty(dataAccordingSchema)) {
            throw new Error("Blocktrail core module, helper service: prepareObjectAccordingToSchema. Nothing to update, data object doesn't match the schema object");
        }

        return self._lodash.assign({}, schema, dataAccordingSchema);
    };

    /**
     * Push a pending data
     * For storage
     * @param pendingData
     * @param data
     */
    HelperService.prototype.pushPendingData = function(pendingData, data) {
        var self = this;

        if(!self._lodash.isObject(data)) {
            throw new Error("Blocktrail core module, helper service: setPendingData. Data is not an object");
        }

        if(!self._lodash.isArray(pendingData)) {
            throw new Error("Blocktrail core module, helper service: setPendingData. Type is not am array");
        }

        pendingData.push(data);
    };

    /**
     * Get a squashed pending data
     * For storage
     * The method mutate the pendingData
     * @param pendingData
     * @return { object | null }
     */
    HelperService.prototype.getSquashedPendingData = function(pendingData) {
        var self = this;
        var quashedPendingData = {};

        if(!self._lodash.isArray(pendingData)) {
            throw new Error("Blocktrail core module, helper service: getPendingData. Type is not an array");
        }

        if (pendingData) {
            quashedPendingData = self._lodash.assign.apply(self._lodash, pendingData);
            pendingData.splice(0, pendingData.length);
        }

        return self._lodash.isEmpty(quashedPendingData) ? null : quashedPendingData;
    };

    /**
     * Return data
     * @param data
     * @return {*}
     */
    HelperService.prototype.returnData = function(data) {
        return data;
    };

    /**
     * To the app reset state
     * @param $state
     * @return { promise|void }
     */
    HelperService.prototype.toAppResetState = function($state) {
        return $state.go("app.reset");
    };

})();



