(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupPhoneCtrl", SetupPhoneCtrl);

    function SetupPhoneCtrl($state, $scope) {
        $scope.onSkipPhoneVerification = function() {
            $state.go("app.setup.profile");
        };
    }
})();
