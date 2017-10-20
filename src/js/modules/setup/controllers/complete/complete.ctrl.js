(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupCompleteCtrl", SetupCompleteCtrl);

    function SetupCompleteCtrl(settingsService, modalService) {
        modalService.showSpinner();

        settingsService
            .$isLoaded()
            .then(function() {
                //load the settings so we can update them
                settingsService.setupComplete = true;
                settingsService.$store();
                modalService.hideSpinner();
            });
    }
})();
