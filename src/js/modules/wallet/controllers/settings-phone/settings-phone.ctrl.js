(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsPhoneCtrl", SettingsPhoneCtrl);

    function SettingsPhoneCtrl($scope, $window, $filter, $btBackButtonDelegate, $cordovaGlobalization, localSettingsService, modalService,
                               phoneFromService, formHelperService) {
        // Enable back button
        enableBackButton();

        // Flag for submitting form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
        // We use one flag for both forms phone/phone verify
        var isFormSubmit = false;

        $scope.localSettingsData = localSettingsService.getReadOnlyLocalSettingsData();

        $scope.formData = {
            phoneNumber: null,
            phoneCountry: null
        };

        $scope.formDataVerifyPhone = {
            token: null
        };

        $scope.isUpdatePhone = false;

        // Methods
        $scope.onSubmitFormPhone = onSubmitFormPhone;
        $scope.onSubmitFormVerifyPhone = onSubmitFormVerifyPhone;
        $scope.getCountryCode = getCountryCode;
        $scope.onSetCountry = onSetCountry;
        $scope.onRemovePhone = onRemovePhone;
        $scope.onUpdatePhone = onUpdatePhone;
        $scope.onResendPhone = onResendPhone;

        init();

        /**
         * Initialization
         */
        function init() {
            resetForm();

            if(!$scope.localSettingsData.phoneCountry) {
                getDefaultCountry()
                    .then(function(country) {
                        $scope.formData.phoneCountry = country.iso2 || null;
                    });
            }
        }

        /**
         * Reset the form
         */
        function resetForm() {
            $scope.formData = {
                phoneNumber: $scope.localSettingsData.phoneNumber,
                phoneCountry: $scope.localSettingsData.phoneCountry
            };
        }

        /**
         * Reset the verify phone form
         */
        function resetVerifyPhoneForm() {
            $scope.formDataVerifyPhone = {
                token: null
            };
        }

        /**
         * Get the country code
         * @param iso2
         * @return {string}
         */
        function getCountryCode(iso2) {
            var country = $filter('filter')($window.allCountries, function(item) {
                return item.iso2 === iso2;
            })[0];

            return country ? country.dialCode : "";

        }

        /**
         * Get the default country
         * @return {*}
         */
        function getDefaultCountry() {
            // try and determine the user's country (use SIM info on android, or guess from locale)
            return $cordovaGlobalization.getLocaleName()
                .then(function(result) {
                    var iso2 = result.value.substr(-2, 2).toLowerCase();

                    return $filter('filter')($window.allCountries, function(item) {
                        return item.iso2 == iso2;
                    })[0];
                }, function() {
                    console.log("Error get country");
                    return {};
                });
        }

        /**
         * On set the country
         */
        function onSetCountry() {
            modalService.select({
                    options: prepareCountryListOptions($window.allCountries || [])
                })
                .then(setCountryHandler);
        }

        /**
         * Prepare the country list options
         * @return {Array}
         */
        function prepareCountryListOptions() {
            var list = [];

            $window.allCountries.forEach(function(item) {
                list.push({
                    value: item.iso2,
                    selected: $scope.localSettingsData.phoneCountry === item.iso2,
                    label: "(+" + item.dialCode + ") " + item.name
                })
            });

            return list;
        }

        /**
         * Set the country handler
         * @param iso2
         */
        function setCountryHandler(iso2) {
            if(iso2) {
                $scope.formData.phoneCountry = iso2;
            }
        }

        /**
         * On submit the form phone
         * @param formPhone
         * @return {boolean}
         */
        function onSubmitFormPhone(formPhone) {
            formHelperService.setAllDirty(formPhone);

            // Submit the form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
            if(isFormSubmit) {
                return false;
            }

            if (formPhone.phone.$invalid) {
                // TODO @Tobias Add the translation message field is required
                modalService.alert({
                    body: "ERROR_TITLE_2"
                });
                return false;
            }

            sendPhone();
        }

        /**
         * On reset the phone
         */
        function onResendPhone() {
            sendPhone();
        }

        /**
         * Send the phone
         */
        function sendPhone() {
            isFormSubmit = true;

            // disable back button
            disableBackButton();

            modalService.showSpinner({
                title: "SENDING"
            });

            var data = {
                phone: $scope.formData.phoneNumber,
                countryCode: getCountryCode($scope.formData.phoneCountry)
            };

            phoneFromService.sendPhone(data)
                .then(formPhoneSuccessHandler, errorHandler);
        }

        /**
         * The phone form success handler
         */
        function formPhoneSuccessHandler(response) {
            var data = {
                isPhoneVerified: false,
                phoneNumber: $scope.formData.phoneNumber,
                phoneCountry: $scope.formData.phoneCountry,
                phoneHash: response.hash
            };

            localSettingsService.setLocalSettings(data)
                .then(successHandler, errorHandler);
        }

        /**
         * On submit the form verify phone
         * @param formVerifyPhone
         * @return {boolean}
         */
        function onSubmitFormVerifyPhone(formVerifyPhone) {
            formHelperService.setAllDirty(formVerifyPhone);

            // Submit the form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
            if(isFormSubmit) {
                return false;
            }

            if (formVerifyPhone.token.$invalid) {
                // TODO @Tobias Add the translation message field is required
                modalService.alert({
                    body: "ERROR_TITLE_2"
                });

                return false;
            }

            verifyPhone();
        }

        /**
         * Verify the phone
         */
        function verifyPhone() {
            isFormSubmit = true;

            // disable back button
            disableBackButton();

            modalService.showSpinner({
                title: "SENDING"
            });

            var data = {
                token: $scope.formDataVerifyPhone.token
            };

            phoneFromService.verifyPhone(data)
                .then(formVerifyPhoneSuccessHandler, errorHandler);
        }

        /**
         * The form verify phone success handler
         */
        function formVerifyPhoneSuccessHandler() {
            var data = {
                isPhoneVerified: true,
                phoneHash: null
            };

            localSettingsService.setLocalSettings(data)
                .then(successHandler, errorHandler);
        }

        /**
         * On update the phone
         */
        function onUpdatePhone() {
            var data = {
                phoneHash: null
            };

            localSettingsService.setLocalSettings(data)
                .then(successHandler, errorHandler);
        }

        /**
         * On remove the phone
         */
        function onRemovePhone() {
            modalService.confirm({
                    body: "MSG_ARE_YOU_SURE"
                })
                .then(function(dialogResult) {
                    if(dialogResult) {
                        phoneFromService.removePhone()
                            .then(removePhoneSuccessHandler, errorHandler);
                    }
                });
        }

        /**
         * Remove the phone
         */
        function removePhoneSuccessHandler() {
            // disable back button
            disableBackButton();

            modalService.showSpinner({
                title: "SETTINGS_PHONE_REMOVE"
            });

            var data = {
                isPhoneVerified: false,
                phoneNumber: null,
                phoneHash: null
            };

            localSettingsService.setLocalSettings(data)
                .then(successHandler, errorHandler);
        }

        /**
         * Success handler success handler
         */
        function successHandler() {
            isFormSubmit = false;
            enableBackButton();
            resetForm();
            resetVerifyPhoneForm();
            modalService.hideSpinner();
        }

        /**
         * Error handler
         */
        function errorHandler() {
            isFormSubmit = false;
            enableBackButton();
            modalService.hideSpinner();
            resetForm();
            resetVerifyPhoneForm();
            modalService.alert({ body: "ERROR_TITLE_3" });
        }

        /**
         * Enable the back button
         */
        function enableBackButton() {
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        }

        /**
         * Disable the back button
         */
        function disableBackButton() {
            $btBackButtonDelegate.setBackButton(angular.noop);
            $btBackButtonDelegate.setHardwareBackButton(angular.noop);
        }
    }

})();
