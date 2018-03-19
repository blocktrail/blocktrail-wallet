(function () {
    "use strict";

    angular.module("blocktrail.core")
        .factory("pushNotificationService", function($rootScope, $window, modalService, $q, sdkService) {
            return new PushNotificationService($rootScope, $window, modalService, $q, sdkService);
        });

    function PushNotificationService($rootScope, $window, modalService, $q, sdkService) {
        var self = this;

        self._rootScope = $rootScope;
        self._window = $window;
        self._modalService = modalService;
        self._q = $q;
        self._sdkService = sdkService;
    }

    /**
     * Fetches new or current push notification token
     */
    PushNotificationService.prototype.enablePushNotifications = function () {
        var self = this;

        console.log('Enabling push notifications');
        // Handle showing notifications
        self._window.FirebasePlugin.onNotificationOpen(function(notification) {
            // If not topic and no body is provided, these are the fields that are set
            // {
            // collapse_key:"com.blocktrail.mywallet"
            // from:"/topics/general"
            // google.message_id:"0:12345678901234%123456789beefbeef"
            // google.sent_time:1500000000000
            // google.ttl:2419200
            // tap:true
            // }
            console.debug(notification);

            // If topic or body is set, display message
            if (notification.topic || notification.body) {
                var params = {
                    title: notification.topic ? notification.topic : '',
                    // titleClass: '',
                    body: notification.body ? notification.body : '',
                    // bodyClass: '',
                    button: notification.continue ? notification.continue : 'Ok, thanks'
                };

                self._modalService.message(params);
            }
        }, function(error) {
            console.error(error);
        });
    };

    /**
     * Check for permissions to receive/display push notifications
     */
    PushNotificationService.prototype.checkPermissions = function() {
        var self = this;

        var deferred = self._q.defer();

        //Check if permissions exist
        self._window.FirebasePlugin.hasPermission(function(data) {
            // If no permissions so far
            if (data && !data.isEnabled) {
                // // Request permission if on iOS
                if (self._rootScope.isIOS) {
                    self._window.FirebasePlugin.grantPermission();
                }
            }
            deferred.resolve(true);
        }, function (error) {
            console.error("Unable to retrieve Push Notification permissions." , error);
            deferred.resolve(false);
        });

        return deferred.promise;
    };

    /**
     * Fetches new or current push notification token
     */
    PushNotificationService.prototype.getToken = function () {
        var self = this;

        self._window.FirebasePlugin.getToken(function(token) {
            console.debug('Push notification token: ' + token);
            // Submit token
            self._sdkService.syncFirebaseToken({
                device_id: device.uuid,
                label: navigator.userAgent,
                platform: device.platform,
                firebase_token: token
            });

        }, function(error) {
            console.error(error);
        });
    };

    /**
     * Enable refresh of push notification token when it happens
     */
    PushNotificationService.prototype.enableTokenRefresh = function () {
        var self = this;

        // Register for token changes
        self._window.FirebasePlugin.onTokenRefresh(function(token) {
            console.debug('New notification token: ' + token);
            // Submit token
            self._sdkService.syncFirebaseToken({
                device_id: device.uuid,
                label: navigator.userAgent,
                platform: device.platform,
                firebase_token: token
            });
        }, function(error) {
            console.error(error);
        });
    };

    /**
     * Subscribe to push notification channel
     */
    PushNotificationService.prototype.subscribe = function (channelName) {
        var self = this;

        // Register for token channel
        self._window.FirebasePlugin.subscribe(channelName);
        console.debug('Subscribed to push notify channel ' + channelName);
    };

    /**
     * Unsubscribe from push notification channel
     */
    PushNotificationService.prototype.unsubscribe = function (channelName) {
        var self = this;

        // Register for token channel
        self._window.FirebasePlugin.unsubscribe(channelName);
        console.debug('Unsubscribed to push notify channel ' + channelName);
    };
})();



