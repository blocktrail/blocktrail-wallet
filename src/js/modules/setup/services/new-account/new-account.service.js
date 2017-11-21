(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .factory("newAccountFormService", function($http, $q, _, cryptoJS, device, CONFIG, launchService, settingsService, trackingService) {
                return new NewAccountFormService($http, $q, _, cryptoJS, device, CONFIG, launchService, settingsService, trackingService);
            }
        );

    function NewAccountFormService($http, $q, _, cryptoJS, device, CONFIG, launchService, settingsService, trackingService) {
        var self = this;

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
            super_secret: self._CONFIG.SUPER_SECRET || null,
            powtcha: null,
            browser_fingerprint: null,
            skip_two_factor: true // will make the resulting API key not require 2FA in the future
        };

        var url = self._CONFIG.API_URL + "/v1/" + data.networkType + "/mywallet/register";

        return self._$http.post(url, postData)
            .then(self._trackEvent.bind(self))
            .then(self._storeAccountInfo.bind(self))
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
     * Store the account info
     * @param response
     * @return { promise }
     * @private
     */
    NewAccountFormService.prototype._storeAccountInfo = function(response) {
        var self = this;

        var accountInfo = self._lodash.merge({}, response.data);

        return self._launchService.storeAccountInfo(accountInfo)
            .then(function() {
                // save the default settings and do a profile sync
                self._settingsService.username = "";
                self._settingsService.displayName = "";
                self._settingsService.enableContacts = false;
                self._settingsService.email = response.data.email;
            })
            .then(function() {
                return response.data;
            });
    };

    /**
     * Error handler
     * @param response
     * @private
     */
    NewAccountFormService.prototype._errorHandler = function(response) {
        var error;

        if (response && response.data && response.data.msg.toLowerCase().match(/username exists/)) {
            error = "MSG_USERNAME_TAKEN";
        } else if (response && response.data && response.data.msg.toLowerCase().match(/already in use/)) {
            error = "MSG_EMAIL_TAKEN";
        } else if (!!response) {
            error = "" + (response.message || response.msg || response);
        }

        return this._$q.reject(error);
    };
})();
