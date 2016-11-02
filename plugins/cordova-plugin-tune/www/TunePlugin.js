var exec = require("cordova/exec");

var TunePlugin = function() {}

TunePlugin.prototype.init = function(tuneAdvertiserId, tuneConversionKey, tunePackageName, tuneIsWearable) {
    console.log("TunePlugin.js: Calling init");
    exec(null, null, "TunePlugin", "init", [tuneAdvertiserId, tuneConversionKey, tunePackageName, tuneIsWearable]);
    return this;
};

// Measure calls
TunePlugin.prototype.checkForDeferredDeeplink = function(success, failure) {
    console.log("TunePlugin.js: Calling checkForDeferredDeeplink");
    exec(success, failure, "TunePlugin", "checkForDeferredDeeplink", []);
    return this;
};

TunePlugin.prototype.automateIapEventMeasurement = function(automate) {
    console.log("TunePlugin.js: Calling automateIapEventMeasurement");
    exec(null, null, "TunePlugin", "automateIapEventMeasurement", [automate]);
    return this;
};

TunePlugin.prototype.getMatId = function(success, failure) {
    console.log("TunePlugin.js: Calling getMatId");
    console.log("TunePlugin.js: getMatId() is deprecated. Please use getTuneId() instead.");
    TunePlugin.prototype.getTuneId(success, failure);
};

TunePlugin.prototype.getTuneId = function(success, failure) {
    console.log("TunePlugin.js: Calling getTuneId");
    exec(success, failure, "TunePlugin", "getTuneId", []);
};

TunePlugin.prototype.getOpenLogId = function(success, failure) {
    console.log("TunePlugin.js: Calling getOpenLogId");
    exec(success, failure, "TunePlugin", "getOpenLogId", []);
};

TunePlugin.prototype.getIsPayingUser = function(success, failure) {
    console.log("TunePlugin.js: Calling getIsPayingUser");
    exec(success, failure, "TunePlugin", "getIsPayingUser", []);
};

TunePlugin.prototype.setAge = function(age) {
    console.log("TunePlugin.js: Calling setAge");
    exec(null, null, "TunePlugin", "setAge", [age]);
    return this;
};

TunePlugin.prototype.setAndroidId = function(enable) {
    console.log("TunePlugin.js: Calling setAndroidId");
    exec(null, null, "TunePlugin", "setAndroidId", [enable]);
    return this;
};

TunePlugin.prototype.setAndroidIdMd5 = function(enable) {
    console.log("TunePlugin.js: Calling setAndroidIdMd5");
    exec(null, null, "TunePlugin", "setAndroidIdMd5", [enable]);
    return this;
};

TunePlugin.prototype.setAndroidIdSha1 = function(enable) {
    console.log("TunePlugin.js: Calling setAndroidIdSha1");
    exec(null, null, "TunePlugin", "setAndroidIdSha1", [enable]);
    return this;
};

TunePlugin.prototype.setAndroidIdSha256 = function(enable) {
    console.log("TunePlugin.js: Calling setAndroidIdSha256");
    exec(null, null, "TunePlugin", "setAndroidIdSha256", [enable]);
    return this;
};

TunePlugin.prototype.setAppAdMeasurement = function(enable) {
    console.log("TunePlugin.js: Calling setAppAdMeasurement");
    exec(null, null, "TunePlugin", "setAppAdMeasurement", [enable]);
    return this;
};

TunePlugin.prototype.setCurrencyCode = function(currencyCode) {
    console.log("TunePlugin.js: Calling setCurrencyCode");
    exec(null, null, "TunePlugin", "setCurrencyCode", [currencyCode]);
    return this;
};

TunePlugin.prototype.setDebugMode = function(enable) {
    console.log("TunePlugin.js: Calling setDebugMode");
    exec(null, null, "TunePlugin", "setDebugMode", [enable]);
    return this;
};

TunePlugin.prototype.setDeepLink = function(deepLinkUrl) {
    console.log("TunePlugin.js: Calling setDeepLink");
    exec(null, null, "TunePlugin", "setDeepLink", [deepLinkUrl]);
    return this;
};

TunePlugin.prototype.setDelegate = function(enable, success, failure) {
    console.log("TunePlugin.js: Calling setDelegate");
    exec(success, failure, "TunePlugin", "setDelegate", [enable]);
    return this;
};

