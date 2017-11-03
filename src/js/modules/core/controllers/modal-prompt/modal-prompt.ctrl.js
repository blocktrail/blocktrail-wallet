(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalPromptCtrl", ModalPromptCtrl);

    function ModalPromptCtrl($scope, parameters) {
        $scope.title = parameters.title;
        $scope.titleClass = parameters.titleClass;
        $scope.body = parameters.body;
        $scope.bodyClass = parameters.bodyClass;
        $scope.placeholder = parameters.placeholder;
        $scope.buttonConfirm = parameters.buttonConfirm;
        $scope.buttonCancel = parameters.buttonCancel;

        $scope.form = {
            confirmPassword: parameters.prefill || ""
        };

        $scope.confirm = function() {
            $scope.closeModal($scope.form.confirmPassword);
        };

        $scope.cancel = function() {
            $scope.closeModal(null);
        };
    }
})();
