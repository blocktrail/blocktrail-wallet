(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupCtrl", SetupCtrl);

    function SetupCtrl($window, $timeout, $rootScope) {
        $timeout(function() {
            if ($window.navigator.splashscreen) {
                $window.navigator.splashscreen.hide();
            }

            $timeout(function() {
                $rootScope.hideLoadingScreen = true;
            }, 100);
        });
    }
})();
