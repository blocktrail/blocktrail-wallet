cordova.define("cordova-plugin-appsflyer-sdk.appsflyer", function(require, exports, module) {
    var exec = require('cordova/exec'),
        argscheck = require('cordova/argscheck'),
        AppsFlyerError = require('./AppsFlyerError');
    
     var callbackMap = {};

    if (!window.CustomEvent) {
        window.CustomEvent = function (type, config) {
            var e = document.createEvent("CustomEvent");
            e.initCustomEvent(type, true, true, config.detail);
            return e;
        };
    }
               
    (function (global) {
        var AppsFlyer = function () {};

        AppsFlyer.prototype.initSdk = function (args, successCB, errorCB) {
            argscheck.checkArgs('O', 'AppsFlyer.initSdk', arguments);
            if (!args) {
                if (errorCB) {
                    errorCB(AppsFlyerError.INVALID_ARGUMENT_ERROR);                
                }
            } else {
                if(args.appId !== undefined && typeof args.appId != 'string'){
                    if (errorCB) {
                      errorCB(AppsFlyerError.APPID_NOT_VALID);
                   }
                 }
                 exec(successCB, errorCB, "AppsFlyerPlugin", "initSdk", [args]);
     

                document.addEventListener("resume", this.onResume.bind(this), false);

                callbackMap = {
                    suc: successCB,
                    err: errorCB
                };

            }
        };
     
        AppsFlyer.prototype.onResume = function() {
            exec(callbackMap.suc, callbackMap.err, "AppsFlyerPlugin", "resumeSDK", []);
        };


        AppsFlyer.prototype.setCurrencyCode = function (currencyId) {
            argscheck.checkArgs('S', 'AppsFlyer.setCurrencyCode', arguments);
            exec(null, null, "AppsFlyerPlugin", "setCurrencyCode", [currencyId]);
        };

        AppsFlyer.prototype.setAppUserId = function (customerUserId) {
             argscheck.checkArgs('S', 'AppsFlyer.setAppUserId', arguments);
            exec(null, null, "AppsFlyerPlugin", "setAppUserId", [customerUserId]);
        };
        AppsFlyer.prototype.setGCMProjectNumber = function (gcmProjectNumber) {
            argscheck.checkArgs('S', 'AppsFlyer.setGCMProjectNumber', arguments);
            exec(null, null, "AppsFlyerPlugin", "setGCMProjectNumber", [gcmProjectNumber]);
        };

        AppsFlyer.prototype.getAppsFlyerUID = function (successCB) {
            argscheck.checkArgs('F', 'AppsFlyer.getAppsFlyerUID', arguments);
            exec(function (result) {
                successCB(result);
            }, null,
                    "AppsFlyerPlugin",
                    "getAppsFlyerUID",
                    []);
        };

        AppsFlyer.prototype.setDeviceTrackingDisabled = function (isDisabled) {
            argscheck.checkArgs('*', 'AppsFlyer.setDeviceTrackingDisabled', arguments);
            exec(null,null,"AppsFlyerPlugin","setDeviceTrackingDisabled", [isDisabled]);
        };

        AppsFlyer.prototype.trackEvent = function (eventName, eventValue) {
            argscheck.checkArgs('SO', 'AppsFlyer.trackEvent', arguments);
            exec(null, null, "AppsFlyerPlugin", "trackEvent", [eventName, eventValue]);
        };

        AppsFlyer.prototype.enableUninstallTracking = function (gcmProjectNumber,successCB, errorCB) {
            argscheck.checkArgs('S', 'AppsFlyer.enableUninstallTracking', arguments);
            exec(successCB, errorCB, "AppsFlyerPlugin", "enableUninstallTracking", [gcmProjectNumber]);
        };

        AppsFlyer.prototype.updateServerUninstallToken = function (token) {
            argscheck.checkArgs('S', 'AppsFlyer.updateServerUninstallToken', arguments);
            exec(null, null, "AppsFlyerPlugin", "updateServerUninstallToken", [token]);
        };

         // USER INVITE TRACKING
         AppsFlyer.prototype.setAppInviteOneLinkID = function (args) {
             argscheck.checkArgs('S', 'AppsFlyer.setAppInviteOneLinkID', arguments);
             exec(null, null, "AppsFlyerPlugin", "setAppInviteOneLinkID", [args]);
         };
     
         AppsFlyer.prototype.generateInviteLink = function (args, successCB, errorCB) {
         argscheck.checkArgs('O', 'AppsFlyer.generateInviteLink', arguments);
         exec(successCB, errorCB, "AppsFlyerPlugin", "generateInviteLink", [args]);
         };
     
         //CROSS PROMOTION
         AppsFlyer.prototype.trackCrossPromotionImpression = function (appId, campaign) {
         argscheck.checkArgs('*', "AppsFlyer.trackCrossPromotionImpression", arguments);
         exec(null, null ,"AppsFlyerPlugin","trackCrossPromotionImpression", [appId, campaign]);
         };
     
         AppsFlyer.prototype.trackAndOpenStore = function (appId, campaign, params) {
         argscheck.checkArgs('*', "AppsFlyer.trackAndOpenStore", arguments);
         exec(null, null ,"AppsFlyerPlugin","trackAndOpenStore", [appId, campaign, params]);
         };


        AppsFlyer.prototype.handleOpenUrl = function (url) {
            argscheck.checkArgs('*', 'AppsFlyer.handleOpenUrl', arguments);
            exec(null, null, "AppsFlyerPlugin", "handleOpenUrl", [url]);
        };

        global.cordova.addConstructor(function () {
            if (!global.Cordova) {
                global.Cordova = global.cordova;
            }

            if (!global.plugins) {
                global.plugins = {};
            }

            global.plugins.appsFlyer = new AppsFlyer();
        });
    } (window));
});
