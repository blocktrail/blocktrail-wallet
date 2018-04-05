(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupProfileCtrl", SetupProfileCtrl);

    function SetupProfileCtrl($scope, $btBackButtonDelegate, settingsService, setupStepsService) {
        // disable back button - re-enable it on $destroy event
        $btBackButtonDelegate.setBackButton(angular.noop);
        $btBackButtonDelegate.setHardwareBackButton(angular.noop);
        $scope.$on('$destroy', function() {
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        });

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
