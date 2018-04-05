(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupWalletBackupCtrl", SetupWalletBackupCtrl);

    function SetupWalletBackupCtrl($scope, $btBackButtonDelegate, modalService, launchService,
                                   settingsService, walletBackupService, setupStepsService) {
        // disable back button - re-enable it on $destroy event
        $btBackButtonDelegate.setBackButton(angular.noop);
        $btBackButtonDelegate.setHardwareBackButton(angular.noop);
        $scope.$on('$destroy', function() {
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        });

        var walletBackupData;
        var readOnlySettingsData = settingsService.getReadOnlySettingsData();

        $scope.isButtonEmailOrOpenClicked = false;
        $scope.form = {
            isBackupSaved: false
        };

        $scope.onSkipBackup = onSkipBackup;
        $scope.onNextStep = onNextStep;

        $scope.emailBackupPdf = emailBackupPdf;
        $scope.openBackupPdf = openBackupPdf;

        init();

        /**
         * Initialize
         */
        function init() {
            modalService.showSpinner();

            launchService.getWalletBackup()
                .then(function(data) {
                    walletBackupData = data;
                    modalService.hideSpinner();
                });
        }

        /**
         * Email the backup PDF
         */
        function emailBackupPdf() {
            modalService.showSpinner();

            var extraInfo = prepareExtraPdfInfo();

            walletBackupService.emailBackupPdf(walletBackupData, extraInfo)
                .then(function() {
                    $scope.isButtonEmailOrOpenClicked = true;
                    modalService.hideSpinner();
                })
                .catch(backupPdfErrorHandler);
        }

        /**
         * Open the backup PDF
         */
        function openBackupPdf() {
            var extraInfo = prepareExtraPdfInfo();

            modalService.message({
                    title: "IMPORTANT",
                    body: ionic.Platform.isIOS() ? "BACKUP_EXPORT_PDF_IOS_INFO" : "BACKUP_EXPORT_PDF_ANDROID_INFO"
                }).then(function() {
                    modalService.showSpinner();

                    walletBackupService.openBackupPdf(walletBackupData, extraInfo)
                        .then(function() {
                            $scope.isButtonEmailOrOpenClicked = true;
                            modalService.hideSpinner();
                        })
                        .catch(backupPdfErrorHandler);
                });
        }

        /**
         * The backup PDF error handler
         * @param e
         */
        function backupPdfErrorHandler(e) {
            modalService.hideSpinner();

            var alert = {};

            if (e.status === 9 && e.message.startsWith("Activity not found: No Activity found to")) {
                alert = { body: "BACKUP_CANT_OPEN" }
            } else {
                alert = { body: e.message ? e.message : e.toString() };
            }

            modalService.alert(alert);
        }

        /**
         * Generate the PDF
         */
        function prepareExtraPdfInfo() {
            var extraInfo = [];

            if (readOnlySettingsData.username) {
                extraInfo.push({ title: "Username", value: readOnlySettingsData.username });
            }
            if (readOnlySettingsData.email) {
                extraInfo.push({ title: "Email", value: readOnlySettingsData.email });
            }
            if (walletBackupData.supportSecret) {
                extraInfo.push({
                    title: "Support Secret",
                    subtitle: "this can be shared with helpdesk to proof ownership of backup document",
                    value: walletBackupData.supportSecret
                });
            }

            return extraInfo;
        }

        /**
         * On skip the backup
         */
        function onSkipBackup() {
            modalService.confirm({
                    body: "MSG_SKIP_BACKUP",
                    titleClass: "text-bad"
                })
                .then(function(dialogResult) {
                    if(dialogResult) {
                        // Remove pdf if it was open before but not saved
                        return walletBackupService.clearBackupPdf(walletBackupData.identifier)
                            .catch(backupPdfClearErrorHandler)
                            .then(function() {
                                setupStepsService.toNextStep();
                            });

                    }
                });
        }

        /**
         * On the next step
         */
        function onNextStep() {
            launchService.clearWalletBackup()
                .then(function() {
                    return modalService.confirm({
                        title: "IMPORTANT",
                        body: "BACKUP_OPTION_KEEP_ON_PHONE",
                        buttonConfirm: "YES",
                        buttonCancel: "NO"
                    });
                })
                .then(function(dialogResult) {
                    if (!dialogResult) {
                        return walletBackupService.clearBackupPdf(walletBackupData.identifier)
                            .catch(backupPdfClearErrorHandler);
                    }
                })
                .then(function() {
                    setupStepsService.toNextStep();
                });
        }

        /**
         * Backup PDF clear error handler
         * @param e
         * @return {boolean}
         */
        function backupPdfClearErrorHandler(e) {
            if(e && e.message === "NOT_FOUND_ERR") {
                return true;
            } else {
                backupPdfErrorHandler();
                // TODO discuss with Ruben, do we have to stop or continue
                return true;
            }
        }
    }

})();
