(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupNewAccountCtrl", SetupNewAccountCtrl);

    function SetupNewAccountCtrl($scope, $state, $q, $cordovaNetwork, CONFIG, $filter, formHelperService,
                                 modalService, passwordStrengthService, newAccountFormService, setupInfoService) {
        var listenerFormPassword;

        $scope.form = {
            email: CONFIG.DEBUG_EMAIL_PREFILL || "",
            password: CONFIG.DEBUG_PASSWORD_PREFILL || "",
            passwordCheck: null,
            networkType: CONFIG.NETWORKS_ENABLED[0],
            termsOfService: false
        };

        // Listeners
        listenerFormPassword = $scope.$watch("form.password", onFormPasswordChange, true);

        $scope.$on("$destroy", onScopeDestroy);

        // Methods
        $scope.onSubmitFormRegister = onSubmitFormRegister;

        /**
         * On form password change handler
         * @param newValue
         */
        function onFormPasswordChange(newValue) {
            if (!newValue) {
                $scope.form.passwordCheck = null;
                return $q.when(false);
            }

            return passwordStrengthService
                .checkPassword($scope.form.password, [$scope.form.username, $scope.form.email, "BTC.com", "wallet"])
                .then(function(result) {
                    result.duration = $filter("duration")(result.crack_times_seconds.online_no_throttling_10_per_second * 1000);
                    $scope.form.passwordCheck = result;
                    return result;
                });
        }

        /**
         * On submit the form register handler
         * @param registerForm
         * @return { boolean | promise }
         */
        function onSubmitFormRegister(registerForm) {
            formHelperService.setAllDirty(registerForm);

            if (registerForm.email.$invalid) {
                modalService.alert({
                    body: "MSG_BAD_EMAIL"
                });
                return false;
            }

            if (registerForm.password.$invalid || $scope.form.passwordCheck.score < CONFIG.REQUIRED_PASSWORD_STRENGTH) {
                modalService.alert({
                    body: "MSG_WEAK_PASSWORD"
                });
                return false;
            }

            if (!$scope.form.termsOfService) {
                modalService.alert({
                    body: "MSG_BAD_LEGAL"
                });
                return false;
            }

            return modalService.prompt({
                    placeholder: "SETUP_PASSWORD_REPEAT_PLACEHOLDER",
                    prefill: CONFIG.DEBUG_PASSWORD_PREFILL || ""
                })
                .then(function(dialogResult) {
                    if (dialogResult !== null) {
                        if ($scope.form.password === dialogResult.trim()) {
                            register();
                        } else {
                            modalService.alert({
                                body: "MSG_BAD_PASSWORD_REPEAT"
                            });
                        }
                    }
                });
        }

        /**
         * Register
         * @return { promise }
         */
        function register() {
            if ($cordovaNetwork.isOnline()) {
                modalService.showSpinner();

                return newAccountFormService
                    .register($scope.form)
                    .then(registerFormSuccessHandler, registerFormErrorHandler);
            } else {
                modalService.alert({
                    body: "MSG_BAD_NETWORK"
                });
            }
        }

        /**
         * Register form success handler
         */
        function registerFormSuccessHandler() {
            setupInfoService.updateSetupInfo({
                password: $scope.form.password,
                networkType: $scope.form.networkType
            });

            modalService.hideSpinner();
            $state.go("app.setup.pin");
        }

        /**
         * Register form error handler
         */
        function registerFormErrorHandler(error) {
            modalService.hideSpinner();
            modalService.alert({
                body: error
            });
        }

        /**
         * On the scope destroy handler
         */
        function onScopeDestroy() {
            if (listenerFormPassword) {
                listenerFormPassword();
            }
        }
    }
})();
