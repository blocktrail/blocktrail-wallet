//
//  Tune.h
//  Tune
//
//  Created by Tune on 03/20/14.
//  Copyright (c) 2013 Tune. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <AvailabilityMacros.h>

#import "TuneConstants.h"
#import "TuneEvent.h"
#import "TuneEventItem.h"
#import "TuneLocation.h"
#import "TunePreloadData.h"
#import "TunePushInfo.h"

#if TARGET_OS_IOS

#import "TuneInAppMessageExperimentDetails.h"
#import "TunePowerHookExperimentDetails.h"

#endif

#ifdef TUNE_USE_LOCATION
#import <CoreLocation/CoreLocation.h>
#import <CoreBluetooth/CoreBluetooth.h>
#endif

#define TUNEVERSION @"4.4.0"


@protocol TuneDelegate;
#ifdef TUNE_USE_LOCATION
@protocol TuneRegionDelegate;
#endif

/*!
 Tune provides the methods to send events and actions to the
 HasOffers servers.
 */
@interface Tune : NSObject


#pragma mark - Main Initializer

/** @name Intitializing Tune With Advertiser Information */
/*!
 Starts Tune with Tune Advertiser ID and Tune Conversion Key. Both values are required.
 @param aid the Tune Advertiser ID provided in Tune.
 @param key the Tune Conversion Key provided in Tune.
 */
+ (void)initializeWithTuneAdvertiserId:(NSString *)aid tuneConversionKey:(NSString *)key;

/** @name Initializing Tune With Advertiser Information */
/*!
 Starts Mobile App Tracker with MAT Advertiser ID and MAT Conversion Key. All values are required.
 @param aid the MAT Advertiser ID provided in Mobile App Tracking.
 @param key the MAT Conversion Key provided in Mobile App Tracking.
 @param name the package name used when setting up the app in Mobile App Tracking.
 @param wearable should be set to YES when being initialized in a WatchKit extension, defaults to NO.
 */
+ (void)initializeWithTuneAdvertiserId:(NSString *)aid tuneConversionKey:(NSString *)key tunePackageName:(NSString *)name wearable:(BOOL)wearable;

#if TARGET_OS_IOS
/** @name Initializing Tune With Advertiser Information and Additional Configuration */
/*!
 Starts Mobile App Tracker with MAT Advertiser ID, MAT Conversion Key, and additional configuration. All values are required.
 @param aid the MAT Advertiser ID provided in Mobile App Tracking.
 @param key the MAT Conversion Key provided in Mobile App Tracking.
 @param name the package name used when setting up the app in Mobile App Tracking.
 @param wearable should be set to YES when being initialized in a WatchKit extension, defaults to NO.
 @param configuration key-value pairs defining additional configuration to pass to TUNE
 */
+ (void)initializeWithTuneAdvertiserId:(NSString *)aid tuneConversionKey:(NSString *)key tunePackageName:(NSString *)name wearable:(BOOL)wearable configuration:(NSDictionary *)configuration;
#endif

#pragma mark - Delegate

/** @name Tune SDK Callback Delegate */
/*!
 [TuneDelegate](TuneDelegate) : A delegate used by Tune
 to post success and failure callbacks from the Tune servers.
 */
+ (void)setDelegate:(id<TuneDelegate>)delegate;

#ifdef TUNE_USE_LOCATION
/** @name Tune SDK Region Delegate */
/*!
 [TuneRegionDelegate](TuneRegionDelegate) : A delegate used by Tune
 to post geofencing boundary notifications.
 */
+ (void)setRegionDelegate:(id<TuneRegionDelegate>)delegate;
#endif


#pragma mark - Debug And Test

/** @name Debug And Test */

/*!
 Specifies that the server responses should include debug information.
 @warning This is only for testing. You must turn this off for release builds.
 @param enable defaults to NO.
 */
+ (void)setDebugMode:(BOOL)enable;

#pragma mark - Behavior Flags
/** @name Behavior Flags */

#if !TARGET_OS_WATCH
/*!
 Check for a deferred deeplink entry point upon app installation.
 On completion, this method does not auto-open the deferred deeplink,
 only the success/failure delegate callbacks are fired.

 This is safe to call at every app launch, since the function does nothing
 unless this is the first launch.

 @param delegate Delegate that implements the TuneDelegate deferred deeplink related callbacks.
 */
+ (void)checkForDeferredDeeplink:(id<TuneDelegate>)delegate;

