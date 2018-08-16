(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SendAddressInputCtrl", SendAddressInputCtrl);

    function SendAddressInputCtrl($scope, $state, $log, $timeout, $cordovaClipboard, CONFIG, $q, walletsManagerService) {
        var walletData = walletsManagerService.getActiveWalletReadOnlyData();

        $scope.networkLong = CONFIG.NETWORKS[walletData.networkType].NETWORK_LONG;
        $scope.addressInput = null;
        $scope.addressAmount = null;

        $scope.message = {
            title: "",
            title_class: "",
            body: "",
            body_class: ""
        };

        $scope.confirmInput = function(address) {
            $scope.message = {title: '', body: ''};
            $scope.addressInput = address;
            return $q.when().then(
                function() {
                    return walletsManagerService.getActiveWallet().validateAddress($scope.addressInput);
                })
                .then(function(result) {
                    //address is valid, assign to parent scope
                    $scope.sendInput.recipientDisplay = $scope.addressInput;
                    $scope.sendInput.recipientAddress = $scope.addressInput;
                    $scope.sendInput.recipientSource = 'AddressInput';
                    if ($scope.addressAmount && !$scope.sendInput.btcValue) {
                        //set the amount if not already set
                        $scope.sendInput.btcValue = parseFloat($scope.addressAmount);
                    }

                    $timeout(function() {
                        $state.go('^');
                    }, 300);
                })
                .catch(function(err) {
                    console.error(err);
                    $scope.message = {title: 'ERROR_TITLE_1', title_class: 'text-bad', body: 'MSG_BAD_ADDRESS_2'};
                });
        };

        $scope.fromClipboard = function(silentErrors) {
            if(!window.cordova) {
                return $q.reject('No cordova plugin');
            }
            return $q.when($cordovaClipboard.paste())
                .then(function(result) {
                    return walletsManagerService.getActiveWallet().validateAddress(result).then(function() {
                        $scope.addressInput = result;

                        return result;
                    });
                })
                .catch(function(err) {
                    $log.error(err);
                    if (!silentErrors) {
                        $scope.message = {title: 'ERROR_TITLE_2', body: 'MSG_BAD_CLIPBOARD'};
                    }
                    return $q.reject(err);
                });
        };


        $scope.$on('appResume', function() {
            $timeout(function() {
                $scope.fromClipboard(true).then(function(result) {
                    $scope.message = {title: 'SEND_ADDRESS_FOUND', body: 'MSG_CLIPBOARD_ADDRESS'};
                });
            }, 600);
        });

        $timeout(function() {
            $scope.fromClipboard(true).then(function(result) {
                $scope.message = {title: 'SEND_ADDRESS_FOUND', body: 'MSG_CLIPBOARD_ADDRESS'};
            });
        }, 600);

    }
})();
