(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("displayAddr", displayAddr);

    function displayAddr(sdkService) {
        return function(input, useCashAddr) {
            if (useCashAddr) {
                return sdkService.getSdkByActiveNetwork().getCashAddressFromLegacyAddress(input);
            } else {
                return input;
            }
        }
    }

})();
