(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("duration", ["moment", duration]);

    function duration(moment) {
        return function (input) {
            return moment.duration(input).humanize();
        };
    }

})();
