(function () {
    "use strict";

    angular.module("blocktrail.wallet")
        .factory("phoneFromService", function(sdkService) {
            return new PhoneFromService(sdkService);
        }
    );

    function PhoneFromService(sdkService) {
        var self = this;

        self._sdkService = sdkService;
    }

    /**
     * Send the phone
     * @param data
     */
    PhoneFromService.prototype.sendPhone = function(data) {
        var self = this;

        var sendData = {
            phone_number: data.phone,
            country_code: data.countryCode
        };

        return self._sdkService.getGenericSdk()
            .updatePhone(sendData);
    };

    /**
     * Verify the phone
     * @param data
     */
    PhoneFromService.prototype.verifyPhone = function(data) {
        var self = this;

        return self._sdkService.getGenericSdk()
            .verifyPhone(data.token);
    };

    /**
     * Remove the phone
     */
    PhoneFromService.prototype.removePhone = function() {
        var self = this;

        return self._sdkService.getGenericSdk()
            .removePhone();
    };

})();
