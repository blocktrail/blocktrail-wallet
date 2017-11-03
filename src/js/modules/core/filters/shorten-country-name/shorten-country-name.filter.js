(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("shortenCountryName", shortenCountryName);

    function shortenCountryName() {
        return function(input) {
            //remove the bracket version of the country name
            if (!input) {
                return input;
            }
            var regex = /\(.+\)/g;
            return input.replace(regex, '');
        };
    }

})();
