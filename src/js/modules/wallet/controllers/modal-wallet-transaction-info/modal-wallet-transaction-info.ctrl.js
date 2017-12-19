(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("ModalWalletTransactionInfo", ModalWalletTransactionInfo);

    function ModalWalletTransactionInfo($scope, $filter, $controller, CONFIG, parameters) {
        // Extend from base controller
        $controller('ModalBaseCtrl', { $scope: $scope });

        $scope.walletData = parameters.walletData;
        $scope.transaction = parameters.transaction;
        $scope.localCurrency = parameters.localCurrency;
        $scope.CONFIG = CONFIG;
        $scope.canvasDisplayText = "";

        $scope.canvasDisplayText += $filter("satoshiToCoin")($filter("mathAbs")($scope.transaction.wallet_value_change), $scope.walletData.networkType, 8);
    }

})();
