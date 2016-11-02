//
//  TunePreloadData.h
//  Tune
//
//  Created by Harshal Ogale on 4/27/15.
//  Copyright (c) 2015 TUNE. All rights reserved.
//

#import <Foundation/Foundation.h>


@interface TunePreloadData : NSObject

/*!
 Name or ID of the publisher on MAT
 */
@property (nonatomic, copy) NSString *publisherId;

/*!
 ID of the offer in the MAT platform
 */
@property (nonatomic, copy) NSString *offerId;

/*!
 Name of agency connected to the advertiser account in the MAT platform
 */
@property (nonatomic, copy) NSString *agencyId;

/*!
 Reference ID of the publisher
 */
@property (nonatomic, copy) NSString *publisherReferenceId;

/*!
 First optional additional info string param related to the publisher
 */
@property (nonatomic, copy) NSString *publisherSub1;

/*!
 Second optional additional info string param related to the publisher
 */
@property (nonatomic, copy) NSString *publisherSub2;

/*!
 Third optional additional info string param related to the publisher
 */
@property (nonatomic, copy) NSString *publisherSub3;

/*!
 Fourth optional additional info string param related to the publisher
 */
@property (nonatomic, copy) NSString *publisherSub4;

/*!
 Fifth optional additional info string param related to the publisher
 */
@property (nonatomic, copy) NSString *publisherSub5;

/*!
 Name or ID of an ad in campaign on partner’s platform
 */
@property (nonatomic, copy) NSString *publisherSubAd;

/*!
 ID of the ad group in campaign on partner’s platform
 */
@property (nonatomic, copy) NSString *publisherSubAdgroup;

/*!
 Name or ID of the campaign on in partner’s platform
 */
@property (nonatomic, copy) NSString *publisherSubCampaign;

/*!
 Name or ID of the keyword specific to Google AdWords integration and other search campaigns
 */
@property (nonatomic, copy) NSString *publisherSubKeyword;

/*!
 Name or ID of the down-stream publisher
 */
@property (nonatomic, copy) NSString *publisherSubPublisher;

/*!
 Name or ID of the site or mobile app the campaign is in/on
 */
@property (nonatomic, copy) NSString *publisherSubSite;

/*!
 Value of "advertiser_sub_ad" passed into measurement URL on click.
 */
@property (nonatomic, copy) NSString *advertiserSubAd;

/*!
 Value of "sub_adgroup" passed into measurement URL on click.
 */
@property (nonatomic, copy) NSString *advertiserSubAdgroup;

/*!
 Value of "advertiser_sub_campaign" passed into measurement URL on click.
 */
@property (nonatomic, copy) NSString *advertiserSubCampaign;

/*!
 Value of "advertiser_sub_keyword" passed into measurement URL on click.
 */
@property (nonatomic, copy) NSString *advertiserSubKeyword;

/*!
 Value of "advertiser_sub_publisher" passed into measurement URL on click.
 */
@property (nonatomic, copy) NSString *advertiserSubPublisher;

/*!
 Value of "advertiser_sub_site" passed into measurement URL on click.
 */
@property (nonatomic, copy) NSString *advertiserSubSite;


/*!
 Create a new instance with the specified publisher name or ID.
 
 @param publisherId ID of the publisher on MAT
 */
+ (instancetype)preloadDataWithPublisherId:(NSString *)publisherId;

@end
