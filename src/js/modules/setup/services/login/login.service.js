(function () {
    "use strict";

    angular.module('blocktrail.setup')
        .factory('loginFormService', function($http, $q, _, cryptoJS, device, CONFIG, launchService, settingsService, trackingService) {

            return new LoginFormService($http, $q, _, cryptoJS, device, CONFIG, launchService, settingsService, trackingService);
        }
    );

    /**
     * TODO here
     * @constructor
     */
    function LoginFormService($http, $q, _, cryptoJS, device, CONFIG, launchService, settingsService, trackingService) {
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
     * Login
     * @param data
     * @return { promise }
     */
    LoginFormService.prototype.login = function(data) {
        var self = this;

        var postData = {
            login: data.login,
            password: self._cryptoJS.SHA512(data.password).toString(),
            platform: ionic.Platform.isIOS() ? "iOS" : "Android",
            version: self._CONFIG.VERSION || self._CONFIG.VERSION_REV,
            two_factor_token: data.twoFactorToken,
            device_uuid: self._device.uuid,
            device_name: (self._device.platform || self._device.model) ? ([self._device.platform, self._device.model].clean().join(" / ")) : 'Unknown Device',
            super_secret: self._CONFIG.SUPER_SECRET || null,
            browser_fingerprint: null,
            skip_two_factor: true // will make the resulting API key not require 2FA in the future
        };

        var url = self._CONFIG.API_URL + "/v1/" + data.networkType + "/mywallet/enable";

        return self._$q.when(postData)
            .then(function(postData) {
                return self._$http.post(url, postData)
                    .then(self._trackEvent.bind(self))
                    .then(self._decryptSecret.bind(self, data.password))
                    .then(self._storeAccountInfo.bind(self));
            })
            .catch(self._errorHandler.bind(self));
    };

    /**
     * @param response
     * @return response
     * @private
     */
    LoginFormService.prototype._trackEvent = function(response) {
        var self = this;

        self._trackingService.trackEvent(self._trackingService.EVENTS.LOGIN);

        return response;
    };

    /**
     * Decrypt the secret
     * @param password
     * @param response
     * @return {{responseData, secret: *}}
     * @private
     */
    LoginFormService.prototype._decryptSecret = function(password, response) {
        var self = this;
        var secret = null;

        if(response.data.encrypted_secret) {
            try {
                secret = self._cryptoJS.AES.decrypt(response.data.encrypted_secret, password).toString(self._cryptoJS.enc.Utf8);
            } catch (e) {
                secret = null;
            }

            // TODO: we should have a checksum
            if (!secret || secret.length !== 44) {
                secret = null;
            }
        }

        return {
            responseData: response.data,
            secret: secret
        };
    };


    /**
     * Store the account info
     * @param data
     * @return { promise }
     * @private
     */
    LoginFormService.prototype._storeAccountInfo = function(data) {
        var self = this;

        var accountInfo = self._lodash.merge({}, { secret: data.secret }, data.responseData);

        return self._launchService.storeAccountInfo(accountInfo)
            .then(function() {
                //save the default settings and do a profile sync
                self._settingsService.username = data.responseData.username;
                self._settingsService.displayName = data.responseData.username;
                self._settingsService.enableContacts = false;
                self._settingsService.accountCreated = data.responseData.timestamp_registered;
                self._settingsService.email = data.responseData.email;
            })
            .then(function() {
                return data.responseData;
            })
    };

    /**
     * Error handler
     * @param response
     * @private
     */
    LoginFormService.prototype._errorHandler = function(response) {
        var error = {
            type: "MSG_BAD_NETWORK",
            data: null
        };

        if (response.data) {
            var blocktrailSDKError = blocktrailSDK.Request.handleFailure(response.data);

            // TODO Do we have BANNED_IP on mobile
            if (blocktrailSDKError.is_banned) {
                error.type = "BANNED_IP";
                error.data = error.is_banned;
            } else if (blocktrailSDKError.requires_sha512) {
                error.type = "SHA_512";
            } else if (blocktrailSDKError instanceof blocktrailSDK.WalletMissing2FAError) {
                error.type = "2FA_MISSING";
            } else if (blocktrailSDKError instanceof blocktrailSDK.WalletInvalid2FAError
                || (blocktrailSDKError.message && blocktrailSDKError.message.match(/invalid two-factor/))) {
                error.type = "2FA_INVALID";
            } else {
                error.type = "MSG_BAD_LOGIN";
            }
        } else if(error) {
            error.type = "MSG_BAD_LOGIN_UNKNOWN";
            error.data = "" + (error.message || error.msg || error);

            if (error.data === ("" + {})) {
                error.data = null;
            }
        }

        return this._$q.reject(error);
    };
})();
