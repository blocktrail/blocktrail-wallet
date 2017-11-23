(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupPhoneVerifyCtrl", SetupPhoneVerifyCtrl);

    function SetupPhoneVerifyCtrl($state, $scope) {
        $scope.onSkipPhoneVerify = onSkipPhoneVerify;

        function onSkipPhoneVerify() {
            $state.go("app.setup.settings.profile");
        }

        /*$scope.onSkipPhoneVerification = function() {
            $state.go("app.setup.profile");
        };*/
    }
})();
