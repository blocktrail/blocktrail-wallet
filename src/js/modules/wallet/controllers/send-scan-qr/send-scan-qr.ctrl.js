(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SendScanQRCtrl", SendScanQRCtrl);

    function SendScanQRCtrl($scope, $rootScope, $state, QR, $log, $timeout, $translate, modalService, $ionicHistory, $btBackButtonDelegate,
                            $cordovaToast, $ionicLoading, bitcoinLinkService, walletsManagerService, $stateParams) {
        //remove animation for next state - looks kinda buggy
        $ionicHistory.nextViewOptions({
            disableAnimate: true
        });

        $ionicLoading.show({template: "<div>{{ 'LOADING' | translate }}...</div>", hideOnStateChange: true});

        //wait for transition, then open the scanner and begin scanning
        QR.scan(
            function(result) {
                $log.debug('scan done', result);
                // bitcoin cash ppl care so little for standards or consensus that we actually need to do this ...
                result = result.replace(/^bitcoin cash:/, 'bitcoincash:');
                $ionicLoading.hide();

                // Handle cancelled stage
                if (result.toLowerCase() !== "cancelled") {
                    //parse result for address and value
                    var elm = angular.element('<a>').attr('href', result )[0];

                    $log.debug(elm.protocol, elm.pathname, elm.search, elm.hostname);

                    // Handle promocodes
                    if (elm.protocol === 'btccomwallet:') {
                        var reg = new RegExp(/btccomwallet:\/\/promocode\?code=(.+)/);
                        var res = result.match(reg);

                        $state.go('app.wallet.promo', {code: res[1]});

                    } else if (elm.protocol === 'bitcoincash:' && $rootScope.NETWORK === "BTC") {
                        throw new Error("Can't send to Bitcoin Cash address with BTC wallet");
                    } else if (elm.protocol === 'bitcoin:' || elm.protocol === 'bitcoincash:') {
                        $scope.clearRecipient();
                        bitcoinLinkService.parse(result).then(function (sendInput) {
                            if(sendInput && (sendInput.network === 'bitcoin' || sendInput.network === 'bitcoincash')) {
                                $state.go('app.wallet.send', {
                                    sendInput: sendInput
                                });
                            } else {
                                $cordovaToast.showLongTop($translate.instant("MSG_INVALID_RECIPIENT").sentenceCase());
                                goBackOnIOSonCancel();
                            }
                        });
                    } else {
                        walletsManagerService.getActiveWallet().validateAddress(result)
                            .then(function () {
                                $state.go('app.wallet.send', {
                                    sendInput: {
                                        recipientDisplay: result,
                                        recipientAddress: result
                                    }
                                });
                            })
                            .catch(function () {
                                $timeout(function() {
                                    modalService.alert({
                                        title: "ERROR_TITLE_3",
                                        body: "MSG_INVALID_RECIPIENT"
                                    });
                                }, 180);
                            });
                    }
                } else {
                    if ($stateParams.promoCodeRedeem) {
                        $timeout(function () {
                            $state.go("app.wallet.summary")
                        }, 300);
                    } else {
                        goBackOnIOSonCancel();
                    }
                }
            },
            function(error) {
                $log.error("Scanning failed: " + error);
                $ionicLoading.hide();
                if (error.message === "Scan is already in progress") {
                    return;
                }
                $scope.appControl.isScanning = false;

                goBackOnIOSonCancel();
                $cordovaToast.showLongTop("Scanning failed: " + error);
            }
        );

        function goBackOnIOSonCancel() {
            if (ionic.Platform.isIOS()) {
                $btBackButtonDelegate.goBack();
            }
        }
    }
})();
