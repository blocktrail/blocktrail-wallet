// user input
var email = prompt();
var accountPassword = prompt();
var walletPassword = accountPassword;

// call backend to create account, get apiKey back from backend
var apiKey = serverApi.createAccount(email, CryptoJS.SHA512(accountPassword));

// random identifier with prefix
var identifier = 'mywallet-' + randomBits(64).toString('hex');

// backup private key
var backupSeed = randomBits(256);

// primary private key
var primarySeed = randomBits(256);

// secret value used during encryption
var secret = randomBits(256);

// secret value used for backup process
var recoverySecret = randomBits(256);

// convert seeds to bitcoin public keys
var primaryPublicKey = bitcoinJS.pubKeyFromSeed(primarySeed);
var backupPublicKey = bitcoinJS.pubKeyFromSeed(backupSeed);

// encrypt seed with secret
var encryptedPrimarySeed = Encrypt(primarySeed, secret);

// encrypt secret in 2 ways
var secretEncryptedWithPassword = Encrypt(secret, walletPassword);
var secretEncryptedWithRecoverySecret = Encrypt(secret, recoverySecret);

// call backend to create wallet and submit encrypted data
var blocktrailPubKey = serverApi.createWallet(
    apiKey, // for authentication
    identifier,
    encryptedPrimarySeed,
    secretEncryptedWithPassword,
    recoverySecret,
    primaryPublicKey,
    backupPublicKey
);

// generate backup PDF and store it
blocktrailSDK.makeBackupPDF(
    identifier,
    encryptedPrimarySeed,
    backupSeed,
    secretEncryptedWithPassword,
    secretEncryptedWithRecoverySecret
).store();