/*!
 Enable automatic measurement of app store in-app-purchase events. When enabled, your code should not explicitly measure events for successful purchases related to StoreKit to avoid event duplication. If your app provides subscription IAP items, please make sure you enter the iTunes Shared Secret on the TUNE dashboard, otherwise Apple receipt validation will fail and the events will be marked as rejected.
 @param automate Automate IAP purchase event measurement. Defaults to NO.
 */
+ (void)automateIapEventMeasurement:(BOOL)automate;
#endif

/*!
 * Set whether the Tune events should also be logged to the Facebook SDK. This flag is ignored if the Facebook SDK is not present.
 * @param logging Whether to send Tune events to FB as well
 * @param limit Whether data such as that generated through FBAppEvents and sent to Facebook should be restricted from being used for other than analytics and conversions.  Defaults to NO.  This value is stored on the device and persists across app launches.
 */
+ (void)setFacebookEventLogging:(BOOL)logging limitEventAndDataUsage:(BOOL)limit;


#pragma mark - Data Setters

/** @name Setter Methods */

/*!
 Set whether this is an existing user or a new one. This is generally used to
 distinguish users who were using previous versions of the app, prior to
 integration of the Tune SDK. The default is to assume a new user.
 See http://support.mobileapptracking.com/entries/22621001-Handling-Installs-prior-to-SDK-implementation
 @param existingUser - Is this a pre-existing user of the app? Default: NO
 */
+ (void)setExistingUser:(BOOL)existingUser;

#if !TARGET_OS_WATCH
/*!
 Set the Apple Advertising Identifier available in iOS 6.
 @param appleAdvertisingIdentifier - Apple Advertising Identifier
 */
+ (void)setAppleAdvertisingIdentifier:(NSUUID *)appleAdvertisingIdentifier
           advertisingTrackingEnabled:(BOOL)adTrackingEnabled;

/*!
 Set the Apple Vendor Identifier available in iOS 6.
 @param appleVendorIdentifier - Apple Vendor Identifier
 */
+ (void)setAppleVendorIdentifier:(NSUUID * )appleVendorIdentifier;
#endif

/*!
 Sets the currency code.
 Default: USD
 @param currencyCode The string name for the currency code.
 */
+ (void)setCurrencyCode:(NSString *)currencyCode;

#if !TARGET_OS_WATCH
/*!
 Sets the jailbroken device flag.
 @param jailbroken The jailbroken device flag.
 */
+ (void)setJailbroken:(BOOL)jailbroken;
#endif

/*!
 Sets the package name (bundle identifier).
 Defaults to the Bundle Identifier of the app that is running the sdk.
 @param packageName The string name for the package.
 */
+ (void)setPackageName:(NSString *)packageName;

#if !TARGET_OS_WATCH
/*!
 Specifies if the sdk should pull the Apple Advertising Identifier and Advertising Tracking Enabled properties from the device.
 YES/NO
 Note that setting to NO will clear any previously set value for the property.
 @param autoCollect YES will access the Apple Advertising Identifier and Advertising Tracking Enabled properties, defaults to YES.
 */
+ (void)setShouldAutoCollectAppleAdvertisingIdentifier:(BOOL)autoCollect;
#endif

/*!
 Specifies if the sdk should auto collect device location if location access has already been permitted by the end user.
 YES/NO
 @param autoCollect YES will auto collect device location, defaults to YES.
 */
+ (void)setShouldAutoCollectDeviceLocation:(BOOL)autoCollect;
#if !TARGET_OS_WATCH
/*!
 Specifies if the sdk should auto detect if the iOS device is jailbroken.
 YES/NO
 @param autoDetect YES will detect if the device is jailbroken, defaults to YES.
 */
+ (void)setShouldAutoDetectJailbroken:(BOOL)autoDetect;

/*!
 Specifies if the sdk should pull the Apple Vendor Identifier from the device.
 YES/NO
 Note that setting to NO will clear any previously set value for the property.
 @param autoGenerate YES will set the Apple Vendor Identifier, defaults to YES.
 */
+ (void)setShouldAutoGenerateAppleVendorIdentifier:(BOOL)autoGenerate;
#endif

/*!
 Set the TRUSTe Trusted Preference Identifier (TPID).
 @param tpid - Trusted Preference Identifier
 */
+ (void)setTRUSTeId:(NSString *)tpid;

/*!
 Sets the MD5, SHA-1 and SHA-256 hash representations of the user's email address.
 @param userEmail The user's email address.
 */
