(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("BuyBTCChooseCtrl", BuyBTCChooseCtrl);

    function BuyBTCChooseCtrl($q, $scope, $state, $cordovaDialogs, settingsService, $ionicLoading,
                      $translate, $timeout, $ionicScrollDelegate, glideraService, buyBTCService, trackingService, $log) {
        var settingsData = settingsService.getReadOnlySettingsData();

        $scope.brokers = [];

        // load chooseRegion from settingsService
        //  show loading spinner while we wait (should be microseconds)
        $scope.chooseRegion = null;
        $scope.chooseState = {
            gettingStarted: true
        };
        $ionicLoading.show({
            template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>",
            hideOnStateChange: true
        });

        $q.all([
            buyBTCService.regions().then(function(regions) {
                $scope.regions = regions;
            }),
            buyBTCService.usStates().then(function(usStates) {
                $scope.usStates = usStates;
            })
        ]).then(function() {
            $scope.chooseRegion = _.defaults({}, settingsData.buyBTCRegion, {
                code: null,
                name: null
            });
            $scope.chooseState.gettingStarted = !$scope.chooseRegion.code;

            return buyBTCService.regionBrokers($scope.chooseRegion.code).then(function(brokers) {
                $scope.brokers = brokers;
                $scope.chooseRegion.regionOk = $scope.brokers.length;

                $timeout(function() {
                    $ionicLoading.hide();
                });
            });
        });

        $scope.selectRegion = function(region, name) {
            $log.debug('selectRegion: ' + region + ' (' + name + ')');
            $scope.chooseRegion.code = region;
            $scope.chooseRegion.name = name;

            buyBTCService.regionBrokers($scope.chooseRegion.code).then(function(brokers) {
                $scope.brokers = brokers;
                $scope.chooseRegion.regionOk = $scope.brokers.length;

                if ($scope.chooseRegion.regionOk) {
                    trackingService.trackEvent(trackingService.EVENTS.BUYBTC.REGION_OK);
                } else {
                    trackingService.trackEvent(trackingService.EVENTS.BUYBTC.REGION_NOTOK);
                }

                $ionicScrollDelegate.scrollTop();

                settingsService.updateSettingsUp({ buyBTCRegion: $scope.chooseRegion });
            });
        };

        $scope.goBuyBTCState = function (broker) {
            $state.go('app.wallet.buybtc.buy', {broker: broker});
        };

        $scope.goGlideraBrowser = function() {
            glideraService.userCanTransact().then(function(userCanTransact) {
                if (!userCanTransact) {
                    return glideraService.accessToken().then(function(accessToken) {
                        if (accessToken) {
                            // 2: Additional user verification information is required
                            if (settingsData.glideraAccessToken.userCanTransactInfo.code == 2) {
                                trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_SETUP_UPDATE);

                                return $cordovaDialogs.confirm(
                                    $translate.instant('MSG_BUYBTC_SETUP_MORE_GLIDERA_BODY', {
                                        message: settingsData.glideraAccessToken.userCanTransactInfo.message
                                    }).sentenceCase(),
                                    $translate.instant('MSG_BUYBTC_SETUP_MORE_GLIDERA_TITLE').sentenceCase(),
                                    [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
                                )
                                    .then(function(dialogResult) {
                                        if (dialogResult == 2) {
                                            return;
                                        }

                                        return glideraService.setup();
                                    })
                                    ;

                            } else if (settingsData.glideraAccessToken.userCanTransactInfo) {
                                throw new Error("User can't transact because: " + settingsData.glideraAccessToken.userCanTransactInfo.message);
                            } else {
                                throw new Error("User can't transact for unknown reason!");
                            }



                        } else {
                            trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_SETUP_INIT);

                            return $cordovaDialogs.confirm(
                                $translate.instant('MSG_BUYBTC_SETUP_GLIDERA_BODY').sentenceCase(),
                                $translate.instant('MSG_BUYBTC_SETUP_GLIDERA_TITLE').sentenceCase(),
                                [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
                            )
                                .then(function(dialogResult) {
                                    if (dialogResult == 2) {
                                        return;
                                    }

                                    return glideraService.oauth2();
                                })
                                ;
                        }
                    });
                } else {
                    $state.go('app.wallet.buybtc.buy', {broker: 'glidera'});
                }
            })
                .then(function() {
                    // -
                }, function(err) {
                    alert(err);
                })
            ;
        };

        /**
         * reset buy BTC state for debugging purposes
         */
        $scope.resetBuyBTC = function() {


            return $q.when()
                .then(function() {
                    var updateSettings = {
                        glideraAccessToken: null,
                        buyBTCRegion: null,
                        glideraTransactions: []
                    };

                    return settingsService.updateSettingsUp(updateSettings);
                })
                .then(function() {
                    $state.go('app.wallet.summary');
                }, function(err) {
                    alert(err);
                });
        };
    }
})();
