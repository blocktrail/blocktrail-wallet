(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalConfirmPasswordCtrl", ModalConfirmPasswordCtrl);

    function ModalConfirmPasswordCtrl($scope) {
        $scope.form = {
            confirmPassword: ""
        };

        $scope.confirm = function() {
            $scope.closeModal($scope.form.confirmPassword);
        };

        $scope.cancel = function() {
            $scope.closeModal(null);
        };
    }
})();
