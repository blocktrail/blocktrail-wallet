(function () {
    "use strict";

    angular.module("blocktrail.wallet")
        .directive("walletTransaction", walletTransaction);

    function walletTransaction() {
        return {
            restrict: "E",
            replace: true,
            scope: {
                transaction: "=",
                walletData: "=",
                btcPrecision: "=",
                onShowTransaction: "&"
            },
            templateUrl: "js/modules/wallet/directives/wallet-transaction/wallet-transaction.tpl.html",
            controller: wTransactionCtrl
        };
    }

    function wTransactionCtrl($scope, $filter) {
        $scope.isReceived = $scope.transaction["wallet_value_change"] > 0;
        $scope.value =  $filter("satoshiToCoin")($scope.transaction['wallet_value_change'], $scope.walletData.networkType, $scope.btcPrecision, true);
    }

})();
