angular.module('blocktrail.wallet')
    .controller('AppRateCtrl', function($scope, $q, sdkService, settingsService, AppRateService, $rootScope, $cordovaDevice) {
        $scope.appRateClass = "choose-stars";
        $scope.apprate = {
            feedbackMsg: "",
            starClicked: null
        };

        $scope.doLater = function() {
            AppRateService.updateStatus(AppRateService.APPRATE_STATUS.REMIND);

            $scope.close();
        };

        $scope.no = function() {
            AppRateService.updateStatus(AppRateService.APPRATE_STATUS.NO);

            $scope.close();
        };

        $scope.close = function() {
            $scope.popover.remove();
        };

        $scope.sendFeedback = function() {
            $q.when(sdkService.sdk())
                .then(function(sdk) {
                    var feedback = {
                        msg: $scope.apprate.feedbackMsg,
                        email: null,
                        platform: $rootScope.isIOS && "iOS" || "Android",
                        app_version: $rootScope.appVersion,
                        os_version: $cordovaDevice.getVersion(),
                        phone_model: $cordovaDevice.getModel()
                    };

                    return sdk.sendFeedback(feedback);
                })
                .finally(function() {
                    $scope.close();
                })
        };

        $scope.rate = function() {
            AppRateService.updateStatus(AppRateService.APPRATE_STATUS.DONE);

            $scope.close();
            AppRateService.navigateToAppStore();
        };

        $scope.clickStar = function(starClicked) {
            // remove the ng-enter class to prevent it being animated when resizing
            $scope.popover.modalEl.classList.remove("ng-enter", "ng-enter-active");
            $scope.apprate.starClicked = starClicked;

            if (starClicked <= 3) {
                $scope.appRateClass = "feedback";
                AppRateService.updateStatus(AppRateService.APPRATE_STATUS.NEGATIVE);
            } else {
                $scope.appRateClass = "rateus";
            }
        };
    }
);
