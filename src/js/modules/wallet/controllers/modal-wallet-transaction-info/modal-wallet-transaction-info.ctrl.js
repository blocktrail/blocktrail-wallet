(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("ModalWalletTransactionInfo", ModalWalletTransactionInfo);

    function ModalWalletTransactionInfo($scope, $filter, CONFIG, parameters) {
        $scope.walletData = parameters.walletData;
        $scope.transaction = parameters.transaction;
        $scope.localCurrency = parameters.localCurrency;
        $scope.CONFIG = CONFIG;
        $scope.canvasDisplayText = "";

        $scope.canvasDisplayText += $filter("satoshiToCoin")($filter("mathAbs")($scope.transaction.wallet_value_change), $scope.walletData.networkType, 8);

        $scope.cancel = function() {
            $scope.closeModal(null);
        };
    }
})();
