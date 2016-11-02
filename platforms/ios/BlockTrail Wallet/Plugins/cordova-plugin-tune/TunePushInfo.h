//
//  TunePushInfo.h
//  TuneMarketingConsoleSDK
//
//  Created by Charles Gilliam on 6/9/16.
//  Copyright © 2016 Tune. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface TunePushInfo : NSObject


/**
 * The campaignId for the message.
 */
@property(nonatomic, copy) NSString *campaignId;

/**
 * The pushId for the notification.
 */
@property(nonatomic, copy) NSString *pushId;

/**
 * The extra information passed in through the payload either from:
 * 1. The "JSON Payload" field in the campaign screen
 * 2. The "extraPushPayload" of the push API
 * Or an empty NSDictionary if nothing was passed through.
 */
@property(nonatomic, copy) NSDictionary *extrasPayload;

@end
