(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupProfileCtrl", SetupProfileCtrl);

    function SetupProfileCtrl($scope, $btBackButtonDelegate, settingsService, setupStepsService) {
        // disable back button
        $btBackButtonDelegate.setBackButton(angular.noop);
        $btBackButtonDelegate.setHardwareBackButton(angular.noop);

        $scope.settingsData = settingsService.getReadOnlySettingsData();

        // Methods
        $scope.onNextStep = onNextStep;

        /**
         * On the next step
         */
        function onNextStep() {
            setupStepsService.toNextStep();
        }
    }

})();