TunePlugin.prototype.setDeviceId = function(enable) {
    console.log("TunePlugin.js: Calling setDeviceId");
    exec(null, null, "TunePlugin", "setDeviceId", [enable]);
    return this;
};

TunePlugin.prototype.setEmailCollection = function(enable) {
    console.log("TunePlugin.js: Calling setEmailCollection");
    exec(null, null, "TunePlugin", "setEmailCollection", [enable]);
    return this;
};

TunePlugin.prototype.setExistingUser = function(existingUser) {
    console.log("TunePlugin.js: Calling setExistingUser");
    exec(null, null, "TunePlugin", "setExistingUser", [existingUser]);
    return this;
};

TunePlugin.prototype.setFacebookEventLogging = function(enable, limit) {
    console.log("TunePlugin.js: Calling setFacebookEventLogging");
    exec(null, null, "TunePlugin", "setFacebookEventLogging", [enable, limit]);
    return this;
};

TunePlugin.prototype.setFacebookUserId = function(facebookUserId) {
    console.log("TunePlugin.js: Calling setFacebookUserId");
    exec(null, null, "TunePlugin", "setFacebookUserId", [facebookUserId]);
    return this;
};

TunePlugin.prototype.setGender = function(gender) {
    console.log("TunePlugin.js: Calling setGender");
    exec(null, null, "TunePlugin", "setGender", [gender]);
    return this;
};

TunePlugin.prototype.setGoogleAdvertisingId = function(googleAid, isLAT) {
    console.log("TunePlugin.js: Calling setGoogleAdvertisingId");
    exec(null, null, "TunePlugin", "setGoogleAdvertisingId", [googleAid, isLAT]);
    return this;
};

TunePlugin.prototype.setGoogleUserId = function(googleUserId) {
    console.log("TunePlugin.js: Calling setGoogleUserId");
    exec(null, null, "TunePlugin", "setGoogleUserId", [googleUserId]);
    return this;
};

TunePlugin.prototype.setLocation = function(latitude, longitude) {
    console.log("TunePlugin.js: Calling setLocation");
    exec(null, null, "TunePlugin", "setLocation", [latitude, longitude]);
    return this;
};

TunePlugin.prototype.setLocationWithAltitude = function(latitude, longitude, altitude) {
    console.log("TunePlugin.js: Calling setLocationWithAltitude");
    exec(null, null, "TunePlugin", "setLocationWithAltitude", [latitude, longitude, altitude]);
    return this;
};

TunePlugin.prototype.setPackageName = function(packageName) {
    console.log("TunePlugin.js: Calling setPackageName");
    exec(null, null, "TunePlugin", "setPackageName", [packageName]);
    return this;
};

TunePlugin.prototype.setPayingUser = function(payingUser) {
    console.log("TunePlugin.js: Calling setPayingUser");
    exec(null, null, "TunePlugin", "setPayingUser", [payingUser]);
    return this;
};

TunePlugin.prototype.setPreloadData = function(preloadData) {
    console.log("TunePlugin.js: Calling setPreloadData");
    exec(null, null, "TunePlugin", "setPreloadData", [preloadData]);
    return this;
};

TunePlugin.prototype.setTRUSTeId = function(trusteID) {
    console.log("TunePlugin.js: Calling setTRUSTeId");
    exec(null, null, "TunePlugin", "setTRUSTeId", [trusteID]);
    return this;
};

TunePlugin.prototype.setTwitterUserId = function(twitterUserId) {
    console.log("TunePlugin.js: Calling setTwitterUserId");
    exec(null, null, "TunePlugin", "setTwitterUserId", [twitterUserId]);
    return this;
};

TunePlugin.prototype.setUserEmail = function(userEmail) {
    console.log("TunePlugin.js: Calling setUserEmail");
    exec(null, null, "TunePlugin", "setUserEmail", [userEmail]);
    return this;
};

TunePlugin.prototype.setUserId = function(userId) {
    console.log("TunePlugin.js: Calling setUserId");
    exec(null, null, "TunePlugin", "setUserId", [userId]);
    return this;
};

TunePlugin.prototype.setUserName = function(userName) {
    console.log("TunePlugin.js: Calling setUserName");
    exec(null, null, "TunePlugin", "setUserName", [userName]);
    return this;
};