+ (void)setUserEmail:(NSString *)userEmail;

/*!
 Sets the user ID.
 @param userId The string name for the user ID.
 */
+ (void)setUserId:(NSString *)userId;

/*!
 Sets the MD5, SHA-1 and SHA-256 hash representations of the user's name.
 @param userName The user's name.
 */
+ (void)setUserName:(NSString *)userName;

/*!
 Sets the MD5, SHA-1 and SHA-256 hash representations of the user's phone number.
 @param phoneNumber The user's phone number.
 */
+ (void)setPhoneNumber:(NSString *)phoneNumber;

/*!
 Set user's Facebook ID.
 @param facebookUserId string containing the user's Facebook user ID.
 */
+ (void)setFacebookUserId:(NSString *)facebookUserId;

/*!
 Set user's Twitter ID.
 @param twitterUserId string containing the user's Twitter user ID.
 */
+ (void)setTwitterUserId:(NSString *)twitterUserId;

/*!
 Set user's Google ID.
 @param googleUserId string containing the user's Google user ID.
 */
+ (void)setGoogleUserId:(NSString *)googleUserId;

/*!
 Sets the user's age.
 @param userAge user's age
 */
+ (void)setAge:(NSInteger)userAge;

/*!
 Sets the user's gender.
 @param userGender user's gender, possible values TuneGenderMale, TuneGenderFemale, TuneGenderUnknown
 */
+ (void)setGender:(TuneGender)userGender;

/*!
 Sets the user's location.
 @param location a TuneLocation instance
 */
+ (void)setLocation:(TuneLocation *)location;

/*!
 Set app-level ad-measurement.
 YES/NO
 @param enable YES means opt-in, NO means opt-out.
 */
+ (void)setAppAdMeasurement:(BOOL)enable;

/*!
 Set whether the user is generating revenue for the app or not.
 If measureEvent is called with a non-zero revenue, this is automatically set to YES.
 @param isPayingUser YES if the user is revenue-generating, NO if not
 */
+ (void)setPayingUser:(BOOL)isPayingUser;

/*!
 Sets publisher information for attribution.
 @param preloadData Preload app attribution data
 */
+ (void)setPreloadData:(TunePreloadData *)preloadData;

#if TARGET_OS_IOS

#pragma mark - Register/Set Custom Profile Variables

/** Register a custom profile variable for this user.
 *
 * This custom variable will be included in this user's personalization profile, and can be used for segmentation, targeting, and reporting purposes.
 *
 * Once registered, the value for this variable can be set using setCustomProfileStringValue:forVariable:.  The default value is nil.
 *
 * @param variableName Name of the variable to register for the current user.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 */
+ (void)registerCustomProfileString:(NSString *)variableName;

/** Register a custom profile variable for this user.
 *
 * This custom variable will be included in this user's personalization profile, and can be used for segmentation, targeting, and reporting purposes.
 *
 * Once registered, the value for this variable can be set using setCustomProfileDateTimeValue:forVariable:.  The default value is nil.
 *
 * @param variableName Name of the variable to register for the current user.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 */
+ (void)registerCustomProfileDateTime:(NSString *)variableName;

/** Register a custom profile variable for this user.
 *
 * This custom variable will be included in this user's personalization profile, and can be used for segmentation, targeting, and reporting purposes.
 *
 * Once registered, the value for this variable can be set using setCustomProfileNumberValue:forVariable:.  The default value is nil.
 *
 * @param variableName Name of the variable to register for the current user.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 */
+ (void)registerCustomProfileNumber:(NSString *)variableName;

/** Register a custom profile variable for this user.
 *
 * This custom variable will be included in this user's personalization profile, and can be used for segmentation, targeting, and reporting purposes.
 *
 * Once registered, the value for this variable can be set using setCustomProfileGeolocationValue:forVariable:.  The default value is nil.
 *
 * @param variableName Name of the variable to register for the current user.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 */
+ (void)registerCustomProfileGeolocation:(NSString *)variableName;

/** Register a custom profile variable for this user.
 *
 * This custom variable will be included in this user's personalization profile, and can be used for segmentation, targeting, and reporting purposes.
 *
 * Once registered, the value for this variable can be set using setCustomProfileStringValue:forVariable:.  The default value is nil.
 *
 * @param variableName Name of the variable to register for the current user.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 *
 * @param value Initial value for the variable.
 */
+ (void)registerCustomProfileString:(NSString *)variableName withDefault:(NSString *)value;

