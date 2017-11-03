(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("CompleteCtrl", CompleteCtrl);

    function CompleteCtrl($scope, $rootScope, settingsService, $btBackButtonDelegate, $state, $injector, $ionicLoading, $log) {
        //reset the back button root state (for android hardware back)
        $btBackButtonDelegate.rootState = "app.wallet.summary";

        settingsService
            .$isLoaded()
            .then(function() {
                //load the settings so we can update them
                settingsService.setupComplete = true;
                settingsService.$store();
            });

        /**
         * Continue
         * init the wallet, poll for transactions, show spinner
         */
        $scope.continue = function() {
            // prevent PIN dialog
            $rootScope.STATE.INITIAL_PIN_DONE = true;

            $ionicLoading.show({
                template: "<div>{{ 'LOADING_WALLET' | translate }}...</div><ion-spinner></ion-spinner>",
                hideOnStateChange: true
            });

            var Wallet = $injector.get("Wallet");

            return Wallet.pollTransactions()
                .then(function() {
                    // pregen some addresses
                    return Wallet.refillOfflineAddresses(2)
                        .catch(function() {
                            return false; // suppress err
                        });
                })
                .then(
                    function() {
                        $state.go("app.wallet.summary");
                    },
                    function(err) {
                        $log.error(err);
                        $state.go("app.wallet.summary");
                    }
                );
        };
    }
})();
