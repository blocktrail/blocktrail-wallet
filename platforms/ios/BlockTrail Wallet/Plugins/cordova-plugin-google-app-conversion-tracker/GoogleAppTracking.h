/********* GoogleAppTracking.h Cordova Plugin Header *******/

#import <Cordova/CDV.h>

@interface GoogleAppTracking : CDVPlugin

- (void)track:(CDVInvokedUrlCommand*)command;

@end
