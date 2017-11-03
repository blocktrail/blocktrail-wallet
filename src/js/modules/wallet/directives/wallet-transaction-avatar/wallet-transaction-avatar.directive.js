(function () {
    "use strict";

    angular.module("blocktrail.wallet")
        .directive("walletTransactionAvatar", walletTransactionAvatar);

    function walletTransactionAvatar() {
        return {
            restrict: "E",
            replace: true,
            scope: {
                transaction: "="
            },
            templateUrl: "js/modules/wallet/directives/wallet-transaction-avatar/wallet-transaction-avatar.tpl.html",
            controller: walletTransactionAvatarCtrl
        };
    }

    function walletTransactionAvatarCtrl($scope, CONFIG, buyBTCService) {
        $scope.contactInitials = "";
        $scope.isReceived = $scope.transaction["wallet_value_change"] > 0;
        $scope.avatarUrl = "";
        $scope.isAnonymous = true;

        var brokerDisplayName = "";

        if (!$scope.transaction.contact && $scope.transaction.buybtc) {
            var broker = buyBTCService.BROKERS[$scope.transaction.buybtc.broker];

            brokerDisplayName = broker.displayName;
            $scope.avatarUrl = broker.avatarUrl;
            $scope.isAnonymous = false;
        }

        if ($scope.transaction.contact) {
            var firstName = $scope.transaction.contact.firstName;
            var lastName = $scope.transaction.contact.lastName;

            if (!lastName && firstName) {
                $scope.contactInitials = firstName.substr(0, 2);
            } else if (!firstName && lastName) {
                $scope.contactInitials = lastName.substr(0, 2);
            } else if (firstName && lastName) {
                $scope.contactInitials = firstName.substr(0, 1) + lastName.substr(0, 1);
            } else if (brokerDisplayName) {
                $scope.contactInitials = brokerDisplayName.substr(0, 2);
            } else if ($scope.transaction.contact.displayName) {
                $scope.contactInitials = $scope.transaction.contact.displayName.substr(0, 1);
            }

            $scope.avatarUrl = "data:image/jpeg;base64," + $scope.transaction.contact.avatarUrl;
            $scope.isAnonymous = false;
        }
    }

})();
