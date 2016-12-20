var _ = require('lodash');
var blocktrail = require('../');
var crypto = require('crypto');
var async = require('async');
var bitcoin = require('bitcoinjs-lib');
var bip39 = require("bip39");

/**
 * @type APIClient
 */
var client = blocktrail.BlocktrailSDK({
    apiKey : process.env.BLOCKTRAIL_SDK_APIKEY || "EXAMPLE_BLOCKTRAIL_SDK_NODEJS_APIKEY",
    apiSecret : process.env.BLOCKTRAIL_SDK_APISECRET || "EXAMPLE_BLOCKTRAIL_SDK_NODEJS_APISECRET",
    testnet : true
});

var TRANSACTION_TEST_WALLET_PRIMARY_MNEMONIC = "give pause forget seed dance crawl situate hole keen",
    TRANSACTION_TEST_WALLET_BACKUP_MNEMONIC = "give pause forget seed dance crawl situate hole give",
    TRANSACTION_TEST_WALLET_PASSWORD = "password";

var _createTestWallet = function(identifier, passphrase, primaryMnemonic, backupMnemonic, cb) {
    var keyIndex = 9999;
    var network = client.testnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;

    var primarySeed = bip39.mnemonicToSeed(primaryMnemonic, passphrase);
    var primaryPrivateKey = bitcoin.HDNode.fromSeedBuffer(primarySeed, network);

    var backupSeed = bip39.mnemonicToSeed(backupMnemonic, "");
    var backupPrivateKey = bitcoin.HDNode.fromSeedBuffer(backupSeed, network);
    var backupPublicKey = backupPrivateKey.neutered();

    var checksum = primaryPrivateKey.getAddress().toBase58Check();
    var primaryPublicKey = primaryPrivateKey.deriveHardened(keyIndex).neutered();

    client.storeNewWalletV1(
        identifier,
        [primaryPublicKey.toBase58(), "M/" + keyIndex + "'"],
        [backupPublicKey.toBase58(), "M"],
        primaryMnemonic,
        checksum,
        keyIndex,
        function(err, result) {
            if (err) {
                return cb(err);
            }

            var blocktrailPublicKeys = _.mapValues(result.blocktrail_public_keys, function(blocktrailPublicKey) {
                return bitcoin.HDNode.fromBase58(blocktrailPublicKey[0], network);
            });

            var wallet = new blocktrail.Wallet(
                client,
                identifier,
                blocktrail.Wallet.WALLET_VERSION_V1,
                primaryMnemonic,
                null,
                null,
                {keyIndex: primaryPublicKey},
                backupPublicKey,
                blocktrailPublicKeys,
                keyIndex,
                client.testnet,
                checksum
            );

            wallet.unlock({
                passphrase: passphrase
            }, function(err) {
                cb(err, wallet);
            });
        }
    );
};

var createDiscoveryTestWallet = function(identifier, passphrase, cb) {
    var primaryMnemonic = "give pause forget seed dance crawl situate hole kingdom";
    var backupMnemonic = "give pause forget seed dance crawl situate hole course";

    return _createTestWallet(identifier, passphrase, primaryMnemonic, backupMnemonic, cb);
};

var createTransactionTestWallet = function(identifier, cb) {
    return _createTestWallet(identifier, TRANSACTION_TEST_WALLET_PASSWORD, TRANSACTION_TEST_WALLET_PRIMARY_MNEMONIC, TRANSACTION_TEST_WALLET_BACKUP_MNEMONIC, cb);
};

createTransactionTestWallet("unittest-transaction", function(err, wallet) {
    if (err) {
        console.log(err);
        return;
    }

    wallet.doDiscovery(50, function(err, result) {
        if (err) {
            console.log(err);
            return;
        }

        console.log(result);
    });
});