TunePlugin.prototype.setUseCookieMeasurement = function(enable) {
    console.log("TunePlugin.js: Calling setUseCookieMeasurement");
    exec(null, null, "TunePlugin", "setUseCookieMeasurement", [enable]);
    return this;
};

TunePlugin.prototype.setShouldAutoCollectAppleAdvertisingIdentifier = function(autoCollect) {
    console.log("TunePlugin.js: Calling setShouldAutoCollectAppleAdvertisingIdentifier");
    exec(null, null, "TunePlugin", "setShouldAutoCollectAppleAdvertisingIdentifier", [autoCollect]);
    return this;
};

TunePlugin.prototype.setShouldAutoCollectDeviceLocation = function(autoCollect) {
    console.log("TunePlugin.js: Calling setShouldAutoCollectDeviceLocation");
    exec(null, null, "TunePlugin", "setShouldAutoCollectDeviceLocation", [autoCollect]);
    return this;
};

TunePlugin.prototype.setShouldAutoDetectJailbroken = function(autoDetect) {
    console.log("TunePlugin.js: Calling setShouldAutoDetectJailbroken");
    exec(null, null, "TunePlugin", "setShouldAutoDetectJailbroken", [autoDetect]);
    return this;
};

TunePlugin.prototype.setShouldAutoGenerateAppleVendorIdentifier = function(autoGenerate) {
    console.log("TunePlugin.js: Calling setShouldAutoGenerateAppleVendorIdentifier");
    exec(null, null, "TunePlugin", "setShouldAutoGenerateAppleVendorIdentifier", [autoGenerate]);
    return this;
};

TunePlugin.prototype.setJailbroken = function(enable) {
    console.log("TunePlugin.js: Calling setJailbroken");
    exec(null, null, "TunePlugin", "setJailbroken", [enable]);
    return this;
};

TunePlugin.prototype.setAppleAdvertisingIdentifier = function(appleAdvertisingId, adTrackingEnabled) {
    console.log("TunePlugin.js: Calling setAppleAdvertisingIdentifier");
    exec(null, null, "TunePlugin", "setAppleAdvertisingIdentifier", [appleAdvertisingId, adTrackingEnabled]);
    return this;
};

TunePlugin.prototype.setAppleVendorIdentifier = function(appleVendorId) {
    console.log("TunePlugin.js: Calling setAppleVendorIdentifier");
    exec(null, null, "TunePlugin", "setAppleVendorIdentifier", [appleVendorId]);
    return this;
};

TunePlugin.prototype.startAppToAppMeasurement = function(targetAppPackageName, targetAppAdvertiserId, targetAdvertiserOfferId, targetAdvertiserPublisherId, shouldRedirect) {
    console.log("TunePlugin.js: Calling startAppToAppMeasurement");
    exec(null, null, "TunePlugin", "startAppToAppMeasurement", [targetAppPackageName, targetAppAdvertiserId, targetAdvertiserOfferId, targetAdvertiserPublisherId, shouldRedirect]);
    return this;
};

TunePlugin.prototype.setRedirectUrl = function(redirectUrl) {
    console.log("TunePlugin.js: Calling setRedirectUrl");
    exec(null, null, "TunePlugin", "setRedirectUrl", [redirectUrl]);
    return this;
};

TunePlugin.prototype.measureSession = function() {
    console.log("TunePlugin.js: calling measureSession");
    exec(null, null, "TunePlugin", "measureSession", []);
    return this;
};

TunePlugin.prototype.measureEvent = function(tuneEvent) {
    if (typeof tuneEvent == 'number') {
        console.log("TunePlugin.js: Calling measureEventId");
        exec(null, null, "TunePlugin", "measureEventId", [tuneEvent]);
    } else if (typeof tuneEvent == 'string') {
        console.log("TunePlugin.js: Calling measureEventName");
        exec(null, null, "TunePlugin", "measureEventName", [tuneEvent]);
    } else if (typeof tuneEvent == 'object') {
        console.log("TunePlugin.js: Calling measureEvent");
        exec(null, null, "TunePlugin", "measureEvent", [tuneEvent]);
    }
    return this;
};

module.exports = new TunePlugin();
