// user input
var email = prompt();
var accountPassword = prompt();
var walletPassword = walletPassword;

// authenticate with backend,
// backend will return apiKey to use for other API calls
// and the identifier to use for the default wallet
var apiKey, identifier = serverApi.loginAccount(email, CryptoJS.SHA512(accountPassword));

// multi wallet setup
// var wallets = serverApi.getAllMyWallets(apiKey);
// var wallet = prompt('Which wallet do you want?' + wallets.map());

// fetch data for wallet
var passwordEncryptedSecret, encryptedPrimarySeed = serverApi.getWallet(
    apiKey,
    identifier
);

// decrypt the secret
var secret = AES.decrypt(passwordEncryptedSecret, walletPassword);

// decrypt the primarySeed
var primarySeed = AES.decrypt(encryptedPrimarySeed, secret);
