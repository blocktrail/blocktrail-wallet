(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .config(launchStateConfig);

    function launchStateConfig($stateProvider) {
        $stateProvider
            .state("app.launch", {
                url: "/launch",
                cache: false,
                data: {
                    excludeFromHistory: true,
                    clearHistory: true  // always clear history when entering this state
                },
                controller: "LaunchCtrl"
            })
            .state("app.reset", {
                url: "/reset",
                data: {
                    excludeFromHistory: true,
                    clearHistory: true
                },
                controller: "ResetCtrl"
            })
            .state("app.pin", {
                url: "/pin",
                cache: false,
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                templateUrl: "js/modules/launch/controllers/open-wallet-pin/open-wallet-pin.tpl.html",
                controller: "OpenWalletPinCtrl",
                params: {
                    nextState: "app.wallet.summary"
                },
                resolve: {
                    initLocalSettings: function(localSettingsService) {
                        return localSettingsService.initLocalSettings();
                    }
                }
            });
    }
    
})();
