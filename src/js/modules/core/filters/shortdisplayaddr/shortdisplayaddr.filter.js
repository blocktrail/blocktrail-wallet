(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("shortDisplayAddr", shortDisplayAddr);

    function shortDisplayAddr() {
        return function(input) {
            // Trunc should always be greater than start
            var trunc = 40;
            var start = 20;

            if (input.length > trunc) {
                // ideal goal, this algorithm dynamically
                // removes X from the middle, so the number
                // of characters displayed is `trunc`
                var sliced = input.substring(0, start) + "..." + input.substring(input.length - (trunc - start));
                return sliced;
            } else {
                return input;
            }

        }
    }

})();
