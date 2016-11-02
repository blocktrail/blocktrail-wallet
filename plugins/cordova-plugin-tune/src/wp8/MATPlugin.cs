using System;
using WPCordovaClassLib.Cordova;
using WPCordovaClassLib.Cordova.Commands;
using WPCordovaClassLib.Cordova.JSON;
using System.Collections.Generic;
using MobileAppTracking;
using System.Diagnostics;

namespace Cordova.Extension.Commands
{
    public class MATPlugin : BaseCommand
    {
        public void initTracker(string args)
        {
            string[] optValues = JsonHelper.Deserialize<string[]>(args);

            string matAdId = optValues[0];
            string matConvKey = optValues[1];

            MobileAppTracker.Instance.initializeValues(matAdId, matConvKey);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "initTracker succeeded"));
        }

        /// <summary>
        /// Gets the mat identifier.
        /// </summary>
        /// <param name="args">Arguments.</param>
        /// [Obsolete("getMATId is deprecated. Please use getTuneId instead.")]
        public void getMatId(string args) 
        { 
            getTuneId (args);
        }

        public void getTuneId(string args)
        {
            string tuneId = MobileAppTracker.Instance.GetMatId();
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "{\"" + tuneId + "\"}"));
        }

        public void getOpenLogId(string args) 
        { 
            string openLogId =  MobileAppTracker.Instance.GetOpenLogId();
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "{\"" + openLogId + "\"}"));
        }

        public void getIsPayingUser(string args) 
        { 
            bool isPayingUser = MobileAppTracker.Instance.GetIsPayingUser();
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "{\"" + isPayingUser + "\"}"));
        }

        public void setAge (string args)
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            MobileAppTracker.Instance.SetAge(Convert.ToInt32(optValue));
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setAge succeeded"));
        }

        public void setAllowDuplicates(string args)
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            MobileAppTracker.Instance.SetDebugMode(Boolean.Parse(optValue));
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setAllowDuplicates succeeded"));
        }

        public void setAppAdTracking(string args)
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            MobileAppTracker.Instance.SetAppAdTracking(Boolean.Parse(optValue));
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setAppAdTracking succeeded"));
        }

        public void setCurrencyCode(string args) { return; } //Not supported

        public void setDebugMode(string args) 
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            MobileAppTracker.Instance.SetDebugMode(Boolean.Parse(optValue));
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setDebugMode succeeded"));
        }

        public void setDelegate(string args)
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            if (Boolean.Parse(optValue))
                MobileAppTracker.Instance.SetMATResponse(new MyMATResponse());
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setDelegate succeeded"));
        }

        public void setEventAttribute1(string args)
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; MobileAppTracker.Instance.SetEventAttribute1(optValue);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventAttribute1 succeeded"));
        }

        public void setEventAttribute2(string args) 
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; MobileAppTracker.Instance.SetEventAttribute2(optValue); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventAttribute2 succeeded"));
        }

        public void setEventAttribute3(string args) 
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; MobileAppTracker.Instance.SetEventAttribute3(optValue);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventAttribute3 succeeded"));
        }

        public void setEventAttribute4(string args) 
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; MobileAppTracker.Instance.SetEventAttribute4(optValue); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventAttribute4 succeeded"));
        }

        public void setEventAttribute5(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; MobileAppTracker.Instance.SetEventAttribute5(optValue);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventAttribute5 succeeded"));
        }

        public void setEventContentId(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetEventContentId(optValue); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventContentId succeeded"));
        }

        public void setEventContentType(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetEventContentType(optValue);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventContentType succeeded"));
        }

        public void setEventDate1(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            Debug.WriteLine("Milliseconds date1: " + args);
            double milliseconds = Convert.ToDouble(optValue);
            //datetime starts in 1970
            DateTime datetime = new DateTime(1970, 1, 1);
            
            TimeSpan timeFrom1970 = TimeSpan.FromMilliseconds(milliseconds);
            datetime = datetime.Add(timeFrom1970);
            MobileAppTracker.Instance.SetEventDate1(datetime);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventDate1 succeeded"));
        }

        public void setEventDate2(string args) 
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            Debug.WriteLine("Milliseconds date2: " + args);

            double milliseconds = Convert.ToDouble(optValue);
            //datetime starts in 1970
            DateTime datetime = new DateTime(1970, 1, 1);
            
            TimeSpan timeFrom1970 = TimeSpan.FromMilliseconds(milliseconds);
            datetime = datetime.Add(timeFrom1970);
            MobileAppTracker.Instance.SetEventDate2(datetime);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventDate2 succeeded"));
        }

        public void setEventLevel(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetEventLevel(Convert.ToInt32(optValue)); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventLevel succeeded"));
        }

        public void setEventQuantity(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetEventQuantity(Convert.ToInt32(optValue)); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventQuantity succeeded"));
        }

        public void setEventRating(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetEventRating(Convert.ToDouble(optValue)); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventRating succeeded"));
        }

        public void setEventSearchString(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            MobileAppTracker.Instance.SetEventSearchString(optValue);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setEventSearchString succeeded"));
        }

        public void setExistingUser(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetExistingUser(Boolean.Parse(optValue)); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setExistingUser succeeded"));
        }

        public void setFacebookUserId(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetFacebookUserId(optValue); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setFacebookUserId succeeded"));
        }

        public void setGender(string args) 
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            int gender = Convert.ToInt32(optValue);

            MATGender gender_temp;
            if (gender == 0)
                gender_temp = MATGender.MALE;
            else if (gender == 1)
                gender_temp = MATGender.FEMALE;
            else
                gender_temp = MATGender.NONE;

            MobileAppTracker.Instance.SetGender(gender_temp);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setGender succeeded"));
          
        }

        public void setGoogleUserId(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
            MobileAppTracker.Instance.SetGoogleUserId(optValue); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setGoogleUserId succeeded"));
        }

        public void setLocation(string args)
        {
            string optValue1 = JsonHelper.Deserialize<string[]>(args)[0]; 
            string optValue2 = JsonHelper.Deserialize<string[]>(args)[1]; 
            MobileAppTracker.Instance.SetLatitude(Convert.ToDouble(optValue1));
            MobileAppTracker.Instance.SetLongitude(Convert.ToDouble(optValue2));
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setLocation succeeded"));
        }

        public void setLocationWithAltitude(string args)
        {
            string[] optValues = JsonHelper.Deserialize<string[]>(args);
            string optValue1 = optValues[0];
            string optValue2 = optValues[1];
            string optValue3 = optValues[2];
            MobileAppTracker.Instance.SetLatitude(Convert.ToDouble(optValue1));
            MobileAppTracker.Instance.SetLongitude(Convert.ToDouble(optValue2));
            MobileAppTracker.Instance.SetAltitude(Convert.ToDouble(optValue3));
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setLocationWithAltitude succeeded"));
        }

        public void setPackageName(string args)
        {
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];

            MobileAppTracker.Instance.SetPackageName(optValue);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setPackageName succeeded"));
        }

        public void setPayingUser(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetIsPayingUser(Boolean.Parse(optValue)); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setPayingUser succeeded"));
        }

        public void setTRUSTeId(string args) { return; } //Not supported

        public void setTwitterUserId(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetTwitterUserId(optValue); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setTwitterUserId succeeded"));
        }

        public void setUserEmail(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetUserEmail(optValue); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setUserEmail succeeded"));
        }

        public void setUserId(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetUserId(optValue); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setUserId succeeded"));
        }

        public void setUserName(string args) 
        { 
            string optValue = JsonHelper.Deserialize<string[]>(args)[0]; 
            MobileAppTracker.Instance.SetUserName(optValue); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "setUserName succeeded"));
        }

        public void setUseCookieTracking(string args) { return; } //Not supported

        public void setShouldAutoDetectJailbroken(string args) { return; } //Not supported

        public void setShouldAutoGenerateAppleVendorIdentifier(string args) { return; } //Not supported

        public void setJailbroken(string args) { return; } //Not supported

        public void setAppleAdvertisingIdentifier(string args) { return; } //Not supported

        public void setAppleVendorIdentifier(string args) { return; } //Not supported

        public void applicationDidOpenURL(string args) { return; } //Not supported

        public void startAppToAppTracking(string args) { return; } //Not supported

        public void setRedirectUrl(string args) { return; } //Not supported

        public void setAndroidId(string args) { return; } //Not supported

        public void setDeviceId(string args) { return; } //Not supported

        public void setGoogleAdvertisingId(string args) { return; } //Not supported

        public void measureSession(string nothing)
        {
            MobileAppTracker.Instance.MeasureSession();
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "measure session succeeded"));
        }

        public void measureAction(string args)
        {
            string[] optValues = JsonHelper.Deserialize<string[]>(args);
            string eventName = optValues[0];
            string referenceId = optValues[1];
            string revenue = optValues[2];
            string currency = optValues[3];
            MobileAppTracker.Instance.MeasureAction(eventName, Convert.ToDouble(revenue), currency, referenceId);
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "measureActionWith succeeded"));
        }

        public void measureActionWithItems(string args) 
        {
            string[] optValues = JsonHelper.Deserialize<string[]>(args);
            string eventName = optValues[0];
            string eventItemGroup = optValues[1];
            string referenceId = optValues[2];
            string revenue = optValues[3];
            string currency = optValues[4];

            MATEventItem[] eventItems = JsonHelper.Deserialize<MATEventItem[]>(eventItemGroup);
            
            MobileAppTracker.Instance.MeasureAction(eventName, Convert.ToDouble(revenue), currency, referenceId, new List<MATEventItem>(eventItems)); 
            DispatchCommandResult(new PluginResult(PluginResult.Status.OK, "measureActionWithItems succeeded"));
        }

        public void measureActionWithReceipt(string args) //WP8 does not currently support receipts, so this reverts to measureActionWithItems
        {
            measureActionWithItems(args);
            string optValue = JsonHelper.Deserialize<string[]>(args)[0];
        }
    }

    public class MyMATResponse : MATResponse
    {
        public void DidSucceedWithData(string response)
        {
            Debug.WriteLine("We got server response " + response);
        }

        public void DidFailWithError(string error)
        {
            Debug.WriteLine("We got MAT failure " + error);
        }

        public void EnqueuedActionWithRefId(string refId)
        {
            Debug.WriteLine("Enqueued request with ref id " + refId);
        }
    }
}