(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("BuyBTCChooseCtrl", BuyBTCChooseCtrl);

    function BuyBTCChooseCtrl($q, $scope, $state, $cordovaDialogs, settingsService, $translate, glideraService, trackingService) {
        var settingsData = settingsService.getReadOnlySettingsData();

        $scope.brokers = [];

        $scope.goBuyBTCState = function (broker) {
            $state.go('app.wallet.buybtc.buy', { broker: broker });
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
