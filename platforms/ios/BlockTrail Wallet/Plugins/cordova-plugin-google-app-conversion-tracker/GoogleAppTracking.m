/********* GoogleAppTracking.m Cordova Plugin Implementation *******/

#import "ACTReporter.h"
#import "GoogleAppTracking.h"
#import <Cordova/CDV.h>

@implementation GoogleAppTracking

- (void)track:(CDVInvokedUrlCommand*)command
{
    NSString *conversion_id = [command.arguments objectAtIndex:0];
    NSString *tracking_label = [command.arguments objectAtIndex:1];
    NSString *tracking_value = [command.arguments objectAtIndex:2];
    BOOL repeatable = [[command.arguments objectAtIndex:3] boolValue];

    [self.commandDelegate runInBackground:^{

      // see: https://developers.google.com/app-conversion-tracking/
      [ACTConversionReporter reportWithConversionID:conversion_id label:tracking_label value:tracking_value isRepeatable:repeatable];

      CDVPluginResult* pluginResult = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
      [self.commandDelegate sendPluginResult:pluginResult callbackId:command.callbackId];
    }];
}

@end

