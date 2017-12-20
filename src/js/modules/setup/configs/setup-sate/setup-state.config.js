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
                    checkIsBanned: function($q, modalService, $translate, launchService) {
                        // TODO Add this later
                        return launchService.getWalletConfig()
                            .then(function(result) {
                                if (result.is_banned_ip) {
                                    modalService.alert({
                                        title: "BANNED_IP_TITLE",
                                        body: $translate.instant('BANNED_IP_BODY', {bannedIp: result.is_banned_ip}),
                                        button: ""
                                    });

                                    // throw error to prevent controller from loading or any other resolves to continue
                                    return $q.reject(new Error("IS_BANNED"));
                                }
                            });
                    },
                    preferredLanguage: preferredLanguage
                }
            })
            .state("app.setup.start", {
                url: "/start",
                cache: false,
                controller: "SetupStartCtrl",
                templateUrl: "js/modules/setup/controllers/start/start.tpl.html",
                data: {
                    clearHistory: true // clear any previous history (backButtonService)
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
                data: {
                    clearHistory: true // clear any previous history (backButtonService)
                },
                resolve: {
                    accountInfo: getAccountInfo
                }
            })
            .state("app.setup.settings", {
                url: "/settings",
                abstract: true,
                cache: false,
                template: "<ion-nav-view></ion-nav-view>",
                resolve: {
                    isSetAccountInfo: sdkSetAccountInfoAndInitSettings
                }
            })
            .state("app.setup.settings.backup", {
                url: "/wallet-backup",
                cache: false,
                controller: "SetupWalletBackupCtrl",
                templateUrl: "js/modules/setup/controllers/wallet-backup/wallet-backup.tpl.html"
            })
            .state("app.setup.settings.profile", {
                url: "/profile",
                cache: false,
                controller: "SetupProfileCtrl",
                templateUrl: "js/modules/setup/controllers/profile/profile.tpl.html"
            });
    }

    /**
     * Check for extra languages to enable, if new language is new preferred, set it
     *
     * @param checkIsBanned Used a dependency
     * @param $state
     * @param $rootScope
     * @param CONFIG
     * @param blocktrailLocalisation
     * @param launchService
     */
    function preferredLanguage(checkIsBanned, $state, $rootScope, CONFIG, blocktrailLocalisation, launchService) {
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

    function sdkSetAccountInfoAndInitSettings(launchService, sdkService, settingsService) {
        return launchService.getAccountInfo()
            .then(function(accountInfo) {
                return sdkService.setAccountInfo(accountInfo);
            })
            .then(function() {
                return settingsService.initSettings();
            });
    }
    
    function getAccountInfo($state, launchService, helperService) {
        return launchService
            .getAccountInfo()
            .catch(helperService.toAppResetState.bind(this, $state));
    }

})();
