BlockTrail NodeJS SDK Developer Notes
=====================================

all tests have a hardcoded API key so anyone who checks out the repo can always run the tests and travis PRs can always run the tests.  

 - for travis we use an API key from the ENV (encrypted in travis.yml).
 - locally for developers we recommend setting an API key in the ENV as well (in `~/.bashrc`)
   ```
   export BLOCKTRAIL_SDK_APIKEY=""
   export BLOCKTRAIL_SDK_APISECRET=""
   ```

when creating a new account / new API key to use for the tests a couple of wallets need to be created on the account.  
this can be done with:
```
node tools/setup-dev-wallet.js
```
