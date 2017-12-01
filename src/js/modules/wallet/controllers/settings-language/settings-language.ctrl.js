(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsLanguageCtrl", SettingsLanguageCtrl);

    // TODO User $translate.use() for language
    function SettingsLanguageCtrl($scope, $rootScope, settingsService, $btBackButtonDelegate, blocktrailLocalisation) {
        $scope.languages = blocktrailLocalisation.getLanguages().map(function(language) {
            // var name = blocktrailLocalisation.languageName(language);
            return name ? {code: language, name: name} : null;
        }).clean();
        $scope.form = {selected: ''};

        $scope.updateSettings = function() {
            settingsService.$store().then(function() {
                $rootScope.changeLanguage(settingsService.language);
                settingsService.$syncSettingsUp();
                $btBackButtonDelegate.goBack();
            });
        };
    }
})();
