(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("toCurrencySymbol", toCurrencySymbol);

    function toCurrencySymbol(Currencies) {
        return function(input) {
            if (typeof Currencies.currencies[input] === "undefined") {
                return input;
            } else {
                return Currencies.currencies[input].symbol || input;
            }
        };
    }

})();
