(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupProfileCtrl", SetupProfileCtrl);

    function SetupProfileCtrl($state, $scope, $btBackButtonDelegate) {
        // disable back button
        $btBackButtonDelegate.setBackButton(angular.noop);
        $btBackButtonDelegate.setHardwareBackButton(angular.noop);


        $scope.onSkipProfile = onSkipProfile;

        function onSkipProfile() {
            $state.go("app.wallet.summary");
        }
    }

})();
