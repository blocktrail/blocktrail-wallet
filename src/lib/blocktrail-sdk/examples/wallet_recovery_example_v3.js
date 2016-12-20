var blocktrail = require('../');

var backupDataV3 = {
    walletVersion:                   3,
    encryptedPrimaryMnemonic:        "library fish steak unfair series jacket enhance unique witness session abandon ability hole spread black stuff gun country icon hair sugar mixture rib mansion neglect afraid unlock barrel today misery shift replace unusual ticket zone habit aspect globe glad find space tape remove priority describe smart annual sign direct regular can pear huge rather wish travel stomach mobile situate stand",
    backupMnemonic:                  "snap lyrics december view youth dynamic physical shed certain govern cigar top submit measure minute flight used glass tragic basket alarm scorpion wagon oblige",

    passwordEncryptedSecretMnemonic: "library faith derive beach blast sustain index fold actor session abandon access forest around canal theme body denial excuse believe voyage anchor state meadow assist ostrich trick lock near uniform suspect person autumn dentist rent square idle motion calm time focus help legal subject quality pupil atom weather start kite enable today primary rail flag clarify clarify syrup fee clump",
    password:                        "roobsieroobs",

    blocktrailKeys: [
        {
            keyIndex: 0,
            path:     "M/0'",
            pubkey:   'tpubD8UrAbbGkiJUnPP85sYJZ6ozSsgfk4qH9jbzWFMUGhfsgKPEzLLpNvgkFm9P4ktkAbPpX1ACns2PdfBT8ZF9vFjaU5GKQCZ892AJSJ2VgDK'
        },
        {
            keyIndex: 9999,
            path:     "M/9999'",
            pubkey:   'tpubD9q6vq9zdP3gbhpjs7n2TRvT7h4PeBhxg1Kv9jEc1XAss7429VenxvQTsJaZhzTk54gnsHRpgeeNMbm1QTag4Wf1QpQ3gy221GDuUCxgfeZ'
        }
    ]
};

var useTestnet = true;


// we need a bitcoin data service to find utxos. We'll use the BlocktraiBitcoinService, which in turn uses the Blocktrail SDK
var bitcoinDataClient = new blocktrail.BlocktrailBitcoinService({
    apiKey:     "MY_APIKEY",
    apiSecret:  "MY_APISECRET",
    network:    "BTC",
    testnet:    useTestnet
});

var discoverAndSweep = true;         //do we want to discover funds and sweep them to another wallet at the same time?
var recoverWithPassword = true;     //do we want to try and recover with or without the password?


/**
 * create an instance of the wallet sweeper, which generates the wallet keys from the backup data
 *
 */
var sweeperOptions = {
    network: 'btc',
    testnet: useTestnet,
    logging: true,          // display extra info in console
    sweepBatchSize: 10      // number of addresses to check at a time (use a larger number for older wallets)
};
var walletSweeper;
if (recoverWithPassword) {
    console.log('Creating wallet keys using password method...');
    walletSweeper = new blocktrail.WalletSweeper(backupDataV3, bitcoinDataClient, sweeperOptions);
} else {
    /**
     * if the wallet password is forgotten for a V2 wallet, it is possible to use the "Encrypted Recovery Secret" on the backup pdf
     * along with a decryption key which must be obtained directly from Blocktrail.
     */
    backupDataV3.password = null;
    backupDataV3.encryptedRecoverySecretMnemonic = "library faint leopard present project pair census prison aisle session abandon achieve clay abandon light brave olympic profit liquid fan ribbon twist glance hold file wrestle unhappy wreck unveil shrug round record jump seven galaxy skate cattle hedgehog humble purity hair hand digital mixture else senior witness great art seat coach trend transfer negative general fruit bright order fresh festival";
    backupDataV3.recoverySecretDecryptionKey = new Buffer("9e2eedf5716b0b1620fb8d2817d4760ef68419ea1ce6aca71845c71fe23e68f9", 'hex');

    console.log('Creating wallet keys using encrypted secret method...');
    walletSweeper = new blocktrail.WalletSweeper(backupDataV3, bitcoinDataClient, sweeperOptions);
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
    var receivingAddress = "2NFLXEc5m1X2Z8NB5QTVd9KJtN8bJBqz1Xp";
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
