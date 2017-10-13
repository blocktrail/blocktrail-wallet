(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("ModalSelectWalletCtrl", ModalSelectWalletCtrl);

    function ModalSelectWalletCtrl($scope, CONFIG, parameters) {
        var selectedValue = parameters.walletsListOptions[0].value;

        $scope.walletsListOptions = parameters.walletsListOptions;
        $scope.CONFIG = CONFIG;

        $scope.onOptionClick = function(value) {
            $scope.walletsListOptions.forEach(function(item) {
                if(item.value ===  value) {
                    item.selected = true;
                    selectedValue = value;
                } else {
                    item.selected = false;
                }
            })
        };

        $scope.confirm = function() {
            $scope.closeModal(selectedValue);
        };

        $scope.cancel = function() {
            $scope.closeModal(null);
        };
    }
})();
