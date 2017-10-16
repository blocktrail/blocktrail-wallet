(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("DialogSpinnerCtrl", DialogSpinnerCtrl);

    function DialogSpinnerCtrl($scope, parameters) {
        $scope.title = (typeof parameters.title === "string") ? parameters.title : "LOADING";
        $scope.titleClass = (typeof parameters.titleClass === "string") ? parameters.titleClass : "";
        $scope.body = (typeof parameters.body === "string") ? parameters.body : "";
        $scope.bodyClass = (typeof parameters.bodyClass === "string") ? parameters.bodyClass : "";

        $scope.updateData = function(data) {
            $scope.title = (typeof data.title === "string") ? data.title : "LOADING";
            $scope.titleClass = (typeof data.titleClass === "string") ? data.titleClass : "";
            $scope.body = (typeof data.body === "string") ? data.body : "";
            $scope.bodyClass = (typeof data.bodyClass === "string") ? data.bodyClass : "";
        }
    }
})();
