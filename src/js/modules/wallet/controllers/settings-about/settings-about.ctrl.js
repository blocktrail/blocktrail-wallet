(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsAboutCtrl", SettingsAboutCtrl);

    function SettingsAboutCtrl($scope, AppRateService) {
        $scope.rateApp = function() {
            AppRateService.navigateToAppStore();
        };
    }
})();
