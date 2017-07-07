angular.module('blocktrail.wallet').factory(
    'bitonicService',
    function(CONFIG, $log, $q, Wallet, $cordovaDialogs, $state, $rootScope, $translate, $http,
             $timeout, $interval, settingsService, launchService, sdkService, trackingService, CurrencyConverter) {

        var encodeOpenURI = function(uri) {
            return uri.replace('#', '%23');
        };
        
        var buyPrices = function(qty, fiat) {

            return new Promise(function(resolve, reject) {
                $http({
                    method: 'GET',
                    url: CONFIG.BITONIC_URL + '/api/buy',
                    params: {
                        btc: qty,
                        eur: fiat
                    }
                })
                    .then(function success(response, status, headers) {
                            var data = response.data;
                            data.qty = data.btc;
                            data.total = data.eur;
                            delete data.btc;
                            delete data.eur;
                            $log.log('buyPrices ' + JSON.stringify(response));
                            resolve(data);
                        }, function error(response, status, headers) {
                            $log.error('buyPrices - fetch price estimate failed ', response, status, headers);
                            reject(response);
                        }
                    );
            });
        };

        var buy = function(qty, fiat) {

            return Wallet.wallet.then(function (wallet) {
                $q.when(Wallet.getNewAddress()).then(function (address) {

                    var params = {
                        address: address
                    };

                    if (qty != null) {
                        params.btc = qty;
                    }
                    if (fiat != null) {
                        params.euros = fiat;
                    }

                    return sdkService.sdk().then(function (sdk) {

                        sdk.getSignedBitonicUrl(wallet.identifier, params).then(function (result) {

                            return $cordovaDialogs.confirm(
                                $translate.instant('MSG_BUYBTC_FORWARD_TO_BROKER', {
                                    broker: "Bitonic"
                                }).sentenceCase(),
                                $translate.instant('MSG_BUYBTC_CONFIRM_TITLE').sentenceCase(),
                                [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
                            )
                                .then(function(dialogResult) {
                                    if (dialogResult == 2) {
                                        return;
                                    }

                                    trackingService.trackEvent(trackingService.EVENTS.BUYBTC.BITONIC_GOTO_BITONIC);
                                    window.open(encodeOpenURI(result.url), '_system');

                                    $timeout(function () {
                                        $state.go('app.wallet.summary');
                                    }, 1000);
                            });
                        });
                    });
                });
            });
        };

        return {
            buyPrices: buyPrices,
            buy: buy
        };
    }
);
