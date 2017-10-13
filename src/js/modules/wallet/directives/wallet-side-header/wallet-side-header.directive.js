(function () {
    "use strict";

    angular.module("blocktrail.wallet")
        .directive("walletSideHeader", walletSideHeader);

    function walletSideHeader() {
        return {
            restrict: "E",
            replace: true,
            scope: {
                settings: '='
            },
            templateUrl: "js/modules/wallet/directives/wallet-side-header/wallet-side-header.tpl.html"
        };
    }

})();
