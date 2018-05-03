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

        $ionicLoading.show({template: "<div>{{ 'LOADING' | translate }}...</div>", hideOnStateChange: true});

        // borrowed from bip21, with a modification for optional addresses
        // in urls.
        function decodeBitcoin (uri) {
            var qregex = /(bitcoin|bitcoincash):\/?\/?([^?]+)?(\?([^]+))?/.exec(uri);
            if (!qregex) throw new Error('Invalid BIP21 URI: ' + uri);

            var protocol = qregex[1];
            var address = qregex[2];
            var query = qregex[4];

            var options = parseQuery("?"+query);
            if (options.amount) {
                options.amount = Number(options.amount);
                if (!isFinite(options.amount)) throw new Error('Invalid amount');
                if (options.amount < 0) throw new Error('Invalid amount');
            }

            return { address: address, options: options };
        }

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
                        // Try to decode payment url
                        try {
                            var uri = decodeBitcoin(result);
                        } catch (e) { }

                        if (uri && uri.options && uri.options.r) {
                            $scope.sendInput.paymentUrl = uri.options.r;
                        } else {
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
                        }

                        //go to parent "send qr" state to continue with send process
                        $state.go('^');
                    } else {
                        //no bitcoin protocol, set address as full string
                        $scope.clearRecipient();
                        $scope.sendInput.recipientAddress = result;
                        $scope.sendInput.recipientDisplay = result;
                        $scope.sendInput.recipientSource = 'ScanQR';
                        $state.go('^');
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