/** Register a custom profile variable for this user.
 *
 * This custom variable will be included in this user's personalization profile, and can be used for segmentation, targeting, and reporting purposes.
 *
 * Once registered, the value for this variable can be set using setCustomProfileDateTimeValue:forVariable:.  The default value is nil.
 *
 * @param variableName Name of the variable to register for the current user.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 *
 * @param value Initial value for the variable.
 */
+ (void)registerCustomProfileDateTime:(NSString *)variableName withDefault:(NSDate *)value;

/** Register a custom profile variable for this user.
 *
 * This custom variable will be included in this user's personalization profile, and can be used for segmentation, targeting, and reporting purposes.
 *
 * Once registered, the value for this variable can be set using setCustomProfileNumberValue:forVariable:.  The default value is nil.
 *
 * @param variableName Name of the variable to register for the current user.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 *
 * @param value Initial value for the variable.
 */
+ (void)registerCustomProfileNumber:(NSString *)variableName withDefault:(NSNumber *)value;

/** Register a custom profile variable for this user.
 *
 * This custom variable will be included in this user's personalization profile, and can be used for segmentation, targeting, and reporting purposes.
 *
 * Once registered, the value for this variable can be set using setCustomProfileGeolocationValue:forVariable:.  The default value is nil.
 *
 * @param variableName Name of the variable to register for the current user.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 *
 * @param value Initial value for the variable.
 */
+ (void)registerCustomProfileGeolocation:(NSString *)variableName withDefault:(TuneLocation *)value;

/** Set or update the value associated with a custom string profile variable.
 *
 * This new value will be used as part of this user's personalization profile, and will be used from this point forward for segmentation, targeting, and reporting purposes.
 *
 * @param value Value to use for the given variable.
 *
 * @param variableName Variable to which this value should be assigned.
 */
+ (void)setCustomProfileStringValue:(NSString *)value forVariable:(NSString *)name;

/** Set or update the value associated with a custom date profile variable.
 *
 * This new value will be used as part of this user's personalization profile, and will be used from this point forward for segmentation, targeting, and reporting purposes.
 *
 * @param value Value to use for the given variable.
 *
 * @param variableName Variable to which this value should be assigned.
 */
+ (void)setCustomProfileDateTimeValue:(NSDate *)value forVariable:(NSString *)name;

/** Set or update the value associated with a custom number profile variable.
 *
 * This new value will be used as part of this user's personalization profile, and will be used from this point forward for segmentation, targeting, and reporting purposes.
 *
 * @param value Value to use for the given variable.
 *
 * @param variableName Variable to which this value should be assigned.
 */
+ (void)setCustomProfileNumberValue:(NSNumber *)value forVariable:(NSString *)name;

/** Set or update the value associated with a custom geolocation profile variable.
 *
 * This new value will be used as part of this user's personalization profile, and will be used from this point forward for segmentation, targeting, and reporting purposes.
 *
 * @param value Value to use for the given variable.
 *
 * @param variableName Variable to which this value should be assigned.
 */
+ (void)setCustomProfileGeolocationValue:(TuneLocation *)value forVariable:(NSString *)name;

/** Get the value assoctiated with a custom string profile variable.
 *
 * Return the value stored for the custom profile variable. Must be called AFTER the appropriate registration call.
 *
 * This will return nil if the variable was registered without a default and has never been set.
 *
 * @param name Name of the custom profile variable.
 */
+ (NSString *)getCustomProfileString:(NSString *)name;

/** Get the value assoctiated with a custom datetime profile variable.
 *
 * Return the value stored for the custom profile variable. Must be called AFTER the appropriate registration call.
 *
 * This will return nil if the variable was registered without a default and has never been set.
 *
 * @param name Name of the custom profile variable.
 */
+ (NSDate *)getCustomProfileDateTime:(NSString *)name;

/** Get the value assoctiated with a custom number profile variable.
 *
 * Return the value stored for the custom profile variable. Must be called AFTER the appropriate registration call.
 *
 * This will return nil if the variable was registered without a default and has never been set.
 *
 * @param name Name of the custom profile variable.
 */
+ (NSNumber *)getCustomProfileNumber:(NSString *)name;

/** Get the value assoctiated with a custom location profile variable.
 *
 * Return the value stored for the custom profile variable. Must be called AFTER the appropriate registration call.
 *
 * This will return nil if the variable was registered without a default and has never been set.
 *
 * @param name Name of the custom profile variable.
 */
