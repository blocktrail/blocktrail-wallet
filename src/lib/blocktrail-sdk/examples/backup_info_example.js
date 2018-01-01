var blocktrail = require('../'); // require('blocktrail-sdk') when trying example from in your own project
var blocktrailBackupGenerator = require('blocktrail-sdk-backup-generator');
var crypto = require('crypto');
var fs = require('fs');
var path = require('path');

var LIBPATH = path.normalize(__dirname + '/..');

var client = blocktrail.BlocktrailSDK({
    apiKey: "MY_APIKEY",
    apiSecret: "MY_APISECRET",
    testnet: true
});

var identifier = "rubensayshi";
var encryptedPrimarySeed = "fat arena brown skull echo quick cargo stereo welcome option pair warrior silk badge try churn note frog lemon open assault squirrel cave echo inch diagram army disease lobster version organ slow pride slush bunker blade diet bundle pair over flavor nerve name debate disease glow illness weather ";
var recoveryEncryptedSecret = "fat arena brown skull echo quit spring paddle nut private chronic genre prison security earth choose smooth trumpet woman depart identify recall pave van note pear because engine snow south pool relax solid language riot double denial filter palm beyond senior club illness prize ritual orange pelican eyebrow consider purse dress screen during rubber length path jealous juice display style hunt lunch nothing valve drill forum spray frequent assault range night lounge ";
var backupSeed = "satoshi mango during hybrid inch order expose height quantum bulb vast mansion little swift nature network pioneer fan airport symptom imitate task tooth element";
var encryptedSecret = "fat arena brown skull echo question sick foster december damage critic novel shed prevent wise group picture swift avoid round problem share sure chat dose pear defense remember fringe office attack speed tent nose person mammal pipe design fuel brush follow peasant defense derive pledge absent shock file gravity output search senior accuse entire awkward private crunch spoon symbol mountain inch rather butter kiss planet impulse curious border burger lake shop engine";
var blocktrailPublicKeys = {
    0: blocktrail.bitcoin.HDNode.fromSeedHex("010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101"),
    1: blocktrail.bitcoin.HDNode.fromSeedHex("020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202020202"),
    2: blocktrail.bitcoin.HDNode.fromSeedHex("020202020202020202020203020202020202020202020203020202020202020202020203020202020202020202020203"),
    3: blocktrail.bitcoin.HDNode.fromSeedHex("040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404040404")
};

var backup = new blocktrailBackupGenerator(
    identifier,
    {
        encryptedPrimarySeed: encryptedPrimarySeed,
        recoveryEncryptedSecret: recoveryEncryptedSecret,
        backupSeed: backupSeed,
        encryptedSecret: encryptedSecret,
        blocktrailPublicKeys: blocktrailPublicKeys
    },
    [
        {title: "username", value: 'testing123'},
        {title: "note to self", value: 'buy pizza'},
        {title: "Support Secret", subtitle: "this can be shared with helpdesk staff to proof ownership of backup document", value: '010101'}
    ]
);

//create a pdf
backup.generatePDF(LIBPATH + "/examples/my-wallet-backup.pdf", function(err, result) {
    console.log(err, result);
});

//can also be html or an image
backup.generateHTML(function(err, result) {
    if (err) {
        console.log(err);
    }

    fs.writeFile(LIBPATH + "/examples/my-wallet-backup.html", result, function(err) {
        if (err) {
            console.log(err);
        } else {
            console.log("The file was saved!");
        }
    });
});
