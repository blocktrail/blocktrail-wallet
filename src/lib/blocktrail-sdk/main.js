var APIClient = require('./lib/api_client');
var blocktrail = require('./lib/blocktrail');

Object.keys(blocktrail).forEach(function(key) {
    APIClient[key] = blocktrail[key];
});

/*
 * we used APIClient as base export so that people can client require('blocktrail')
 *  but that's deprecated and they should require('blocktrail').BlocktrailSDK now, but leaving it for now
 */

APIClient.q = require('q');
APIClient.BlocktrailSDK = APIClient;
APIClient.Wallet = require('./lib/wallet');
APIClient.BackupGenerator = require('./lib/backup_generator');
APIClient.Request = require('./lib/request');
APIClient.Encryption = require('./lib/encryption');
APIClient.KeyDerivation = require('./lib/keyderivation');
APIClient.EncryptionMnemonic = require('./lib/encryption_mnemonic');
APIClient.useWebworker = require('./lib/use-webworker');

APIClient.WalletSweeper = require('./lib/wallet_sweeper');
APIClient.UnspentOutputFinder = require('./lib/unspent_output_finder');

// data service providers, for wallet recovery
APIClient.BlocktrailBitcoinService = require('./lib/services/blocktrail_bitcoin_service');
APIClient.InsightBitcoinService = require('./lib/services/insight_bitcoin_service');

// expose these for using in the browser
APIClient.randomBytes = require('randombytes');
APIClient.lodash = require('lodash');
APIClient.CryptoJS = require('crypto-js');
APIClient.debug = require('debug');
APIClient.bip39 = require('bip39');
APIClient.bitcoin = require('bitcoinjs-lib');
APIClient.superagent = require('superagent');
APIClient.Buffer = Buffer;

exports = module.exports = APIClient;
