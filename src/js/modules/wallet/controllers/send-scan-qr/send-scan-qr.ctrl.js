(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SendScanQRCtrl", SendScanQRCtrl);

    function SendScanQRCtrl($scope, $rootScope, $state, QR, $log, $btBackButtonDelegate, $timeout,
                            $ionicHistory, $cordovaToast, $ionicLoading, bitcoinLinkService) {
        //remove animation for next state - looks kinda buggy
        $ionicHistory.nextViewOptions({
            disableAnimate: true
        });

        $ionicLoading.show({template: "<div>{{ 'LOADING' | translate }}...</div>", hideOnStateChange: true});

        //wait for transition, then open the scanner and begin scanning
        $timeout(function() {
            QR.scan(
                function(result) {
                    $log.debug('scan done', result);
                    // bitcoin cash ppl care so little for standards or consensus that we actually need to do this ...
                    result = result.replace(/^bitcoin cash:/, 'bitcoincash:');

                    $log.debug('scan done', result);
                    $ionicLoading.hide();

                    //parse result for address and value
                    var elm = angular.element('<a>').attr('href', result )[0];

                    $log.debug(elm.protocol, elm.pathname, elm.search, elm.hostname);

                    // Handle cancelled stage
                    if (result.toLowerCase() === "cancelled") {
                        // go back - on iOS
                        if (ionic.Platform.isIOS()) {
                            $timeout(function () {
                                $btBackButtonDelegate.goBack();
                            }, 180);
                        }
                    }

                    // Handle promocodes
                    if (elm.protocol === 'btccomwallet:') {
                        var reg = new RegExp(/btccomwallet:\/\/promocode\?code=(.+)/);
                        var res = result.match(reg);

                        $state.go('app.wallet.promo', {code: res[1]});

                    } else if (elm.protocol === 'bitcoincash:' && $rootScope.NETWORK === "BTC") {
                        throw new Error("Can't send to Bitcoin Cash address with BTC wallet");
                    } else if (elm.protocol === 'bitcoin:' || elm.protocol === 'bitcoincash:') {
                        $scope.clearRecipient();
                        bitcoinLinkService.parse(result).then(function (sendParams) {
                            $state.go('app.wallet.send', {sendInput: sendParams});
                        });
                    }
                },
                function(error) {
                    $log.error("Scanning failed: " + error);

                    $ionicLoading.hide();
                    $cordovaToast.showLongTop("Scanning failed: " + error);
                    $scope.appControl.isScanning = false;

                    $timeout(function() {$btBackButtonDelegate.goBack();}, 180);
                }
            );
        }, 350);
    }
})();
