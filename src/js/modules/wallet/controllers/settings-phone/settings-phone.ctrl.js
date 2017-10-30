(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsPhoneCtrl", SettingsPhoneCtrl);

    function SettingsPhoneCtrl($scope, $stateParams, settingsService, $btBackButtonDelegate, sdkService,
                          $q, $log, $timeout, $filter, $cordovaGlobalization) {
        $scope.allCountries = allCountries;
        $scope.formInput = {
            newPhoneNumber: !settingsService.phoneVerified ? settingsService.phoneNationalNumber : null,
            selectedCountry: null,
            verifyToken: null
        };
        $scope.appControl = {
            working: false,
            showMessage: false,
            showCountrySelect: false,
            showPhoneInput: true
        };
        $scope.message = {
            title: "",
            title_class: "",
            body: "",
            body_class: ""
        };
        $scope.dismissAndGoBack = false;

        //hide the phone input if verification pending
        if (settingsService.phoneNumber && !settingsService.phoneVerified) {
            $scope.appControl.showPhoneInput = false;
        }

        //set the selected country
        if (settingsService.phoneRegionCode) {
            $scope.formInput.selectedCountry = $filter('filter')(allCountries, function(val, index) {
                return val.dialCode == settingsService.phoneRegionCode;
            })[0];
        } else {
            //try and determine the user's country (use SIM info on android, or guess from locale)
            $cordovaGlobalization.getLocaleName().then(
                function(result) {
                    var country = result.value.substr(-2, 2).toLowerCase();
                    $scope.formInput.selectedCountry = $filter('filter')(allCountries, function(val, index) {
                        return val.iso2 == country;
                    })[0];
                },
                function(error) { console.error(error);});
        }

        $scope.showMessage = function() {
            $scope.appControl.showMessage = true;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                    $scope.dismissMessage();
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.dismissMessage();
                });
            }, true);
        };

        $scope.dismissMessage = function() {
            $scope.appControl.showMessage = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);

            if ($scope.dismissAndGoBack) {
                //go back to previous state
                $btBackButtonDelegate.goBack();
            }
        };

        $scope.showCountrySelect = function() {
            $scope.appControl.showCountrySelect = true;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                    $scope.dismissCountrySelect();
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.dismissCountrySelect();
                });
            }, true);
        };

        $scope.dismissCountrySelect = function() {
            $scope.appControl.showCountrySelect = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };

        $scope.updatePhone = function() {
            if ($scope.appControl.working || !$scope.formInput.newPhoneNumber) {
                return false;
            }

            //send new phone number to be normalised and validated
            $scope.message = {title: 'WORKING', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();
            $q.when(sdkService.sdk())
                .then(function(sdk) {
                    return sdk.updatePhone({phone_number: $scope.formInput.newPhoneNumber, 'country_code': $scope.formInput.selectedCountry.dialCode});
                })
                .then(function(result) {
                    //success, update settings with returned hash and normalised number
                    settingsService.phoneVerified = false;
                    settingsService.phoneHash = result.hash;
                    settingsService.phoneNumber = result.phone;
                    settingsService.phoneNationalNumber = result.phone_national;
                    settingsService.phoneRegionCode = result.country_code;
                    $scope.formInput.newPhoneNumber = null;//result.phone;
                    settingsService.$store();

                    $scope.message = {title: 'SUCCESS', title_class: 'text-good', body: ''};
                    $scope.appControl.working = false;
                    $scope.appControl.showPhoneInput = false;
                    $scope.dismissMessage();
                }, function(err) {
                    $log.error(err);
                    $scope.message = {title: 'ERROR_TITLE_3', title_class: 'text-bad', body: err};
                    $scope.showMessage();
                    $scope.appControl.working = false;
                });
        };

        $scope.removePhone = function() {
            if ($scope.appControl.working) {
                return false;
            }
            if (!settingsService.phoneNumber) {
                $scope.formInput.newPhoneNumber = null;
                return false;
            }

            $scope.message = {title: 'WORKING', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();
            $q.when(sdkService.sdk())
                .then(function(sdk) {
                    return sdk.removePhone();
                })
                .then(function(result) {
                    //success, update settings with returned hash and normalised number
                    settingsService.phoneVerified = false;
                    settingsService.phoneHash = null;
                    settingsService.phoneNumber = null;
                    //settingsService.phoneNationalNumber = result.phone_national;  //leave this phone number for display, so they can add it again
                    $scope.formInput.newPhoneNumber = null;
                    settingsService.$store();

                    $scope.message = {title: 'SUCCESS', title_class: 'text-good', body: ''};
                    $scope.appControl.working = false;
                    $timeout(function() {$scope.dismissMessage();}, 1000);
                }, function(err) {
                    $log.error(err);
                    $scope.message = {title: 'ERROR_TITLE_3', title_class: 'text-bad', body: err};
                    $scope.showMessage();
                    $scope.appControl.working = false;
                });
        };

        $scope.verifyPhone = function() {
            if ($scope.appControl.working || !$scope.formInput.verifyToken) {
                return false;
            }

            $scope.message = {title: 'VERIFYING', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();
            $q.when(sdkService.sdk())
                .then(function(sdk) {
                    return sdk.verifyPhone($scope.formInput.verifyToken);
                })
                .then(function(result) {
                    //success, update status locally
                    settingsService.phoneVerified = true;
                    $scope.formInput.verifyToken = null;
                    $scope.formInput.newPhoneNumber = null;

                    $scope.message = {title: 'SUCCESS', title_class: 'text-good', body: 'MSG_PHONE_VERIFIED'};
                    $scope.showMessage();
                    $scope.appControl.working = false;
                    $scope.dismissAndGoBack = true;
                    //push the provided state into the history if indicated in the url
                    if ($stateParams.goBackTo) {
                        $btBackButtonDelegate.addHistory($stateParams.goBackTo);
                    }

                    settingsService.$store().then(function() {
                        //$btBackButtonDelegate.goBack();
                    });
                }, function(err) {
                    $log.error(err);
                    $scope.message = {title: 'ERROR_TITLE_2', title_class: 'text-bad', body: 'MSG_BAD_TOKEN'};
                    $scope.showMessage();
                    $scope.appControl.working = false;
                });
        };
    }
})();
