/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
 */

#import "CDVContactsPhoneNumbers.h"
#import <UIKit/UIKit.h>

@implementation CDVContactsPhoneNumbers

- (void)list:(CDVInvokedUrlCommand*)command
{
    NSString* callbackId = command.callbackId;

    [self.commandDelegate runInBackground:^{

        CDVAddressBookPhoneNumberHelper* abHelper = [[CDVAddressBookPhoneNumberHelper alloc] init];
        CDVContactsPhoneNumbers* __weak weakSelf = self;

        [abHelper createAddressBook: ^(ABAddressBookRef addrBook) {
            if (addrBook == NULL) { // permission was denied or other error - return error
                CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:@"unauthorized"];
                [weakSelf.commandDelegate sendPluginResult:result callbackId:callbackId];
                return;
            }

            NSMutableArray* contactsWithPhoneNumbers = [[NSMutableArray alloc] init];

            CFArrayRef records = ABAddressBookCopyArrayOfAllPeople(addrBook);
            NSArray *phoneContacts = (__bridge NSArray*)records;
            CFRelease(records);

            for(int i = 0; i < phoneContacts.count; i++) {
                ABRecordRef ref = (__bridge ABRecordRef)[phoneContacts objectAtIndex:i];

                ABMultiValueRef phones = ABRecordCopyValue(ref, kABPersonPhoneProperty);
                int countPhones = ABMultiValueGetCount(phones);
                //we skip users with no phone numbers
                if (countPhones > 0) {
                    NSMutableArray* phoneNumbersArray = [[NSMutableArray alloc] init];

                    for(CFIndex j = 0; j < countPhones; j++) {
                        CFStringRef phoneNumberRef = ABMultiValueCopyValueAtIndex(phones, j);
                        CFStringRef phoneTypeLabelRef = ABMultiValueCopyLabelAtIndex(phones, j);
                        NSString *number = (__bridge NSString *) phoneNumberRef;
                        NSString *phoneLabel = @"OTHER";
                        if (phoneTypeLabelRef) {
                            if (CFEqual(phoneTypeLabelRef, kABWorkLabel)) {
                                phoneLabel = @"WORK";
                            } else if (CFEqual(phoneTypeLabelRef, kABHomeLabel)) {
                                phoneLabel = @"HOME";
                            } else if (CFEqual(phoneTypeLabelRef, kABPersonPhoneMobileLabel)) {
                                phoneLabel = @"MOBILE";
                            } else if (CFEqual(phoneTypeLabelRef, kABPersonPhoneIPhoneLabel)) {
                                phoneLabel = @"IPHONE";
                            } else if (CFEqual(phoneTypeLabelRef, kABPersonPhoneMainLabel)) {
                                phoneLabel = @"MAIN";
                            } else if (CFEqual(phoneTypeLabelRef, kABPersonPhoneHomeFAXLabel)) {
                                phoneLabel = @"HOMEFAX";
                            } else if (CFEqual(phoneTypeLabelRef, kABPersonPhoneWorkFAXLabel)) {
                                phoneLabel = @"WORKFAX";
                            } else if (CFEqual(phoneTypeLabelRef, kABPersonPhoneOtherFAXLabel)) {
                                phoneLabel = @"OTHERFAX";
                            } else if (CFEqual(phoneTypeLabelRef, kABPersonPhonePagerLabel)) {
                                phoneLabel = @"PAGER";
                            }
                        }

                        // creating the nested element with the phone number details
                        NSMutableDictionary* phoneNumberDictionary = [NSMutableDictionary dictionaryWithCapacity:1];
                        [phoneNumberDictionary setObject: number forKey:@"number"];
                        [phoneNumberDictionary setObject: number forKey:@"normalizedNumber"];
                        [phoneNumberDictionary setObject: phoneLabel forKey:@"type"];
                        // adding this phone number to the list of phone numbers for this user
                        [phoneNumbersArray addObject:phoneNumberDictionary];

                        if (phoneNumberRef) CFRelease(phoneNumberRef);
                        if (phoneTypeLabelRef) CFRelease(phoneTypeLabelRef);
                    }

                    // creating the contact object
                    NSString *displayName;

                    NSString *firstName = (__bridge_transfer NSString*)ABRecordCopyValue(ref, kABPersonFirstNameProperty);
                    if (!firstName)
                        firstName = @"";
                    displayName = firstName;

                    NSString *middleName = (__bridge_transfer NSString*)ABRecordCopyValue(ref, kABPersonMiddleNameProperty);
                    if (!middleName) {
                        middleName = @"";
                    }
                    else {
                        if (displayName.length)
                            displayName = [displayName stringByAppendingString:@" "];
                        displayName = [displayName stringByAppendingString:middleName];
                    }

                    NSString *lastName = (__bridge_transfer NSString*)ABRecordCopyValue(ref, kABPersonLastNameProperty);
                    if (!lastName) {
                        lastName = @"";
                    }
                    else {
                        if (displayName.length)
                            displayName = [displayName stringByAppendingString:@" "];
                        displayName = [displayName stringByAppendingString:lastName];
                    }

                    NSString *contactId = [NSString stringWithFormat:@"%d", ABRecordGetRecordID(ref)];

                    //NSLog(@"Name %@ - %@", displayName, contactId);

                    NSMutableDictionary* contactDictionary = [NSMutableDictionary dictionaryWithCapacity:1];
                    [contactDictionary setObject: contactId forKey:@"id"];
                    [contactDictionary setObject: displayName forKey:@"displayName"];
                    [contactDictionary setObject: firstName forKey:@"firstName"];
                    [contactDictionary setObject: lastName forKey:@"lastName"];
                    [contactDictionary setObject: middleName forKey:@"middleName"];
                    [contactDictionary setObject: phoneNumbersArray forKey:@"phoneNumbers"];

                    //add the contact to the list to return
                    [contactsWithPhoneNumbers addObject:contactDictionary];
                }
                CFRelease(phones);
            }

            CDVPluginResult* result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:contactsWithPhoneNumbers];
            [weakSelf.commandDelegate sendPluginResult:result callbackId:callbackId];

            if (addrBook) {
                CFRelease(addrBook);
            }
        }];
    }];

    return;
}
@end



@implementation CDVAddressBookPhoneNumberHelper

/**
 * NOTE: workerBlock is responsible for releasing the addressBook that is passed to it
 */
- (void)createAddressBook:(CDVAddressBookWorkerBlock)workerBlock
{
    ABAddressBookRef addrBook = ABAddressBookCreateWithOptions(NULL, nil);
    ABAddressBookRequestAccessWithCompletion(addrBook, ^(bool granted, CFErrorRef error) {
        // callback can occur in background, address book must be accessed on thread it was created on
        dispatch_sync(dispatch_get_main_queue(), ^{
            workerBlock(error || !granted ? NULL : addrBook);
        });
    });
}

@end
