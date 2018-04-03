angular.module('blocktrail.wallet')
    .controller('PromoCodeRedeemCtrl', function($scope, $rootScope, $state, $stateParams, $btBackButtonDelegate, $q, $log,
                                                $cordovaToast, $ionicLoading, QR, $timeout, walletsManagerService, trackingService) {
        $scope.appControl = {
            working: false,
            showMessage: false
        };

        $scope.promoCodeInput = {
            code: $stateParams.code || null,             //promo code
            address: null,          //redemption address
            uuid: device.uuid,      //unique device id     //nocommit
            platform: $rootScope.isIOS && "iOS" || "Android",
            version: $rootScope.appVersion
        };

        $scope.message = {
            title: "",
            title_class: "",
            body: "",
            body_class: ""
        };

        $scope.scanQr = function() {
            $ionicLoading.show({template: "<div>{{ 'LOADING' | translate }}...</div>", hideOnStateChange: true});

            // wait for transition, then open the scanner and begin scanning
            $timeout(function() {
                QR.scan(
                    function(result) {
                        $log.debug('scan done', result);
                        $ionicLoading.hide();

                        // parse result for address and value
                        var elm = angular.element('<a>').attr('href', result )[0];

                        $log.debug(elm.protocol, elm.pathname, elm.search, elm.hostname);

                        if (result.toLowerCase() === "cancelled") {
                            $state.go('wallet.summary');
                        }
                        else if (elm.protocol === 'btccomwallet:') {
                            var reg = new RegExp(/btccomwallet:\/\/promocode\?code=(.+)/);
                            var res = result.match(reg);

                            $scope.promoCodeInput.code = res[1];
                        }
                    },
                    function(error) {
                        $log.error(error);
                        $log.error("Scanning failed: " + error);
                        $ionicLoading.hide();
                        $cordovaToast.showLongTop("Scanning failed: " + error);
                    }
                );
            }, 350);
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

        $scope.resetMessage = function() {
            $scope.message = {
                title: "",
                title_class: "",
                body: "",
                body_class: ""
            };
        };

        $scope.confirmInput = function() {
            if ($scope.appControl.working) {
                return false;
            }

            //validate and cleanup
            if (!$scope.promoCodeInput.code) {
                $scope.message = {title: 'ERROR_TITLE_2', title_class: 'text-bad', body: 'MSG_MISSING_PROMO_CODE'};
                return false;
            }

            //generate redemption address then send promo code
            $scope.message = {title: 'CHECKING', title_class: 'text-neutral', body: ''};
            $scope.appControl.working = true;
            $scope.showMessage();
            $q.when($scope.promoCodeInput.address || walletsManagerService.getActiveWallet().getNewAddress())
                .then(function(address) {
                    $scope.promoCodeInput.address = address;
                    trackingService.trackEvent(trackingService.EVENTS.PROMO_ATTEMPT);
                    return walletsManagerService.getActiveSdk().redeemPromoCode($scope.promoCodeInput);
                })
                .then(function(result) {
                    trackingService.trackEvent(trackingService.EVENTS.PROMO_REDEEM);
                    $timeout(function(){
                        $scope.dismissMessage();

                        $timeout(function(){
                            $scope.message = {title: 'THANKS_1', title_class: 'text-good', body: result.msg};
                            $scope.promoCodeInput.code = '';
                            $scope.appControl.working = false;
                        }, 400);
                    }, 200);
                })
                .catch(function(err) {
                    $timeout(function(){
                        $scope.dismissMessage();

                        $timeout(function(){
                            $scope.message = {title: 'SORRY', title_class: 'text-bad', body: err.message || err};
                            $scope.appControl.working = false;
                        }, 400);
                    }, 200);
                });
        };
    }
);