+ (TuneLocation *)getCustomProfileGeolocation:(NSString *)name;

/** Clear out a specific custom value set for the current user.
 *
 * This value will be cleared from this user's personalization profile.  The variable will still be registered, so you can update it later.
 *
 * @param name The name of the variable to clear.
 */
+ (void)clearCustomProfileVariable:(NSString *)name;

/** Clear out all of the custom profile values set for the current user.
 *
 * All custom profile values will be cleared from this user's personalization profile.
 */
+ (void)clearAllCustomProfileVariables;

#endif

#pragma mark - Data Getters

/** @name Getter Methods */

/*!
 Get the Apple Advertising Identifier.
 @return Apple Advertising Identifier (IFA)
 */
+ (NSString*)appleAdvertisingIdentifier;

/*!
 Get the TUNE ID for this installation (mat_id).
 @return TUNE ID
 */
+ (NSString*)tuneId;

/*!
 Get the Tune log ID for the first app open (open_log_id).
 @return open log ID
 */
+ (NSString*)openLogId;

/*!
 Get whether the user is revenue-generating.
 @return YES if the user has produced revenue, NO if not
 */
+ (BOOL)isPayingUser;

#if TARGET_OS_IOS

/*!
 Gets the current device token for push notifications.

 NOTE: This should be called after application:didRegisterForRemoteNotificationsWithDeviceToken: finishes. If called before it will be nil.

 @return device token, nil if there isn't one
 */
+ (NSString *)getPushToken;


#pragma mark - Power Hook API

/**
 * Manage all Power Hooks used with TUNE. This includes:
 *
 * - Registering hooks to be set dynamically by TMC.
 * - Referencing these hooks in the code.
 * - Providing test methods to verify the impact of different hooks on your app code.
 *
 * Power Hooks are key-value pairs that are passed into your application code by TUNE when your app starts, allowing for settings, text, and logic to be modified on the fly for all user devices without revisioning or updating your application.
 *
 * All hooks created are registered with TMC automatically when you connect your device to TUNE for the first time.  The registration process will detect all registered hook keys, and will display all of the hooks for this app in TMC where they can be edited.  Values set on hooks on the web will automatically be downloaded by all devices upon app startup, allowing for their usage throughout your system code.
 */

/**
 * Registers a single-value (non-code-block) Power Hook for use with TUNE.
 *
 * Use this method to declare the existence of a Power Hook you would like to pass in from TUNE.  This declaration should occur in the `didFinishLaunchingWithOptions:` method of your main app delegate, *before* you start TUNE using the `[ARManager startWithAppId:version:]` method.
 *
 * @param hookId The name of the configuration setting to register. Name must be unique for this app and cannot be empty.
 * @param friendlyName The name for this hook that will be displayed in TMC. This value cannot be empty.
 * @param defaultValue The default value for this hook.  This value will be used if no value is passed in from TMC for this app. This value cannot be nil.
 */
+ (void)registerHookWithId:(NSString *)hookId friendlyName:(NSString *)friendlyName defaultValue:(NSString *)defaultValue;

/**
 * Gets the value of a single-value (non-code-block) Power Hook.
 *
 * Use this method to get the value of a Power Hook from TUNE.  This will return the value specified in TMC, or the default value if none has been specified.
 *
 * *NOTE*: When called in the context of an experiment this method triggers the view for the Power Hook variation value that is returned.
 *
 * @param hookId The name of the Power Hook you wish to retrieve. Will return nil if the setting has not been registered.
 */
+ (NSString *)getValueForHookById:(NSString *)hookId;

/** Set the value of a single-value (non-code-block) Power Hook manually.
 *
 * Use this method to manually apply a value to an TUNE Power Hook.  The app will behave as if this value has been passed from TMC, and all calls to getValueForhookId: for this hookId will return this value.
 *
 * This method should be called in the `didFinishLaunchingWithOptions:` method of your main app delegate, immediately after regstering the corresponding hookId.
 *
 * @warning *Note:* This method is intended for local test and QA use only, and should *not* be used within production code.
 *
 * @param hookId The name of the Power Hook whose value you want to set.
 * @param value The value you want to specify for this Power Hook.  If the Power Hook has not been registered, this will be ignored. This value cannot be nil.
 */
+ (void)setValueForHookById:(NSString *)hookId value:(NSString *)value;

/** Register a block for callback when any Power Hook variables have changed.
 *
 * The thread calling the block of code is not guaranteed to be on the main thread.  If the code inside of the block requires executing on the main thread you will need to implement this logic.
 *
 * @param block The block of code to be executed.
 *
 */
