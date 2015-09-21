package com.dbaq.cordova.contactsPhoneNumbers;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.provider.ContactsContract;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.provider.ContactsContract.CommonDataKinds.StructuredName;
import android.provider.ContactsContract.Contacts;
import android.provider.ContactsContract.Contacts.Data;
import android.util.Log;

public class ContactsManager extends CordovaPlugin {

    private CallbackContext callbackContext;
    
    private JSONArray executeArgs;
    
    public static final String ACTION_LIST_CONTACTS = "list";
    
    private static final String LOG_TAG = "Contact Phone Numbers";
    
    public ContactsManager() {}

    /**
     * Executes the request and returns PluginResult.
     *
     * @param action            The action to execute.
     * @param args              JSONArray of arguments for the plugin.
     * @param callbackContext   The callback context used when calling back into JavaScript.
     * @return                  True if the action was valid, false otherwise.
     */
    public boolean execute(String action, JSONArray args, final CallbackContext callbackContext) throws JSONException {
        
        this.callbackContext = callbackContext;
        this.executeArgs = args; 
        
        if (ACTION_LIST_CONTACTS.equals(action)) {
            this.cordova.getThreadPool().execute(new Runnable() {
                public void run() {
                    callbackContext.success(list());
                }
            });    
            return true;
        }
        
        return false;
    }
    
    private JSONArray list() {
        JSONArray contacts = new JSONArray(); 
        ContentResolver cr = this.cordova.getActivity().getContentResolver();
        String[] projection = new String[] { 
            ContactsContract.Contacts.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME,
            ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME,
            ContactsContract.Contacts.HAS_PHONE_NUMBER,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.NORMALIZED_NUMBER,
            ContactsContract.CommonDataKinds.Phone.TYPE,
            ContactsContract.Data.CONTACT_ID,
            ContactsContract.Data.MIMETYPE
        };
        // Retrieve only the contacts with a phone number at least
        Cursor cursor = cr.query(ContactsContract.Data.CONTENT_URI,
                projection, 
                ContactsContract.Contacts.HAS_PHONE_NUMBER + " = 1",
                null,
                ContactsContract.Data.CONTACT_ID + " ASC");

        contacts = populateContactArray(cursor);
        return contacts;
    }


    /**
     * Creates an array of contacts from the cursor you pass in
     *
     * @param c            the cursor
     * @return             a JSONArray of contacts
     */
    private JSONArray populateContactArray(Cursor c) {

        JSONArray contacts = new JSONArray();

        String contactId = null;
        String oldContactId = null;
        boolean newContact = true;
        String mimetype = null;

        JSONObject contact = new JSONObject();
        JSONArray phones = new JSONArray();

        try {
            if (c.getCount() > 0) {
                while (c.moveToNext()) {
                    contactId = c.getString(c.getColumnIndex(ContactsContract.Data.CONTACT_ID)); 

                    if (c.getPosition() == 0) // If we are in the first row set the oldContactId
                        oldContactId = contactId;

                    // When the contact ID changes we need to push the Contact object to the array of contacts and create new objects.
                    if (!oldContactId.equals(contactId)) {
                        // Populate the Contact object with it's arrays and push the contact into the contacts array
                        contact.put("phoneNumbers", phones);
                        contacts.put(contact);
                        // Clean up the objects
                        contact = new JSONObject();
                        phones = new JSONArray();

                        // Set newContact to true as we are starting to populate a new contact
                        newContact = true;
                    }

                    // When we detect a new contact set the ID. These fields are available in every row in the result set returned.
                    if (newContact) {
                        newContact = false;
                        contact.put("id", contactId);
                    }

                    mimetype = c.getString(c.getColumnIndex(ContactsContract.Data.MIMETYPE)); // Grab the mimetype of the current row as it will be used in a lot of comparisons
                    
                    if (mimetype.equals(ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE)) {
                        contact.put("firstName", c.getString(c.getColumnIndex(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME)));
                        contact.put("lastName", c.getString(c.getColumnIndex(ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME)));
                        contact.put("displayName", c.getString(c.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME)));
                    }
                    else if (mimetype.equals(ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE)) {
                        phones.put(getPhoneNumber(c));
                    }

                    // Set the old contact ID
                    oldContactId = contactId;
                } 
                // Push the last contact into the contacts array
                contact.put("phoneNumbers", phones);
                contacts.put(contact);
            }
        } catch (JSONException e) {
            Log.e(LOG_TAG, e.getMessage(), e);
        }
        c.close();
        return contacts;
    }

    /**
     * Create a phone number JSONObject
     * @param cursor the current database row
     * @return a JSONObject representing a phone number
     */
    private JSONObject getPhoneNumber(Cursor cursor) throws JSONException {
        JSONObject phoneNumber = new JSONObject();
        String number = cursor.getString(cursor.getColumnIndex(Phone.NUMBER));
        String normalizedNumber = cursor.getString(cursor.getColumnIndex(Phone.NORMALIZED_NUMBER));
        phoneNumber.put("number", number);
        phoneNumber.put("normalizedNumber", (normalizedNumber == null) ? number : normalizedNumber);
        phoneNumber.put("type", getPhoneTypeLabel(cursor.getInt(cursor.getColumnIndex(Phone.TYPE))));
        return phoneNumber;
    }


    /**
     * Retrieve the type of the phone number based on the type code
     * @param type the code of the type
     * @return a string in caps representing the type of phone number
     */    
    private String getPhoneTypeLabel(int type) {
        String label = "OTHER";
        if (type == Phone.TYPE_HOME)
            label = "HOME";
        else if (type == Phone.TYPE_MOBILE)
            label = "MOBILE";
        else if (type == Phone.TYPE_WORK)
            label = "WORK";
        
        return label;
    }
}
