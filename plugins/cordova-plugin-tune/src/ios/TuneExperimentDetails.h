//
//  TuneExperimentDetails.h
//  TuneMarketingConsoleSDK
//
//  Copyright (c) 2014 Tune Mobile. All rights reserved.
//

#import <Foundation/Foundation.h>

extern NSString *const DetailDictionaryExperimentNameKey;
extern NSString *const DetailDictionaryExperimentIdKey;
extern NSString *const DetailDictionaryExperimentTypeKey;
extern NSString *const DetailDictionaryCurrentVariationKey;
extern NSString *const DetailDictionaryCurrentVariationIdKey;
extern NSString *const DetailDictionaryCurrentVariationNameKey;

extern NSString *const DetailDictionaryTypePowerHook;
extern NSString *const DetailDictionaryTypeInApp;

/**
 * An object containing useful information about an experiment
 **/
@interface TuneExperimentDetails : NSObject

/**
 * The id of the experiment.
 *
 * The experiment id is a unique identifier for an experiment.
 */
@property (nonatomic, readonly) NSString *experimentId;

/**
 * The name of the experiment.
 *
 * The experiment name is the same that you would see in Tune Marketing Automation Tools.
 */
@property (nonatomic, readonly) NSString *experimentName;

/**
 * The type of the experiment.
 */
@property (nonatomic, copy) NSString *experimentType;

/**
 * The current variant id for the experiment.
 *
 * The variant id is a unique identifier for the variation of an Tune Marketing Automation Experiment.
 */
@property (nonatomic, copy) NSString *currentVariantId;

/**
 * The current variant name for the experiment.
 *
 * The variant name is the same that you would see in Tune Marketing Automation Tools. Unless the names were edited in Artisan tools they are "Control", "B", "C", etc.
 */
@property (nonatomic, copy) NSString *currentVariantName;

/**
 * The current variant letter for the experiment.
 *
 * This will the be same as 'currentVariantName' unless you gave it a new name. Otherwise it will give the associated variation letter to the name.
 */
@property (nonatomic, copy) NSString *currentVariantLetter;

/**
 * Return the experiment details as a dictionary
 */
- (NSDictionary *)toDictionary;

@end
