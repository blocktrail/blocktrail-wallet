# ContactsPhoneNumbers
Cross-platform plugin for Cordova / PhoneGap to list all the contacts with at least a phone number.

## Installing the plugin ##
```
cordova plugin add cordova-plugin-contacts-phonenumbers
```
or use this repository (unstable)
```
cordova plugin add https://github.com/dbaq/cordova-plugin-contacts-phone-numbers.git
```
## Using the plugin ##
The plugin creates the object `navigator.contactsPhoneNumbers` with the methods

  `list(success, fail)`

A full example could be:

```
   //
   //
   // after deviceready
   //
   //
   navigator.contactsPhoneNumbers.list(function(contacts) {
      console.log(contacts.length + ' contacts found');
      for(var i = 0; i < contacts.length; i++) {
         console.log(contacts[i].id + " - " + contacts[i].displayName);
         for(var j = 0; j < contacts[i].phoneNumbers.length; j++) {
            var phone = contacts[i].phoneNumbers[j];
            console.log("===> " + phone.type + "  " + phone.number + " (" + phone.normalizedNumber+ ")");
         }
      }
   }, function(error) {
      console.error(error);
   });

```

## JSON Response format

The success callback function contains an array of contacts.

Each entry contains:

   * the unique contact id
   * the name of the contact (first name, last name, display name)
   * an array containing the number, the normalizedNumber and the type of the number (```WORK```, ```MOBILE```, ```HOME``` or ```OTHER```)

Here is a sample of what you can get:

```
    [{
        "id": "1",
        "firstName": "Kate",
        "middleName": "",
        "lastName": "Bell",
        "displayName": "Kate Bell",
        "thumbnail": null,
        "phoneNumbers": [{
            "number": "(555) 564-8583",
            "normalizedNumber": "(555) 564-8583",
            "type": "MOBILE"
        }, {
            "number": "(415) 555-3695",
            "normalizedNumber": "(415) 555-3695",
            "type": "OTHER"
        }]
    }, {
        "id": "2",
        "firstName": "Daniel",
        "middleName": "",
        "lastName": "Higgins",
        "displayName": "Daniel Higgins",
        "thumbnail": null,
        "phoneNumbers": [{
            "number": "555-478-7672",
            "normalizedNumber": "555-478-7672",
            "type": "HOME"
        }, {
            "number": "(408) 555-5270",
            "normalizedNumber": "(408) 555-5270",
            "type": "MOBILE"
        }, {
            "number": "(408) 555-3514",
            "normalizedNumber": "(408) 555-3514",
            "type": "OTHER"
        }]
    }, {
        "id": "3",
        "firstName": "John",
        "middleName": "Paul",
        "lastName": "Appleseed",
        "displayName": "John Paul Appleseed",
        "thumbnail": "content://com.android.contacts/contacts/49/photo",
        "phoneNumbers": [{
            "number": "888-555-5512",
            "normalizedNumber": "888-555-5512",
            "type": "MOBILE"
        }, {
            "number": "888-555-1212",
            "normalizedNumber": "888-555-1212",
            "type": "HOME"
        }]
    }]
```

## Behaviour

The plugin retrieves **ONLY** the contacts containing one or more phone numbers. It does not allow to modify them (use [the official cordova contacts plugin for that](https://github.com/apache/cordova-plugin-contacts)).

With the official plugin, it is difficult and inefficient[1] to retrieve the list of all the contacts with at least a phone number (for Android at least). I needed a fastest way to retrieve a simple list containing just the name and the list of phone numbers.

If you need more fields like the email address or if you also need to retrieve the contacts without email address, we can add an option, open an issue and I'll see what I can do.

**[1]** When I say *difficult and inefficient*, it is because on Android, all your Gmail contacts are returned as a contact. [See this issue on stackoverflow](http://stackoverflow.com/questions/20406564/phonegap-contacts-api-android-return-only-phone-contacts-and-not-gmail-conta). With the official plugin you have to retrieve all the contacts and then iterate over the result to filter out what you want.

I executed a small benchmark on my Nexus 5 with Lollipop. The code calls both plugins and displays the result in the console. On this phone I have 1028 contacts but only 71 contacts have at least a phone number. Of course the performances depends on the number of contacts with phone numbers.

**cordova-plugin-contacts**

    *  1 call:
        try 1: 2.527s
        try 2: 2.581s
        try 3: 2.221s

        => average of 2.443s

    * 10 calls:
        try 1: 6.048s
        try 2: 9.196s
        try 3: 8.981s

        => average of 8.075s for 10 calls

**cordova-plugin-contacts-phone-numbers**

    *  1 call
        try 1: 0.145s
        try 2: 0.185s
        try 3: 0.286s

        => average of 0.205s

    * 10 calls:
        try 1: 1.195s
        try 2: 1.211s
        try 3: 1.351s

        => average of 1.252s for 10 calls

## iOS and Android

The plugin works with iOS and Android.

iOS does not provide a normalized number like Android. So number === normalizedNumber for iOS.

The thumbnail is not returned on iOS, if you want iOS support, feel free to open a PR.

The Android code is heavily inspired from the official plugin with some tweaks to improve the perfomances.

## Donations

If your app is successful or if you are working for a company, please consider donating some beer money :beer::

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.me/dbaq/10)

Keep in mind that I am maintaining this repository on my free time so thank you for considering a donation. :+1:

## Contributing

Thanks for considering contributing to this project.

### Finding something to do

Ask, or pick an issue and comment on it announcing your desire to work on it. Ideally wait until we assign it to you to minimize work duplication.

### Reporting an issue

- Search existing issues before raising a new one.

- Include as much detail as possible.

### Pull requests

- Make it clear in the issue tracker what you are working on, so that someone else doesn't duplicate the work.

- Use a feature branch, not master.

- Rebase your feature branch onto origin/master before raising the PR.

- Keep up to date with changes in master so your PR is easy to merge.

- Be descriptive in your PR message: what is it for, why is it needed, etc.

- Make sure the tests pass

- Squash related commits as much as possible.

### Coding style

- Try to match the existing indent style.

- Don't mix platform-specific stuff into the main code.



## Licence ##

The MIT License

Copyright (c) 2013 Didier Baquier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
