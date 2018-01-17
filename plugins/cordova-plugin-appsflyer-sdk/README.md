<img src="https://www.appsflyer.com/wp-content/uploads/2016/11/logo-1.svg"  width="200">

# Cordova AppsFlyer plugin for Android and iOS. 

[![npm version](https://badge.fury.io/js/cordova-plugin-appsflyer-sdk.svg)](https://badge.fury.io/js/cordova-plugin-appsflyer-sdk) [![Build Status](https://travis-ci.org/AppsFlyerSDK/cordova-plugin-appsflyer-sdk.svg?branch=master)](https://travis-ci.org/AppsFlyerSDK/cordova-plugin-appsflyer-sdk)

----------
**Important!** <br>
Cordova AppsFlyer plugin version **4.4.0** and higher are meant to be used with **cordova-android@7.0.0**
<br>For lower versions of cordova-android please use plugin version 4.3.0 available @ https://github.com/AppsFlyerSDK/cordova-plugin-appsflyer-sdk/tree/releases/4.x.x/4.3.x/4.3.0_cordova_android_6

----------
In order for us to provide optimal support, we would kindly ask you to submit any issues to support@appsflyer.com

*When submitting an issue please specify your AppsFlyer sign-up (account) email , your app ID , production steps, logs, code snippets and any additional relevant information.*

----------

## Table of content

- [Supported Platforms](#supported-platforms)
- [SDK versions](#plugin-build-for)
- [Installation using CLI](#installation-using-cli)
- [Manual installation](#manual-installation)
  - [iOS](#manual-installation-ios)
  - [Android](#manual-installation-android)
- [Usage](#usage)
 - [for pure Cordova](#usage-pure) 
 - [For Ionic](#usage-ionic1)
- [API Methods](#api-methods) 
 - [initSdk](#initSdk) 
 - [trackEvent](#trackEvent)
 - [deviceTrackingDisabled](#deviceTrackingDisabled)
 - [setCurrencyCode](#setCurrencyCode)
 - [setAppUserId](#setAppUserId)
 - [enableUninstallTracking](#enableUninstallTracking)
 - [setGCMProjectID](#setGCMProjectID)
 - [updateServerUninstallToken](#updateServerUninstallToken)
 - [getAppsFlyerUID](#getAppsFlyerUID)
 - [setAppInviteOneLinkID](#setAppInviteOneLinkID)
 - [generateInviteLink](#generateInviteLink)
 - [trackCrossPromotionImpression](#trackCrossPromotionImpression)
 - [trackAndOpenStore](#trackAndOpenStore)
- [Deep linking Tracking](#deep-linking-tracking) 
 - [Android](#dl-android)
 - [iOS URL Types](#dl-ios)
 - [iOS Universal Links](#dl-ul)
- [Sample App](#sample-app)  

## <a id="supported-platforms"> Supported Platforms

- Android
- iOS 8+



### <a id="plugin-build-for"> This plugin is built for

- iOS AppsFlyerSDK **v4.8.1**
- Android AppsFlyerSDK **v4.8.3**


## <a id="installation-using-cli"> Installation using CLI:

```
$ cordova plugin add cordova-plugin-appsflyer-sdk
```
or directly from git:

```
$ cordova plugin add https://github.com/AppsFlyerSDK/cordova-plugin-appsflyer-sdk.git
```

## <a id="manual-installation"> Manual installation:

1\. Add the following xml to your `config.xml` in the root directory of your `www` folder:
```xml
<!-- for iOS -->
<feature name="AppsFlyerPlugin">
  <param name="ios-package" value="AppsFlyerPlugin" />
</feature>
```
```xml
<!-- for Android -->
<feature name="AppsFlyerPlugin">
  <param name="android-package" value="com.appsflyer.cordova.plugin.AppsFlyerPlugin" />
</feature>
```
2\. For Android, add the following xml to your `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```
Inside the `<aplication>` tag,  add the following receiver:
```xml
<receiver android:exported="true"    android:name="com.appsflyer.MultipleInstallBroadcastReceiver">
    <intent-filter>
        <action android:name="com.android.vending.INSTALL_REFERRER" />
    </intent-filter>
</receiver>
```
        
3\. Copy appsflyer.js to `www/js/plugins` and reference it in `index.html`:
```html
<script type="text/javascript" src="js/plugins/appsflyer.js"></script>
```
4\. Download the source files and copy them to your project.

##### <a id="manual-installation-ios"> **iOS:** 
Copy:

 - `AppsFlyerPlugin.h`
 - `AppsFlyerPlugin.m`
 - `AppsFlyerTracker.h`
 - `libAppsFlyerLib.a`
to `platforms/ios/<ProjectName>/Plugins`

##### <a id="manual-installation-android"> **Android:** 

Copy `AppsFlyerPlugin.java` to `platforms/android/src/com/appsflyer/cordova/plugins` (create the folders)

   
## <a id="usage"> Usage:

#### 1\. Set your App_ID (iOS only), Dev_Key and enable AppsFlyer to detect installations, sessions (app opens) and updates.  
> This is the minimum requirement to start tracking your app installs and is already implemented in this plugin. You **MUST** modify this call and provide:  
 **-devKey** - Your application devKey provided by AppsFlyer.
**-appId**  - ***For iOS only.*** Your iTunes Application ID.



Add the following lines to your code to be able to initialize tracking with your own AppsFlyer dev key:

##### <a id="usage-pure"> **for pure Cordova:**
```javascript
document.addEventListener("deviceready", function(){
    
   var options = {
             devKey:  'xxXXXXXxXxXXXXxXXxxxx8'// your AppsFlyer devKey               
           };

    var userAgent = window.navigator.userAgent.toLowerCase();
                          
    if (/iphone|ipad|ipod/.test( userAgent )) {
        options.appId = "123456789";            // your ios app id in app store        
    }
    window.plugins.appsFlyer.initSdk(options);
}, false);
```

##### <a id="usage-ionic1"> **For Ionic 1**

```javascript
  $ionicPlatform.ready(function() {      
    
    var options = {
           devKey:  'xxXXXXXxXxXXXXxXXxxxx8'// your AppsFlyer devKey               
         };
                              
    if (ionic.Platform.isIOS()) {
        options.appId = "123456789";            // your ios app id in app store 
    }

      window.plugins.appsFlyer.initSdk(options);      
  });
```


##<a id="api-methods"> API Methods

---

##### <a id="initSdk"> **`initSdk(options, onSuccess, onError): void`**

initialize the SDK.

| parameter   | type                        | description  |
| ----------- |-----------------------------|--------------|
| `options`   | `Object`                    |   SDK configuration           |
| `onSuccess` | `(message: string)=>void` | Success callback - called after successfull SDK initialization. (optional)|
| `onError`   | `(message: string)=>void` | Error callback - called when error occurs during initialization. (optional)|

**`options`**

| name       | type    | default | description            |
| -----------|---------|---------|------------------------|
| `devKey`   |`string` |         |   [Appsflyer Dev key](https://support.appsflyer.com/hc/en-us/articles/207032126-AppsFlyer-SDK-Integration-Android)    |
| `appId`    |`string` |        | [Apple Application ID](https://support.appsflyer.com/hc/en-us/articles/207032066-AppsFlyer-SDK-Integration-iOS) (for iOS only) |
| `isDebug`  |`boolean`| `false` | debug mode (optional)|
| `onInstallConversionDataListener`  |`boolean`| `false` | Accessing AppsFlyer Attribution / Conversion Data from the SDK (Deferred Deeplinking). Read more: [Android](http://support.appsflyer.com/entries/69796693-Accessing-AppsFlyer-Attribution-Conversion-Data-from-the-SDK-Deferred-Deep-linking-), [iOS](http://support.appsflyer.com/entries/22904293-Testing-AppsFlyer-iOS-SDK-Integration-Before-Submitting-to-the-App-Store-). AppsFlyer plugin will return attribution data in `onSuccess` callback. 

*Example:*

```javascript
var onSuccess = function(result) {
     //handle result
};

function onError(err) {
    // handle error
}
var options = {
               devKey:  'd3Ac9qPardVYZxfWmCspwL',
               appId: '123456789',
               isDebug: false,
               onInstallConversionDataListener: true
             };
window.plugins.appsFlyer.initSdk(options, onSuccess, onError);
```

---

##### <a id="trackEvent"> **`trackEvent(eventName, eventValues): void`** (optional)


- These in-app events help you track how loyal users discover your app, and attribute them to specific 
campaigns/media-sources. Please take the time define the event/s you want to measure to allow you 
to track ROI (Return on Investment) and LTV (Lifetime Value).
- The `trackEvent` method allows you to send in-app events to AppsFlyer analytics. This method allows you to add events dynamically by adding them directly to the application code.


| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `eventName` | `String`                    | custom event name, is presented in your dashboard.  See the Event list [HERE](https://github.com/AppsFlyerSDK/cordova-plugin-appsflyer-sdk/blob/master/src/ios/AppsFlyerTracker.h)  |
| `eventValue` | `Object`                    | event details |

*Example:*

```javascript
var eventName = "af_add_to_cart";
var eventValues = {
           "af_content_id": "id123",
           "af_currency":"USD",
           "af_revenue": "2"
           };
window.plugins.appsFlyer.trackEvent(eventName, eventValues);
```
---

##### <a id="deviceTrackingDisabled"> **`deviceTrackingDisabled(bool): void`**
**End User Opt-Out (Optional)** 
AppsFlyer provides you a method to opt‐out specific users from AppsFlyer analytics. This method complies with the latest privacy requirements and complies with Facebook data and privacy policies. Default is FALSE, meaning tracking is enabled by default.

*Examples:*

```javascript
window.plugins.appsFlyer.setDeviceTrackingDisabled(true);
```
---

##### <a id="setCurrencyCode"> **`setCurrencyCode(currencyId): void`**


| parameter   | type                  | Default     | description |
| ----------- |-----------------------|-------------|-------------|
| `currencyId`| `String`              |   `USD`     |  [ISO 4217 Currency Codes](http://www.xe.com/iso4217.php)           |

*Examples:*

```javascript
window.plugins.appsFlyer.setCurrencyCode("USD");
window.plugins.appsFlyer.setCurrencyCode("GBP"); // British Pound
```

---

##### <a id="setAppUserId"> **`setAppUserId(customerUserId): void`**


Setting your own Custom ID enables you to cross-reference your own unique ID with AppsFlyer’s user ID and the other devices’ IDs. This ID is available in AppsFlyer CSV reports along with postbacks APIs for cross-referencing with you internal IDs.
 
**Note:** The ID must be set during the first launch of the app at the SDK initialization. The best practice is to call this API during the `deviceready` event, where possible.


| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `customerUserId`   | `String`                      | |

*Example:*

```javascript
window.plugins.appsFlyer.setAppUserId(userId);
```
---




##### <a id="enableUninstallTracking"> **`enableUninstallTracking(token, onSuccess, onError): void`** 

Enables app uninstall tracking.
<a href="https://support.appsflyer.com/hc/en-us/articles/211211963-iOS-Uninstall-Tracking">More Information</a>

| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `FCM/GCM ProjectNumber`   | `String`    | GCM/FCM ProjectNumber |
| `onSuccess` | `(message: string)=>void` | Success callback - called after successfull register uninstall. (optional)|
| `onError`   | `(message: string)=>void` | Error callback - called when error occurs during register uninstall. (optional)|


---

##### <a id="setGCMProjectID"> **`setGCMProjectID(GCMProjectNumber): void`** *Deprecated*

AppsFlyer requires a Google Project Number to enable uninstall tracking.
<a href="https://support.appsflyer.com/hc/en-us/articles/208004986-Android-Uninstall-Tracking">More Information</a>


| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `GCMProjectNumber`   | `String`           | GCM ProjectNumber |


---

##### <a id="updateServerUninstallToken"> **`updateServerUninstallToken("token"): void`** 

Allows to pass GCM/FCM Tokens that where collected by third party plugins to the AppsFlyer server.
Can be used for Uninstall Tracking.


| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `token`   | `String`                      | GCM/FCM Token|


---

##### <a id="getAppsFlyerUID"> **`getAppsFlyerUID(successCB): void`**  (Advanced)

Get AppsFlyer’s proprietary Device ID. The AppsFlyer Device ID is the main ID used by AppsFlyer in Reports and APIs.

```javascript
function getUserIdCallbackFn(id){/* ... */} 
window.plugins.appsFlyer.getAppsFlyerUID(getUserIdCallbackFn);
```
*Example:*

```javascript
var getUserIdCallbackFn = function(id) {
    alert('received id is: ' + id);
}
window.plugins.appsFlyer.getAppsFlyerUID(getUserIdCallbackFn);
```

| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `getUserIdCallbackFn` | `() => void`                | Success callback |


---

##### <a id="setAppInviteOneLinkID"> **`setAppInviteOneLinkID(OneLinkID): void`**  (User Invite / Cross Promotion)

Set AppsFlyer’s OneLink ID. Setting a valid OneLink ID will result in shortened User Invite links, when one is generated. The OneLink ID can be obtained on the AppsFlyer Dashboard.

*Example:*
```javascript
window.plugins.appsFlyer.setAppInviteOneLinkID("Ab1C");
```

| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `OneLinkID` | `String`                    | OneLink ID |


---

##### <a id="generateInviteLink"> **`generateInviteLink(options, onSuccess, onError): void`**  (User Invite)

Allowing your existing users to invite their friends and contacts as new users to your app can be a key growth factor for your app. AppsFlyer allows you to track and attribute new installs originating from user invites within your app.

*Example:*
```javascript
var inviteOptions {
  channel: "gmail",
  campaign: "myCampaign",
  customerID: "1234",
  
  userParams {
    myParam : "newUser",
    anotherParam : "fromWeb",
    amount : 1
  }
};

var onInviteLinkSuccess = function(link) {
  console.log(link); // Handle Generated Link Here
}

function onInviteLinkError(err) {
  console.log(err);
}

window.plugins.appsFlyer.generateInviteLink(inviteOptions, onInviteLinkSuccess, onInviteLinkError);
```

| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `inviteOptions` | `Object`                    |Parameters for Invite link  |
| `onInviteLinkSuccess` | `() => void`                | Success callback (generated link) |
| `onInviteLinkError` | `() => void`                | Error callback |

A complete list of supported parameters is available <a href="https://support.appsflyer.com/hc/en-us/articles/115004480866-User-Invite-Tracking">here</a>.
Custom parameters can be passed using a `userParams{}` nested object, as in the example above.

---

##### <a id="trackCrossPromotionImpression"> **`trackCrossPromotionImpression("appID", "campaign"): void`**  (Cross Promotion)

Use this call to track an impression use the following API call. Make sure to use the promoted App ID as it appears within the AppsFlyer dashboard.

*Example:*
```javascript
window.plugins.appsFlyer.trackCrossPromotionImpression("com.myandroid.app", "myCampaign");
```

| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `appID` | `String`                    | Promoted Application ID |
| `campaign` | `String`                    | Promoted Campaign |

For more details about Cross-Promotion tracking please see <a href="https://support.appsflyer.com/hc/en-us/articles/115004481946-Cross-Promotion-Tracking">here</a>.

---

##### <a id="trackAndOpenStore"> **`trackAndOpenStore("appID","campaign", options): void`**  (Cross Promotion)

Use this call to track the click and launch the app store's app page (via Browser)

*Example:*
```javascript
var crossPromOptions {
  customerID: "1234",
  myCustomParameter: "newUser"
};

window.plugins.appsFlyer.trackAndOpenStore("com.myandroid.app", "myCampaign", crossPromOptions);
```

| parameter   | type                        | description |
| ----------- |-----------------------------|--------------|
| `appID` | `String`                    | Promoted Application ID |
| `campaign` | `String`                    | Promoted Campaign |
| `options` | `Object`                    | Additional Parameters to track |

For more details about Cross-Promotion tracking please see <a href="https://support.appsflyer.com/hc/en-us/articles/115004481946-Cross-Promotion-Tracking">here</a>.

---

### <a id="deep-linking-tracking"> Deep linking Tracking

#### <a id="dl-android"> Android
In ver. >4.2.5 deeplinking metadata (scheme/host) is sent automatically

#### <a id="dl-ios"> iOS URL Types
Add the following lines to your code to be able to track deeplinks with AppsFlyer attribution data:

for pure Cordova - add a function 'handleOpenUrl' to your root, and call our SDK as shown:
```javascript
    window.plugins.appsFlyer.handleOpenUrl(url);
```
It appears as follows:

```javascript
var handleOpenURL = function(url) {
    window.plugins.appsFlyer.handleOpenUrl(url);
}
```
#### <a id='dl-ul'>Universal Links in iOS
To enable Universal Links in iOS please follow the guide <a href="https://support.appsflyer.com/hc/en-us/articles/207032266-Setting-Deeplinking-on-iOS9-using-iOS-Universal-Links">here</a>.

##### **Note**: Our plugin utilizes the

 ` - (BOOL)application:(UIApplication *)application 
 continueUserActivity:(NSUserActivity *)userActivity
 restorationHandler:(void (^)(NSArray * _Nullable))restorationHandler; ` 

##### method for Universal Links support. 

##### ***If additional instances of the method exist in your code - merge all calls into one***

##### (Available on cordova-plugin-appsflyer-sdk 4.2.24 and higher )

---

## Demo

This plugin has a `examples` folder with `demoA` (Angular 1)  and `demoC` (Cordova) projects bundled with it. To give it a try , clone this repo and from root a.e. `cordova-plugin-appsflyer-sdk` execute the following:

For Cordova:
```sh
npm run setup_c 
```
-  `npm run demo_c.ra` - runs Android
-  `npm run demo_c.ba` - builds Android
-  `npm run demo_c.ri` - runs iOS
-  `npm run demo_c.bi` - builds iOS


For Angular:
```sh
npm run setup_a
```
-  `npm run demo_a.ra` - runs Android
-  `npm run demo_a.ba` - builds Android
-  `npm run demo_a.ri` - runs iOS
-  `npm run demo_a.bi` - builds iOS



![demo printscreen](examples/demo_example.png?raw=true)