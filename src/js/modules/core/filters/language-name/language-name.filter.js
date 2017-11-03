(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("languageName", languageName);

    function languageName(blocktrailLocalisation) {
        return function(input) {
            return blocktrailLocalisation.languageName(input);
        };
    }

})();
