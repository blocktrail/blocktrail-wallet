(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("ReceiveCtrl", ReceiveCtrl);

    function ReceiveCtrl($scope, walletsManagerService, settingsService, CurrencyConverter, $q, $cordovaClipboard, $cordovaEmailComposer,
                          $timeout, $btBackButtonDelegate, $cordovaSocialSharing, $translate, $log, $cordovaToast, CONFIG) {

        var activeWallet = walletsManagerService.getActiveWallet();
        var walletData = walletsManagerService.getActiveWalletReadOnlyData();

        $scope.networkLong = CONFIG.NETWORKS[walletData.networkType].NETWORK_LONG;
        $scope.newRequest = {
            address: null,
            path: null,
            btcValue: 0,
            fiatValue: 0,
            message: null,
            bitcoinUri: ""
        };
        //control status of the app (allows for child scope modification)
        $scope.appControl = {
            showCashOption: CONFIG.NETWORKS[walletData.networkType].CASHADDRESS,
            useCashAddress: CONFIG.NETWORKS[walletData.networkType].CASHADDRESS,
            working: false,
            showMessage: false,
            showRequestOptions: false
        };

        $scope.settingsData = settingsService.getReadOnlySettingsData();

        $scope.message = {};

        $scope.qrSettings = {
            correctionLevel: 7,
            SIZE: 225,
            inputMode: 'M',
            image: true
        };
        $scope.smsOptions = {
            replaceLineBreaks: false, // true to replace \n by a new line, false by default
            android: {
                intent: 'INTENT'  // send SMS with the native android SMS messaging
                //intent: '' // send SMS without open any other app
            }
        };

        $scope.swapInputs = function() {
            $scope.fiatFirst = !$scope.fiatFirst;
        };

        $scope.setFiat = function() {
            //converts and sets the FIAT value from the BTC value
            $scope.newRequest.fiatValue = parseFloat(CurrencyConverter.fromBTC($scope.newRequest.btcValue, $scope.settingsData.localCurrency, 2)) || 0;
            //$scope.newRequest.fiatValue.$setDirty();   //ideally set the other input to dirty as well
        };
        $scope.setBTC = function() {
            //converts and sets the BTC value from the FIAT value
            $scope.newRequest.btcValue = parseFloat(CurrencyConverter.toBTC($scope.newRequest.fiatValue, $scope.settingsData.localCurrency, 6)) || 0;
            //$scope.newRequest.btcValue.$setDirty();    //ideally set the other input to dirty as well
        };
        $scope.newAddress = function() {
            var chainIdx = null;
            if (walletData.networkType === "BCC") {
                chainIdx = blocktrailSDK.Wallet.CHAIN_BCC_DEFAULT;
            } else if (walletData.networkType === "BTC") {
                chainIdx = blocktrailSDK.Wallet.CHAIN_BTC_DEFAULT;
            }

            $q.when(walletsManagerService.getActiveWallet().getNewAddress(chainIdx)).then(function(address) {
                $scope.newRequest.address = address;
            });
        };

        window.myscope = $scope;
        $scope.$watch("appControl.useCashAddress", function(newValue, oldValue) {
            if (newValue !== oldValue && $scope.newRequest.address) {
                var sdk = activeWallet.getSdkWallet().sdk;
                if (newValue) {
                    $scope.newRequest.address = sdk.getCashAddressFromLegacyAddress($scope.newRequest.address);
                } else {
                    $scope.newRequest.address = sdk.getLegacyBitcoinCashAddress($scope.newRequest.address);
                }
            }
        });

        $scope.generateQR = function() {
            if (!$scope.newRequest.address) {
                return false;
            }

            var prefix = CONFIG.NETWORKS[walletData.networkType].URIPREFIX;
            if (CONFIG.NETWORKS[walletData.networkType].CASHADDRESS) {
                prefix = "";
                if (!$scope.appControl.useCashAddress) {
                    prefix = CONFIG.NETWORKS[walletData.networkType].URIPREFIX;
                }
            }

            $scope.newRequest.bitcoinUri = prefix + $scope.newRequest.address;
            if ($scope.newRequest.btcValue) {
                $scope.newRequest.bitcoinUri += "?amount=" + $scope.newRequest.btcValue.toFixed(8);
            }
        };

        $scope.showExportOptions = function() {
            $scope.appControl.showRequestOptions = true;
            $scope.appControl.showMessage = false;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                    $scope.appControl.showRequestOptions = false;
                    $scope.appControl.showMessage = false;
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.appControl.showRequestOptions = false;
                    $scope.appControl.showMessage = false;
                });
            }, true);
        };

        $scope.hideExportOptions = function() {
            $scope.appControl.showRequestOptions = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };

        $scope.showMessage = function() {
            $scope.appControl.showMessage = true;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                    $scope.appControl.showMessage = false;
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.appControl.showMessage = false;
                });
            }, true);
        };

        $scope.dismissMessage = function() {
            $scope.appControl.showMessage = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };

        $scope.toClipboard = function() {
            $cordovaClipboard.copy($scope.newRequest.address).then(function () {
                $cordovaToast.showShortCenter($translate.instant('MSG_ADDRESS_COPIED').sentenceCase())
                    .catch(function (err) {
                        console.error(err);
                    });
            }, function () {
                // error
                $scope.message = {title: 'Oops', body: 'unable to copy to clipboard'};
                $scope.showMessage();
            });
        };

        $scope.toEmail = function() {
            //get the QRCode
            var qrcode = document.querySelector('qr img');

            var params = {
                address: $scope.newRequest.address,
                addressURI: $scope.newRequest.bitcoinUri,
                btcValue: $scope.newRequest.btcValue,
                fiatValue: $scope.newRequest.fiatValue,
                localCurrency: $scope.settingsData.localCurrency,
                qrcode: qrcode.src
            };

            //launch email
            var options = {
                to: '',
                attachments: [
                    'base64:qrcode.png//' + qrcode.src.replace(/^data\:([^\;]+)\;base64,/gmi, '')
                ],
                subject: $scope.newRequest.btcValue ? $translate.instant('MSG_REQUEST_EMAIL_SUBJECT_2', params).sentenceCase() : $translate.instant('MSG_REQUEST_EMAIL_SUBJECT_1', params).sentenceCase(),
                body: $scope.newRequest.btcValue ? $translate.instant('MSG_REQUEST_EMAIL_BODY_2', params) : $translate.instant('MSG_REQUEST_EMAIL_BODY_1', params),
                isHtml: true
            };

            return $cordovaEmailComposer.open(options)
                .then(function() {
                    $log.debug('email success');
                    $scope.hideExportOptions();
                }, function() {
                    // user cancelled email
                    $log.error('email cancelled');
                    $scope.hideExportOptions();
                });
        };

        $scope.shareLink = function() {
            var params = {
                address: $scope.newRequest.address,
                btcValue: $scope.newRequest.btcValue,
                fiatValue: $scope.newRequest.fiatValue,
                localCurrency: $scope.settingsData.localCurrency,
                network: CONFIG.NETWORKS[walletData.networkType].TICKER,
                networkLong: CONFIG.NETWORKS[walletData.networkType].TICKER_LONG
            };

            var message = $scope.newRequest.btcValue ? $translate.instant('MSG_REQUEST_SMS_2', params) : $translate.instant('MSG_REQUEST_SMS_1', params);
            var message = message + "\n\n";

            // Share via native share sheet
            return $cordovaSocialSharing
                .share(message, "", null, $scope.newRequest.bitcoinUri)
                .then(function(result) {}, function(err) {
                    $log.error("LinkSharing: " + err.message);
                });
        };

        // update the URI and QR code when address or value change
        $scope.$watchGroup(['newRequest.btcValue', 'newRequest.address'], function(newValues, oldValues) {
            if (oldValues != newValues) {
                //ignore call from scope initialisation
                $scope.generateQR();
            }
        });

        // generate the first address
        $scope.newAddress();
    }
})();
