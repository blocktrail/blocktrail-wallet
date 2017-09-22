#import <Foundation/Foundation.h>
#import <QuickLook/QuickLook.h>

#import <Cordova/CDV.h>
#import <Cordova/CDVPlugin.h>

@interface Open : CDVPlugin <QLPreviewControllerDelegate,
                             QLPreviewControllerDataSource, QLPreviewItem>

@property(strong, nonatomic) NSURL *fileUrl;
@property(readonly) NSURL *previewItemURL;
@property (nonatomic, copy) NSString* callbackId;

@end
