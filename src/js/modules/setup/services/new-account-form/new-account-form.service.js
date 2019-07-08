(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .factory("newAccountFormService", function($log, $http, $q, _, cryptoJS, device, CONFIG, launchService, settingsService, trackingService) {
                return new NewAccountFormService($log, $http, $q, _, cryptoJS, device, CONFIG, launchService, settingsService, trackingService);
            }
        );

    function NewAccountFormService($log, $http, $q, _, cryptoJS, device, CONFIG, launchService, settingsService, trackingService) {
        var self = this;

        self._$log = $log;
        self._$http = $http;
        self._$q = $q;
        self._lodash = _;
        self._cryptoJS = cryptoJS;
        self._device = device || {};
        self._CONFIG = CONFIG;
        self._launchService = launchService;
        self._settingsService = settingsService;
        self._trackingService = trackingService;
    }

    /**
     * Register
     * @param data
     * @return { promise }
     */
    NewAccountFormService.prototype.register = function(data) {
        var self = this;

        var postData = {
            username: null,
            email: data.email,
            password: self._cryptoJS.SHA512(data.password).toString(),
            password_score: data.passwordCheck && data.passwordCheck.score || 0,
            platform: ionic.Platform.isIOS() ? "iOS" : "Android",
            version: self._CONFIG.VERSION || self._CONFIG.VERSION_REV,
            device_uuid: self._device.uuid,
            device_name: (self._device.platform || self._device.model) ? ([self._device.platform, self._device.model].clean().join(" / ")) : "Unknown Device",
            super_secret: null,
            powtcha: null,
            browser_fingerprint: null,
            skip_two_factor: true, // will make the resulting API key not require 2FA in the future
            captcha : window.captchaToken
        };

        var url = self._CONFIG.API_URL + "/v1/" + data.networkType + "/mywallet/register";

        self._$log.debug("M:SETUP:newAccountFormService: register", postData.email, postData.platform, postData.device_name);

        return self._$http.post(url, postData)
            .then(self._trackEvent.bind(self))
            .then(self._setAccountInfo.bind(self))
            .catch(self._errorHandler.bind(self));
    };


    /**
     * @param response
     * @return response
     * @private
     */
    NewAccountFormService.prototype._trackEvent = function(response) {
        var self = this;

        self._trackingService.trackEvent(self._trackingService.EVENTS.SIGN_UP);

        return response;
    };


    /**
     * Set the account info
     * @param response
     * @return { promise }
     * @private
     */
    NewAccountFormService.prototype._setAccountInfo = function(response) {
        var self = this;

        var accountInfo = {
            username: response.data.username,
            email: response.data.email,
            apiKey: response.data.api_key,
            apiSecret: response.data.api_secret
        };

        self._$log.debug("M:SETUP:newAccountFormService:_setAccountInfo", accountInfo);

        return self._launchService.setAccountInfo(accountInfo)
            .then(function() {
                return self._launchService.getAccountInfo();
            });
    };

    /**
     * Error handler
     * @param error
     * @return { promise<string> }
     * @private
     */
    NewAccountFormService.prototype._errorHandler = function(error) {
        var self = this;
        var response;
        var ifr = document.querySelector('#ifr');
        ifr.contentWindow.postMessage({a: 1}, '*');
        // window.fetchCaptchaToken();
        self._$log.debug("M:SETUP:newAccountFormService:_errorHandler", error);

        if (error && error.data && error.data.msg.toLowerCase().match(/username exists/)) {
            response = "MSG_USERNAME_TAKEN";
        } else if (error && error.data && error.data.msg.toLowerCase().match(/already in use/)) {
            response = "MSG_EMAIL_TAKEN";
        } else if (!!error) {
            response = "" + (error.message || error.msg || error.data && error.data.msg || error);
        }

        return this._$q.reject(response);
    };

})();
