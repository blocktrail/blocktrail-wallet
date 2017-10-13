(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalSpinnerCtrl", ModalSpinnerCtrl);

    function ModalSpinnerCtrl($scope, parameters) {
        $scope.title = parameters.title;
        $scope.titleClass = parameters.titleClass;
        $scope.body = parameters.body;
        $scope.bodyClass = parameters.bodyClass;

        // Methods
        $scope.updateData = updateData;

        function updateData(data) {
            $scope.title = data.title;
            $scope.titleClass = data.titleClass;
            $scope.body = data.body;
            $scope.bodyClass = data.bodyClass;
        }
    }
})();
