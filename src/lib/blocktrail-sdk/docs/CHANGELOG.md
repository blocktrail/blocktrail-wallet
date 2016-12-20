BlockTrail NodeJS SDK Changelog
===============================

v3.0.0
------
 - New [Default] Wallet Version 3  
   Better encryption scheme / key derivation.
 - Deprecated passing in `primaryPrivateKey`, should use `primarySeed` instead.

v2.0.1
------
 - Add support for `OP_RETURN` in `wallet.pay` (see `examples/opreturn_payment_api_usage.js`)

v2.0.0
------
 - New [Default] Wallet Version 2
 - `BackupGenerator` now supports `extra` to be printed on document for extra notes
 - No longer support `BackupGenerator::generateImage`
 - 2FA support
 - Floating Fees

### Upgrade / BC breaks
 - `createNewWallet` now returns `spread(wallet, backupInfo)` to be able to support both v1 and v2
 - `new BackupGenerator()` now takes `identifier, backupInfo, extra`
 - No longer support `BackupGenerator::generateImage`
 - Defaults to using `Wallet.FEE_STRATEGY_OPTIMAL` instead of `Wallet.FEE_STRATEGY_BASE_FEE`!

### New [Default] Wallet Version 2
Instead of using `BIP39`, wallet seeds will now be stored encrypted - to allow for password changes

Wallet Creation:  
```
primarySeed = random()
secret = random()
primaryMnemonic = BIP39.entropyToMnemonic(AES.encrypt(primarySeed, secret))
secretMnemonic = BIP39.entropyToMnemonic(AES.encrypt(secret, password))
```

Wallet Init:  
```
secret = BIP39.entropyToMnemonic(AES.decrypt(secretMnemonic, password))
primarySeed = BIP39.entropyToMnemonic(AES.decrypt(primaryMnemonic, secret))
```

See `docs/KEYS.md` for more info
   
Old Wallets that are v1 will remain so and will continue working.

Wallets created through the Blocktrail website will have an option to choose which version to create (default v2), 
as grace period the first few days after the SDK release this will default to v1 still.

### Floating Fees
To deal with stresstests etc. there's now a `feePerKB` method to get the optimal fee and the `wallet.pay` has a `feeStrategy` argument.  
When `feeStrategy` is `Wallet.FEE_STRATEGY_OPTIMAL` (default) it will use the (by the API calculated) optimal fee per KB.  
When `feeStrategy` is `Wallet.FEE_STRATEGY_BASE_FEE` it will use the BASE_FEE of 0.0001 BTC per KB and use the old way of rounding the transaction size to 1 KB.

Optimal fee is calculated by taking all transactions from the last 30 blocks and calculating what the lowest possible fee is 
that still gives more than 80% chance to end up in the next block.

### 2FA Support
When enabled (currently still impossible to enable) you'll be required to add a `twoFactorToken` to the `wallet.pay`.  
We'll do another patch soon to add ways to setup 2FA and add it to the GUI on the site!

v1.3.12
-------
 - add batch support for fetching multiple transactions.
 - use .notify on the pay promise for progress.
 - allow for bypassing of local derivation of new address (used to verify API response)
