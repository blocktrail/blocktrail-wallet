var blocktrail = require('../');

/**
 * backup data from a Wallet V1 Backup PDF (Developer wallets)
 *
 * walletVersion:       the version number of the created wallet
 * primaryMnemonic:     the primary mnemonic, obtained from our backup pdf
 * primaryPassphrase:   our wallet passphrase, as used to unlock the wallet when sending transactions
 * backupMnemonic:      the backup mnemonic, obtained from our backup pdf
 * blocktrailKeys:      an array of the blocktrail pubkeys objects as {keyIndex: keyIndex, path: path, pubkey: pubkey}
 *                          keyIndex:   key index printed below each pubkey QR code on the backup pdf
 *                          path:       path printed below each pubkey QR code on the backup pdf
 *                          pubkey:     the contents of the QR code
 */
var backupDataV1 = {
    walletVersion:      1,
    primaryMnemonic:    "plug employ detail flee ethics junior cover surround aspect slender venue faith devote ice sword camp pepper baby decrease mushroom feel endless cactus group deposit achieve cheese fire alone size enlist sail labor pulp venture wet gas object fruit dutch industry lend glad category between hidden april network",
    primaryPassphrase:  "test",
    backupMnemonic:     "disorder husband build smart also alley uncle buffalo scene club reduce fringe assault inquiry damage gravity receive champion coffee awesome conduct two mouse wisdom super lend dice toe emotion video analyst worry charge sleep bless pride motion oxygen congress jewel push bag ozone approve enroll valley picnic flight",
    blocktrailKeys: [
        {
            keyIndex: 0,
            path:     "M/0'",
            pubkey:   'tpubD8UrAbbGkiJUnZY91vYMX2rj7zJRGH7snQ1g9H1waU39U74vE8HAfMCZdBByRJhVHq2B9X6uZcA2VaCJwnPN3zXLAPjETsfPGwAgWgEFvVk'
        },
        {
            keyIndex: 9999,
            path:     "M/9999'",
            pubkey:   'tpubD9q6vq9zdP3gbhpjs7n2TRvT7h4PeBhxg1Kv9jEc1XAss7429VenxvQTsJaZhzTk54gnsHRpgeeNMbm1QTag4Wf1QpQ3gy221GDuUCxgfeZ'
        }
    ]
};


/**
 * backup data from a Wallet V2 Backup PDF (Consumer web and mobile wallets)
 *
 * walletVersion:               the version number of the created wallet
 * encryptedPrimaryMnemonic:    the "Encrypted Primary Seed" mnemonic, obtained from our backup pdf (page 1)
 * backupMnemonic:              the "backup seed" mnemonic, obtained from our backup pdf (page 1)
 *
 * passwordEncryptedSecretMnemonic: the "password encrypted secret" mnemonic, obtained from our backup pdf (page 2)
 * password:                        our wallet password, as used to unlock the wallet when sending transactions
 *
 * encryptedRecoverySecretMnemonic: the "Encrypted Recovery Secret" an alternative to the password and encrypted secret, if the password is forgotten (page 1)
 * recoverySecretDecryptionKey:     required to decrypt the encrypted recovery secret. Must be obtained from Blocktrail via support@blocktrail.com
 *
 * blocktrailKeys:                  an array of the blocktrail pubkeys objects as {keyIndex: keyIndex, path: path, pubkey: pubkey}
 *                                      keyIndex:   key index printed below each pubkey QR code on the backup pdf (page 1)
 *                                      path:       path printed below each pubkey QR code on the backup pdf (page 1)
 *                                      pubkey:     the contents of the QR code (page 1)
 */
var backupDataV2 = {
    walletVersion:                   2,
    encryptedPrimaryMnemonic:        "fat arena brown skull echo quiz diesel beach gift olympic riot orphan sketch chief exchange height danger nasty clutch dune wing run drastic roast exist super toddler combine vault salute salad trap spider tenant draw million insane alley pelican spot alpha cheese version clog arm tomorrow slush plunge",
    backupMnemonic:                  "aerobic breeze taste swear whip service bone siege tackle grow drip few tray clay crumble glass athlete bronze office roast learn tuition exist symptom",

    passwordEncryptedSecretMnemonic: "fat arena brown skull echo quick damage toe later above jewel life void despair outer model annual various original stool answer vessel tired fragile visa summer step dash inform unit member social liberty valve tonight ocean pretty dial ability special angry like ancient unit shiver safe hospital ocean around poet album split they random decide ginger guilt mix evolve click avoid oven sad gospel worry chaos another lonely essence lucky health view",
    password:                        "test",

    blocktrailKeys: [
        {
            keyIndex: 0,
            path:     "M/0'",
            pubkey:   'xpub687DeMmb3SM2WUySJREg6F2vvRCQE1uSHcm5DY6HKyJe5oCczqavKHWUS8e5hDdx5bU4EWzFq9vSRSbi2rEYShdw6ectgbxAqmBgg8ZaqtC'
        }
    ]
};

