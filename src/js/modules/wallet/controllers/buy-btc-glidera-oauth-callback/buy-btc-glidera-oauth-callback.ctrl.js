(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("BuyBTCGlideraOauthCallbackCtrl", BuyBTCGlideraOauthCallbackCtrl);

    function BuyBTCGlideraOauthCallbackCtrl($state, $rootScope, glideraService) {
        glideraService.handleOauthCallback($rootScope.glideraCallback)
            .then(function() {
                return glideraService.userCanTransact().then(function(userCanTransact) {
                    if (userCanTransact) {
                        $state.go('app.wallet.buybtc.buy', {broker: 'glidera'});
                    } else {
                        $state.go('app.wallet.buybtc.choose');
                    }
                })
            }, function(err) {
                $state.go('app.wallet.buybtc.choose');
            })
        ;
    }
})();
