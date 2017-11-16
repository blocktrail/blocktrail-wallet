(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .config(setupStateConfig);

    function setupStateConfig($stateProvider) {
        $stateProvider
            .state("app.setup", {
                url: "/setup",
                abstract: true,
                controller: "SetupCtrl",
                templateUrl: "js/modules/setup/controllers/setup/setup.tpl.html",
                resolve: {
                    preferredLanguage: preferredLanguage
                }
            })
            .state("app.setup.start", {
                url: "/start",
                cache: false,
                controller: "SetupStartCtrl",
                templateUrl: "js/modules/setup/controllers/start/start.tpl.html",
                data: {
                    clearHistory: true
                }
            })
            .state("app.setup.login", {
                url: "/login",
                cache: false,
                controller: "SetupLoginCtrl",
                templateUrl: "js/modules/setup/controllers/login/login.tpl.html"
            })
            .state("app.setup.register", {
                url: "/register",
                cache: false,
                controller: "SetupNewAccountCtrl",
                templateUrl: "js/modules/setup/controllers/new-account/new-account.tpl.html"
            })
            .state("app.setup.pin", {
                url: "/pin",
                cache: false,
                controller: "SetupWalletPinCtrl",
                templateUrl: "js/modules/setup/controllers/wallet-pin/wallet-pin.tpl.html",
                resolve: {
                    accountInfo: getAccountInfo
                }
            })



            // TODO Review
            .state("app.setup.backup", {
                url: "/wallet-backup",
                cache: false,
                controller: "SetupWalletBackupCtrl",
                templateUrl: "js/modules/setup/controllers/wallet-backup/wallet-backup.tpl.html",
                resolve: {
                    // TODO Do we need it ??
                    getWalletBackup: getWalletBackup,

                    // TODO check initialization for SDK
                    sdkSetAccountInfo: sdkSetAccountInfo
                }
            })

            .state("app.setup.wallet", {
                url: "/phone",
                controller: "SetupPhoneCtrl",
                templateUrl: "js/modules/setup/controllers/phone/phone.tpl.html",
                data: {
                    clearHistory: true  //clear any previous history
                },
                resolve: {
                    // TODO Do we need it ??
                    getWalletBackup: getWalletBackup,

                    // TODO check initialization for SDK
                    sdkSetAccountInfo: sdkSetAccountInfo
                }
            })

            .state("app.setup.wallet.phone", {
                url: "/phone",
                controller: "SetupPhoneCtrl",
                templateUrl: "js/modules/setup/controllers/phone/phone.tpl.html",
                data: {
                    clearHistory: true  //clear any previous history
                },
                resolve: {
                    walletInfo: getWalletInfo
                }
            })


            .state("app.setup.phone", {
                url: "/phone",
                controller: "SetupPhoneCtrl",
                templateUrl: "js/modules/setup/controllers/phone/phone.tpl.html",
                data: {
                    clearHistory: true  //clear any previous history
                },
                resolve: {
                    walletInfo: getWalletInfo
                }
            })
            // NB: create a copy of the app.wallet.settings.phone to bypass the WalletController which inits the wallet and starts polling
            .state("app.setup.phone-verify", {
                url: "/phone?goBackTo",
                templateUrl: "templates/settings/settings.phone.html",
                controller: "SettingsPhoneCtrl",
                resolve: {
                    // TODO Review !!!
                    settings: function(settingsService, $rootScope) {
                        // do an initial load of the user's settings
                        return settingsService
                            .$isLoaded()
                            .then(
                                function(data) {
                                    $rootScope.settings = settingsService;
                                    //set the preferred language
                                    $rootScope.changeLanguage(settingsService.language);

                                    return data;
                                });
                    }
                }
            })
            .state("app.setup.contacts", {
                url: "/contacts",
                controller: "SetupContactsCtrl",
                templateUrl: "js/modules/setup/controllers/contacts/contacts.tpl.html",
                resolve: {
                    walletInfo: getWalletInfo
                }
            })
            // TODO review profile for wallet & setup !!! to complex logic
            .state("app.setup.profile", {
                url: "/profile",
                controller: "SettingsProfileCtrl", // This controller from the wallet module
                templateUrl: "js/modules/setup/controllers/profile/profile.tpl.html",
                resolve: {
                    walletInfo: getWalletInfo
                }
            })
            .state("app.setup.complete", {
                url: "/complete",
                controller: "SetupCompleteCtrl",
                templateUrl: "js/modules/setup/controllers/complete/complete.tpl.html"
            });
    }

    /**
     * Check for extra languages to enable, if new language is new preferred, set it
     *
     * @param $state
     * @param $rootScope
     * @param CONFIG
     * @param blocktrailLocalisation
     * @param launchService
     */
    function preferredLanguage($state, $rootScope, CONFIG, blocktrailLocalisation, launchService) {
        var bannedIp = false;

        return launchService.getWalletConfig()
            .then(function(result) {
                // TODO Review
                bannedIp = result.is_banned_ip;
                return result.extraLanguages.concat(CONFIG.EXTRA_LANGUAGES).unique();
            })
            .then(function(extraLanguages) {
                // parse extra languages to determine if there"s any new
                var r = blocktrailLocalisation.parseExtraLanguages(extraLanguages);
                var preferredLanguage;

                // if there's any new we should store those
                if (r) {
                    preferredLanguage = r[1];
                } else {
                    preferredLanguage = blocktrailLocalisation.setupPreferredLanguage();
                }

                // activate preferred language
                $rootScope.changeLanguage(preferredLanguage);
            })
            .then(function() {
                if (bannedIp) {
                    // TODO Add this state
                    $state.go("app.bannedip", { bannedIp: bannedIp });
                }
            }, function(e) {
                console.error(e);
            });
    }

    function sdkSetAccountInfo(launchService, sdkService) {
        return launchService.getAccountInfo()
            .then(function(accountInfo) {
                return sdkService.setAccountInfo(accountInfo);
            });
    }
    
    function getAccountInfo($state, launchService) {
        return launchService
            .getAccountInfo()
            .then(returnData, toAppResetState.bind(this, $state));
    }

    function getWalletBackup($state, launchService) {
        return launchService
            .getWalletBackup()
            .then(returnData, toAppResetState.bind(this, $state));
    }
    
    function getWalletInfo($state, launchService) {
        return launchService
            .getWalletInfo()
            .then(returnData, toAppResetState.bind(this, $state));
    }

    function returnData(data) {
        return data;
    }

    function toAppResetState($state) {
        return $state.go("app.reset");
    }
})();
