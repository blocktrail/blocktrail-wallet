(function () {
    "use strict";

    angular.module("blocktrail.setup")
        .factory("setupStepsService", function($q, $state, launchService, settingsService) {
            return new SetupStepsService($q, $state, launchService, settingsService);
        }
    );

    function SetupStepsService($q, $state, launchService, settingsService) {
        var self = this;

        self._$q = $q;
        self._$state = $state;
        self._launchService = launchService;
        self._settingsService = settingsService;
    }

    SetupStepsService.prototype.toNextStep = function() {
        var self = this;

        var currentStateName = self._$state.current.name;

        var walletSummary = "app.wallet.summary";
        var setupPin = "app.setup.pin";
        var setupSettingsBackup = "app.setup.settings.backup";
        var setupSettingsProfile = "app.setup.settings.profile";

        return self._$q.all([self._launchService.getWalletBackup(), self._settingsService.initSettings()])
            .then(function(data) {
                var walletBackup = data[0];
                var readOnlySettingsData = self._settingsService.getReadOnlySettingsData();

                // From pin state to backup || profile || summary
                if(currentStateName === setupPin && walletBackup.identifier) {
                    self._$state.go(setupSettingsBackup);
                } else if (currentStateName === setupPin && !readOnlySettingsData.profilePic) {
                    self._$state.go(setupSettingsProfile);
                }
                // From backup state to profile || summary
                else if(currentStateName === setupSettingsBackup && !readOnlySettingsData.profilePic)
                    self._$state.go(setupSettingsProfile);
                else {
                    self._$state.go(walletSummary);
                }
            })
    }

})();
