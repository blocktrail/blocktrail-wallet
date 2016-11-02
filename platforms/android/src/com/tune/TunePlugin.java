package com.tune;

import java.lang.Double;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.provider.Settings.Secure;
import android.telephony.TelephonyManager;
import android.view.View;
import android.view.ViewGroup;
import android.widget.RelativeLayout;

import com.tune.Tune;
import com.tune.TuneDeeplinkListener;
import com.tune.TuneEvent;
import com.tune.TuneEventItem;
import com.tune.TuneGender;
import com.tune.TuneListener;
import com.tune.TunePreloadData;
import com.tune.TuneUtils;

public class TunePlugin extends CordovaPlugin {
    public static final String INIT = "init";
    public static final String MEASUREEVENT = "measureEvent";
    public static final String MEASUREEVENTNAME = "measureEventName";
    public static final String MEASUREEVENTID = "measureEventId";
    public static final String MEASURESESSION = "measureSession";
    public static final String CHECKFORDEFERREDDEEPLINK = "checkForDeferredDeeplink";
    public static final String SETAGE = "setAge";
    public static final String SETANDROIDID = "setAndroidId";
    public static final String SETANDROIDIDMD5 = "setAndroidIdMd5";
    public static final String SETANDROIDIDSHA1 = "setAndroidIdSha1";
    public static final String SETANDROIDIDSHA256 = "setAndroidIdSha256";
    public static final String SETAPPADMEASUREMENT = "setAppAdMeasurement";
    public static final String SETDEBUG = "setDebugMode";
    public static final String SETDEEPLINK = "setDeepLink";
    public static final String SETDELEGATE = "setDelegate";
    public static final String SETDEVICEID = "setDeviceId";
    public static final String SETEMAILCOLLECTION = "setEmailCollection";
    public static final String SETEXISTINGUSER = "setExistingUser";
    public static final String SETFBEVENTLOGGING = "setFacebookEventLogging";
    public static final String SETGENDER = "setGender";
    public static final String SETGOOGLEADVERTISINGID = "setGoogleAdvertisingId";
    public static final String SETLOCATION = "setLocation";
    public static final String SETLOCATIONWITHALTITUDE = "setLocationWithAltitude";
    public static final String SETPACKAGENAME = "setPackageName";
    public static final String SETPAYINGUSER = "setPayingUser";
    public static final String SETPRELOADDATA = "setPreloadData";
    public static final String SETTPID = "setTRUSTeId";
    public static final String SETUSEREMAIL = "setUserEmail";
    public static final String SETUSERID = "setUserId";
    public static final String SETUSERNAME = "setUserName";
    public static final String SETFBUSERID = "setFacebookUserId";
    public static final String SETTWUSERID = "setTwitterUserId";
    public static final String SETGGUSERID = "setGoogleUserId";
    public static final String GETMATID = "getMatId";
    public static final String GETTUNEID = "getTuneId";
    public static final String GETOPENLOGID = "getOpenLogId";
    public static final String GETISPAYINGUSER = "getIsPayingUser";
    
    private Tune tune;
    
