(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("DialogConfirmPasswordCtrl", DialogAlertModalCtrl);

    function DialogAlertModalCtrl($scope) {
        $scope.form = {
            confirmPassword: ""
        };

        $scope.cancel = function() {
            $scope.closeModal(null);
        };

        $scope.confirm = function() {
            $scope.closeModal($scope.form.confirmPassword);
        };
    }
})();
