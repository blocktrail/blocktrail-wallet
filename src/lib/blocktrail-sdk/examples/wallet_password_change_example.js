var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var LIBPATH = path.normalize(__dirname + '/..');

var client = blocktrail.BlocktrailSDK({
    apiKey: "MY_APIKEY",
    apiSecret: "MY_APISECRET",
    testnet: true
});

//create a new wallet
var walletIdentifier = "nodejs-example-" + crypto.randomBytes(24).toString('hex');
client.createNewWallet(walletIdentifier, "example-strong-password", 9999, function(err, wallet, backupInfo) {
    if (err) {
        return console.log("createNewWallet ERR", err);
    }

    wallet.passwordChange("example-stronger-password", function(err, backupInfo) {
        if (err) {
            console.log(err);
        }

        //generate the backup document
        var backup = new blocktrail.BackupGenerator(wallet.identifier, backupInfo, null, {
            // disable page 1 and 3 because we only need page2 for a password change
            page1: false,
            page3: false
        });

        //create a pdf
        backup.generatePDF(LIBPATH + "/examples/my-wallet-backup-password-change.pdf", function(err, result) {
            console.log(err, result);
        });

        //can also be html or an image
        backup.generateHTML(function(err, result) {
            if (err) {
                console.log(err);
            }

            fs.writeFile(LIBPATH + "/examples/my-wallet-backup-password-change.html", result, function(err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("The file was saved!");
                }
            });
        });
    });
});
