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
                    /**
                     * check for extra languages to enable
                     * if new language is new preferred, set it
                     */
                    preferredLanguage: function(CONFIG, $rootScope, settingsService, blocktrailLocalisation, launchService, AppVersionService) {
                        return launchService.getWalletConfig()
                            .then(function(result) {
                                AppVersionService.checkVersion(
                                    null,
                                    null,
                                    result.versionInfo.mobile,
                                    AppVersionService.CHECKS.SETUP
                                );

                                return result.extraLanguages.concat(CONFIG.EXTRA_LANGUAGES).unique();
                            })
                            .then(function(extraLanguages) {
                                return settingsService.$isLoaded().then(function() {
                                    // parse extra languages to determine if there's any new
                                    var r = blocktrailLocalisation.parseExtraLanguages(extraLanguages);
                                    var preferredLanguage;

                                    // if there's any new we should store those
                                    if (r) {
                                        var newLanguages = r[0];
                                        preferredLanguage = r[1];
                                        settingsService.extraLanguages = settingsService.extraLanguages.concat(newLanguages).unique();
                                    } else {
                                        preferredLanguage = blocktrailLocalisation.setupPreferredLanguage();
                                    }

                                    // activate preferred language
                                    $rootScope.changeLanguage(preferredLanguage);

                                    // store preferred language
                                    settingsService.language = preferredLanguage;

                                    return settingsService.$store();
                                });
                            })
                            .then(function() {
                            }, function(e) {
                                console.error(e);
                            });
                    },
                    settings: function(settingsService, $rootScope) {
                        //do an initial load of the user's settings (will return defaults if none have been saved yet)
                        return settingsService.$isLoaded().then(function() {
                            $rootScope.settings = settingsService;
                            return settingsService;
                        });
                    }
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
                controller: "SetupRegisterCtrl",
                templateUrl: "js/modules/setup/controllers/register/register.tpl.html"
            })
            .state("app.setup.pin", {
                url: "/pin",
                cache: false,
                controller: "SetupWalletPinCtrl",
                templateUrl: "js/modules/setup/controllers/wallet-pin/wallet-pin.tpl.html",
                resolve: {
                    accountInfo: function($state, launchService) {
                        return launchService.getAccountInfo().then(
                            function(accountInfo) {
                                return accountInfo;
                            },
                            function() {
                                return $state.go("app.setup.start");
                            }
                        );
                    }
                }
            })
            .state("app.setup.backup", {
                url: "/wallet-backup",
                cache: false,
                controller: "SetupWalletBackupCtrl",
                templateUrl: "js/modules/setup/controllers/wallet-backup/wallet-backup.tpl.html",
                resolve: {
                    backupInfo: function($state, launchService) {
                        return launchService.getBackupInfo().then(
                            function(backupInfo) {
                                return backupInfo;
                            },
                            function() {
                                return $state.go("app.setup.start");
                            }
                        );
                    }
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
                    walletInfo: function($state, launchService) {
                        return launchService.getWalletInfo().then(
                            function(walletInfo) {
                                return walletInfo;
                            },
                            function() {
                                return $state.go("app.setup.start");
                            }
                        );
                    }
                }
            })
            //NB: create a copy of the app.wallet.settings.phone to bypass the WalletController which inits the wallet and starts polling
            .state("app.setup.phone-verify", {
                url: "/phone?goBackTo",
                templateUrl: "templates/settings/settings.phone.html",
                controller: "PhoneSettingsCtrl",
                resolve: {
                    settings: function(settingsService, $rootScope, $translate) {
                        //do an initial load of the user's settings
                        return settingsService.$isLoaded().then(function(data) {
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
                    walletInfo: function($state, launchService) {
                        return launchService
                            .getWalletInfo()
                            .then(
                                function(walletInfo) {
                                    return walletInfo;
                                },
                                function() {
                                    return $state.go("app.setup.start");
                                }
                            );
                    }
                }
            })
            // TODO review profile for wallet & setup !!! to complex logic
            .state("app.setup.profile", {
                url: "/profile",
                controller: "ProfileSettingsCtrl", // This controller from the wallet module
                templateUrl: "js/modules/setup/controllers/profile/profile.tpl.html",
                resolve: {
                    walletInfo: function($state, launchService) {
                        return launchService.getWalletInfo().then(
                            function(walletInfo) {
                                return walletInfo;
                            },
                            function() {
                                return $state.go("app.setup.start");
                            }
                        );
                    }
                }
            })
            .state("app.setup.complete", {
                url: "/complete",
                controller: "SetupCompleteCtrl",
                templateUrl: "js/modules/setup/controllers/complete.tpl.html"
            });
    }

})();
