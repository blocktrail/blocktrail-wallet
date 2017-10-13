(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("DialogAlertCtrl", DialogAlertModalCtrl);

    function DialogAlertModalCtrl($scope, parameters) {
        $scope.title = parameters.title || "FAIL";
        $scope.titleClass = parameters.titleClass || "text-bad";
        $scope.body = parameters.body || "";
        $scope.bodyClass = parameters.bodyClass || "";

        $scope.cancel = function() {
            $scope.closeModal(null);
        };
    }
})();
