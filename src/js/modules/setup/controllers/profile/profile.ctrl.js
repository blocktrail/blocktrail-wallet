(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupProfileCtrl", SetupProfileCtrl);

    function SetupProfileCtrl($state, $scope) {
        $scope.onSkipProfile = onSkipProfile;

        function onSkipProfile() {
            $state.go("app.wallet.summary");
        }
    }

})();
