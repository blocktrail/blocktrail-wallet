BlockTrail NodeJS SDK
=====================
This is the BlockTrail NodeJS SDK. This SDK contains methods for easily interacting with the BlockTrail API.
Below are examples to get you started. For additional examples, please see our official documentation
at https://www.blocktrail.com/api/docs/lang/nodejs

[![Latest Stable Version](https://badge.fury.io/js/blocktrail-sdk.svg)](https://www.npmjs.org/package/blocktrail-sdk)
[![Build Status](https://travis-ci.org/blocktrail/blocktrail-sdk-nodejs.png?branch=master)](https://travis-ci.org/blocktrail/blocktrail-sdk-nodejs)
[![Sauce Test Status](https://saucelabs.com/buildstatus/team_blocktrail)](https://saucelabs.com/u/team_blocktrail)


[![Sauce Test Status](https://saucelabs.com/browser-matrix/team_blocktrail.svg)](https://saucelabs.com/u/team_blocktrail)

The Blocktrail SDK is tested against;  
 - NodeJS:
   - 0.11
   - 0.12
   - 5.11
   - 6.3.0
   - 7.1.0
 - Browser:
   - Google Chrome 48 / latest
   - Firefox 49 / latest
   - Safari 10.0 / latest
   - Edge 14.14393
   - IE 11.103
   - Android 4.4
   - Android 5.0
   - iPhone OS X 10.10


Upgrading from v2.x to v3.0.0
-----------------------------
**IMPORTANT** `v3.0.0` introduces a new **DEFAULT** wallet encryption, please make sure you upgrade the SDK everywhere you're using it!!

Upgrading from v1.x to v2.0.0
-----------------------------
**IMPORTANT** `v2.0.0` has a few BC breaks, please check [docs/CHANGELOG.md](docs/CHANGELOG.md)!!

IMPORTANT! FLOATS ARE EVIL!!
----------------------------
As is best practice with financial data, The API returns all values as an integer, the Bitcoin value in Satoshi's.
**In Javascript even more than in other languages it's really easy to make mistakes when converting from float to integer etc!**

The BlockTrail SDK has some easy to use functions to do this for you, we recommend using these
and we also **strongly** recommend doing all Bitcoin calculation and storing of data in integers
and only convert to/from Bitcoin float values for displaying it to the user.

```javascript
var blocktrail = require('blocktrail-sdk');

console.log("123456789 Satoshi to BTC: ", blocktrail.toBTC(123456789));
console.log("1.23456789 BTC to Satoshi: ", blocktrail.toSatoshi(1.23456789));
```

A bit more about this can be found [in our documentation](https://www.blocktrail.com/api/docs/lang/nodejs#api_coin_format).

Installation
------------
You can install the package through NPM (https://www.npmjs.org/package/blocktrail-sdk).
```
npm install blocktrail-sdk
```

Usage
-----
Please visit our official documentation at https://www.blocktrail.com/api/docs/lang/nodejs for the usage.

Promises vs Callbacks
---------------------
Personally we prefer good old callbacks over promises,  
but to make everyone happy the SDK functions accept a callback argument and return a (Q)promise object, so you can use whatever you prefer!

Support and Feedback
--------------------
Be sure to visit the BlockTrail API official [documentation website](https://www.blocktrail.com/api/docs/lang/nodejs)
for additional information about our API.

If you find a bug, please submit the issue in Github directly.
[BlockTrail-NodeJS-SDK Issues](https://github.com/blocktrail/blocktrail-sdk-nodejs/issues)

As always, if you need additional assistance, drop us a note at
[support@blocktrail.com](mailto:support@blocktrail.com).

Unit Tests
----------
Unit Tests are created with Mocha and can be ran with `npm test` (or `mocha`)

We also run jshint and jscs, these are automatically ran by [travis-ci](https://travis-ci.org/blocktrail/blocktrail-sdk-nodejs) for every commit and pull request.
```
jshint main.js lib/ test/
```
```
jscs main.js lib/ test/
```

Browserify
----------
The BlockTrail NodeJS SDK can be browserified to use it in the browser, which we use ourselves for wallet actions from our webapp.  
If you want to test or develop on the SDK in the browser you can use `grunt build` (and `grunt watch`) to build the browserify version.

You need to pull the git submodules before you can build the browserify version:  
`git submodule update --init --recursive`

Files in `./build` are:

 - `blocktrail-sdk.js` (and `blocktrail-sdk.min.js`) the blocktrailSDK browserified  
 - `jsPDF.js` (and `jsPDF.min.js`) dependancy for generating the backup PDF  
 - `blocktrail-sdk-full.js` (and `blocktrail-sdk-full.min.js`) the blocktrailSDK browserified + jsPDF bundled  

If you use these browserified versions of our SDK it will be accessible as `window.blocktrailSDK` or plain `blocktrailSDK`.

Known Supported and Tested Browsers:
 - Android 4.3+ (Use Crosswalk for lower versions if neccesary)
 - iOS6+
 - IE9+

For the following any modern version will work just fine:
 - Chrome
 - FireFox
 - Safari

Uglify
------
If you're planning to uglify/minify the javascript yourself, make sure to exclude the following variable names from being mangled:  
`['Buffer', 'BitInteger', 'Point', 'Script', 'ECPubKey', 'ECKey']`

License
-------
The BlockTrail NodeJS SDK is released under the terms of the MIT license. See LICENCE.md for more information or see http://opensource.org/licenses/MIT.

