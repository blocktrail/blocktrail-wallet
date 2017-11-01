(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupLoginCtrl", SetupLoginCtrl);

    function SetupLoginCtrl($scope, $rootScope, $state, $q, $http, $timeout, $cordovaNetwork, launchService, CONFIG, loginFormService, modalService,
                            settingsService, $btBackButtonDelegate, $log, $cordovaDialogs, $translate, trackingService, sdkService, formHelperService) {
        $scope.form = {
            email: CONFIG.DEBUG_EMAIL_PREFILL || "",
            password: CONFIG.DEBUG_PASSWORD_PREFILL || "",
            networkType: sdkService.getNetworkType(),
            twoFactorToken: null
        };

        // Methods
        $scope.onSubmitFormLogin = onSubmitFormRegister;

        /**
         * On submit the form login handler
         * @param loginForm
         * @return { boolean | promise }
         */
        function onSubmitFormRegister(loginForm) {
            formHelperService.setAllDirty(loginForm);

            if (loginForm.email.$invalid) {
                modalService.alert({
                    body: 'MSG_BAD_EMAIL'
                });
                return false;
            }

            if (loginForm.password.$invalid) {
                modalService.alert({
                    body: 'MSG_MISSING_LOGIN'
                });
                return false;
            }

            $scope.form.twoFactorToken = null;

            login();
        }

        /**
         * Login
         * @return { promise }
         */
        function login() {
            var data = {
                login: $scope.form.email,
                password: $scope.form.password,
                twoFactorToken: $scope.form.twoFactorToken,
                networkType: $scope.form.networkType
            };

            modalService.showSpinner();

            return loginFormService.login(data)
                .then(loginFormSuccessHandler, loginFormErrorHandler);
        }

        /**
         * Login success handle
         * @param data
         */
        function loginFormSuccessHandler(data) {
            modalService.hideSpinner();

            if (!$scope.form.forceNewWallet) {
                $scope.setupInfo.identifier = data.existing_wallet || $scope.setupInfo.identifier;
            }

            $scope.setupInfo.password = $scope.form.password;
            $scope.setupInfo.networkType = $scope.form.networkType;

            $state.go('app.setup.pin');
        }

        /**
         * Login error handle
         * @param error
         */
        function loginFormErrorHandler(error) {
            modalService.hideSpinner();

            switch (error.type) {
                // TODO Add state later
                case "BANNED_IP":
                    return modalService.alert({
                        title: "BANNED_IP_TITLE",
                        body: "BANNED_IP_BODY"
                    });

                    break;

                case "SHA_512":
                    return modalService.alert({
                        title: "SETUP_LOGIN_FAILED",
                        body: "MSG_UPGRADE_REQUIRED"
                    });

                    break;

                case "2FA_MISSING":
                    modalService.prompt({
                            placeholder: "MSG_MISSING_TWO_FACTOR_TOKEN"
                        })
                        .then(function(dialogResult) {
                            if (dialogResult !== null) {
                                $scope.form.twoFactorToken = dialogResult;
                                login();
                            }
                        });

                    break;

                case "2FA_INVALID":
                    modalService.prompt({
                            placeholder: "MSG_INCORRECT_TWO_FACTOR_TOKEN"
                        })
                        .then(function(dialogResult) {
                            if (dialogResult !== null) {
                                $scope.form.twoFactorToken = dialogResult;
                                login();
                            }
                        });

                    break;

                case "MSG_BAD_LOGIN":
                    modalService.alert({
                        body: "MSG_BAD_LOGIN"
                    });

                    break;

                case "MSG_BAD_LOGIN_UNKNOWN":
                    modalService.alert({
                        body: "MSG_BAD_LOGIN_UNKNOWN"
                    });

                    break;
            }
        }
    }
})();
