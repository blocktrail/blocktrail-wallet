(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupLoginCtrl", SetupLoginCtrl);

    function SetupLoginCtrl($scope, $state, CONFIG, modalService, formHelperService , sdkService, loginFormService, setupInfoService) {
        // Flag for submitting form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
        var isFormSubmit = false;

        $scope.form = {
            email: CONFIG.DEBUG_EMAIL_PREFILL || "",
            password: CONFIG.DEBUG_PASSWORD_PREFILL || "",
            networkType: sdkService.getNetworkType(),
            twoFactorToken: null
        };

        // Methods
        $scope.onSubmitFormLogin = onSubmitFormLogin;

        /**
         * On submit the form login handler
         * @param loginForm
         * @return { boolean | promise }
         */
        function onSubmitFormLogin(loginForm) {
            formHelperService.setAllDirty(loginForm);

            // Submit the form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
            if(isFormSubmit) {
                return false;
            }

            if (loginForm.email.$invalid) {
                modalService.alert({
                    body: "MSG_BAD_EMAIL"
                });
                return false;
            }

            if (loginForm.password.$invalid) {
                modalService.alert({
                    body: "MSG_MISSING_LOGIN"
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
         * @param response
         */
        function loginFormSuccessHandler(response) {
            modalService.hideSpinner();

            var setupInfo = {
                password: $scope.form.password,
                networkType: $scope.form.networkType,
                // set the identifier of the existing wallet (from API) or otherwise use a new identifier
                identifier: response.existing_wallet || setupInfoService.getSetupInfoProperty("identifier")
            };

            setupInfoService.setSetupInfo(setupInfo);

            $state.go("app.setup.pin");
        }

        /**
         * Login error handle
         * @param error
         */
        function loginFormErrorHandler(error) {
            modalService.hideSpinner();

            // to make the form available for the repeat enter
            isFormSubmit = false;

            switch (error.type) {
                // TODO Add BANNED_IP state
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

                case "EMAIL_2FA_MISSING":
                    modalService.prompt({
                        placeholder: "MSG_MISSING_EMAIL_TWO_FACTOR_TOKEN"
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
