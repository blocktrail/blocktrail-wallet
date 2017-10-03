(function () {
    "use strict";

    angular.module("blocktrail.wallet")
        .directive("walletTransactionDescription", walletTransactionDescription);

    function walletTransactionDescription() {
        return {
            restrict: "E",
            replace: true,
            scope: {
                transaction: "="
            },
            templateUrl: "js/modules/wallet/directives/wallet-transaction-description/wallet-transaction-description.tpl.html",
            controller: walletTransactionDescriptionCtrl
        };
    }

    function walletTransactionDescriptionCtrl($scope, buyBTCService) {
        $scope.isReceived = $scope.transaction["wallet_value_change"] > 0;
        $scope.altDisplay = "";
        $scope.displayName = "";

        if (!$scope.transaction.contact && $scope.transaction.buybtc) {
            var broker = buyBTCService.BROKERS[$scope.transaction.buybtc.broker];

            $scope.displayName = broker.displayName;
        } else if ($scope.transaction.contact) {
            $scope.displayName = $scope.transaction.contact.displayName;
        }

        if ($scope.transaction["wallet_value_change"] > 0) {
            // received from anonymous
            $scope.altDisplay = "TX_INFO_RECEIVED";
        } else if ($scope.transaction["is_internal"]) {
            // sent to self
            $scope.altDisplay = "INTERNAL_TRANSACTION_TITLE";
        } else {
            // sent to anonymous
            $scope.altDisplay = "TX_INFO_SENT";
        }
    }

})();
