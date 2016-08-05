# Blocktrail Mobile Wallet
Take back control of your Bitcoin!
BlockTrail's Bitcoin wallet features unparalleled security through MultiSignature technology, keeping you in full control of your coins at all time.  
Transactions are signed on your device so we never see your private keys.

With our HD wallets you can create an unlimited number of addresses to help protect your privacy without the need for multiple private key backups.  
Our system will also generate new addresses for change and fund requests automatically.

Access your wallet anywhere, anytime; use the mobile app when you're on the go, or log in to the web-interface when at home or in the office.

- 2-of-3 Multisig technology so you always remain in control of your coins
- HD wallet technology allowing you to create an unlimited number of addresses
- Send and Receive bitcoin easily with contacts on your phone
- Live update for new transactions and your balance
- View your full transaction history with the price at the time of the transaction
- Personalise your account so your friends can quickly identify you
- QR code scanning with bitcoin URI support
- Send requests via email and SMS
- PIN protection
- Anonymous accounts, for your privacy
- Transactions signed locally on your device
- Backup document incase the worst happens
- Local currency display using live price updates

## Web Wallet
For the Web Wallet see; https://github.com/blocktrail/blocktrail-webwallet

## Install
```
npm install -g npm # make sure npm is latest version

# engine_strict=false is required because cordova -> cordova-common -> plist -> xmlbuilder@2.2.1
# next version of plist will use xmlbuilder@3.x which will fix this isse
npm_config_engine_strict=false npm install -g ionic cordova gulp

npm install
git submodule update --init --recursive # for translations package
cp appconfig.example.json appconfig.json

gulp
```

## Run
```
ionic run android|ios
```

## Translations
Translations for both Web and Mobile Wallet are kept in: https://github.com/blocktrail/blocktrail-wallet-translations  
And then submoduled into the projects.  

Keep this in mind when adding / updating translations, don't forget to commit them to the translations repo.  

It's okay to do PRs without bumping the translations submodule, we'll handle that before doing releases!

## Release Process
### Android
```
mv appconfig.json .appconfig.json
cp appconfig.prod.json appconfig.json

rm -rf platforms/android/build/outputs/apk/* # clean up old builds

ionic build --release android

# you should commit and tag here...
# git commit -am "v1.0.x"; git tag v1.0.x

jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/blocktrail.keystore /work/blocktrail-wallet/platforms/android/build/outputs/apk/android-release-unsigned.apk blocktrail  

zipalign -v 4 /work/blocktrail-wallet/platforms/android/build/outputs/apk/android-release-unsigned.apk /work/blocktrail-wallet/platforms/android/build/outputs/apk/blocktrail.apk

mv .appconfig.json appconfig.json
```

### iOS
In xCode build for archiving: Product > Archive  
Select new build in Archives Organiser and submitt to app store (optionally validate before hand)  

### tips
Remember to remove the old signed, zipped APK before running zipalign, it doesn't overrite the file.  

## License
The Blocktrail Wallet source code is released under the GNU Affero General Public License.  
The Blocktrail Logo and any other images / graphics are not part of this.  
See [LICENSE.md](LICENSE.md).
