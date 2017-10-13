(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalMessageCtrl", ModalMessageCtrl);

    function ModalMessageCtrl($scope, parameters) {
        $scope.title = parameters.title;
        $scope.titleClass = parameters.titleClass;
        $scope.body = parameters.body;
        $scope.bodyClass = parameters.bodyClass;
        $scope.button = parameters.button;

        $scope.cancel = function() {
            $scope.closeModal(null);
        };
    }
})();
