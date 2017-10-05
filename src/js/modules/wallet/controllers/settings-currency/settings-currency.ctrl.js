(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsCurrencyCtrl", SettingsCurrencyCtrl);

    function SettingsCurrencyCtrl($scope, settingsService, $btBackButtonDelegate, Currencies,
                          trackingService) {
        $scope.currencies = Currencies.getFiatCurrencies();
        $scope.form = {selected: ''};

        $scope.updateSettings = function(){
            trackingService.setUserProperty(trackingService.USER_PROPERTIES.FIAT_CURRENCY, settingsService.localCurrency);

            settingsService.$store().then(function() {
                settingsService.$syncSettingsUp();
                $btBackButtonDelegate.goBack();
            });
        };
    }
})();
