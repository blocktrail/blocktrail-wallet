(function() {
    "use strict";

    angular.module("blocktrail.launch")
        .controller("Android43Ctrl", Android43Ctrl);

    function Android43Ctrl($rootScope, $scope, altNotice) {
        $rootScope.hideLoadingScreen = true;

        $scope.altNotice = altNotice;

        if (navigator.splashscreen) {
            navigator.splashscreen.hide();
        }
    }

})();