// use testnet or not? (NB: backupDataV1 is testnet, while backupDataV2 is mainnet)
var useTestnet = false;


// we need a bitcoin data service to find utxos. We'll use the BlocktraiBitcoinService, which in turn uses the Blocktrail SDK
var bitcoinDataClient = new blocktrail.BlocktrailBitcoinService({
    apiKey:     "MY_APIKEY",
    apiSecret:  "MY_APISECRET",
    network:    "BTC",
    testnet:    useTestnet
});
// there is also an Insight data service using bitpay's API
// bitcoinDataClient = new blocktrail.InsightBitcoinService({testnet: useTestnet});




var discoverAndSweep = false;        //do we want to discover funds and sweep them to another wallet at the same time?
var recoverWithPassword = false;     //do we want to try and recover with or without the password?


/**
 * create an instance of the wallet sweeper, which generates the wallet keys from the backup data
 *
 */
var sweeperOptions = {
    network: 'btc',
    testnet: useTestnet,
    logging: true,          // display extra info in console
    sweepBatchSize: 100     // number of addresses to check at a time (use a larger number for older wallets)
};
var walletSweeper;
if (recoverWithPassword) {
    console.log('Creating wallet keys using password method...');
    //walletSweeper = new blocktrail.WalletSweeper(backupDataV1, bitcoinDataClient, sweeperOptions);  //version 1, testnet
    walletSweeper = new blocktrail.WalletSweeper(backupDataV2, bitcoinDataClient, sweeperOptions);      //version 2, mainnet
} else {
    /**
     * if the wallet password is forgotten for a V2 wallet, it is possible to use the "Encrypted Recovery Secret" on the backup pdf
     * along with a decryption key which must be obtained directly from Blocktrail.
     */
    backupDataV2.password = null;
    backupDataV2.encryptedRecoverySecretMnemonic = "fat arena brown skull echo question sphere farm witness slender hospital note sketch two level ten oyster interest oppose stable method left fringe damage shiver tumble help group eyebrow recipe also another front account apart tomato trigger daring slush magic lunch clump knife cloth measure tool tower hood define salute reopen cover sad bag scan kingdom fault tag increase snap cruise input amused once spring skin grief syrup actual legend tribe emotion";
    backupDataV2.recoverySecretDecryptionKey = "86e23bddc80dfb93fc4b05cbfae9c08b6d7398014c52232541237dfe2faaf963";

    console.log('Creating wallet keys using encrypted secret method...');
    //walletSweeper = new blocktrail.WalletSweeper(backupDataV1, bitcoinDataClient, sweeperOptions);  //version 1, testnet
    walletSweeper = new blocktrail.WalletSweeper(backupDataV2, bitcoinDataClient, sweeperOptions);      //version 2, mainnet
}


/**
 * now we can discover funds in the wallet, and then create a transaction to send them all to a new address
 *
 */
if (!discoverAndSweep) {
    //Do wallet fund discovery - can be run separately from sweeping
    console.log('-----Discovering Funds-----');
    var batchSize = 25;
    walletSweeper.discoverWalletFunds(batchSize)
        .progress(function(progress) {
            console.info(progress);
        })
        .then(function(result) {
            console.log(result);
        })
        .catch(function(err) {
            console.error(err);
        });

} else {
    // Do wallet fund discovery and sweeping - if successful you will be returned a signed transaction ready to submit to the network
    console.log('\n-----Sweeping Wallet-----');
    //var receivingAddress = "2NCfSZa6f8YwAnjvGcorGDdMSyY9kMzQTZe";     //testnet address in wallet 1
    var receivingAddress = "3EBzEG5g23gTFCW6LE8uf7tVx8WpKpVUUd";        //mainnet address in wallet 2
    walletSweeper.sweepWallet(receivingAddress)
        .progress(function(progress) {
            console.info(progress);
        })
        .then(function(result) {
            console.log(result);
        })
        .catch(function(err) {
            console.error(err);
        });

}
