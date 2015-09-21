# CryptoJS

Port of CryptoJS for using with CommonJS.

Original project: https://code.google.com/p/crypto-js/

### Install

    $ bower install browserify-cryptojs

    $ npm install browserify-cryptojs

### Usage with Browserify

```javascript
window.CryptoJS = require('browserify-cryptojs');
require('browserify-cryptojs/components/enc-base64');
require('browserify-cryptojs/components/md5');
require('browserify-cryptojs/components/evpkdf');
require('browserify-cryptojs/components/cipher-core');
require('browserify-cryptojs/components/aes');
```

### Encryption/Decryption

```javascript
var passphrase = 'MyKeyHere';
var encrypted = CryptoJS.AES.encrypt('ssshhhhh!', passphrase); // .toString() for just string
var decrypted = CryptoJS.AES.decrypt(encrypted, passphrase); // .toString(CryptoJS.enc.Utf8) for getting back `ssshhhhh!`
```