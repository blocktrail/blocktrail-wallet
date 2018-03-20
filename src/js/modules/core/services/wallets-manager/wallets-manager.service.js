(function() {
    "use strict";

    // TODO Add later
    angular.module("blocktrail.core")
        .factory("walletsManagerService", function($q, CONFIG, sdkService, walletService, launchService) {
            return new WalletsManagerService($q, CONFIG, sdkService, walletService, launchService);
        });

    function WalletsManagerService($q, CONFIG, sdkService, walletService, launchService) {
        var self = this;

        self._$q = $q;
        self._CONFIG = CONFIG;
        self._sdkService = sdkService;
        self._walletService = walletService;
        self._launchService = launchService;

        self._wallets = {};
        self._walletsList = [];
        self._activeWallet = null;
    }

    /**
     * Fetch the wallets list
     * @return { promise } _walletsList
     */
    WalletsManagerService.prototype.fetchWalletsList = function() {
        var self = this;

        return self._sdkService.getGenericSdk()
            .getAllWallets(!!self._CONFIG.DEBUG)
            .then(function(result) {
                return self._launchService.getWalletConfig()
                    .then(function(walletConfig) {
                        return {
                            disabledNetworks: walletConfig.disabledNetworks || [],
                            list: result.data
                        }
                    });
            })
            .then(function(res) {
                var disabledNetworks = res.disabledNetworks;
                var list = res.list;

                self._walletsList = [];
                list.forEach(function(wallet) {
                    wallet.network = wallet.network.replace(/BCH$/, 'BCC');
                    if (self._CONFIG.NETWORKS_ENABLED.indexOf(wallet.network) !== -1 && disabledNetworks.indexOf(wallet.network) === -1) {
                        // Add unique id
                        wallet.uniqueIdentifier = self._getWalletUniqueIdentifier(wallet.network, wallet.identifier);

                        self._walletsList.push(wallet);
                    }
                });

                return self._walletsList;
            });
    };

    /**
     * Get the wallet list
     * @return { Array } _walletsList
     */
    WalletsManagerService.prototype.getWalletsList = function() {
        var self = this;

        return self._walletsList;
    };

    /**
     * Get the active wallet
     * @return { null | object } _activeWallet
     */
    WalletsManagerService.prototype.getActiveWallet = function() {
        var self = this;

        return self._activeWallet;
    };

    /**
     * Get the active wallet
     * @return { null | object } _activeWallet
     */
    WalletsManagerService.prototype.getActiveWalletReadOnlyData = function() {
        var self = this;

        return self._activeWallet.getReadOnlyWalletData();
    };

    /**
     * Get the active wallet network type
     * @return { string }
     */
    WalletsManagerService.prototype.getActiveWalletNetwork = function() {
        var self = this;

        return self._activeWallet.getReadOnlyWalletData().networkType;
    };

    /**
     * Get the active sdk wallet
     * @return { string }
     */
    WalletsManagerService.prototype.getActiveSdkWallet = function() {
        var self = this;

        return self._activeWallet.getSdkWallet();
    };

    /**
     * Get active sdk
     */
    WalletsManagerService.prototype.getActiveSdk = function() {
        var self = this;

        return self._activeWallet.getSdk();
    };


    /**
     * Set the active wallet by the network type and the identifier
     * @param networkType
     * @param identifier
     * @return { object } _activeWallet
     */
    WalletsManagerService.prototype.setActiveWalletByNetworkTypeAndIdentifier = function(networkType, identifier) {
        var self = this;
        var uniqueIdentifier = self._getWalletUniqueIdentifier(networkType, identifier);

        if (!networkType) {
            throw new TypeError("Blocktrail core module, wallets manager service. Network type should be defined.");
        }

        if (!identifier) {
            throw new TypeError("Blocktrail core module, wallets manager service. Identifier should be defined.");
        }

        if (!self._isExistingWalletByUniqueIdentifier(uniqueIdentifier)) {
            var wallets = self._filterWalletsByNetworkType(networkType);

            if (wallets.length) {
                identifier = wallets[0].identifier;
                uniqueIdentifier = self._getWalletUniqueIdentifier(networkType, identifier);
            } else {
                throw new TypeError("Blocktrail core module, wallets manager service. No wallets for " + networkType + " network type.");
            }
        }

        return self._setActiveWallet(networkType, identifier, uniqueIdentifier);
    };

    /**
     * Set the active wallet by the unique identifier
     * @param uniqueIdentifier
     * @return { object } _activeWallet
     */
    WalletsManagerService.prototype.setActiveWalletByUniqueIdentifier = function(uniqueIdentifier) {
        var self = this;

        var wallet = self._walletsList.filter(function(wallet) {
            return wallet.uniqueIdentifier === uniqueIdentifier;
        })[0];

        if (!wallet) {
            throw new Error("Blocktrail core module, wallets manager service. Wallet with unique identifier " + uniqueIdentifier + " is not exist.");
        }

        return self._setActiveWallet(wallet.network, wallet.identifier, wallet.uniqueIdentifier);
    };

    /**
     * Set the active wallet
     * @param networkType
     * @param identifier
     * @param uniqueIdentifier
     * @return { object } _activeWallet
     * @private
     */
    WalletsManagerService.prototype._setActiveWallet = function(networkType, identifier, uniqueIdentifier) {
        var self = this;
        var promise = null;

        if (self._activeWallet) {
            // Check on the same wallet
            if (self._activeWallet.getReadOnlyWalletData().uniqueIdentifier !== uniqueIdentifier) {
                // Disable polling for active wallet and enable polling for new active wallet
                self._activeWallet.disablePolling();
                // Check the wallet in the buffer
                if (self._wallets[uniqueIdentifier]) {
                    self._wallets[uniqueIdentifier].enablePolling();
                    // Set a link to the new active wallet
                    self._activeWallet = self._wallets[uniqueIdentifier];

                    promise = self._$q.when(self._activeWallet);
                } else {
                    // if wallet is not in the buffer we have to initialize it
                    promise = self._initWallet(networkType, identifier, uniqueIdentifier);
                }
            } else {
                promise = self._$q.when(self._activeWallet);
            }
        } else {
            // if active wallet is not exist have to initialize it
            promise = self._initWallet(networkType, identifier, uniqueIdentifier);
        }

        return self._$q.when(promise);
    };

    /**
     * Initialize the wallet
     * @param networkType
     * @param identifier
     * @param uniqueIdentifier
     * @return { object } _activeWallet
     * @private
     */
    WalletsManagerService.prototype._initWallet = function(networkType, identifier, uniqueIdentifier) {
        var self = this;

        return self._walletService.initWallet(networkType, identifier, uniqueIdentifier)
            .then(function(wallet) {
                // Add wallet to buffer
                self._wallets[wallet.getReadOnlyWalletData().uniqueIdentifier] = wallet;
                // Set a link to the active wallet
                self._activeWallet = self._wallets[wallet.getReadOnlyWalletData().uniqueIdentifier];

                return self._activeWallet;
            });
    };

    /**
     * Is existing the wallet by unique identifier
     * @param uniqueIdentifier
     * @return {boolean}
     * @private
     */
    WalletsManagerService.prototype._isExistingWalletByUniqueIdentifier = function(uniqueIdentifier) {
        var self = this;

        return !!self._walletsList.filter(function(item) {
            return item.uniqueIdentifier === uniqueIdentifier;
        }).length;
    };

    /**
     * Filter the wallets by network type
     * @param networkType
     * @return { Array }
     * @private
     */
    WalletsManagerService.prototype._filterWalletsByNetworkType = function(networkType) {
        var self = this;

        return self._walletsList.filter(function(item) {
            return item.network === networkType;
        });
    };

    /**
     * Get the wallet unique identifier
     * @param networkType
     * @param identifier
     * @return {string}
     * @private
     */
    WalletsManagerService.prototype._getWalletUniqueIdentifier = function(networkType, identifier) {
        return networkType + "_" + identifier;
    };
})();
