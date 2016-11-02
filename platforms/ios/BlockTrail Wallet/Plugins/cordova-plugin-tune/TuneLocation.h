//
//  TuneLocation.h
//  MobileAppTracker
//
//  Created by Harshal Ogale on 8/3/15.
//  Copyright (c) 2015 TUNE. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface TuneLocation : NSObject <NSCoding>

@property (nonatomic, copy) NSNumber *altitude;
@property (nonatomic, copy) NSNumber *latitude;
@property (nonatomic, copy) NSNumber *longitude;

@end
