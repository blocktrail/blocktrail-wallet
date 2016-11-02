//
//  TuneConstants.h
//  TuneMarketingConsoleSDK
//
//  Created by Harshal Ogale on 12/2/15.
//  Copyright © 2015 Tune. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef TuneConstants_h
#define TuneConstants_h

#pragma mark - enumerated types

/** @name Error codes */

typedef NS_ENUM(NSInteger, TuneErrorCode)
{
    TuneNoAdvertiserIDProvided          = 1101,
    TuneNoConversionKeyProvided         = 1102,
    TuneInvalidConversionKey            = 1103,
    TuneServerErrorResponse             = 1111,
    TuneInvalidEventClose               = 1131,
    TuneMeasurementWithoutInitializing  = 1132,
    TuneInvalidDuplicateSession         = 1133
};

/** @name Gender type constants */
typedef NS_ENUM(NSInteger, TuneGender)
{
    TuneGenderMale       = 0,                // Gender type MALE. Equals 0.
    TuneGenderFemale     = 1,                // Gender type FEMALE. Equals 1.
    TuneGenderUnknown    = 2
};


#endif /* TuneConstants_h */

extern NSTimeInterval const DefaultFirstPlaylistDownloadedTimeout;
