angular.module('blocktrail.wallet').factory(
    'notificationService',
    function($cordovaDialogs, settingsService, $state, $translate) {
        var backupNotification = function () {
            return settingsService.$isLoaded().then(function () {
                if (!settingsService.backupSaved) {
                    var currTimestamp = ((new Date()).getTime() / 1000).toFixed(0);
                    if (currTimestamp - settingsService.backupNotifyTimestamp > 84000) {
                        return $cordovaDialogs.confirm(
                            $translate.instant("MSG_BACKUP_SAVE_NOW"),
                            $translate.instant("IMPORTANT"),
                            [$translate.instant("YES"), $translate.instant("SKIP_STEP")]
                        ).then(function (dialogResult) {
                            // Bump notify counter and last timestamp of notify
                            settingsService.backupNotifyTimestamp = currTimestamp;
                            return settingsService.$store().then(function () {
                                return settingsService.$syncSettingsUp().then(function () {
                                    if (dialogResult === 2) {
                                        return;
                                    }

                                    $state.go('app.wallet.settings.backup');
                                });
                            })
                        })
                    }
                }
            });
        };

        return {
            backupNotification: backupNotification
        };
    });
