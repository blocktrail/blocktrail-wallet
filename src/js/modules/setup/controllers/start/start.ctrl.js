(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupStartCtrl", SetupStartCtrl);

    function SetupStartCtrl($scope, $state) {
        $scope.slider = {
            displayed: 0
        };

        $scope.newAccount = function() {
            $state.go('app.setup.register');
        };

        $scope.toLogin = function() {
            $state.go('app.setup.login');
        };
    }
})();
