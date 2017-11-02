(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("toCurrencyTicker", toCurrencyTicker);

    function toCurrencyTicker(Currencies) {
        return function(input) {
            if (typeof Currencies.currencies[input] === "undefined") {
                return input;
            } else {
                return Currencies.currencies[input].ticker || Currencies.currencies[input].code || input;
            }
        };
    }

})();
