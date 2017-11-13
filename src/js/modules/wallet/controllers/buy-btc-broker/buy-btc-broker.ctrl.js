(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("BuyBTCBrokerCtrl", BuyBTCBrokerCtrl);

    function BuyBTCBrokerCtrl($scope, $state, $ionicLoading, $cordovaDialogs, glideraService,
                              $stateParams, $timeout, $interval, $translate, $filter,
                              CONFIG, trackingService, $q) {
        trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_OPEN);
        $scope.broker = $stateParams.broker;

        $scope.priceBTCCurrency = 'USD';
        $scope.fetchingInputPrice = false;
        $scope.fiatFirst = false;
        $scope.buyInput = {
            displayFee: CONFIG.DISPLAY_FEE,
            btcValue: null,
            fiatValue: null,
            currencyType: null,
            fiatCurrency: 'USD',
            amount: null,
            feeValue: null,
            feePercentage: null,
            recipientAddress: null,
            referenceMessage: "",
            pin: null,

            recipient: null,        //contact object when sending to contact
            recipientDisplay: null,  //recipient as displayed on screen
            recipientSource: null
        };

        var doneTypingInterval = 500;
        var typingTimer = null;

        var lastPriceResponse = null;

        var fetchBrokerService = function () {
            switch ($scope.broker) {
                case 'glidera':
                    trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_OPEN);
                    $scope.buyInput.currencyType = 'USD';
                    $scope.buyInput.fiatCurrency = 'USD';
                    return glideraService;
                    break;
                default:
                    return null;
                    break;
            }
        };

        var updateBrokerCurrencies = function () {
            switch ($scope.broker) {
                case 'glidera':
                    $scope.currencies = [{code: 'USD', symbol: 'USD'}];
                    return true;
                    break;
                default:
                    return false;
                    break;
            }
        };

        $scope.swapInputs = function() {
            if (!$scope.fiatFirst && $scope.settings.localCurrency !== $scope.buyInput.currencyType) {
                return $cordovaDialogs.confirm(
                    $translate.instant('MSG_BUYBTC_FIAT_USD_ONLY', {
                        currency: $scope.currencies[0].code,
                        yourCurrency: $scope.settings.localCurrency
                    }).sentenceCase(),
                    $translate.instant('MSG_BUYBTC_FIAT_USD_ONLY_TITLE').sentenceCase(),
                    [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
                )
                    .then(function(dialogResult) {
                        if (dialogResult === 2) {
                            return;
                        }

                        $scope.fiatFirst = !$scope.fiatFirst;
                    })
                    ;
            } else {
                $scope.fiatFirst = !$scope.fiatFirst;
            }
        };

        $scope.triggerUpdate = function () {
            $timeout.cancel(typingTimer);
            typingTimer = $timeout(function () {
                $scope.fetchingInputPrice = true;
                $ionicLoading.show();

                $scope.updateInputPrice()
                    .then(function() {
                        $scope.fetchingInputPrice = false;
                        $ionicLoading.hide();
                    })
                    .catch(function () {
                        $scope.fetchingInputPrice = false;
                        $ionicLoading.hide();
                    });
            }, doneTypingInterval);
        };

        var updateMainPrice = function() {
            $scope.fetchingMainPrice = true;

            if (fetchBrokerService() === null) {
                $scope.brokerNotExistent = true;
                $scope.fetchingMainPrice = false;
                return null;
            }

            return fetchBrokerService().buyPrices(1, null).then(function (result) {
                $scope.priceBTC = result.total;
                $scope.fetchingMainPrice = false;
            });
        };

        $scope.updateInputPrice = function() {
            return $q.when().then(function() {
                $scope.fetchingInputPrice = true;

                if (!$scope.fiatFirst) {
                    // reset fields that we're about to set
                    $scope.buyInput.fiatValue = null;
                    $scope.buyInput.feeValue = null;
                    $scope.altCurrency = {};

                    // when the field is blank
                    if (!$scope.buyInput.btcValue) {
                        return false;
                    }

                    // parse float
                    $scope.buyInput.btcValue = parseFloat($scope.buyInput.btcValue) || 0.0;

                    // when the field is 0
                    if ($scope.buyInput.btcValue === 0.0) {
                        return false;
                    }

                    return fetchBrokerService().buyPrices($scope.buyInput.btcValue, null).then(function (result) {
                        lastPriceResponse = result;

                        if (lastPriceResponse.error) {
                            throw new Error(lastPriceResponse.error);
                        }

                        $scope.buyInput.fiatValue = parseFloat(result.total);
                        if (result.fees) $scope.buyInput.feeValue = parseFloat(result.fees);
                        if (result.fees) $scope.buyInput.feePercentage = ($scope.buyInput.feeValue / $scope.buyInput.fiatValue) * 100;

                        $scope.altCurrency = {
                            code: $scope.buyInput.fiatCurrency,
                            amount: $scope.buyInput.fiatValue
                        };

                        $scope.fetchingInputPrice = false;
                    });
                } else {
                    $scope.buyInput.btcValue = null;
                    $scope.buyInput.feeValue = null;
                    $scope.altCurrency = {};

                    // when the field is blank
                    if (!$scope.buyInput.fiatValue) {
                        return false;
                    }

                    // parse float
                    $scope.buyInput.fiatValue = parseFloat($scope.buyInput.fiatValue) || 0.0;

                    // when the field is 0
                    if ($scope.buyInput.fiatValue === 0.0) {
                        return false;
                    }

                    return fetchBrokerService().buyPrices(null, $scope.buyInput.fiatValue).then(function (result) {
                        lastPriceResponse = result;

                        if (lastPriceResponse.error) {
                            throw new Error(lastPriceResponse.error);
                        }

                        $scope.buyInput.btcValue = parseFloat(result.qty);
                        if (result.fees) $scope.buyInput.feeValue = parseFloat(result.fees);
                        if (result.fees) $scope.buyInput.feePercentage = ($scope.buyInput.feeValue / $scope.buyInput.fiatValue) * 100;

                        $scope.altCurrency = {
                            code: 'BTC',
                            amount: $scope.buyInput.btcValue
                        };

                        $scope.fetchingInputPrice = false;
                    });
                }
            });
        };

        $scope.updateCurrentType = function(currencyType) {
            updateBrokerCurrencies();
            $scope.currencies.unshift({code: 'BTC', 'symbol': 'BTC'});
            $scope.currencies = $scope.currencies.filter(function(currency) {
                return currency.code != currencyType;
            });

            $scope.buyInput.currencyType = currencyType;
            $scope.updateInputPrice();
        };

        // set default BTC
        $scope.updateCurrentType('BTC');

        var uninit = null;
        var init = function() {
            fetchBrokerService();
            // update every minute
            var interval = $interval(function() {
                // update input price
                $scope.updateInputPrice();

                updateMainPrice().then(function() {
                    $timeout(function() {
                        $scope.initializing = false;
                    });
                });
            }, 60 * 1000);

            return function() {
                if (interval) {
                    $interval.cancel(interval);
                }
            }
        };

        $scope.$on('$ionicView.enter', function() {
            uninit = init();
        });
        $scope.$on('$ionicView.leave', function() {
            uninit();
        });

        $scope.buyBTC = function() {
            var btcValue = $scope.buyInput.btcValue;
            var fiatValue = $scope.buyInput.fiatValue;

            if(fiatValue + btcValue <= 0) {
                return $cordovaDialogs.confirm(
                    $translate.instant('MSG_BUYBTC_ZERO_AMOUNT').sentenceCase(),
                    $translate.instant('MSG_BUYBTC_CONFIRM_TITLE').sentenceCase(),
                    [$translate.instant('OK')/*, $translate.instant('CANCEL').sentenceCase()*/]
                );
            }

            $ionicLoading.show();

            switch ($scope.broker) {
                case 'glidera':
                    return glideraService.buyPricesUuid(btcValue, fiatValue)
                        .then(function (result) {
                            trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_BUY_CONFIRM);

                            return $cordovaDialogs.confirm(
                                $translate.instant('MSG_BUYBTC_CONFIRM_BODY', {
                                    qty: $filter('number')(result.qty, 6),
                                    price: $filter('number')(result.total, 2),
                                    fee: $filter('number')(result.fees, 2),
                                    currencySymbol: $filter('toCurrencySymbol')($scope.buyInput.fiatCurrency)
                                }).sentenceCase(),
                                $translate.instant('MSG_BUYBTC_CONFIRM_TITLE').sentenceCase(),
                                [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
                            )
                                .then(function (dialogResult) {
                                    if (dialogResult === 2) {
                                        $ionicLoading.hide();
                                        return;
                                    }

                                    $ionicLoading.show();

                                    return glideraService.buy(result.qty, result.priceUuid)
                                        .then(function (result) {
                                            $ionicLoading.hide();
                                            trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_BUY_DONE);

                                            $cordovaDialogs.alert(
                                                $translate.instant('MSG_BUYBTC_BOUGHT_BODY', {
                                                    qty: $filter('number')(result.qty, 6),
                                                    price: $filter('number')(result.total, 2),
                                                    fee: $filter('number')(result.fees, 2),
                                                    estimatedDate: $filter('amCalendar')(result.estimatedDeliveryDate),
                                                    currencySymbol: $filter('toCurrencySymbol')('USD')
                                                }).sentenceCase(),
                                                $translate.instant('MSG_BUYBTC_BOUGHT_TITLE').sentenceCase(),
                                                $translate.instant('OK')
                                            );
                                            $ionicLoading.hide();

                                            $state.go('app.wallet.summary');
                                        }, function (e) {
                                            trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_BUY_ERR);
                                            alert(e.details || ("Unknown error occurred (err: " + e.code + ")"));
                                            $ionicLoading.hide();
                                        });
                                });
                        })
                        .then(function () {
                            // -
                        }, function (err) {
                            $ionicLoading.hide();
                            if (err !== "CANCELLED") {
                                // TODO: Alert on mobile?
                            }
                        });
                    break;
            }
        };
    }
})();
