(function() {
    "use strict";

    angular.module("blocktrail.launch")
        .controller("ResetCtrl", ResetCtrl);

    function ResetCtrl($window, storageService) {
        storageService.resetAll()
            .then(function() {
                $window.location.replace("");
            });
    }

})();
