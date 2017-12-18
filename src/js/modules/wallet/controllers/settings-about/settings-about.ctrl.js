(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsAboutCtrl", SettingsAboutCtrl);

    function SettingsAboutCtrl($scope, AppRateService, walletsManagerService) {
        $scope.walletData = walletsManagerService.getActiveWalletReadOnlyData();

        $scope.rateApp = function() {
            AppRateService.navigateToAppStore();
        };
    }
})();
