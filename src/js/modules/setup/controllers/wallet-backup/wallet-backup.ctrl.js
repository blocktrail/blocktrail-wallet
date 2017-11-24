(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupWalletBackupCtrl", SetupWalletBackupCtrl);

    function SetupWalletBackupCtrl($scope, $q, $state, modalService, launchService, settingsService, walletBackupService) {
        var walletBackupData;
        var readOnlySettingsData;

        var actionButtonOptions = [
            {
                icon: "ion-email",
                value: "email"
            },
            {
                icon: "ion-upload",
                value: "open"
            }
        ];

        $scope.isButtonEmailOrOpenClicked = false;
        $scope.form = {
            isBackupSaved: false
        };

        $scope.onShowExportOptions = onShowExportOptions;
        $scope.onSkipBackup = onSkipBackup;
        $scope.onNextStep = onNextStep;

        init();

        /**
         * Initialize
         */
        function init() {
            modalService.showSpinner();

            $q.all([launchService.getWalletBackup(), settingsService.getSettings()])
                .then(function(data) {
                    walletBackupData = data[0];
                    readOnlySettingsData = settingsService.getReadOnlySettingsData();
                    modalService.hideSpinner();
                });
        }

        /**
         * On show export options
         */
        function onShowExportOptions() {
            modalService.actionButtons({ options: actionButtonOptions })
                .then(function(action) {
                    switch (action) {
                        case "email":
                            emailBackupPdf();
                            break;
                        case "open":
                            openBackupPdf();
                            break;
                    }
                })
        }

        /**
         * Email the backup PDF
         */
        function emailBackupPdf() {
            modalService.updateSpinner({ body: "SEND_PDF_FILE" });

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
                    walletBackupService.openBackupPdf(walletBackupData, extraInfo)
                        .then(function() {
                            $scope.isButtonEmailOrOpenClicked = true;
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
                    /*if (dialogResult) {
                        settingsService.$isLoaded()
                            .then(function() {
                                settingsService.backupSkipped = true;
                                settingsService.backupSavedPersistent = true;
                                settingsService.$store();
                            });

                    }*/

                    // debugger;

                    // TODO Continue here
                    if(dialogResult) {
                        $state.go("app.setup.settings.profile");
                    } else {
                        // TODO Check on phone or profile else redirect to "summary"
                        $state.go("app.setup.settings.profile");
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
                        return walletBackupService.clearBackupPdf(walletBackupData.identifier);
                    }
                })
                .then(function() {
                    // TODO Save in settings (settingsService)
                })
                .then(function() {
                    // TODO Check on phone or profile else redirect to "summary"
                    $state.go("app.setup.settings.profile");
                });
        }
    }

})();
