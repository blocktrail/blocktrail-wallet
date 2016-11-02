//
//  TunePlugin.m
//
//  Copyright 2016 TUNE, Inc. All rights reserved.
//

#import "TunePlugin.h"


#pragma mark - Tune Category

@interface Tune (PhoneGapPlugin)

+ (void)setPluginName:(NSString *)pluginName;

@end


@implementation TunePlugin

NSString *tuneDelegateCallbackId;
NSString *tuneDeeplinkCallbackId;


#pragma mark - Init Methods


- (void)init:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: init");
    
    NSArray *arguments = command.arguments;
    
    NSString *advertiserId = [arguments objectAtIndex:0];
    NSString *conversionKey = [arguments objectAtIndex:1];
    
    NSLog(@"TunePlugin: init: advertiserId = %@, tuneConversionKey = %@", advertiserId, conversionKey);
    
    CDVPluginResult *pluginResult = nil;
    if (advertiserId == nil || conversionKey == nil || 0 == [advertiserId length] || 0 == [conversionKey length])
    {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"Advertiser Id and Conversion Key cannot be nil"];
    }
    else
    {
        NSString *packageName = nil;
        
        if (arguments.count > 2 && ![self isNull:[arguments objectAtIndex:2]])
        {
            packageName = [arguments objectAtIndex:2];
        }
        
        BOOL wearable = NO;
        
        if (arguments.count > 3 && ![self isNull:[arguments objectAtIndex:3]])
        {
            wearable = [[arguments objectAtIndex:3] boolValue];
        }
        
        [Tune initializeWithTuneAdvertiserId:advertiserId
                           tuneConversionKey:conversionKey
                             tunePackageName:packageName
                                    wearable:wearable];
        [Tune setPluginName:@"phonegap"];
        
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    }
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)setDebugMode:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setDebugMode");
    
    NSArray *arguments = command.arguments;
    
    NSString *strEnable = [arguments objectAtIndex:0];
    
    if (![self isNull:strEnable])
    {
        BOOL enable = [strEnable boolValue];
        
        [Tune setDebugMode:enable];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setDelegate:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setDelegate");
    
    NSArray *arguments = command.arguments;
    
    NSString *strEnable = [arguments objectAtIndex:0];
    
    if (![self isNull:strEnable])
    {
        tuneDelegateCallbackId = command.callbackId;
        
        BOOL enable = [strEnable boolValue];
        
        [Tune setDelegate:enable ? self : nil];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)checkForDeferredDeeplink:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: checkForDeferredDeeplink");
    
    tuneDeeplinkCallbackId = command.callbackId;
    
    [Tune checkForDeferredDeeplink:self];
}