+ (void)onPowerHooksChanged:(void (^)()) block;

#pragma mark - Deep Action API

/**
 * Registers a deep action for use with TUNE Marketing Automation.
 *
 * Use this method to declare the existence of a deep action you would like to use in your app with data that is configurable from TUNE Markeing Automation.
 *
 * *NOTE:* If this block is executed from a push message or URL the thread calling the block of code is guaranteed to be the main thread. If the code inside of the block requires executing on a background thread you will need to implement this logic.
 *
 * @param deepActionId The name of the code to register. Name must be unique for this app and cannot be empty.
 * @param friendlyName The name for this deep action that will be displayed in TUNE Marketing Automation. This value cannot be empty.
 * @param data The default data for this deep action. This should be string keys and values. This data will be used if no data is passed in from TUNE Marketing Automation for this deep action for this app. This may be an empty dictionary but it cannot be nil.
 * @param deepAction The reusable block of code that you are registering with TUNE. We will merge the values from TUNE Marketing Automation with this extra data. A block is required, this parameter cannot be nil.
 */
+ (void)registerDeepActionWithId:(NSString *)deepActionId friendlyName:(NSString *)friendlyName data:(NSDictionary *)data andAction:(void (^)(NSDictionary *extra_data))deepAction;

#pragma mark - Push Notifications API

/**
 * Returns true if the current session is because the user opened a Tune push notification. Otherwise returns false.
 * This is set back to false on application background.
 */
+ (BOOL)didSessionStartFromTunePush;

/**
 * Returns information about the received Tune push if this session was started through opening a Tune push. Otherwise returns nil.
 * This is set back to nil on application background.
 */
+ (TunePushInfo *)getTunePushInfoForSession;

/**
 * Manage all Push Notification events used with TUNE.
 *
 * Push notification events are auto-instrumented by the TUNE SDK if your UIApplicationDelegate is named 'AppDelegate',
 * or you have set the name for 'AppDelegateClassName' in 'TuneConfiguration.plist'.
 *
 * If you are not using TUNE's auto-instrumentation setup, you may instead invoke the following methods manually from the UIApplicationDelegate methods.
 *
 * WARNING: If you enable the swizzle, do not call these methods.
 */

+ (void)application:(UIApplication *)application tuneDidRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken;

+ (void)application:(UIApplication *)application tuneDidFailToRegisterForRemoteNotificationsWithError:(NSError *)error;

+ (void)application:(UIApplication *)application tuneDidReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler;

+ (void)application:(UIApplication *)application tuneHandleActionWithIdentifier:(NSString *)identifier forRemoteNotification:(NSDictionary *)userInfo completionHandler:(void (^)())completionHandler;

+ (void)application:(UIApplication *)application tuneHandleActionWithIdentifier:(NSString *)identifier forRemoteNotification:(NSDictionary *)userInfo withResponseInfo:(NSDictionary *)responseInfo completionHandler:(void(^)())completionHandler;

#pragma mark - Spotlight API

#if !TARGET_OS_WATCH
+ (BOOL)application:(UIApplication *)application tuneContinueUserActivity:(NSUserActivity *)userActivity restorationHandler:(void(^)(NSArray *restorableObjects))restorationHandler;
#endif

#pragma mark - Experiment API

/**
 * Get details for all currently running Power Hook Variable experiments.
 *
 * Details include the hook id for the Power Hook, experiment and variation ids and start and end date of the experiment.
 *
 * Returns an `NSDictionary` of experiment details for all running Power Hook variable experiments, where the keys are the `NSString` hook ids of the Power Hook variables, and the values are `TunePowerHookExperimentDetails` objects.
 */
+ (NSDictionary *)getPowerHookVariableExperimentDetails;

/**
 * Get details for all currently running In App Message experiments.
 *
 * Details include the experiment and variation ids and start and end date of the experiment.
 *
 * Returns an `NSDictionary` of experiment details for all running Power Hook variable experiments, where the keys are the `NSString` campaign ids of the Power Hook variables, and the values are `TuneInAppMessageExperimentDetails` objects.
 */
+ (NSDictionary *)getInAppMessageExperimentDetails;

#pragma mark - Playlist API

