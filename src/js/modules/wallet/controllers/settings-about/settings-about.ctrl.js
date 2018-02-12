(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsAboutCtrl", SettingsAboutCtrl);

    function SettingsAboutCtrl($scope, AppRateService, walletsManagerService) {
        $scope.walletData = walletsManagerService.getActiveWalletReadOnlyData();

        $scope.devTools = false;
        $scope.panic = function() {
            throw new Error("Panic!");
        };

        $scope.rateApp = function() {
            AppRateService.navigateToAppStore();
        };
    }
})();
