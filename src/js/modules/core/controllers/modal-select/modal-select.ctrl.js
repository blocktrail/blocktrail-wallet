(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalSelectCtrl", ModalSelectCtrl);

    function ModalSelectCtrl($scope, $controller, parameters) {
        // Extend from base controller
        $controller('ModalBaseCtrl', { $scope: $scope });

        $scope.options = parameters.options;
        $scope.buttonCancel = parameters.buttonCancel;

        // Methods
        $scope.select = select;

        /**
         * Select
         * @param value
         */
        function select(option) {
            if(!option.selected) {
                $scope.closeModal(option.value);
            }
        }
    }

})();