- (void)automateIapEventMeasurement:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: automateIapEventMeasurement");
    
    NSArray *arguments = command.arguments;
    
    NSString *strAutomate = [arguments objectAtIndex:0];
    
    if (![self isNull:strAutomate])
    {
        BOOL automate = [strAutomate boolValue];
        
        [Tune automateIapEventMeasurement:automate];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

#pragma mark - Measure Session

- (void)measureSession:(CDVInvokedUrlCommand *)command
{
    NSLog(@"TunePlugin: measureSession");
    
    [Tune measureSession];
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

#pragma mark - Measure Events

- (void)measureEventName:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: measureEventName");
    
    NSArray *arguments = command.arguments;
    
    NSString *eventName = [arguments objectAtIndex:0];
    
    if(![self isNull:eventName])
    {
        [Tune measureEventName:eventName];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)measureEventId:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: measureEventId");
    
    NSArray *arguments = command.arguments;
    
    NSString *strEventId = [arguments objectAtIndex:0];
    
    if(![self isNull:strEventId])
    {
        int eventId = [strEventId intValue];
        
        [Tune measureEventId:eventId];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)measureEvent:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: measureEvent");
    
    NSArray *arguments = command.arguments;
    
    NSDictionary *dict = [arguments objectAtIndex:0];
    
    if(![self isNull:dict])
    {
        TuneEvent *event = [self convertToTuneEvent:dict];
        
        [Tune measureEvent:event];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

#pragma mark - Setter Methods

- (void)setPackageName:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setPackageName");
    
    NSArray *arguments = command.arguments;
    
    NSString *packageName = [arguments objectAtIndex:0];
    
    if(![self isNull:packageName])
    {
        [Tune setPackageName:packageName];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setCurrencyCode:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setCurrencyCode");
    
    NSArray *arguments = command.arguments;
    
    NSString *currencyCode = [arguments objectAtIndex:0];
    
    if(![self isNull:currencyCode])
    {
        [Tune setCurrencyCode:currencyCode];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setAppleAdvertisingIdentifier:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setAppleAdvertisingIdentifier");
    
    NSArray *arguments = command.arguments;
    
    NSString *strAppleAdvId = [arguments objectAtIndex:0];
    NSString *strEnabled = [arguments objectAtIndex:1];
    
    id classNSUUID = NSClassFromString(@"NSUUID");
    
    CDVPluginResult *pluginResult = nil;
    
    if(classNSUUID)
    {
        if(![self isNull:strAppleAdvId] && ![self isNull:strEnabled])
        {
            NSUUID *ifa = [[classNSUUID alloc] initWithUUIDString:strAppleAdvId];
            BOOL trackingEnabled = [strEnabled boolValue];
            
            [Tune setAppleAdvertisingIdentifier:ifa advertisingTrackingEnabled:trackingEnabled];
            
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        }
        else
        {
            [self throwInvalidArgsErrorForCommand:command];
        }
    }
    else
    {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"NSUUID class not found"];
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)setAppleVendorIdentifier:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setAppleVendorIdentifier");
    
    NSArray *arguments = command.arguments;
    
    NSString *strAppleVendorId = [arguments objectAtIndex:0];
    
    id classNSUUID = NSClassFromString(@"NSUUID");
    
    CDVPluginResult *pluginResult = nil;
    
    if(classNSUUID)
    {
        if(![self isNull:strAppleVendorId])
        {
            NSUUID *ifv = [[classNSUUID alloc] initWithUUIDString:strAppleVendorId];
            
            [Tune setAppleVendorIdentifier:ifv];
            
            pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        }
        else
        {
            [self throwInvalidArgsErrorForCommand:command];
        }
    }
    else
    {
        pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"NSUUID class not found"];
    }
    
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)setTRUSTeId:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setTRUSTeId");
    
    NSArray *arguments = command.arguments;
    
    NSString *tpid = [arguments objectAtIndex:0];
    
    if(![self isNull:tpid])
    {
        [Tune setTRUSTeId:tpid];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setUserEmail:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setUserEmail");
    
    NSArray *arguments = command.arguments;
    
    NSString *userEmail = [arguments objectAtIndex:0];
    
    if(![self isNull:userEmail])
    {
        [Tune setUserEmail:userEmail];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setUserId:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setUserId");
    
    NSArray *arguments = command.arguments;
    
    NSString *userId = [arguments objectAtIndex:0];
    
    if(![self isNull:userId])
    {
        [Tune setUserId:userId];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setUserName:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setUserName");
    
    NSArray *arguments = command.arguments;
    
    NSString *userName = [arguments objectAtIndex:0];
    
    if(![self isNull:userName])
    {
        [Tune setUserName:userName];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setFacebookEventLogging:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setFacebookEventLogging");
    
    NSArray *arguments = command.arguments;
    
    NSString *strEnable = [arguments objectAtIndex:0];
    NSString *strLimit = [arguments objectAtIndex:1];
    
    if(![self isNull:strEnable] && ![self isNull:strLimit])
    {
        BOOL enable = [strEnable boolValue];
        BOOL limit = [strLimit boolValue];
        
        [Tune setFacebookEventLogging:enable limitEventAndDataUsage:limit];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setFacebookUserId:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setFacebookUserId");
    
    NSArray *arguments = command.arguments;
    
    NSString *userId = [arguments objectAtIndex:0];
    
    if(![self isNull:userId])
    {
        [Tune setFacebookUserId:userId];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setTwitterUserId:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setTwitterUserId");
    
    NSArray *arguments = command.arguments;
    
    NSString *userId = [arguments objectAtIndex:0];
    
    if(![self isNull:userId])
    {
        [Tune setTwitterUserId:userId];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setGoogleUserId:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setGoogleUserId");
    
    NSArray *arguments = command.arguments;
    
    NSString *userId = [arguments objectAtIndex:0];
    
    if(![self isNull:userId])
    {
        [Tune setGoogleUserId:userId];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setJailbroken:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setJailbroken");
    
    NSArray *arguments = command.arguments;
    
    NSString *strJailbroken = [arguments objectAtIndex:0];
    
    if(![self isNull:strJailbroken])
    {
        BOOL jailbroken = [strJailbroken boolValue];
        
        [Tune setJailbroken:jailbroken];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setAge:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setAge");
    
    NSArray *arguments = command.arguments;
    
    NSString *strAge = [arguments objectAtIndex:0];
    
    if(![self isNull:strAge])
    {
        int age = [strAge intValue];
        
        [Tune setAge:age];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setLocation:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setLocation");
    
    NSArray *arguments = command.arguments;
    
    NSNumber *numLat = [arguments objectAtIndex:0];
    NSNumber *numLon = [arguments objectAtIndex:1];
    
    if(![self isNull:numLat]
       && ![self isNull:numLon])
    {
        TuneLocation *loc = [TuneLocation new];
        loc.latitude = numLat;
        loc.longitude = numLon;
        [Tune setLocation:loc];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setLocationWithAltitude:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setLocationWithAltitude");
    
    NSArray *arguments = command.arguments;
    
    NSNumber *numLat = [arguments objectAtIndex:0];
    NSNumber *numLon = [arguments objectAtIndex:1];
    NSNumber *numAlt = [arguments objectAtIndex:2];
    
    if(![self isNull:numLat]
       && ![self isNull:numLon]
       && ![self isNull:numAlt])
    {
        TuneLocation *loc = [TuneLocation new];
        loc.latitude = numLat;
        loc.longitude = numLon;
        loc.altitude = numAlt;
        [Tune setLocation:loc];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setUseCookieMeasurement:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setUseCookieMeasurement");
    
    NSArray *arguments = command.arguments;
    
    NSString *strUseCookie = [arguments objectAtIndex:0];
    
    if(![self isNull:strUseCookie])
    {
        BOOL useCookie = [strUseCookie boolValue];
        
        [Tune setUseCookieMeasurement:useCookie];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setShouldAutoCollectAppleAdvertisingIdentifier:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setShouldAutoCollectAppleAdvertisingIdentifier");
    
    NSArray *arguments = command.arguments;
    
    NSString *strAutoCollect = [arguments objectAtIndex:0];
    
    if(![self isNull:strAutoCollect])
    {
        BOOL autoCollect = [strAutoCollect boolValue];
        
        [Tune setShouldAutoCollectAppleAdvertisingIdentifier:autoCollect];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setShouldAutoCollectDeviceLocation:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setShouldAutoCollectDeviceLocation");
    
    NSArray *arguments = command.arguments;
    
    NSString *strAutoCollect = [arguments objectAtIndex:0];
    
    if(![self isNull:strAutoCollect])
    {
        BOOL autoCollect = [strAutoCollect boolValue];
        
        [Tune setShouldAutoCollectDeviceLocation:autoCollect];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setShouldAutoDetectJailbroken:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setShouldAutoDetectJailbroken");
    
    NSArray *arguments = command.arguments;
    
    NSString *strAutoDetect = [arguments objectAtIndex:0];
    
    if(![self isNull:strAutoDetect])
    {
        BOOL autoDetect = [strAutoDetect boolValue];
        
        [Tune setShouldAutoDetectJailbroken:autoDetect];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setShouldAutoGenerateAppleVendorIdentifier:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setShouldAutoGenerateAppleVendorIdentifier");
    
    NSArray *arguments = command.arguments;
    
    NSString *strAutoGen = [arguments objectAtIndex:0];
    
    if(![self isNull:strAutoGen])
    {
        BOOL autoGen = [strAutoGen boolValue];
        
        [Tune setShouldAutoGenerateAppleVendorIdentifier:autoGen];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setAppAdMeasurement:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setAppAdMeasurement");
    
    NSArray *arguments = command.arguments;
    
    NSString *strEnable = [arguments objectAtIndex:0];
    
    if(![self isNull:strEnable])
    {
        BOOL enable = [strEnable boolValue];
        
        [Tune setAppAdMeasurement:enable];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setGender:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setGender");
    
    NSArray *arguments = command.arguments;
    
    NSString *strGender = [arguments objectAtIndex:0];
    
    if(![self isNull:strGender])
    {
        int gender = [strGender intValue];
        
        [Tune setGender:gender];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setDeepLink:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setDeepLink");
    
    NSArray *arguments = command.arguments;
    
    NSString *strURL = [arguments objectAtIndex:0];
    
    if(![self isNull:strURL])
    {
        [Tune applicationDidOpenURL:strURL sourceApplication:nil];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)startAppToAppMeasurement:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: startAppToAppMeasurement");
    
    NSArray *arguments = command.arguments;
    
    NSString *strTargetAppPackageName = [arguments objectAtIndex:0];
    NSString *strTargetAdvId = [arguments objectAtIndex:1];
    NSString *strTargetOfferId = [arguments objectAtIndex:2];
    NSString *strTargetPublisherId = [arguments objectAtIndex:3];
    NSString *strShouldRedirect = [arguments objectAtIndex:4];
    
    if(![self isNull:strTargetAppPackageName]
       && ![self isNull:strTargetAdvId]
       && ![self isNull:strTargetOfferId]
       && ![self isNull:strTargetPublisherId]
       && ![self isNull:strShouldRedirect])
    {
        BOOL shouldRedirect = [strShouldRedirect boolValue];
        
        [Tune startAppToAppMeasurement:strTargetAppPackageName
                          advertiserId:strTargetAdvId
                               offerId:strTargetOfferId
                           publisherId:strTargetPublisherId
                              redirect:shouldRedirect];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setRedirectUrl:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setRedirectUrl");
    
    NSArray *arguments = command.arguments;
    
    NSString *strURL = [arguments objectAtIndex:0];
    
    if(![self isNull:strURL])
    {
        [Tune setRedirectUrl:strURL];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setExistingUser:(CDVInvokedUrlCommand *)command
{
    NSLog(@"TunePlugin: setExistingUser");
    
    NSArray *arguments = command.arguments;
    
    NSString *strExistingUser = [arguments objectAtIndex:0];
    
    if(![self isNull:strExistingUser])
    {
        BOOL isExistingUser = [strExistingUser boolValue];
        
        [Tune setExistingUser:isExistingUser];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

-(void)setPayingUser:(CDVInvokedUrlCommand *)command
{
    NSLog(@"TunePlugin: setPayingUser");
    
    NSArray *arguments = command.arguments;
    
    NSString *strPayingUser = [arguments objectAtIndex:0];
    
    if(![self isNull:strPayingUser])
    {
        BOOL isPayingUser = [strPayingUser boolValue];
        
        [Tune setPayingUser:isPayingUser];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

- (void)setPreloadData:(CDVInvokedUrlCommand*)command
{
    NSLog(@"TunePlugin: setPreloadData");
    
    NSArray *arguments = command.arguments;
    
    NSDictionary *dict = [arguments objectAtIndex:0];
    
    if(![self isNull:dict])
    {
        TunePreloadData *pd = [self convertToTunePreloadData:dict];
        
        [Tune setPreloadData:pd];
        
        CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
        [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }
    else
    {
        [self throwInvalidArgsErrorForCommand:command];
    }
}

#pragma mark - Getter Methods

- (void)getMatId:(CDVInvokedUrlCommand *)command
{
    NSLog(@"TunePlugin: getMatId: is deprecated, please use getTuneId: instead.");
    [self getTuneId:command];
}

- (void)getTuneId:(CDVInvokedUrlCommand *)command
{
    NSLog(@"TunePlugin: getTuneId");
    
    NSString *tuneId = [Tune tuneId];
    
    NSLog(@"TunePlugin: getTuneId: %@", tuneId);
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:tuneId];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)getOpenLogId:(CDVInvokedUrlCommand *)command
{
    NSLog(@"TunePlugin: getOpenLogId");
    
    NSString *logId = [Tune openLogId];
    NSLog(@"TunePlugin: getOpenLogId: %@", logId);
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:logId];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (void)getIsPayingUser:(CDVInvokedUrlCommand *)command
{
    NSLog(@"TunePlugin: getIsPayingUser");
    
    BOOL payingUser = [Tune isPayingUser];
    NSLog(@"TunePlugin: getIsPayingUser: %d", payingUser);
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsBool:payingUser];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

#pragma mark - Android only placeholder methods

- (void)setAndroidId:(CDVInvokedUrlCommand*)command
{
    // no-op Android only placeholder method
}

- (void)setDeviceId:(CDVInvokedUrlCommand*)command
{
    // no-op Android only placeholder method
}

- (void)setGoogleAdvertisingId:(CDVInvokedUrlCommand *)command
{
    // no-op Android only placeholder method
}

#pragma mark - Helper Methods

- (TuneEvent *)convertToTuneEvent:(NSDictionary *)dict
{
    TuneEvent *event = nil;
    
    NSString *strEventName = dict[@"name"];
    NSNumber *numEventId = dict[@"id"];
    
    if((strEventName && ![self isNull:strEventName]) || (numEventId && ![self isNull:numEventId]))
    {
        if(strEventName && ![self isNull:strEventName])
        {
            event = [TuneEvent eventWithName:strEventName];
        }
        else
        {
            int eventId = [numEventId intValue];
            
            event = [TuneEvent eventWithId:eventId];
        }
        
        NSString *strContentId = dict[@"contentId"];
        NSString *strContentType = dict[@"contentType"];
        NSString *strCurrency = dict[@"currency"];
        NSString *strEventAttribute1 = dict[@"attribute1"];
        NSString *strEventAttribute2 = dict[@"attribute2"];
        NSString *strEventAttribute3 = dict[@"attribute3"];
        NSString *strEventAttribute4 = dict[@"attribute4"];
        NSString *strEventAttribute5 = dict[@"attribute5"];
        NSString *strReceipt = dict[@"receipt"];
        NSString *strRefId = dict[@"advertiserRefId"];
        NSString *strSearchString = dict[@"searchString"];
        
        NSNumber *numLevel = dict[@"level"];
        NSNumber *numQuantity = dict[@"revenue"];
        NSNumber *numRev = dict[@"revenue"];
        NSNumber *numRating = dict[@"rating"];
        NSNumber *numTransactionState = dict[@"transactionState"];
        NSNumber *numDate1Millis = dict[@"date1"];
        NSNumber *numDate2Millis = dict[@"date2"];
        
        NSArray *arrItems = dict[@"eventItems"];
        
        if(numDate1Millis && ![self isNull:numDate1Millis])
        {
            double dateMillis = [numDate1Millis doubleValue];
            NSDate *date1 = [NSDate dateWithTimeIntervalSince1970:dateMillis / 1000];
            event.date1 = date1;
        }
        if(numDate2Millis && ![self isNull:numDate2Millis])
        {
            double dateMillis = [numDate2Millis doubleValue];
            NSDate *date2 = [NSDate dateWithTimeIntervalSince1970:dateMillis / 1000];
            event.date2 = date2;
        }
        if(strContentId && ![self isNull:strContentId])
        {
            event.contentId = strContentId;
        }
        if(strContentType && ![self isNull:strContentType])
        {
            event.contentType = strContentType;
        }
        if(strSearchString && ![self isNull:strSearchString])
        {
            event.searchString = strSearchString;
        }
        if (numLevel && ![self isNull:numLevel])
        {
            event.level = [numLevel intValue];
        }
        if (numQuantity && ![self isNull:numQuantity])
        {
            event.quantity = [numQuantity intValue];
        }
        if (numRating && ![self isNull:numRating])
        {
            event.rating = [numRating doubleValue];
        }
        if(strEventAttribute1 && ![self isNull:strEventAttribute1])
        {
            event.attribute1 = strEventAttribute1;
        }
        if(strEventAttribute2 && ![self isNull:strEventAttribute2])
        {
            event.attribute2 = strEventAttribute2;
        }
        if(strEventAttribute3 && ![self isNull:strEventAttribute3])
        {
            event.attribute3 = strEventAttribute3;
        }
        if(strEventAttribute4 && ![self isNull:strEventAttribute4])
        {
            event.attribute4 = strEventAttribute4;
        }
        if(strEventAttribute5 && ![self isNull:strEventAttribute5])
        {
            event.attribute5 = strEventAttribute5;
        }
        if(strRefId && ![self isNull:strRefId])
        {
            event.refId = strRefId;
        }
        if(strCurrency && ![self isNull:strCurrency])
        {
            event.currencyCode = strCurrency;
        }
        
        double revenue = 0;
        if(numRev && ![self isNull:numRev])
        {
            revenue = [numRev doubleValue];
        }
        
        // Ref: https://developer.apple.com/library/mac/documentation/StoreKit/Reference/SKPaymentTransaction_Class/Reference/Reference.html#//apple_ref/c/econst/SKPaymentTransactionStatePurchased
        // default to -1, since valid values start from 0
        int transactionState = -1;
        if(numTransactionState && ![self isNull:numTransactionState])
        {
            transactionState = [numTransactionState intValue];
        }
        
        NSData *receiptData = nil;
        if(strReceipt && ![self isNull:strReceipt])
        {
            receiptData = [[NSData alloc] initWithBase64EncodedString:strReceipt options:0];
        }
        
        // handle null value
        arrItems = [self isNull:arrItems] ? nil : arrItems;
        // convert array of dictionary representations to array of TuneEventItem
        arrItems = [self convertToTuneEventItems:arrItems];
        
        event.eventItems = arrItems;
        event.revenue = revenue;
        event.transactionState = transactionState;
        event.receipt = receiptData;
    }
    
    return event;
}

- (NSArray *)convertToTuneEventItems:(NSArray *)arrDictionaries
{
    NSMutableArray *arrItems = [NSMutableArray array];
    
    for (NSDictionary *dict in arrDictionaries) {
        
        NSString *strName = [dict valueForKey:@"item"];
        if(strName && ![self isNull:strName])
        {
            NSString *name = strName;
            
            NSString *strUnitPrice = [dict valueForKey:@"unit_price"];
            float unitPrice = 0;
            if(strUnitPrice && ![self isNull:strUnitPrice])
            {
                unitPrice = [strUnitPrice floatValue];
            }
            
            NSString *strQuantity = [dict valueForKey:@"quantity"];
            int quantity = 0;
            if(strQuantity && ![self isNull:strQuantity])
            {
                unitPrice = [strQuantity intValue];
            }
            
            NSString *strRevenue = [dict valueForKey:@"revenue"];
            float revenue = 0;
            if(strRevenue && ![self isNull:strRevenue])
            {
                unitPrice = [strRevenue floatValue];
            }
            
            NSString *strAttribute1 = [dict valueForKey:@"attribute1"];
            NSString *attribute1 = nil;
            if(strAttribute1 && ![self isNull:strAttribute1])
            {
                attribute1 = strAttribute1;
            }
            
            NSString *strAttribute2 = [dict valueForKey:@"attribute2"];
            NSString *attribute2 = nil;
            if(strAttribute2 && ![self isNull:strAttribute2])
            {
                attribute2 = strAttribute2;
            }
            
            NSString *strAttribute3 = [dict valueForKey:@"attribute3"];
            NSString *attribute3 = nil;
            if(strAttribute3 && ![self isNull:strAttribute3])
            {
                attribute3 = strAttribute3;
            }
            
            NSString *strAttribute4 = [dict valueForKey:@"attribute4"];
            NSString *attribute4 = nil;
            if(strAttribute4 && ![self isNull:strAttribute4])
            {
                attribute4 = strAttribute4;
            }
            
            NSString *strAttribute5 = [dict valueForKey:@"attribute5"];
            NSString *attribute5 = nil;
            if(strAttribute5 && ![self isNull:strAttribute5])
            {
                attribute5 = strAttribute5;
            }
            
            TuneEventItem *item = [TuneEventItem eventItemWithName:name
                                                         unitPrice:unitPrice
                                                          quantity:quantity
                                                           revenue:revenue
                                                        attribute1:attribute1
                                                        attribute2:attribute2
                                                        attribute3:attribute3
                                                        attribute4:attribute4
                                                        attribute5:attribute5];
            
            [arrItems addObject:item];
        }
    }
    
    return arrItems;
}

- (TunePreloadData *)convertToTunePreloadData:(NSDictionary *)dict
{
    TunePreloadData *pd = nil;
    
    NSString *publisherId = [dict valueForKey:@"publisherId"];
    
    if(publisherId)
    {
        pd = [TunePreloadData preloadDataWithPublisherId:publisherId];
        
        NSString *advertiserSubAd = [dict valueForKey:@"advertiserSubAd"];
        NSString *advertiserSubAdgroup = [dict valueForKey:@"advertiserSubAdgroup"];
        NSString *advertiserSubCampaign = [dict valueForKey:@"advertiserSubCampaign"];
        NSString *advertiserSubKeyword = [dict valueForKey:@"advertiserSubKeyword"];
        NSString *advertiserSubPublisher = [dict valueForKey:@"advertiserSubPublisher"];
        NSString *advertiserSubSite = [dict valueForKey:@"advertiserSubSite"];
        NSString *agencyId = [dict valueForKey:@"agencyId"];
        NSString *offerId= [dict valueForKey:@"offerId"];
        NSString *publisherReferenceId = [dict valueForKey:@"publisherReferenceId"];
        NSString *publisherSub1 = [dict valueForKey:@"publisherSub1"];
        NSString *publisherSub2 = [dict valueForKey:@"publisherSub2"];
        NSString *publisherSub3 = [dict valueForKey:@"publisherSub3"];
        NSString *publisherSub4 = [dict valueForKey:@"publisherSub4"];
        NSString *publisherSub5 = [dict valueForKey:@"publisherSub5"];
        NSString *publisherSubAd = [dict valueForKey:@"publisherSubAd"];
        NSString *publisherSubAdgroup = [dict valueForKey:@"publisherSubAdgroup"];
        NSString *publisherSubCampaign = [dict valueForKey:@"publisherSubCampaign"];
        NSString *publisherSubKeyword = [dict valueForKey:@"publisherSubKeyword"];
        NSString *publisherSubPublisher = [dict valueForKey:@"publisherSubPublisher"];
        NSString *publisherSubSite = [dict valueForKey:@"publisherSubSite"];
        
        if(advertiserSubAd && ![self isNull:advertiserSubAd])
        {
            pd.advertiserSubAd = advertiserSubAd;
        }
        
        if(advertiserSubAdgroup && ![self isNull:advertiserSubAdgroup])
        {
            pd.advertiserSubAdgroup = advertiserSubAdgroup;
        }
        
        if(advertiserSubCampaign && ![self isNull:advertiserSubCampaign])
        {
            pd.advertiserSubCampaign = advertiserSubCampaign;
        }
        
        if(advertiserSubKeyword && ![self isNull:advertiserSubKeyword])
        {
            pd.advertiserSubKeyword = advertiserSubKeyword;
        }
        
        if(advertiserSubPublisher && ![self isNull:advertiserSubPublisher])
        {
            pd.advertiserSubPublisher = advertiserSubPublisher;
        }
        
        if(advertiserSubSite && ![self isNull:advertiserSubSite])
        {
            pd.advertiserSubSite = advertiserSubSite;
        }
        
        if(agencyId && ![self isNull:agencyId])
        {
            pd.agencyId = agencyId;
        }
        
        if(offerId && ![self isNull:offerId])
        {
            pd.offerId = offerId;
        }
        
        if(publisherReferenceId && ![self isNull:publisherReferenceId])
        {
            pd.publisherReferenceId = publisherReferenceId;
        }
        
        if(publisherSub1 && ![self isNull:publisherSub1])
        {
            pd.publisherSub1 = publisherSub1;
        }
        
        if(publisherSub2 && ![self isNull:publisherSub2])
        {
            pd.publisherSub2 = publisherSub2;
        }
        
        if(publisherSub3 && ![self isNull:publisherSub3])
        {
            pd.publisherSub3 = publisherSub3;
        }
        
        if(publisherSub4 && ![self isNull:publisherSub4])
        {
            pd.publisherSub4 = publisherSub4;
        }
        
        if(publisherSub5 && ![self isNull:publisherSub5])
        {
            pd.publisherSub5 = publisherSub5;
        }
        
        if(publisherSubAd && ![self isNull:publisherSubAd])
        {
            pd.publisherSubAd = publisherSubAd;
        }
        
        if(publisherSubAdgroup && ![self isNull:publisherSubAdgroup])
        {
            pd.publisherSubAdgroup = publisherSubAdgroup;
        }
        
        if(publisherSubCampaign && ![self isNull:publisherSubCampaign])
        {
            pd.publisherSubCampaign = publisherSubCampaign;
        }
        
        if(publisherSubKeyword && ![self isNull:publisherSubKeyword])
        {
            pd.publisherSubKeyword = publisherSubKeyword;
        }
        
        if(publisherSubPublisher && ![self isNull:publisherSubPublisher])
        {
            pd.publisherSubPublisher = publisherSubPublisher;
        }
        
        if(publisherSubSite && ![self isNull:publisherSubSite])
        {
            pd.publisherSubSite = publisherSubSite;
        }
    }
    
    return pd;
}

#pragma mark - Helper Methods

- (void)throwInvalidArgsErrorForCommand:(CDVInvokedUrlCommand*)command
{
    NSString *msg = [NSString stringWithFormat:@"Invalid arguments passed: %@", command.arguments];
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:msg];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
}

- (BOOL)isNull:(id)obj
{
    return obj == [NSNull null];
}

#pragma mark - TuneDelegate Methods

- (void)tuneDidSucceedWithData:(id)data
{
    NSString *str = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    NSLog(@"TunePlugin.tuneDelegate.success: %@", str);
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:[[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding]];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:tuneDelegateCallbackId];
}

- (void)tuneDidFailWithError:(NSError *)error
{
    NSLog(@"TunePlugin.tuneDelegate.failure: %@", error);
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:error.description];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:tuneDelegateCallbackId];
}

- (void)tuneEnqueuedActionWithReferenceId:(NSString *)referenceId
{
    NSLog(@"TunePlugin.tuneDelegate.enqueued: %@", referenceId);
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:referenceId];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:tuneDelegateCallbackId];
}

- (void)tuneDidReceiveDeeplink:(NSString *)deeplink
{
    NSLog(@"TunePlugin.tuneDelegate.deferredDeeplink: %@", deeplink);
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:deeplink];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:tuneDeeplinkCallbackId];
    
}

- (void)tuneDidFailDeeplinkWithError:(NSError *)error
{
    NSLog(@"TunePlugin.tuneDelegate.tuneDidFailDeeplinkWithError = %@", error);
    
    CDVPluginResult *pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:error.description];
    [pluginResult setKeepCallbackAsBool:YES];
    [self.commandDelegate sendPluginResult:pluginResult callbackId:tuneDeeplinkCallbackId];
}

@end
