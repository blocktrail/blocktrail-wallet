(function () {
    "use strict";

    angular.module("blocktrail.wallet")
        .factory("feedbackFromService", function($rootScope, $cordovaDevice, sdkService) {

            return new FeedbackFromService($rootScope, $cordovaDevice, sdkService);
        }
    );

    function FeedbackFromService($rootScope, $cordovaDevice, sdkService) {
        var self = this;

        self._$rootScope = $rootScope;
        self._$cordovaDevice = $cordovaDevice;
        self._sdkService = sdkService;
    }

    /**
     * Send
     * @param data
     */
    FeedbackFromService.prototype.send = function(data) {
        var self = this;

        var sendData = {
            msg: data.msg ? data.msg : "",
            email: data.email ? data.email : null,
            platform: self._$rootScope.isIOS && "iOS" || "Android",
            app_version: self._$rootScope.appVersion,
            os_version: self._$cordovaDevice.getVersion(),
            phone_model: self._$cordovaDevice.getModel()
        };

        return self._sdkService.getGenericSdk()
            .sendFeedback(sendData);
    };

})();
