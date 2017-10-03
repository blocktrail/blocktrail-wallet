(function() {
    "use strict";

    angular.module("blocktrail.core")
        .factory("formHelperService", function() {
            return new FormHelperService();
        });

    function FormHelperService() {
    }

    FormHelperService.prototype.setAllDirty = function(form) {
        // sets form and all form controls to dirty state
        form.$setDirty();

        angular.forEach(form.$error, function(value) {
            angular.forEach(value, function(value) {
                value.$dirty = true;
                value.$touched = true;
                value.$pristine = false;
            });
        });
    };

    FormHelperService.prototype.setAllPristine = function(form) {
        // sets form and all form controls to pristine state
        form.$setPristine();
        angular.forEach(form.$error.required, function(value) {
            value.$setPristine();
        });
    };

    FormHelperService.prototype.setValidityOnce = function(formElement, key, val) {
        if (typeof formElement.$validators[key] === "undefined") {
            formElement.$validators[key] = function() {
                return true;
            };
        }

        formElement.$setValidity(key, val || false);
        formElement.$setDirty();
    }

})();
