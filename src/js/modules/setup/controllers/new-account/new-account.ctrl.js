(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupNewAccountCtrl", SetupNewAccountCtrl);

    function SetupNewAccountCtrl($scope, $state, $q, CONFIG, $filter, formHelperService, sdkService,
                                 modalService, passwordStrengthService, newAccountFormService) {

        var listenerForm;
        var listenerFormPassword;

        $scope.form = {
            email: "",
            password: "",
            passwordCheck: null,
            networkType: sdkService.getNetworkType(),
            termsOfService: false
        };

        // Listeners
        listenerForm = $scope.$watch("form", onFormChange, true);
        listenerFormPassword = $scope.$watch("form.password", onFormPasswordChange, true);

        $scope.$on("$destroy", onScopeDestroy);

        // Methods
        $scope.onSubmitFormRegister = onSubmitFormRegister;

        /**
         * On form change handler
         * @param newValue
         * @param oldValue
         */
        function onFormChange(newValue, oldValue) {
            if (newValue.networkType !== oldValue.networkType) {
                sdkService.setNetworkType(newValue.networkType);
            }
        }

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
                    placeholder: "SETUP_PASSWORD_REPEAT_PLACEHOLDER"
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
            modalService.showSpinner();

            return newAccountFormService
                .register($scope.form)
                .then(registerFormSuccessHandler, registerFormErrorHandler);
        }

        /**
         * Register form success handler
         */
        function registerFormSuccessHandler() {
            $scope.setupInfo.password = $scope.form.password;
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
            if (listenerForm) {
                listenerForm();
            }

            if (listenerFormPassword) {
                listenerFormPassword();
            }
        }
    }
})();
