(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("mathAbs", mathAbs);

    function mathAbs() {
        return function(input) {
            return Math.abs(input);
        };
    }

})();
