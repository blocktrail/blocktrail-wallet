// from backup PDF
var backupSeed = prompt();
var encryptedPrimarySeed = prompt();
var recoveryEncryptedSecret = prompt();

// user input
var newPassword = prompt();

// from email (from our server)
var recoverySecret = prompt();

// decrypt
var secret = AES.decrypt(recoveryEncryptedSecret, recoverySecret);
var primarySeed = AES.decrypt(encryptedPrimarySeed, secret);

// new encrypt
var passwordEncryptedSecret = AES.encrypt(secret, newPassword);

server.updateWalletEncryptedSecret(
    identifier,
    passwordEncryptedSecret
);

blocktrailSDK.makeBackupPDFPage2(
    passwordEncryptedSecret
).store();
