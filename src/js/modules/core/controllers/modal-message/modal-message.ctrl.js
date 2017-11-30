(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalMessageCtrl", ModalMessageCtrl);

    function ModalMessageCtrl($scope, $controller, parameters) {
        // Extend from base controller
        $controller('ModalBaseCtrl', { $scope: $scope });

        $scope.title = parameters.title;
        $scope.titleClass = parameters.titleClass;
        $scope.body = parameters.body;
        $scope.bodyClass = parameters.bodyClass;
        $scope.button = parameters.button;
    }
})();
