package com.myhealthteams.plugins;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.google.ads.conversiontracking.*;

public class GoogleAppTracking extends CordovaPlugin {

  @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
      String conversion_id = args.getString(0);
      String tracking_label = args.getString(1);
      String tracking_value = args.getString(2);
      Boolean repeatable = args.getBoolean(3);

      if (action.equals("track")) {
        this.track(conversion_id, tracking_label, tracking_value, repeatable, callbackContext);
        return true;
      }
      return false;
    }

  private void track(String conversion_id, String tracking_label, String tracking_value, Boolean repeatable, CallbackContext callbackContext) {

    try {
      // see: https://developers.google.com/app-conversion-tracking/docs/android-conversion-tracking
      AdWordsConversionReporter.reportWithConversionId(
          this.cordova.getActivity().getApplicationContext(),
          conversion_id,
          tracking_label,
          tracking_value,
          repeatable);
    } catch(final Exception e) {
      callbackContext.error("Error in GoogleAppConversion tracking.");
    }

  }
}

