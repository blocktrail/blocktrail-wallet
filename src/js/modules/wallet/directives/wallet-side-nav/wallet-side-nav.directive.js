(function () {
    "use strict";

    angular.module("blocktrail.wallet")
        .directive("walletSideNav", walletSideNav);

    function walletSideNav() {
        return {
            restrict: "E",
            replace: true,
            scope: {
                list: '='
            },
            templateUrl: "js/modules/wallet/directives/wallet-side-nav/wallet-side-nav.tpl.html"
        };
    }

})();
