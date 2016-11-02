//
//  TuneEvent.h
//  Tune
//
//  Created by Harshal Ogale on 3/10/15.
//  Copyright (c) 2015 TUNE. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreGraphics/CoreGraphics.h>

@class TuneEventItem;
@class TuneLocation;

/*!
 TUNE pre-defined event string "achievement_unlocked"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_ACHIEVEMENT_UNLOCKED;

/*!
 TUNE pre-defined event string "add_to_cart"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_ADD_TO_CART;

/*!
 TUNE pre-defined event string "add_to_wishlist"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_ADD_TO_WISHLIST;

/*!
 TUNE pre-defined event string "added_payment_info"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_ADDED_PAYMENT_INFO;

/*!
 TUNE pre-defined event string "checkout_initiated"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_CHECKOUT_INITIATED;

/*!
 TUNE pre-defined event string "content_view"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_CONTENT_VIEW;

/*!
 TUNE pre-defined event string "invite"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_INVITE;

/*!
 TUNE pre-defined event string "level_achieved"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_LEVEL_ACHIEVED;

/*!
 TUNE pre-defined event string "login"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_LOGIN;

/*!
 TUNE pre-defined event string "purchase"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_PURCHASE;

/*!
 TUNE pre-defined event string "rated"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_RATED;

/*!
 TUNE pre-defined event string "registration"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_REGISTRATION;

/*!
 TUNE pre-defined event string "reservation"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_RESERVATION;

/*!
 TUNE pre-defined event string "search"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_SEARCH;

/*!
 TUNE pre-defined event string "session". Corresponds to Tune measureSession method.
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_SESSION;

/*!
 TUNE pre-defined event string "share"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_SHARE;

/*!
 TUNE pre-defined event string "spent_credits"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_SPENT_CREDITS;

/*!
 TUNE pre-defined event string "tutorial_complete"
 */
FOUNDATION_EXPORT NSString *const TUNE_EVENT_TUTORIAL_COMPLETE;


/*!
 An event to be measured using Tune. Event details can be set using the optional instance properties.
 */
@interface TuneEvent : NSObject

/*!
 Name of the event
 */
@property(nonatomic, copy, readonly) NSString *eventName;

/*!
 Event ID of the event as defined on the MobileAppTracking dashboard
 */
@property(nonatomic, assign, readonly) NSInteger eventId;

/*!
 An array of TuneEventItem items
 */
@property(nonatomic, copy) NSArray *eventItems;

/*!
 Revenue associated with the event
 */
@property(nonatomic, assign) CGFloat revenue;

/*!
 Currency code associated with the event
 */
@property(nonatomic, copy) NSString *currencyCode;

/*!
 Reference ID associated with the event
 */
@property(nonatomic, copy) NSString *refId;

/*!
 App Store in-app-purchase transaction receipt data
 */
@property(nonatomic, copy) NSData *receipt;

/*!
 Content type associated with the event (e.g., @"shoes")
 */
@property(nonatomic, copy) NSString *contentType;

/*!
 Content ID associated with the event (International Article Number
 (EAN) when applicable, or other product or content identifier)
 */
@property(nonatomic, copy) NSString *contentId;

/*!
 Search string associated with the event
 */
@property(nonatomic, copy) NSString *searchString;

/*!
 Transaction state of App Store in-app-purchase
 */
@property(nonatomic, assign) NSInteger transactionState;

/*!
 Rating associated with the event (e.g., a user rating an item)
 */
@property(nonatomic, assign) CGFloat rating;

/*!
 Level associated with the event (e.g., for a game)
 */
@property(nonatomic, assign) NSInteger level;

/*!
 Quantity associated with the event (e.g., number of items)
 */
@property(nonatomic, assign) NSUInteger quantity;

/*!
 First date associated with the event (e.g., user's check-in time)
 */
@property(nonatomic, strong) NSDate *date1;

/*!
 Second date associated with the next action (e.g., user's check-out time)
 */
@property(nonatomic, strong) NSDate *date2;

/*!
 First custom string attribute for the event
 */
@property(nonatomic, copy) NSString *attribute1;

/*!
 Second custom string attribute for the event
 */
@property(nonatomic, copy) NSString *attribute2;

/*!
 Third custom string attribute for the event
 */
@property(nonatomic, copy) NSString *attribute3;

/*!
 Fourth custom string attribute for the event
 */
@property(nonatomic, copy) NSString *attribute4;

/*!
 Fifth custom string attribute for the event
 */
@property(nonatomic, copy) NSString *attribute5;

/*!
 Create a new event with the specified event name.
 
 @param eventName Name of the event
 */
+ (instancetype)eventWithName:(NSString *)eventName;

/*!
 Create a new event with the specified event id that corresponds to an event defined on the MobileAppTracking dashboard.
 
 @param eventId Event ID of the event as defined on the MobileAppTracking dashboard
 */
+ (instancetype)eventWithId:(NSInteger)eventId;

/** Tag this event with a string.
 *
 * Tags can be used to add additional event data for filtering and targeting within Tune In-App Marketing.
 *
 * You may not tag the same event with with the same tag name more than once.
 *
 * @param name Name of the tag.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 *
 * @param value Value for the tag.
 */
- (void)addTag:(NSString *)name withStringValue:(NSString *)value;

/** Tag this event with a date.
 *
 * Tags can be used to add additional event data for filtering and targeting within Tune In-App Marketing.
 *
 * You may not tag the same event with with the same tag name more than once.
 *
 * @param name Name of the tag.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 *
 * @param value Value for the tag.
 */
- (void)addTag:(NSString *)name withDateTimeValue:(NSDate *)value;

/** Tag this event with a number.
 *
 * Tags can be used to add additional event data for filtering and targeting within Tune In-App Marketing.
 *
 * You may not tag the same event with with the same tag name more than once.
 *
 * @param name Name of the tag.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 *
 * @param value Value for the tag.
 */
- (void)addTag:(NSString *)name withNumberValue:(NSNumber *)value;

/** Tag this event with a location.
 *
 * Tags can be used to add additional event data for filtering and targeting within Tune In-App Marketing.
 *
 * You may not tag the same event with with the same tag name more than once.
 *
 * @param name Name of the tag.  Valid characters for this name include [0-9],[a-z],[A-Z], -, and _.  Any other characters will automatically be stripped out.
 *
 * @param value Value for the tag.
 */
- (void)addTag:(NSString *)name withGeolocationValue:(TuneLocation *)value;

@end