    @Override
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) {
        if (INIT.equals(action)) {
            String advertiserId = args.optString(0);
            String advertiserKey = args.optString(1);
            if (advertiserId.length() > 0 && advertiserKey.length() > 0) {
                tune = Tune.init(cordova.getActivity(), advertiserId, advertiserKey);
                tune.setPluginName("phonegap");
                tune.setReferralSources(cordova.getActivity());
                callbackContext.success();
            } else {
                callbackContext.error("TUNE advertiser ID or key is empty");
            }
            return true;
        } else if (MEASURESESSION.equals(action)) {
            if (tune != null) {
                tune.measureSession();
            }
            callbackContext.success();
            return true;
        } else if (MEASUREEVENTNAME.equals(action)) {
            String eventName = args.optString(0);
            if (eventName.length() > 0) {
                if (tune != null) {
                    tune.measureEvent(eventName);
                }
                callbackContext.success();
            } else {
                callbackContext.error("Event name is empty");
            }
            return true;
        } else if (MEASUREEVENTID.equals(action)) {
            int eventId = args.optInt(0);
            if (tune != null) {
                tune.measureEvent(eventId);
            }
            callbackContext.success();
            return true;
        } else if (MEASUREEVENT.equals(action)) {
            // Parse TuneEvent from first arg
            JSONObject tuneEvent = args.optJSONObject(0);
            if (tuneEvent != null && tune != null) {
                String eventName        = tuneEvent.optString("name");
                double revenue          = tuneEvent.optDouble("revenue");
                String currencyCode     = tuneEvent.optString("currency");
                String refId            = tuneEvent.optString("advertiserRefId");
                JSONArray eventItems    = tuneEvent.optJSONArray("eventItems");
                String receiptData      = tuneEvent.optString("receipt");
                String receiptSignature = tuneEvent.optString("receiptSignature");
                String contentType      = tuneEvent.optString("contentType");
                String contentId        = tuneEvent.optString("contentId");
                int level               = tuneEvent.optInt("level");
                int quantity            = tuneEvent.optInt("quantity");
                String searchString     = tuneEvent.optString("searchString");
                double rating           = tuneEvent.optDouble("rating");
                double date1            = tuneEvent.optDouble("date1");
                double date2            = tuneEvent.optDouble("date2");
                String attribute1       = tuneEvent.optString("attribute1");
                String attribute2       = tuneEvent.optString("attribute2");
                String attribute3       = tuneEvent.optString("attribute3");
                String attribute4       = tuneEvent.optString("attribute4");
                String attribute5       = tuneEvent.optString("attribute5");

                if (!eventName.isEmpty()) {
                    // Create TuneEvent from JSONObject fields
                    TuneEvent event = new TuneEvent(eventName);
                    if (!Double.isNaN(revenue)) {
                        event.withRevenue(revenue);
                    }
                    event.withCurrencyCode(currencyCode);
                    event.withAdvertiserRefId(refId);
                    if (eventItems != null) {
                        // Convert JSONArray of JSONObjects into List of TuneEventItems
                        List<TuneEventItem> eventItemList = new ArrayList<TuneEventItem>();
                        for (int i = 0; i < eventItems.length(); i++) {
                            JSONObject item = eventItems.optJSONObject(i);
                            if (!item.has("item")) {
                                // If event item missing item name, go to next item
                                continue;
                            }
                            String name = item.optString("item");
                            int itemQuantity = item.optInt("quantity");
                            double unitPrice = item.optDouble("unit_price", 0);
                            double itemRevenue = item.optDouble("revenue", 0);
                            String attribute_sub1 = item.optString("attribute_sub1");
                            String attribute_sub2 = item.optString("attribute_sub2");
                            String attribute_sub3 = item.optString("attribute_sub3");
                            String attribute_sub4 = item.optString("attribute_sub4");
                            String attribute_sub5 = item.optString("attribute_sub5");
                            
                            TuneEventItem eventItem = new TuneEventItem(name)
                                                         .withQuantity(itemQuantity)
                                                         .withUnitPrice(unitPrice)
                                                         .withRevenue(itemRevenue)
                                                         .withAttribute1(attribute_sub1)
                                                         .withAttribute2(attribute_sub2)
                                                         .withAttribute3(attribute_sub3)
                                                         .withAttribute4(attribute_sub4)
                                                         .withAttribute5(attribute_sub5);
                            eventItemList.add(eventItem);
                        }
                        event.withEventItems(eventItemList);
                    }
                    event.withReceipt(receiptData, receiptSignature);
                    event.withContentType(contentType);
                    event.withContentId(contentId);
                    if (level != 0) {
                        event.withLevel(level);
                    }
                    if (quantity != 0) {
                        event.withQuantity(quantity);
                    }
                    event.withSearchString(searchString);
                    if (!Double.isNaN(rating)) {
                        event.withRating(rating);
                    }
                    if (!Double.isNaN(date1)) {
                        event.withDate1(new Date((long)date1));
                    }
                    if (!Double.isNaN(date2)) {
                        event.withDate2(new Date((long)date2));
                    }
                    event.withAttribute1(attribute1);
                    event.withAttribute2(attribute2);
                    event.withAttribute3(attribute3);
                    event.withAttribute4(attribute4);
                    event.withAttribute5(attribute5);

                    // Call measureEvent with constructed TuneEvent
                    tune.measureEvent(event);
                    callbackContext.success();
                } else {
                    callbackContext.error("Event name is empty");
                }
            }
            return true;
        } else if (CHECKFORDEFERREDDEEPLINK.equals(action)) {
            if (tune != null) {
                tune.checkForDeferredDeeplink(new TuneDeeplinkListener() {
                    @Override
                    public void didReceiveDeeplink(String deeplink) {
                        PluginResult result = new PluginResult(PluginResult.Status.OK, deeplink);
                        callbackContext.sendPluginResult(result);
                    }

                    @Override
                    public void didFailDeeplink(String error) {
                        PluginResult result = new PluginResult(PluginResult.Status.ERROR, error);
                        callbackContext.sendPluginResult(result);
                    }
                });
            }
            return true;
        } else if (SETAGE.equals(action)) {
            int age = args.optInt(0);
            if (tune != null && age != 0) {
                tune.setAge(age);
            }
            callbackContext.success();
            return true;
        } else if (SETANDROIDID.equals(action)) {
            boolean enableAndroidId = args.optBoolean(0);
            if (tune != null && enableAndroidId) {
                String androidId = Secure.getString(cordova.getActivity().getApplicationContext().getContentResolver(), Secure.ANDROID_ID);
                tune.setAndroidId(androidId);
            }
            callbackContext.success();
            return true;
        } else if (SETANDROIDIDMD5.equals(action)) {
            boolean enableAndroidIdMd5 = args.optBoolean(0);
            if (tune != null && enableAndroidIdMd5) {
                String androidId = Secure.getString(cordova.getActivity().getApplicationContext().getContentResolver(), Secure.ANDROID_ID);
                tune.setAndroidIdMd5(TuneUtils.md5(androidId));
            }
            callbackContext.success();
            return true;
        } else if (SETANDROIDIDSHA1.equals(action)) {
            boolean enableAndroidIdSha1 = args.optBoolean(0);
            if (tune != null && enableAndroidIdSha1) {
                String androidId = Secure.getString(this.cordova.getActivity().getApplicationContext().getContentResolver(), Secure.ANDROID_ID);
                tune.setAndroidIdSha1(TuneUtils.sha1(androidId));
            }
            callbackContext.success();
            return true;
        } else if (SETANDROIDIDSHA256.equals(action)) {
            boolean enableAndroidIdSha256 = args.optBoolean(0);
            if (tune != null && enableAndroidIdSha256) {
                String androidId = Secure.getString(this.cordova.getActivity().getApplicationContext().getContentResolver(), Secure.ANDROID_ID);
                tune.setAndroidIdSha256(TuneUtils.sha256(androidId));
            }
            callbackContext.success();
            return true;
        } else if (SETAPPADMEASUREMENT.equals(action)) {
            boolean adTracking = args.optBoolean(0);
            if (tune != null) {
                tune.setAppAdTrackingEnabled(adTracking);
            }
            callbackContext.success();
            return true;
        } else if (SETDEBUG.equals(action)) {
            boolean debug = args.optBoolean(0);
            if (tune != null) {
                tune.setDebugMode(debug);
            }
            callbackContext.success();
            return true;
        } else if (SETDEEPLINK.equals(action)) {
            String deepLinkUrl = args.optString(0);
            if (tune != null) {
                tune.setReferralUrl(deepLinkUrl);
            }
            callbackContext.success();
            return true;
        } else if (SETDEVICEID.equals(action)) {
            boolean enableDeviceId = args.optBoolean(0);
            if (tune != null && enableDeviceId) {
                // Check for READ_PHONE_STATE permission
                String permission = "android.permission.READ_PHONE_STATE";
                int res = this.cordova.getActivity().getApplicationContext().checkCallingOrSelfPermission(permission);
                if (res == PackageManager.PERMISSION_GRANTED) {
                    TelephonyManager telephonyManager = (TelephonyManager)this.cordova.getActivity().getApplicationContext().getSystemService(Context.TELEPHONY_SERVICE);
                    tune.setDeviceId(telephonyManager.getDeviceId());
                }
            }
            callbackContext.success();
            return true;
        } else if (SETEMAILCOLLECTION.equals(action)) {
            boolean collectEmail = args.optBoolean(0);
            if (tune != null && collectEmail) {
                tune.setEmailCollection(collectEmail);
            }
            callbackContext.success();
            return true;
        } else if (SETEXISTINGUSER.equals(action)) {
            boolean existingUser = args.optBoolean(0);
            if (tune != null) {
                tune.setExistingUser(existingUser);
            }
            callbackContext.success();
            return true;
        } else if (SETFBEVENTLOGGING.equals(action)) {
            boolean fbEventLogging = args.optBoolean(0);
            boolean limitEventAndDataUsage = args.optBoolean(1);
            if (tune != null) {
                tune.setFacebookEventLogging(fbEventLogging, cordova.getActivity(), limitEventAndDataUsage);
            }
            callbackContext.success();
            return true;
        } else if (SETGENDER.equals(action)) {
            try {
                int gender = args.getInt(0);
                if (tune != null) {
                    if (gender == 0) {
                        tune.setGender(TuneGender.MALE);
                    } else if (gender == 1) {
                        tune.setGender(TuneGender.FEMALE);
                    }
                }
                callbackContext.success();
            } catch (JSONException e) {
            }
            return true;
        } else if (SETGOOGLEADVERTISINGID.equals(action)) {
            String googleAid = args.optString(0);
            boolean isLAT = args.optBoolean(1);
            if (tune != null) {
                tune.setGoogleAdvertisingId(googleAid, isLAT);
            }
            callbackContext.success();
            return true;
        } else if (SETLOCATION.equals(action)) {
            double latitude = args.optDouble(0);
            double longitude = args.optDouble(1);
            if (tune != null && !Double.isNaN(latitude) && !Double.isNaN(longitude)) {
                tune.setLatitude(latitude);
                tune.setLongitude(longitude);
            }
            callbackContext.success();
            return true;
        } else if (SETLOCATIONWITHALTITUDE.equals(action)) {
            double latitude = args.optDouble(0);
            double longitude = args.optDouble(1);
            double altitude = args.optDouble(2);
            if (tune != null && !Double.isNaN(latitude) && !Double.isNaN(longitude) && !Double.isNaN(altitude)) {
                tune.setLatitude(latitude);
                tune.setLongitude(longitude);
                tune.setAltitude(altitude);
            }
            callbackContext.success();
            return true;
        } else if (SETPACKAGENAME.equals(action)) {
            String packageName = args.optString(0);
            if (!packageName.isEmpty()) {
                if (tune != null) {
                    tune.setPackageName(packageName);
                }
            }
            callbackContext.success();
            return true;
        } else if (SETPAYINGUSER.equals(action)) {
            boolean payingUser = args.optBoolean(0);
            if (tune != null) {
                tune.setIsPayingUser(payingUser);
            }
            callbackContext.success();
            return true;
        } else if (SETTPID.equals(action)) {
            String tpid = args.optString(0);
            if (!tpid.isEmpty()) {
                if (tune != null) {
                    tune.setTRUSTeId(tpid);
                }
            }
            callbackContext.success();
            return true;
        } else if (SETUSEREMAIL.equals(action)) {
            String userEmail = args.optString(0);
            if (!userEmail.isEmpty()) {
                if (tune != null) {
                    tune.setUserEmail(userEmail);
                }
            }
            callbackContext.success();
            return true;
        } else if (SETUSERID.equals(action)) {
            String userId = args.optString(0);
            if (!userId.isEmpty()) {
                if (tune != null) {
                    tune.setUserId(userId);
                }
            }
            callbackContext.success();
            return true;
        } else if (SETUSERNAME.equals(action)) {
            String userName = args.optString(0);
            if (!userName.isEmpty()) {
                if (tune != null) {
                    tune.setUserName(userName);
                }
            }
            callbackContext.success();
            return true;
        } else if (SETFBUSERID.equals(action)) {
            String userId = args.optString(0);
            if (!userId.isEmpty()) {
                if (tune != null) {
                    tune.setFacebookUserId(userId);
                }
            }
            callbackContext.success();
            return true;
        } else if (SETTWUSERID.equals(action)) {
            String userId = args.optString(0);
            if (!userId.isEmpty()) {
                if (tune != null) {
                    tune.setTwitterUserId(userId);
                }
            }
            callbackContext.success();
            return true;
        } else if (SETGGUSERID.equals(action)) {
            String userId = args.optString(0);
            if (!userId.isEmpty()) {
                if (tune != null) {
                    tune.setGoogleUserId(userId);
                }
            }
            callbackContext.success();
            return true;
        } else if (SETPRELOADDATA.equals(action)) {
            // Parse preload data from first arg
            JSONObject preloadData = args.optJSONObject(0);
            if (preloadData != null && tune != null) {
                String publisherId              = preloadData.optString("publisherId");
                String offerId                  = preloadData.optString("offerId");
                String agencyId                 = preloadData.optString("agencyId");
                String publisherReferenceId     = preloadData.optString("publisherReferenceId");
                String publisherSub1            = preloadData.optString("publisherSub1");
                String publisherSub2            = preloadData.optString("publisherSub2");
                String publisherSub3            = preloadData.optString("publisherSub3");
                String publisherSub4            = preloadData.optString("publisherSub4");
                String publisherSub5            = preloadData.optString("publisherSub5");
                String publisherSubAd           = preloadData.optString("publisherSubAd");
                String publisherSubAdgroup      = preloadData.optString("publisherSubAdgroup");
                String publisherSubCampaign     = preloadData.optString("publisherSubCampaign");
                String publisherSubKeyword      = preloadData.optString("publisherSubKeyword");
                String publisherSubPublisher    = preloadData.optString("publisherSubPublisher");
                String publisherSubSite         = preloadData.optString("publisherSubSite");
                String advertiserSubAd          = preloadData.optString("advertiserSubAd");
                String advertiserSubAdgroup     = preloadData.optString("advertiserSubAdgroup");
                String advertiserSubCampaign    = preloadData.optString("advertiserSubCampaign");
                String advertiserSubKeyword     = preloadData.optString("advertiserSubKeyword");
                String advertiserSubPublisher   = preloadData.optString("advertiserSubPublisher");
                String advertiserSubSite        = preloadData.optString("advertiserSubSite");

                if (!publisherId.isEmpty()) {
                    // Create TunePreloadData from JSONObject fields
                    TunePreloadData tunePreloadData = new TunePreloadData(publisherId)
                                                        .withOfferId(offerId)
                                                        .withAgencyId(agencyId)
                                                        .withPublisherReferenceId(publisherReferenceId)
                                                        .withPublisherSub1(publisherSub1)
                                                        .withPublisherSub2(publisherSub2)
                                                        .withPublisherSub3(publisherSub3)
                                                        .withPublisherSub4(publisherSub4)
                                                        .withPublisherSub5(publisherSub5)
                                                        .withPublisherSubAd(publisherSubAd)
                                                        .withPublisherSubAdgroup(publisherSubAdgroup)
                                                        .withPublisherSubCampaign(publisherSubCampaign)
                                                        .withPublisherSubKeyword(publisherSubKeyword)
                                                        .withPublisherSubPublisher(publisherSubPublisher)
                                                        .withPublisherSubSite(publisherSubSite)
                                                        .withAdvertiserSubAd(advertiserSubAd)
                                                        .withAdvertiserSubAdgroup(advertiserSubAdgroup)
                                                        .withAdvertiserSubCampaign(advertiserSubCampaign)
                                                        .withAdvertiserSubKeyword(advertiserSubKeyword)
                                                        .withAdvertiserSubPublisher(advertiserSubPublisher)
                                                        .withAdvertiserSubSite(advertiserSubSite);
                    tune.setPreloadedApp(tunePreloadData);
                }
            }
            callbackContext.success();
            return true;
        } else if (GETMATID.equals(action) || GETTUNEID.equals(action)) {
            String tuneId = tune.getMatId();
            callbackContext.success(tuneId);
            return true;
        } else if (GETOPENLOGID.equals(action)) {
            String logId = tune.getOpenLogId();
            callbackContext.success(logId);
            return true;
        } else if (GETISPAYINGUSER.equals(action)) {
            boolean payingUser = tune.getIsPayingUser();
            callbackContext.success(String.valueOf(payingUser));
            return true;
        } else if (SETDELEGATE.equals(action)) {
            // default to true
            boolean enabled = args.optBoolean(0, true);
            if (enabled) {
                tune.setListener(new TuneListener() {
                    @Override
                    public void enqueuedActionWithRefId(String refId) {
                    }

                    @Override
                    public void didSucceedWithData(JSONObject data) {
                        PluginResult result = new PluginResult(PluginResult.Status.OK, data.toString());
                        callbackContext.sendPluginResult(result);
                    }

                    @Override
                    public void didFailWithError(JSONObject error) {
                        PluginResult result = new PluginResult(PluginResult.Status.ERROR, error.toString());
                        callbackContext.sendPluginResult(result);
                    }
                });
            }
            return true;
        } else {
            callbackContext.error("Unsupported action on Android");
            return false;
        }
    }
}
