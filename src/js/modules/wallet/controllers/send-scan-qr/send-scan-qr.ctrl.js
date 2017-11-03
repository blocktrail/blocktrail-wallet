(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SendScanQRCtrl", SendScanQRCtrl);

    function SendScanQRCtrl($scope, $rootScope, $state, QR, $log, $btBackButtonDelegate, $timeout,
                            $ionicHistory, $cordovaToast, $ionicLoading) {
        //remove animation for next state - looks kinda buggy
        $ionicHistory.nextViewOptions({
            disableAnimate: true
        });

        $ionicLoading.show({template: "<div>{{ 'LOADING' | translate }}...", hideOnStateChange: true});

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

                    if (result.toLowerCase() === "cancelled") {
                        //go back
                        $timeout(function() {$btBackButtonDelegate.goBack();}, 180);
                    } else if (elm.protocol === 'btccomwallet:') {
                        var reg = new RegExp(/btccomwallet:\/\/promocode\?code=(.+)/);
                        var res = result.match(reg);

                        $state.go('app.wallet.promo', {code: res[1]})

                    } else if (elm.protocol === 'bitcoincash:' && $rootScope.NETWORK === "BTC") {
                        throw new Error("Can't send to Bitcoin Cash address with BTC wallet");
                    } else if (elm.protocol === 'bitcoin:' || elm.protocol === 'bitcoincash:') {
                        $scope.clearRecipient();
                        $scope.sendInput.recipientAddress = elm.pathname;
                        $scope.sendInput.recipientDisplay = elm.pathname;
                        $scope.sendInput.recipientSource = 'ScanQR';
                        //check for bitcoin amount in qsa
                        if (elm.search) {
                            var reg = new RegExp(/amount=([0-9]*.[0-9]*)/);
                            var amount = elm.search.match(reg);
                            if (amount && amount[1]) {
                                $scope.sendInput.btcValue = parseFloat(amount[1]);
                                $scope.setFiat();
                            }
                        }

                        //go to parent "send qr" state to continue with send process
                        $state.go('^');
                    }
                    else {
                        //no bitcoin protocol, set address as full string
                        $scope.clearRecipient();
                        $scope.sendInput.recipientAddress = result;
                        $scope.sendInput.recipientDisplay = result;
                        $scope.sendInput.recipientSource = 'ScanQR';
                        $state.go('^');
                    }
                },
                function(error) {
                    $log.error(error);
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