/** Register block for callback when the very first playlist is downloaded.
 *
 * Use this method to register a block for callback the first time a playlist is downloaded. This call is non-blocking so code execution will continue immediately to the next line of code.
 *
 * If the first playlist has already been downloaded when this call is made this becomes a blocking call and the block of code is executed immediately on a background thread.
 *
 * Otherwise the callback will fire after 3 seconds or when the first playlist is downloaded, whichever comes first.
 *
 * <b>IMPORTANT</b>: The thread calling the block of code is not guaranteed to be the main thread. You will need to implement custom logic if you want to ensure that the block of code always executes on the main thread.
 *
 * NOTE: This callback will fire upon first playlist download from the application start and upon each callback registration call.
 * If registered more than once, the latest callback will always fire, regardless of whether a previously registered callback already executed.
 * We do not recommend registering more than once but if you do so, please make sure that executing the callback more than once will not cause any issues in your app.
 *
 * NOTE: Pending callbacks will be canceled upon app background and resumed upon app foreground.
 *
 * NOTE: Only the latest callback registered will be executed. Subsequent calls to onFirstPlaylistDownloaded will replace the callback to be executed.
 *
 * WARNING: If TMA is not enabled then this callback will never fire.
 *
 * @param block The block of code to be executed.
 *
 */
+ (void)onFirstPlaylistDownloaded:(void (^)())block;

/** Register block for callback when the very first playlist is downloaded.
 *
 * Use this method to register a block for callback the first time a playlist is downloaded. This call is non-blocking so code execution will continue immediately to the next line of code.
 *
 * If the first playlist has already been downloaded when this call is made this becomes a blocking call and the block of code is executed immediately on a background thread.
 *
 * The timeout provided overrides the default timeout of 3 seconds. If the given timeout is greater than zero, the block of code will fire when the timeout expires or the first playlist is downloaded, whichever comes first.
 *
 * <b>IMPORTANT</b>: The thread calling the block of code is not guaranteed to be the main thread. You will need to implement custom logic if you want to ensure that the block of code always executes on the main thread.
 *
 * NOTE: This callback will fire upon first playlist download from the application start and upon each callback registration call.
 * If registered more than once, the latest callback will always fire, regardless of whether a previously registered callback already executed.
 * We do not recommend registering more than once but if you do so, please make sure that executing the callback more than once will not cause any issues in your app.
 *
 * NOTE: Pending callbacks will be canceled upon app background and resumed upon app foreground.
 *
 * NOTE: Only the latest callback registered will be executed. Subsequent calls to onFirstPlaylistDownloaded will replace the callback to be executed.
 *
 * WARNING: If TMA is not enabled then this callback will never fire.
 *
 * @param block The block of code to be executed.
 * @param timeout The amount of time in seconds to wait before executing the callback if the Playlist hasn't been downloaded yet. We recommend this is not over 5 seconds at a maximum and is over 1 second at a minimum.
 *
 */
+ (void)onFirstPlaylistDownloaded:(void (^)())block withTimeout:(NSTimeInterval)timeout;

#endif

#pragma mark - Measuring Sessions

/** @name Measuring Sessions */

/*!
 To be called when an app opens; typically in the applicationDidBecomeActive event.
 */
+ (void)measureSession;


#pragma mark - Measuring Events

/** @name Measuring Events */

/*!
 Record an event for an Event Name.
 @param eventName The event name.
 */
+ (void)measureEventName:(NSString *)eventName;

/*!
 Record an event by providing the equivalent Event ID defined on the TUNE dashboard.
 @param eventId The event ID.
 */
+ (void)measureEventId:(NSInteger)eventId;

/*!
 Record an event with a TuneEvent.
 @param event The TuneEvent.
 */
+ (void)measureEvent:(TuneEvent *)event;


#pragma mark - Cookie Measurement

/** @name Cookie Measurement */
/*!
 Sets whether or not to use cookie based measurement.
 Default: NO
 @param enable YES/NO for cookie based measurement.
 */
+ (void)setUseCookieMeasurement:(BOOL)enable;


#pragma mark - App-to-app Measurement

/** @name App-To-App Measurement */

/*!
 Sets a url to be used with app-to-app measurement so that
 the sdk can open the download (redirect) url. This is
 used in conjunction with the setAppToAppMeasurement:advertiserId:offerId:publisherId:redirect: method.
 @param redirectUrl The string name for the url.
 */
+ (void)setRedirectUrl:(NSString *)redirectUrl;

