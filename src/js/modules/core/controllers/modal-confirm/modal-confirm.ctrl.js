(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalConfirmCtrl", ModalConfirmCtrl);

    function ModalConfirmCtrl($scope, parameters) {
        $scope.title = parameters.title;
        $scope.titleClass = parameters.titleClass;
        $scope.body = parameters.body;
        $scope.bodyClass = parameters.bodyClass;
        $scope.buttonConfirm = parameters.buttonConfirm;
        $scope.buttonCancel = parameters.buttonCancel;

        $scope.confirm = function() {
            $scope.closeModal(true);
        };

        $scope.cancel = function() {
            $scope.closeModal(false);
        };
    }
})();
