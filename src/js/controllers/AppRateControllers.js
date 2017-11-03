angular.module('blocktrail.wallet')
    .controller('AppRateCtrl', function($scope, $q, sdkService, trackingService, settingsService, AppRateService, $rootScope, $cordovaDevice) {
        $scope.appRateClass = "choose-stars";
        $scope.apprate = {
            feedbackMsg: "",
            starClicked: null
        };

        $scope.doLater = function() {
            AppRateService.updateStatus(AppRateService.APPRATE_STATUS.REMIND);
            trackingService.trackEvent(trackingService.EVENTS.APPRATE, {label: 'later'});

            $scope.close();
        };

        $scope.no = function() {
            AppRateService.updateStatus(AppRateService.APPRATE_STATUS.NO);
            trackingService.trackEvent(trackingService.EVENTS.APPRATE, {label: 'no'});

            $scope.close();
        };

        $scope.close = function() {
            $scope.popover.remove();
        };

        $scope.sendFeedback = function() {
            trackingService.trackEvent(trackingService.EVENTS.APPRATE, {label: 'feedback'});

            $q.when(sdkService.getSdkByActiveNetwork())
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
            trackingService.trackEvent(trackingService.EVENTS.APPRATE, {label: 'rate'});

            $scope.close();
            AppRateService.navigateToAppStore();
        };

        $scope.clickStar = function(starClicked) {
            // remove the ng-enter class to prevent it being animated when resizing
            $scope.popover.modalEl.classList.remove("ng-enter", "ng-enter-active");
            $scope.apprate.starClicked = starClicked;

            trackingService.trackEvent(trackingService.EVENTS.APPRATE_STAR, {label: starClicked + ' stars', value: starClicked});

            if (starClicked <= 3) {
                $scope.appRateClass = "feedback";
                AppRateService.updateStatus(AppRateService.APPRATE_STATUS.NEGATIVE);
            } else {
                $scope.appRateClass = "rateus";
            }
        };
    }
);