/*!
 Start an app-to-app measurement session on the Tune server.
 @param targetAppPackageName The bundle identifier of the target app.
 @param targetAppAdvertiserId The Tune advertiser ID of the target app.
 @param targetAdvertiserOfferId The Tune offer ID of the target app.
 @param targetAdvertiserPublisherId The Tune publisher ID of the target app.
 @param shouldRedirect Should redirect to the download url if the measurement session was
   successfully created. See setRedirectUrl:.
 */
+ (void)startAppToAppMeasurement:(NSString *)targetAppPackageName
                    advertiserId:(NSString *)targetAppAdvertiserId
                         offerId:(NSString *)targetAdvertiserOfferId
                     publisherId:(NSString *)targetAdvertiserPublisherId
                        redirect:(BOOL)shouldRedirect;


#pragma mark - Re-Engagement Method

/** @name Application Re-Engagement */

/*!
 Record the URL and Source when an application is opened via a URL scheme.
 This typically occurs during OAUTH or when an app exits and is returned
 to via a URL. The data will be sent to the HasOffers server when the next
 measureXXX method is called so that a Re-Engagement can be recorded.

 WARNING: You don't need to call this method if you have the swizzle enabled.
 @param urlString the url string used to open your app.
 @param sourceApplication the source used to open your app. For example, mobile safari.
 */
+ (void)applicationDidOpenURL:(NSString *)urlString sourceApplication:(NSString *)sourceApplication;


#ifdef TUNE_USE_LOCATION
#pragma mark - Region Monitoring

/** @name Region monitoring */

/*!
 Begin monitoring for an iBeacon region. Boundary-crossing events will be recorded
 by the Tune servers for event attribution.

 When the first region is added, the user will immediately be prompted for use of
 their location, unless they have already granted it to the app.

 @param UUID The region's universal unique identifier (required).
 @param nameId The region's name, as programmed into the beacon (required).
 @param majorId A subregion's major identifier (optional, send 0)
 @param minorId A sub-subregion's minor identifier (optional, send 0)
 */
+ (void)startMonitoringForBeaconRegion:(NSUUID*)UUID
                                nameId:(NSString*)nameId
                               majorId:(NSUInteger)majorId
                               minorId:(NSUInteger)minorId;
#endif

@end


#pragma mark - TuneDelegate

/** @name TuneDelegate */

/*!
 Protocol that allows for callbacks from the Tune methods.
 To use, set your class as the delegate for Tune and implement these methods.
 Delegate methods are called on an arbitrary thread.
 */
@protocol TuneDelegate <NSObject>
@optional

/*!
 Delegate method called when an action is enqueued.
 @param referenceId The reference ID of the enqueue action.
 */
- (void)tuneEnqueuedActionWithReferenceId:(NSString *)referenceId;

/*!
 Delegate method called when an action succeeds.
 @param data The success data returned by Tune.
 */
- (void)tuneDidSucceedWithData:(NSData *)data;

/*!
 Delegate method called when an action fails.
 @param error Error object returned by Tune.
 */
- (void)tuneDidFailWithError:(NSError *)error;

/*!
 Delegate method called when a deferred deeplink becomes available.
 The deeplink should be used to open the appropriate screen in your app.
 @param deeplink String representation of the deeplink url.
 */
- (void)tuneDidReceiveDeeplink:(NSString *)deeplink;

/*!
 Delegate method called when a deferred deeplink request fails.
 @param error Error object indicating why the request failed.
 */
- (void)tuneDidFailDeeplinkWithError:(NSError *)error;

@end


#ifdef TUNE_USE_LOCATION
#pragma mark - TuneRegionDelegate

/** @name TuneRegionDelegate */

/*!
 Protocol that allows for callbacks from the Tune region-based
 methods. Delegate methods are called on an arbitrary thread.
 */

@protocol TuneRegionDelegate <NSObject>

@optional

/*!
 Delegate method called when an iBeacon region is entered.
 @param region The region that was entered.
 */
- (void)tuneDidEnterRegion:(CLRegion*)region;

/*!
 Delegate method called when an iBeacon region is exited.
 @param region The region that was exited.
 */
- (void)tuneDidExitRegion:(CLRegion*)region;

/*!
 Delegate method called when the user changes location authorization status.
 @param authStatus The new status.
 */
- (void)tuneChangedAuthStatusTo:(CLAuthorizationStatus)authStatus;

/*!
 Delegate method called when the device's Bluetooth settings change.
 @param bluetoothState The new state.
 */
- (void)tuneChangedBluetoothStateTo:(CBCentralManagerState)bluetoothState;

@end
#endif
