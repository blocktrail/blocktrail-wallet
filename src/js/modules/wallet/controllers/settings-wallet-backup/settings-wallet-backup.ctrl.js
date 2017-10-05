(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsWalletBackupCtrl", SettingsWalletBackupCtrl);

    function SettingsWalletBackupCtrl($scope, backupInfo, $q, $btBackButtonDelegate, $translate, $cordovaDialogs,
                                $ionicActionSheet, $log, $cordovaFileOpener2, $cordovaFile, sdkService,
                                launchService, settingsService, $timeout) {
        if (!backupInfo) {
            settingsService.$isLoaded().then(function() {

                $log.log(settingsService.backupSavedPersistent, ionic.Platform.isIOS());

                var dialogMessage = (settingsService.backupSavedPersistent && ionic.Platform.isIOS())
                    ? 'MSG_BACKUP_SAVED_PERSISTENT' : 'MSG_BACKUP_SAVED_ALREADY';

                $cordovaDialogs.alert(
                    $translate.instant(dialogMessage).sentenceCase(),
                    $translate.instant('SETTINGS_BACKUP_COMPLETE').sentenceCase(),
                    $translate.instant('OK')
                ).then(function() {
                    $btBackButtonDelegate.goBack();
                });
                return false;
            });
        }

        $scope.appControl = {
            working: false,
            saveButtonClicked: false,
            backupSaved: false
        };
        $scope.setupInfo = {
            identifier: backupInfo.identifier,
            password: "",
            primaryMnemonic: "",
            backupMnemonic: "",
            blocktrailPublicKeys: null
        };
        //$scope.setupInfo.identifier = backupInfo.identifier;
        $scope.setupInfo.backupInfo = {
            encryptedPrimarySeed: backupInfo.encryptedPrimarySeed,
            encryptedSecret: backupInfo.encryptedSecret,
            backupSeed: backupInfo.backupSeed,
            recoveryEncryptedSecret: backupInfo.recoveryEncryptedSecret
        };

        // hacky, we asume that user won't click generate backup before this promise is finished
        if (!$scope.setupInfo.backupInfo.blocktrailPublicKeys) {
            sdkService.sdk().then(function(sdk) {
                $scope.setupInfo.backupInfo.blocktrailPublicKeys = {};
                angular.forEach(backupInfo.blocktrailPublicKeys, function(pubkey, key) {
                    $scope.setupInfo.backupInfo.blocktrailPublicKeys[pubkey.keyIndex] = bitcoinjs.HDNode.fromBase58(pubkey.pubKey, sdk.network);
                });
            });
        }

        $scope.qrSettings = {
            correctionLevel: 7,
            SIZE: 150,
            inputMode: 'M',
            image: true
        };

        $scope.backupSettings = {
            //NB: on android fileOpener2 only works with SD storage (i.e. non-private storage)
            path: window.cordova ? (ionic.Platform.isAndroid() ? cordova.file.externalDataDirectory : cordova.file.documentsDirectory) : null,
            filename: 'btc-wallet-backup-' + backupInfo.identifier + '.pdf',
            replace: true
        };

        $scope.showExportOptions = function() {

            //Temporary handling of a bug in iOS with the $cordovaFileOpener2
            var optionButtons = [
                { text: $translate.instant('BACKUP_EMAIL_PDF') },
                { text: $translate.instant('BACKUP_OPEN_PDF') }
            ];

            $scope.hideExportOptions = $ionicActionSheet.show({
                buttons: optionButtons,
                cancelText: $translate.instant('CANCEL'),
                cancel: function() {},
                buttonClicked: function(index) {
                    $timeout(function() {
                        $q.when(true)
                            .then(function() {
                                var deferred = $q.defer();

                                var extraInfo = [];

                                if (settingsService.username) {
                                    extraInfo.push({title: 'Username', value: settingsService.username});
                                }
                                if (settingsService.email) {
                                    extraInfo.push({title: 'Email', value: settingsService.email});
                                }

                                var backup = new sdkService.BackupGenerator(
                                    $scope.setupInfo.identifier,
                                    $scope.setupInfo.backupInfo,
                                    extraInfo
                                );

                                //create a backup pdf
                                backup.generatePDF(function (err, pdf) {
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
                                //save file temporarily
                                $log.debug('writing to ' + $scope.backupSettings.path + $scope.backupSettings.filename);
                                return $cordovaFile.writeFile($scope.backupSettings.path, $scope.backupSettings.filename, buffer, $scope.backupSettings.replace);
                            })
                            .then(function(result) {
                                // Options for saving
                                if (index == 0) {
                                    //email the backup pdf
                                    var options = {
                                        to: '',
                                        attachments: [
                                            $scope.backupSettings.path + $scope.backupSettings.filename
                                        ],
                                        subject: $translate.instant('MSG_BACKUP_EMAIL_SUBJECT_1'),
                                        body: $translate.instant('MSG_BACKUP_EMAIL_BODY_1'),
                                        isHtml: true
                                    };
                                    var deferred = $q.defer();

                                    //check that emails can be sent (try with normal mail, can't do attachments with gmail)
                                    cordova.plugins.email.isAvailable(function (isAvailable) {
                                        $log.debug('is email supported? ' + isAvailable);
                                        if (isAvailable) {
                                            $scope.appControl.saveButtonClicked = true;
                                            cordova.plugins.email.open(options, function (result) {
                                                deferred.resolve(result);
                                            });
                                        } else {
                                            //no mail support...sad times :(
                                            $cordovaDialogs.alert(
                                                $translate.instant('MSG_EMAIL_NOT_SETUP'),
                                                $translate.instant('SORRY'),
                                                $translate.instant('OK')
                                            );
                                        }
                                    });

                                    return deferred.promise;

                                } else if (index == 1) {
                                    var msg = 'BACKUP_EXPORT_PDF_ANDROID_INFO';
                                    if (ionic.Platform.isIOS()) {
                                        msg = 'BACKUP_EXPORT_PDF_IOS_INFO';
                                    }

                                    return $cordovaDialogs.alert(
                                        $translate.instant(msg),
                                        $translate.instant('IMPORTANT'),
                                        $translate.instant('OK')
                                    ).then(function () {
                                        $log.debug('opening file ' + $scope.backupSettings.path + $scope.backupSettings.filename);

                                        if (ionic.Platform.isIOS()) {
                                            cordova.plugins.disusered.open($scope.backupSettings.path + $scope.backupSettings.filename,
                                                function () {
                                                    $scope.appControl.saveButtonClicked = true;
                                                },
                                                function (err) {
                                                    console.log(err.message, err);
                                                }
                                            );
                                        } else {
                                            $scope.appControl.saveButtonClicked = true;
                                            return $cordovaFileOpener2.open($scope.backupSettings.path + $scope.backupSettings.filename, 'application/pdf');
                                        }
                                    });
                                }
                            })
                            .then(function() {
                                // backup export successful
                                $log.debug("backup export complete");
                                $scope.hideExportOptions();
                            })
                            .catch(function(err) {
                                $log.error(err);
                                if (err) {
                                    if (err.status && err.status == 9) {
                                        $cordovaDialogs.alert($translate.instant('MSG_CANT_OPEN_PDF'), $translate.instant('ERROR'), $translate.instant('OK'));
                                    } else {
                                        $cordovaDialogs.alert(err, $translate.instant('ERROR'), $translate.instant('OK'));
                                    }
                                } else {
                                    //some of the above plugins reject the promise even on success...
                                    $scope.hideExportOptions();
                                }
                            })
                        ;
                    });
                    //end $timeout
                }
            });
        };

        /**
         * clear the backup info and continue
         */
        $scope.continue = function() {
            if (!$scope.appControl.backupSaved) {
                $cordovaDialogs.alert($translate.instant('MSG_SAVE_BACKUP'), $translate.instant('SETUP_WALLET_BACKUP'), $translate.instant('OK'))
            } else {
                //delete all temp backup info
                launchService.clearBackupInfo()
                    .then(function() {
                        settingsService.$isLoaded().then(function() {
                            settingsService.backupSaved = true;
                            settingsService.backupSkipped = false;
                            return settingsService.$store();
                        }).then(function () {
                            $cordovaDialogs.confirm(
                                $translate.instant("BACKUP_OPTION_KEEP_ON_PHONE"),
                                $translate.instant("IMPORTANT"),
                                [
                                    $translate.instant("YES"),
                                    $translate.instant("NO")
                                ])
                                .then(function (dialogResult) {

                                    if (dialogResult == 1) {
                                        settingsService.backupSavedPersistent = true;

                                        console.log('keeping backup');
                                        $scope.backupSettings.keepBackup = true;
                                        return settingsService.$store();
                                    } else {
                                        console.log('not keeping backup');
                                        //delete the temporary backup file if created
                                        return $cordovaFile.removeFile($scope.backupSettings.path, $scope.backupSettings.filename);
                                    }
                                })
                                .then(function () {
                                    $btBackButtonDelegate.goBack();
                                });
                        });
                    })
                    .catch(function(err) {
                        console.error(err);
                    });
            }
        };

        /**
         * skip the back save process and do it another day
         */
        $scope.skipBackup = function() {
            $cordovaDialogs.confirm(
                $translate.instant('MSG_SKIP_BACKUP'),
                $translate.instant('MSG_ARE_YOU_SURE'),
                [$translate.instant('OK'), $translate.instant('CANCEL')]
            )
                .then(function(dialogResult) {
                    if (dialogResult == 1) {
                        settingsService.$isLoaded().then(function() {
                            settingsService.backupSkipped = true;
                            settingsService.$store();
                        });

                        $btBackButtonDelegate.goBack();
                    } else {
                        //canceled
                    }
                });
        };
    }
})();
