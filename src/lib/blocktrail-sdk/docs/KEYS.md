# BlockTrail MultiSig HD Wallet
Below is a short write up about how BlockTrail Wallets are created and initialized.  
Code snippets are pseudo code.

The old document explaining the wallet creation, initialization and usage is here: https://gist.github.com/rubensayshi/da922774d43976e0804c

## Wallet Creation
```
username = prompt()
userPassword = prompt()
walletPassword = walletPassword

primarySeed = randomBits(256)
backupSeed = randomBits(256)
secret = randomBits(256)
recoverySecret = randomBits(256)

passwordEncryptedSecret = AES.encrypt(secret, userPassword)

encryptedPrimarySeed = AES.encrypt(primarySeed, secret)

primaryPublicKey = bip32.derive(primarySeed, "M/0'/0'")
backupPublicKey = bip32.derive(backupSeed, "M/0/0")

recoveryEncryptedSecret = AES.encrypt(secret, recoverySecret)
```

### Submit UserInfo to Server
 - `username`
 - `sha512(userPassword)`

### Submit WalletInfo to Server
 - `passwordEncryptedSecret`
 - `encryptedPrimarySeed`
 - `recoverySecret`
 - `primaryPublicKey`
 - `backupPublicKey`

### Print Recovery Sheet
#### page 1:
 - `encryptedPrimarySeed` (QR & bip39.entropyToMnemonic)
 - `backupSeed` (QR & bip39.entropyToMnemonic)
 - `recoveryEncryptedSecret` (QR & bip39.entropyToMnemonic)

#### page 2:
 - `passwordEncryptedSecret` (QR & bip39.entropyToMnemonic)

### Motivation
We're using a `secret` to encrypt the `primarySeed` with so that it's easy to password change without having to change the `encryptedPrimarySeed`.  
And it won't require updating the backup document.

We hash the `userPassword` before submitting it to the server, to ensure we never have access to the real password, 
of course the (hash of the) `userPassword` is then salted and hashed again using industry standards before storing in our database.

The Recovery Sheet still requires the `walletPassword` to be able to use it,  
or alternatively the `recoverySecret`, this allows a user who has forgotten his password to still recover his wallet if he's able to 
authenticate himself with BlockTrail.

(BIP39) Mnemonics are used on the Recovery Sheet to be able to store / print the (encrypted) data 
so it can easily be entered by a human from a printed document.  

## Wallet Init
```
password = prompt()
passwordEncryptedSecret = fromServer()
encryptedPrimarySeed = fromServer()

secret = AES.decrypt(passwordEncryptedSecret, password)
primarySeed = AES.decrypt(encryptedPrimarySeed, secret)
```

## Wallet Password Change
```
userPassword = prompt()
walletPassword = userPassword
newUserPassword = prompt()
newWalletPassword = newUserPassword

secret = AES.decrypt(passwordEncryptedSecret, password)
newPasswordEncryptedSecret = AES.encrypt(secret, newPassword)
```

### Submit UserInfo to Server
 - `sha512(userPasssword)`
 - `sha512(newWalletPassword)`

### Submit WalletInfo to Server
 - `newPasswordEncryptedSecret`
 - previous `passwordEncryptedSecret` is deleted

### Print Update to Recovery Sheet
#### page N:
 - `passwordEncryptedSecret` (QR & bip39.entropyToMnemonic)

## Wallet Lost Password Recovery 
```
recoverySecret = fromServer()
recoveryEncryptedSecret = prompt("from sheet") # either QR base64 or bip39.mnemonicToEntropy()
secret = AES.decrypt(recoveryEncryptedSecret, recoverySecret)
```

#### Problem Scenario
If a user has chosen to use username instead of email for account creation (which is not the default, but allowed for the anonymous-advocates).  
He could be locked out of his wallet and account if he forgets his password,  
and then we can't auth them so we can't provide the recoverySecretMnemonic anymore either.  

In this case we'll attempt to manually verify the user by asking him information about the wallet (estimated balance, first created).  
We'll also ask ID document, just so that if it's someone who stole a backup document we at least have something to report to authorities.  
