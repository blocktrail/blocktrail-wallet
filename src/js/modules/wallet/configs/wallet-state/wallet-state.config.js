(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .config(walletStateConfig);

    function walletStateConfig($stateProvider) {
        $stateProvider
        /*---Wallet Home---*/
            .state("app.wallet", {
                abstract: true,
                cache: false,
                url: "/wallet",
                controller: "WalletCtrl",
                templateUrl: "js/modules/wallet/controllers/wallet/wallet.tpl.html",
                resolve: {
                    showLoadingScreenOnAppWalletResolveStart: showLoadingScreenOnAppWalletResolveStart,
                    checkAPIKeyActive: checkAPIKeyActive,
                    pinOnOpen: pinOnOpen,
                    activeWallet: getActiveWallet,
                    loadingData: loadingData
                },
                params: {
                    networkChange: false
                }
            })
            .state("app.wallet.summary", {
                url: "?refresh",
                cache: false,
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/wallet-summary/wallet-summary.tpl.html",
                        controller: "WalletSummaryCtrl"
                    }
                }
            })
            .state("app.wallet.buybtc", {
                url: "/buy",
                abstract: true,
                template: "<ion-nav-view />"
            })
            .state("app.wallet.buybtc.choose", {
                url: "/choose",
                data: {
                    clearHistory: true  // always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/buy-btc-choose/buy-btc-choose.tpl.html",
                        controller: "BuyBTCChooseCtrl"
                    }
                }
            })
            .state("app.wallet.buybtc.glidera_oauth2_callback", {
                cache: false,
                url: "/glidera/oaoth2/callback",
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/buy-btc-glidera-oauth-callback/buy-btc-glidera-oauth-callback.tpl.html",
                        controller: "BuyBTCGlideraOauthCallbackCtrl"
                    }
                }
            })
            .state("app.wallet.buybtc.buy", {
                url: "/broker/:broker",
                data: {
                    clearHistory: true  // always clear history when entering this state
                },
                cache: false,
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/buy-btc-broker/buy-btc-broker.tpl.html",
                        controller: "BuyBTCBrokerCtrl"
                    }
                }
            })

            /*--- Send ---*/
            .state("app.wallet.send", {
                url: "/send",
                cache: false,
                data: {
                    clearHistory: true  // always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/send/send.tpl.html",
                        controller: "SendCtrl"
                    }
                },
                params: {
                    sendInput : null
                }
            })
            .state("app.wallet.send.qrcode", {
                url: "/scan?backdrop",
                data: {
                    clearHistory: false
                },
                views: {
                    "overlayView": {
                        controller: "SendScanQRCtrl"
                    }
                },
                params: {
                    promoCodeRedeem : false
                }
            })
            .state("app.wallet.send.contacts", {
                url: "/contacts",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "js/modules/wallet/controllers/contact-list/contact-list.tpl.html",
                        controller: "ContactsListCtrl"
                    }
                }
            })
            .state("app.wallet.send.address", {
                url: "/address-input",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "js/modules/wallet/controllers/send-address-input/send-address-input.tpl.html",
                        controller: "SendAddressInputCtrl"
                    }
                }
            })
            .state("app.wallet.send.fee-choice", {
                url: "/fee-choice",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "js/modules/wallet/controllers/fee-choice/fee-choice.tpl.html"
                    }
                }
            })
            .state("app.wallet.send.confirm", {
                url: "/confirm",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "js/modules/wallet/controllers/send-confirm/send-confirm.tpl.html",
                        controller: "SendConfirmCtrl"
                    }
                }
            })

            /*--- Receive ---*/
            .state("app.wallet.receive", {
                url: "/receive",
                cache: false,
                data: {
                    clearHistory: true  // always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/receive/receive.tpl.html",
                        controller: "ReceiveCtrl"
                    }
                }
            })

            /*--- Address lookup ---*/
            .state("app.wallet.receive.address-lookup", {
                url: "/receive/address-lookup",
                cache: false,
                data: {
                    clearHistory: true // always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/address-lookup/address-lookup.tpl.html",
                        controller: "AddressLookupCtrl"
                    }
                }
            })

            /*--- Promo Codes ---*/
            .state("app.wallet.promo", {
                url: "/promo?code",
                cache: false,
                data: {
                    clearHistory: true  // always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/promo/promo.redeem-code.html",
                        controller: "PromoCodeRedeemCtrl"
                    }
                }
            })

            /*--- Settings ---*/
            .state("app.wallet.settings", {
                url: "/settings",
                cache: false,
                data: {
                    clearHistory: true
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings/settings.tpl.html",
                        controller: "SettingsCtrl"
                    }
                }
            })
            .state("app.wallet.settings.profile", {
                url: "/profile",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-profile/settings-profile.tpl.html",
                        controller: "SettingsProfileCtrl"
                    }
                }
            })
            .state("app.wallet.settings.backup", {
                url: "/wallet-backup",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-wallet-backup/settings-wallet-backup.tpl.html",
                        controller: "SettingsWalletBackupCtrl"
                    }
                }
            })
            .state("app.wallet.settings.phone", {
                url: "/phone?goBackTo",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-phone/settings-phone.tpl.html",
                        controller: "SettingsPhoneCtrl"
                    }
                }
            })
            .state("app.wallet.settings.about", {
                url: "/about",
                cache: true,
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-about/settings-about.tpl.html",
                        controller: "SettingsAboutCtrl"
                    }
                }
            })
            .state("app.wallet.settings.feedback", {
                url: "/feedback",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-feedback/settings-feedback.tpl.html",
                        controller: "SettingsFeedbackCtrl"
                    }
                }
            });
    }

    function checkAPIKeyActive($state, $q, launchService, modalService, sdkService, Currencies) {
        return launchService.getWalletConfig(true)
            .then(function(result) {
                if (result.api_key && (result.api_key !== 'ok')) {
                    // alert user session is invalid
                    modalService.alert({
                            title: "INVALID_SESSION_LOGOUT_NOW",
                            body: "INVALID_SESSION"
                        })
                        .then(function () {
                            $state.go('app.reset');
                        });

                    // throw error to prevent controller from loading or any other resolves to continue
                    return $q.reject(new Error("API_KEY_INVALID"));
                } else {
                    // TODO Review checkAPIKeyActive
                    if(result.currencies) {
                        result.currencies.forEach(function (currency) {
                            Currencies.enableCurrency(currency);
                        });
                    }
                }

                return true;
            })
            .then(sdkSetAccountInfo.bind({}, launchService, sdkService));
    }

    function sdkSetAccountInfo(launchService, sdkService) {
        return launchService.getAccountInfo()
            .then(function(accountInfo) {
                return sdkService.setAccountInfo(accountInfo);
            });
    }

    /**
     *
     * @param $q
     * @param $state
     * @param $rootScope
     */
    function pinOnOpen(localSettingsService, $q, $state, $rootScope, CONFIG) {
        return localSettingsService.getLocalSettings()
            .then(function(localSettings) {
                // if pinOnOpen is required and last time we asked for it was more than 5min ago
                if (localSettings.isPinOnOpen && !$rootScope.STATE.INITIAL_PIN_DONE && (typeof CONFIG.PIN_ON_OPEN === "undefined" || CONFIG.PIN_ON_OPEN === true)) {
                    $rootScope.STATE.PENDING_PIN_REQUEST = true;

                    $state.go("app.pin", { nextState: $state.$current.name });

                    // throw error to prevent controller from loading or any other resolves to continue
                    return $q.reject(new Error("PIN_REQUIRED"));
                }
            });
    }

    /**
     * Get the active wallet
     * @param $state
     * @param $q
     * @param launchService
     * @param sdkService
     * @param walletsManagerService
     * @param pinOnOpen                 not used, just for forcing order of resolves
     */
    function getActiveWallet($state, $q, launchService, sdkService, walletsManagerService, pinOnOpen) {
        return $q.all([launchService.getAccountInfo(), launchService.getWalletInfo()])
            .then(function(data) {
                var accountInfo = data[0];
                var walletInfo = data[1];

                if (!sdkService.getNetworkType() || !walletInfo.identifier) {
                    $state.go("app.reset");
                    throw new Error("Missing networkType or identifier");
                }

                sdkService.setAccountInfo(accountInfo);
                sdkService.setNetworkType(walletInfo.networkType);

                return walletsManagerService.fetchWalletsList()
                    .then(function() {
                        var activeWallet = walletsManagerService.getActiveWallet();

                        // active wallet is null when we load first time
                        if (!activeWallet) {
                            activeWallet = walletsManagerService.setActiveWalletByNetworkTypeAndIdentifier(walletInfo.networkType, walletInfo.identifier);
                        } else {
                            sdkService.setNetworkType(activeWallet.getReadOnlyWalletData().networkType);
                        }

                        return activeWallet;
                    });
            });
    }

    /**
     * Loading data
     * @param settingsService
     * @param $q
     * @param $rootScope
     * @param $log
     * @param Currencies
     * @param activeWallets         not used, just for forcing order of resolves
     */
    /**
     * !! activeWallet and handleSetupState should stay in here even when not used
     * !! to make sure the resolves happen in the correct order
     * TODO Review
     */
    function loadingData($q, $rootScope, $log, CONFIG, settingsService, localSettingsService, launchService,
                         blocktrailLocalisation, Currencies, activeWallet) {
        // Do an initial load of cached user data
        return $q.all([
            Currencies.updatePrices(true),
            settingsService.initSettings(),
            localSettingsService.initLocalSettings(),
            launchService.getWalletConfig()
        ]).then(function(results) {
            var settings = results[1];
            var walletConfig = results[3];
            // TODO Review the logic with selected language
            var extraLanguages = walletConfig.extraLanguages.concat(CONFIG.EXTRA_LANGUAGES).unique();

            // enable all languages
            extraLanguages.forEach(function(language) {
                blocktrailLocalisation.enableLanguage(language);
            });

            $log.debug("Initial load complete");
            $rootScope.bitcoinPrices = results[0];
            $rootScope.changeLanguage(settings.language);
            return true;
        });
    }

    // Display full loading screen while we initialize the wallet
    function showLoadingScreenOnAppWalletResolveStart($rootScope) {
        $rootScope.hideLoadingScreen = false;
    }

})();
