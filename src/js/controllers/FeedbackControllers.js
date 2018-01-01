angular.module('blocktrail.wallet')
    .controller('FeedbackCtrl', function($scope, genericSdkService, $btBackButtonDelegate, $q, $rootScope, $cordovaDevice) {

        $scope.appControl = {
            working: false,
            showMessage: false
        };
        $scope.feedbackInput = {
            msg: '',
            email: null,
            platform: $rootScope.isIOS && "iOS" || "Android",
            app_version: $rootScope.appVersion,
            os_version: $cordovaDevice.getVersion(),
            phone_model: $cordovaDevice.getModel()
        };
        $scope.message = {
            title: "",
            title_class: "",
            body: "",
            body_class: ""
        };

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
        };

        $scope.sendFeedback = function() {
            if ($scope.appControl.working) {
                return false;
            }

            //validate and cleanup
            if (!$scope.feedbackInput.msg) {
                $scope.message = {title: 'ERROR_TITLE_2', title_class: 'text-bad', body: 'MSG_BAD_FEEDBACK'};
                $scope.showMessage();
                return false;
            }

            //send feedback
            $scope.message = {title: 'SENDING', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();

            $q.when(genericSdkService.getSdk())
                .then(function(sdk) {
                    return sdk.sendFeedback($scope.feedbackInput);
                })
                .then(function(result) {
                        $scope.message = {title: 'THANKS_1', title_class: 'text-good', body: 'MSG_FEEDBACK_SUCCESS'};
                        $scope.showMessage();
                        //$timeout();
                        $scope.feedbackInput.msg = '';
                        $scope.feedbackInput.email = null;
                        $scope.appControl.working = false;
                    }, function(err) {
                        $scope.message = {title: 'ERROR_TITLE_3', title_class: 'text-bad', body: err};
                        $scope.showMessage();
                        $scope.appControl.working = false;
                    }
                );
        };



        $scope.$on('$ionicView.leave', function() {
            //$btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            //$btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        });
    }
);
