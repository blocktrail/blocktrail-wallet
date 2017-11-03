(function() {
    "use strict";

    /**
     * window.device adds to widow dynamically that's why we use factory instead of constant
     */
    angular.module("blocktrail.core")
        .factory("device", function($window) {
                return $window.device;
            }
        );
})();
