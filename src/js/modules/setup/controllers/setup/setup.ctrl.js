(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupCtrl", SetupCtrl);

    function SetupCtrl($scope, CONFIG, $btBackButtonDelegate, $rootScope, $timeout) {
        $scope.setupInfo = {
            // force uniqueness of the identifier to make it easier to force a
            identifier: CONFIG.DEFAULT_IDENTIFIER + "-" + randomBytes(8).toString('hex'),
            password: "",
            primaryMnemonic: "",
            backupMnemonic: "",
            blocktrailPublicKeys: null
        };

        $scope.appControl = {
            working: false,
            showMessage: false
        };
        $scope.message = {
            title: "",
            title_class: "",
            body: "",
            body_class: ""
        };

        // wait 200ms timeout to allow view to render before hiding loadingscreen
        $timeout(function() {
            $rootScope.hideLoadingScreen = true;

            // allow for one more digest loop
            $timeout(function() {
                if (navigator.splashscreen) {
                    navigator.splashscreen.hide();
                }
            }, 450);
        }, 0);

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
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };
    }
})();
