(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalConfirmCtrl", ModalConfirmCtrl);

    function ModalConfirmCtrl($scope, $controller, parameters) {
        // Extend from base controller
        $controller('ModalBaseCtrl', { $scope: $scope });

        $scope.title = parameters.title;
        $scope.titleClass = parameters.titleClass;
        $scope.body = parameters.body;
        $scope.bodyClass = parameters.bodyClass;
        $scope.buttonConfirm = parameters.buttonConfirm;
        $scope.buttonCancel = parameters.buttonCancel;

        // Methods
        $scope.confirm = confirm;

        /**
         * Confirm
         */
        function confirm() {
            $scope.closeModal(true);
        }
    }

})();
