(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .config(walletStateConfig);

    function walletStateConfig($stateProvider) {
        $stateProvider
        /*---Wallet Home---*/
            .state('app.wallet', {
                abstract: true,
                cache: false,
                url: "/wallet",
                controller: "WalletCtrl",
                templateUrl: "js/modules/wallet/controllers/wallet/wallet.tpl.html",
                resolve: {
                    checkAPIKeyActive: checkAPIKeyActive,
                    settingsData: getSettingsData,
                    pinOnOpen: pinOnOpen,
                    activeWallet: getActiveWallet,
                    loadingData: loadingData
                }
            })
            .state('app.wallet.summary', {
                url: "?refresh",
                cache: false,
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/wallet-summary/wallet-summary.tpl.html",
                        controller: 'WalletSummaryCtrl'
                    }
                }
            })
            .state('app.wallet.buybtc', {
                url: "/buy",
                abstract: true,
                template: "<ion-nav-view />"
            })
            .state('app.wallet.buybtc.choose', {
                url: "/choose",
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/buy-btc-choose/buy-btc-choose.tpl.html",
                        controller: 'BuyBTCChooseCtrl'
                    }
                }
            })
            .state('app.wallet.buybtc.glidera_oauth2_callback', {
                cache: false,
                url: "/glidera/oaoth2/callback",
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/buy-btc-glidera-oauth-callback/buy-btc-glidera-oauth-callback.tpl.html",
                        controller: 'BuyBTCGlideraOauthCallbackCtrl'
                    }
                }
            })
            .state('app.wallet.buybtc.buy', {
                url: "/broker/:broker",
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                cache: false,
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/buy-btc-broker/buy-btc-broker.tpl.html",
                        controller: 'BuyBTCBrokerCtrl'
                    }
                }
            })

            /*--- Send ---*/
            .state('app.wallet.send', {
                url: "/send",
                cache: false,
                data: {
                    clearHistory: true  // always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/send/send.tpl.html",
                        controller: 'SendCtrl'
                    }
                }
            })
            .state('app.wallet.send.qrcode', {
                url: "/scan?backdrop",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true        //never add this state to the history stack
                },
                views: {
                    "overlayView": {
                        templateProvider: function($stateParams, $log) {
                            $log.debug('set the backdrop', $stateParams);
                            if ($stateParams.backdrop) {
                                return '<div class="scan-screen"><h1>Loading...</h1></div>';
                            } else {
                                return '';
                            }
                        },
                        controller: 'SendScanQRCtrl'
                    }
                }
            })
            .state('app.wallet.send.contacts', {
                url: "/contacts",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "js/modules/wallet/controllers/contact-list/contact-list.tpl.html",
                        controller: 'ContactsListCtrl'
                    }
                }
            })
            .state('app.wallet.send.address', {
                url: "/address-input",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "js/modules/wallet/controllers/send-address-input/send-address-input.tpl.html",
                        controller: 'SendAddressInputCtrl'
                    }
                }
            })
            .state('app.wallet.send.fee-choice', {
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
            .state('app.wallet.send.confirm', {
                url: "/confirm",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "js/modules/wallet/controllers/send-confirm/send-confirm.tpl.html",
                        controller: 'SendConfirmCtrl'
                    }
                }
            })

            /*--- Receive ---*/
            .state('app.wallet.receive', {
                url: "/receive",
                cache: false,
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/receive/receive.tpl.html",
                        controller: 'ReceiveCtrl'
                    }
                }
            })

            /*--- Address lookup ---*/
            .state('app.wallet.receive.address-lookup', {
                url: "/receive/address-lookup",
                cache: false,
                data: {
                    clearHistory: true //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/address-lookup/address-lookup.tpl.html",
                        controller: 'AddressLookupCtrl'
                    }
                }
            })

            /*--- Promo Codes ---*/
            .state('app.wallet.promo', {
                url: "/promo?code",
                cache: false,
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/promo/promo.redeem-code.html",
                        controller: 'PromoCodeRedeemCtrl'
                    }
                }
            })

            /*--- Settings ---*/
            .state('app.wallet.settings', {
                url: "/settings",
                cache: false,
                data: {
                    clearHistory: true
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings/settings.tpl.html",
                        controller: 'SettingsCtrl'
                    }
                }
            })
            .state('app.wallet.settings.profile', {
                url: "/profile",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-profile/settings-profile.tpl.html",
                        controller: 'SettingsProfileCtrl'
                    }
                }
            })
            .state('app.wallet.settings.phone', {
                url: "/phone?goBackTo",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-phone/settings-phone.tpl.html",
                        controller: 'SettingsPhoneCtrl'
                    }
                }
            })
            .state('app.wallet.settings.currency', {
                url: "/currency",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-currency/settings-currency.tpl.html",
                        controller: 'SettingsCurrencyCtrl'
                    }
                }
            })
            .state('app.wallet.settings.language', {
                url: "/language",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-language/settings-language.tpl.html",
                        controller: 'SettingsLanguageCtrl'
                    }
                }
            })
            .state('app.wallet.settings.wallet', {
                url: "/wallet",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-wallet/settings-wallet.tpl.html",
                        controller: 'SettingsWalletCtrl'
                    }
                }
            })
            .state('app.wallet.settings.backup', {
                url: "/wallet-backup",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-wallet-backup/settings-wallet-backup.tpl.html",
                        controller: 'SettingsWalletBackupCtrl'
                    }
                },
                resolve: {
                    backupInfo: function($state, launchService) {
                        return launchService.getBackupInfo().then(
                            function(backupInfo) {
                                return backupInfo;
                            },
                            function() {
                                return null;
                            }
                        );
                    }
                }
            })
            .state('app.wallet.settings.about', {
                url: "/about",
                cache: true,
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "js/modules/wallet/controllers/settings-about/settings-about.tpl.html",
                        controller: 'SettingsAboutCtrl'
                    }
                }
            })

            /*--- Feedback ---*/
            .state('app.wallet.feedback', {
                url: "/feedback",
                data: {
                    clearHistory: true,
                    excludeFromHistory: true
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/feedback/feedback.html",
                        controller: 'FeedbackCtrl'
                    }
                }
            });
    }

    function checkAPIKeyActive(launchService, $state, $q, $translate, $cordovaDialogs) {
        return launchService.getWalletConfig()
            .then(function(result) {
                if (result.api_key && (result.api_key !== 'ok')) {
                    // alert user session is invalid
                    $cordovaDialogs.alert(
                        $translate.instant('INVALID_SESSION_LOGOUT_NOW'),
                        $translate.instant('INVALID_SESSION'),
                        $translate.instant('OK')
                    )
                        .finally(function () {
                            $state.go('app.reset');
                        });

                    // throw error to prevent controller from loading or any other resolves to continue
                    return $q.reject(new Error("API_KEY_INVALID"));
                }
            });
    }

    /**
     *
     * @param settingsService
     * @param checkAPIKeyActive leave here for forcing order of resolves
     * @return {promise|*}
     */
    function getSettingsData(settingsService, checkAPIKeyActive) {
        return settingsService.getSettings();
    }

    /**
     *
     * @param settingsService
     * @param $q
     * @param $state
     * @param $rootScope
     * @param settingsData          not used, just for forcing order of resolves
     */
    function pinOnOpen(settingsService, $q, $state, $rootScope, settingsData) {

        debugger;


        return settingsService.$isLoaded().then(function () {
            // if pinOnOpen is required and last time we asked for it was more than 5min ago
            if (settingsService.pinOnOpen && !$rootScope.STATE.INITIAL_PIN_DONE && (typeof CONFIG.PIN_ON_OPEN === "undefined" || CONFIG.PIN_ON_OPEN === true)) {
                $rootScope.STATE.PENDING_PIN_REQUEST = true;

                $state.go('app.pin', { nextState: $state.$current.name });

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
    function loadingData(settingsService, $q, $rootScope, $log, Currencies, activeWallet) {
        // Do an initial load of cached user data
        debugger;


        return $q.all([
            Currencies.updatePrices(true),
            settingsService.getSettings()
        ]).then(function(results) {
            $log.debug("Initial load complete");
            $rootScope.bitcoinPrices = results[0];
            $rootScope.changeLanguage(results[1].language);
            return true;
        });
    }
})();