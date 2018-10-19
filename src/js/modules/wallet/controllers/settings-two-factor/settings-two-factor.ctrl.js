(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SettingsTwoFactorCtrl", SettingsTwoFactorCtrl);

    function SettingsTwoFactorCtrl($scope, $btBackButtonDelegate, modalService, launchService, formSettingsService, settingsService, walletBackupService) {

        $scope.isTwoFactorEnabled = false;
        launchService.getAccountInfo().then(function (accountInfo) {
            $scope.isTwoFactorEnabled = !!accountInfo.requires2FA;
        });



        // modalService.show("js/modules/wallet/controllers/modal-pin/modal-pin.tpl.html", "ModalPinCtrl", {
        //     title: "SETTINGS_CHANGE_PIN",
        //     body: "MSG_ENTER_PIN",
        //     placeholderPin: "SETTINGS_CURRENT_PIN",
        //     isPinRepeat: false,
        //     preFill: CONFIG.DEBUG_PIN_PREFILL
        // }).then(function(dialogResult) {
        //     if(dialogResult && dialogResult.pin) {
        //         unlockData(false, dialogResult.pin);
        //     }
        // });


        // modalService.prompt({
        //     title: "SETUP_WALLET_PASSWORD",
        //     body: "MSG_WALLET_PASSWORD",
        //     buttonConfirm: "OK"
        // })

        // TODO move to modal controller
        function enable2FA() {
            var pleaseWaitDialog;

            return $q.when(null)
                .then(function() {
                    // Enter password
                    return modalService.show({
                        title: $translate.instant('SETTINGS_2FA'),
                        // subtitle: $translate.instant('SETTINGS_2FA_STEP1'),
                        body: $translate.instant('SETTINGS_2FA_STEP1_BODY'),
                        label: $translate.instant('SETTINGS_2FA_PASSWORD'),
                        input_type: 'password',
                        ok: $translate.instant('CONTINUE'),
                    })
                        .result
                        .then(function(password) {
                            pleaseWaitDialog = modalService.alert({
                                title: $translate.instant('SETTINGS_2FA'),
                                body: $translate.instant('PLEASE_WAIT'),
                                body_class: 'text-center',
                                showSpinner: true,
                                ok: false
                            });

                            return formSettingsService.sdkSetup2FA(password)
                                .then(function(result) {
                                    pleaseWaitDialog.dismiss();

                                    // QR code
                                    return dialogService.alert({
                                        title: $translate.instant('SETTINGS_2FA'),
                                        subtitle: $translate.instant('SETTINGS_2FA_STEP2'),
                                        bodyHtml: $sce.trustAsHtml($translate.instant('SETTINGS_2FA_STEP2_BODY')),
                                        bodyExtra: $translate.instant('SETINGS_2FA_STEP2_CODE', { secret: result.secret }),
                                        ok: $translate.instant('CONTINUE'),
                                        cancel: $translate.instant('CANCEL'),
                                        qr: {
                                            correctionLevel: 7,
                                            SIZE: 225,
                                            inputMode: 'M',
                                            image: true,
                                            text: result.otp_uri
                                        }
                                    })
                                        .result
                                        .then(function() {
                                            return dialogService.prompt({
                                                title: $translate.instant('SETTINGS_2FA'),
                                                subtitle: $translate.instant('SETTINGS_2FA_STEP3'),
                                                body: $translate.instant('SETTINGS_2FA_STEP3_BODY'),
                                                label: $translate.instant('TWO_FACTOR_TOKEN'),
                                                ok: $translate.instant('SETTINGS_2FA_VERIFY_TOKEN')
                                            })
                                                .result
                                                .then(function(twoFactorToken) {
                                                    pleaseWaitDialog = dialogService.alert({
                                                        title: $translate.instant('SETTINGS_2FA'),
                                                        body: $translate.instant('PLEASE_WAIT'),
                                                        body_class: 'text-center',
                                                        showSpinner: true,
                                                        ok: false
                                                    });

                                                    return formSettingsService.sdkEnable2FA(twoFactorToken)
                                                        .then(function() {
                                                            pleaseWaitDialog.update({
                                                                title: $translate.instant('SETTINGS_2FA'),
                                                                body: $translate.instant('SETTINGS_2FA_DONE'),
                                                                body_class: 'text-center',
                                                                ok: false
                                                            });

                                                            return formSettingsService.updateLaunchService2FA($scope.isEnabled2fa)
                                                                .then(function () {
                                                                    isEnabled2fa = $scope.isEnabled2fa;

                                                                    launchService.updateAccountInfo({
                                                                        requires2FA: true
                                                                    }).then(function () {

                                                                        accountSecurityService.updateSecurityScore();
                                                                        pleaseWaitDialog.dismiss();

                                                                    });
                                                                });

                                                        }, function (e) {
                                                            // Error handler for wrong two factor token
                                                            $scope.isEnabled2fa = isEnabled2fa;

                                                            if (pleaseWaitDialog) {
                                                                pleaseWaitDialog.dismiss();
                                                            }

                                                            dialogService.alert({
                                                                title: $translate.instant('SETTINGS_2FA'),
                                                                body: e.message || e
                                                            });
                                                        });

                                                });
                                        }, function () {
                                            // Reset for enter QR code
                                            $scope.isEnabled2fa = isEnabled2fa;
                                        }).catch(function () {
                                            $scope.isEnabled2fa = isEnabled2fa;
                                        });
                                }, function (e) {
                                    // Error handler for wrong password
                                    $scope.isEnabled2fa = isEnabled2fa;

                                    if (pleaseWaitDialog) {
                                        pleaseWaitDialog.dismiss();
                                    }

                                    dialogService.alert({
                                        title: $translate.instant('SETTINGS_2FA'),
                                        body: e.message || e
                                    });
                                });


                        }, function () {
                            // Reset for enter password
                            $scope.isEnabled2fa = isEnabled2fa;
                        });
                });
        }

        // TODO move to modal controller
        function disable2FA() {
            var pleaseWaitDialog;

            return $q.when(null)
                .then(function() {
                    return dialogService.prompt({
                        title: $translate.instant('SETTINGS_2FA'),
                        subtitle: $translate.instant('SETTINGS_2FA_DISABLE_2FA'),
                        body: $translate.instant('SETTINGS_2FA_DISABLE_BODY'),
                        label: $translate.instant('TWO_FACTOR_TOKEN'),
                        ok: $translate.instant('SETTINGS_2FA_DISABLE_2FA')
                    })
                        .result
                        .then(function(twoFactorToken) {
                            pleaseWaitDialog = dialogService.alert({
                                title: $translate.instant('SETTINGS_2FA'),
                                body: $translate.instant('PLEASE_WAIT'),
                                body_class: 'text-center',
                                showSpinner: true,
                                ok: false
                            });

                            return formSettingsService.sdkDisable2FA(twoFactorToken)
                                .then(function() {
                                    pleaseWaitDialog.update({
                                        title: $translate.instant('SETTINGS_2FA'),
                                        body: $translate.instant('SETTINGS_2FA_DISABLE_DONE'),
                                        body_class: 'text-center',
                                        ok: false
                                    });

                                    return formSettingsService.updateLaunchService2FA($scope.isEnabled2fa)
                                        .then(function () {
                                            isEnabled2fa = $scope.isEnabled2fa;

                                            launchService.updateAccountInfo({
                                                requires2FA: false
                                            }).then(function () {
                                                accountSecurityService.updateSecurityScore();
                                                $timeout(function() {
                                                    pleaseWaitDialog.dismiss();
                                                }, 1500);
                                            });
                                        });
                                }, function (e) {
                                    // Error handler for wrong two factor token
                                    $scope.isEnabled2fa = isEnabled2fa;

                                    if (pleaseWaitDialog) {
                                        pleaseWaitDialog.dismiss();
                                    }

                                    dialogService.alert({
                                        title: $translate.instant('SETTINGS_2FA'),
                                        body: e.message || e
                                    });
                                });
                        }, function() {
                            // Reset for enter two factor token
                            $scope.isEnabled2fa = isEnabled2fa;
                        });
                });
        }
    }
})();
