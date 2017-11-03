(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupWalletBackupCtrl", SetupWalletBackupCtrl);

    function SetupWalletBackupCtrl($scope, $window, backupInfo, $state, $q, $translate,
                                   $ionicActionSheet, $cordovaFileOpener2, $cordovaFile, sdkService,
                                   launchService, settingsService, modalService) {

        var actionSheet = null;
        var backupSettings = {
            // NB: on android fileOpener2 only works with SD storage (i.e. non-private storage)
            path: $window.cordova ? ($window.ionic.Platform.isAndroid() ? $window.cordova.file.externalDataDirectory : $window.cordova.file.documentsDirectory) : null,
            filename: "btc-wallet-backup-" + backupInfo.identifier + ".pdf",
            replace: true
        };

        $scope.isSaveButtonClicked = false;
        $scope.form = {
            isBackupSaved: false
        };

        // Methods
        $scope.onSkipBackup = onSkipBackup;
        $scope.onShowExportOptions = onShowExportOptions;
        $scope.clearBackupInfoAndContinue = clearBackupInfoAndContinue;

        /**
         * On show export options
         */
        function onShowExportOptions() {
            actionSheet = $ionicActionSheet.show({
                titleText: "",
                buttons: [
                    {text: $translate.instant("BACKUP_EMAIL_PDF")},
                    {text: $translate.instant("BACKUP_OPEN_PDF")}
                ],
                cancelText: "",
                buttonClicked: onActionSheetButtonClickHandler
            });
        }

        /**
         * Click handler for action sheet buttons
         * @param index { integer }
         * @return { boolean }
         */
        function onActionSheetButtonClickHandler(index) {
            modalService.showSpinner({
                title: "",
                body: "GENERATE_PDF_FILE"
            });

            switch (index) {
                case 0:
                    generatePdf()
                        .then(emailBackupPdf)
                        .catch(backupPdfErrorHandler);
                    break;
                case 1:
                    generatePdf()
                        .then(openBackupPdf)
                        .catch(backupPdfErrorHandler);
                    break;
            }

            return true;
        }

        /**
         * Generate the PDF
         */
        function generatePdf() {
            return $q.when(true)
                .then(function() {
                    var deferred = $q.defer();

                    var extraInfo = [];

                    if (settingsService.username) {
                        extraInfo.push({title: "Username", value: settingsService.username});
                    }
                    if (settingsService.email) {
                        extraInfo.push({title: "Email", value: settingsService.email});
                    }
                    if ($scope.setupInfo.backupInfo && $scope.setupInfo.backupInfo.supportSecret) {
                        extraInfo.push({
                            title: "Support Secret",
                            subtitle: "this can be shared with helpdesk to proof ownership of backup document",
                            value: $scope.setupInfo.backupInfo.supportSecret
                        });
                    }

                    var backup = sdkService.getBackupGenerator(
                        $scope.setupInfo.identifier,
                        $scope.setupInfo.backupInfo,
                        extraInfo
                    );

                    // create a backup pdf
                    backup.generatePDF(function(err, pdf) {
                        if (err) {
                            return deferred.reject(err);
                        }

                        deferred.resolve(pdf.output());
                    });

                    return deferred.promise;
                })
                .then(function(pdfData) {
                    // FUNKY ASS HACK
                    // https://coderwall.com/p/nc8hia/making-work-cordova-phonegap-jspdf
                    var buffer = new ArrayBuffer(pdfData.length);
                    var array = new Uint8Array(buffer);

                    for (var i = 0; i < pdfData.length; i++) {
                        array[i] = pdfData.charCodeAt(i);
                    }

                    return buffer;
                })
                .then(function(buffer) {
                    // save file temporarily
                    return $cordovaFile.writeFile(
                        backupSettings.path,
                        backupSettings.filename,
                        buffer,
                        backupSettings.replace
                    );
                });
        }

        /**
         * Email the backup PDF
         */
        function emailBackupPdf() {
            // email the backup pdf
            var options = {
                to: "",
                attachments: [
                    backupSettings.path + backupSettings.filename
                ],
                subject: $translate.instant("MSG_BACKUP_EMAIL_SUBJECT_1"),
                body: $translate.instant("MSG_BACKUP_EMAIL_BODY_1"),
                isHtml: true
            };

            var deferred = $q.defer();

            modalService.updateSpinner({
                title: "",
                body: "SEND_PDF_FILE"
            });

            // check that emails can be sent (try with normal mail, can't do attachments with gmail)
            cordova.plugins.email.isAvailable(function(isAvailable) {
                if (isAvailable) {
                    cordova.plugins.email.open(options, function(result) {
                        deferred.resolve(result);
                        $scope.isSaveButtonClicked = true;
                        modalService.hideSpinner();
                    });
                } else {
                    // no mail support...sad times :(
                    deferred.reject("MSG_EMAIL_NOT_SETUP");
                }
            });

            return deferred.promise;
        }

        /**
         * Open the backup PDF
         */
        function openBackupPdf() {
            modalService.hideSpinner();

            return modalService.message({
                title: "IMPORTANT",
                body: ionic.Platform.isIOS() ? "BACKUP_EXPORT_PDF_IOS_INFO" : "BACKUP_EXPORT_PDF_ANDROID_INFO"
            })
                .then(function() {
                    if (ionic.Platform.isIOS()) {
                        cordova.plugins.disusered.open(backupSettings.path + backupSettings.filename,
                            function() {
                                $scope.isSaveButtonClicked = true;
                            },
                            function(err) {
                                $scope.isSaveButtonClicked = true;
                                console.log(err.message, err);
                            }
                        );
                    } else {
                        $scope.isSaveButtonClicked = true;
                        return $cordovaFileOpener2.open(backupSettings.path + backupSettings.filename, "application/pdf");
                    }
                });
        }

        /**
         * Backup PDF error handler
         * @param e
         */
        function backupPdfErrorHandler(e) {
            modalService.hideSpinner();
            var alert = {};
            if (e.status === 9 && e.message.startsWith("Activity not found: No Activity found to")) {
                alert = { body: $translate.instant('BACKUP_CANT_OPEN') }
            } else {
                alert = { body: e.message ? e.message : e.toString() };
            }

            modalService.alert(alert);
        }

        /**
         * Clear the backup info and continue, next step is 'app.setup.phone'
         */
        function clearBackupInfoAndContinue() {
            // delete all temp backup info
            return launchService.clearBackupInfo()
                .then(function() {
                    return settingsService.$isLoaded()
                        .then(function() {
                            settingsService.backupSaved = true;
                            settingsService.$store();
                        });
                })
                .then(function() {
                    return modalService.confirm({
                        title: "IMPORTANT",
                        body: "BACKUP_OPTION_KEEP_ON_PHONE",
                        buttonConfirm: "YES",
                        buttonCancel: "NO"
                    });
                })
                .then(function(dialogResult) {
                    if (dialogResult) {
                        settingsService.backupSavedPersistent = true;
                        backupSettings.keepBackup = true;
                        return settingsService.$store();
                    } else {
                        console.log("not keeping backup");
                        // delete the temporary backup file if created
                        return $cordovaFile.removeFile(backupSettings.path, backupSettings.filename);
                    }
                })
                .then(function() {
                    $state.go("app.setup.phone");
                });
        }

        /**
         * On skip backup process
         */
        function onSkipBackup() {
            modalService.confirm({
                body: "MSG_SKIP_BACKUP",
                titleClass: "text-bad"
            })
                .then(function(dialogResult) {
                    if (dialogResult) {
                        settingsService.$isLoaded()
                            .then(function() {
                                settingsService.backupSkipped = true;
                                settingsService.backupSavedPersistent = true;
                                settingsService.$store();
                            });

                        // onwards to phone number and contacts setup
                        $state.go("app.setup.phone");
                    }
                });
        }
    }
})();
