(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupCompleteCtrl", SetupCompleteCtrl);

    function SetupCompleteCtrl($scope, $rootScope, settingsService, modalService) {
        modalService.showSpinner();

        // prevent PIN dialog
        $rootScope.STATE.INITIAL_PIN_DONE = true;

        settingsService
            .$isLoaded()
            .then(function() {
                //load the settings so we can update them
                settingsService.setupComplete = true;
                settingsService.$store();
                modalService.hideSpinner();
            });

        $scope.showSpinner = function() {
            modalService.showSpinner();
        };

        $scope.$on('$destroy', function () {
            modalService.hideSpinner();
        });
    }
})();
