angular.module('blocktrail.wallet')
    .controller('BuyBTCChooseCtrl', function($q, $scope, $state, $rootScope, $cordovaDialogs, settingsService, $ionicLoading,
                                             $translate, $ionicScrollDelegate, glideraService, buyBTCService, trackingService, $log) {
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
        settingsService.$isLoaded().then(function() {
            $q.all([
                buyBTCService.regions().then(function(regions) {
                    $scope.regions = regions;
                }),
                buyBTCService.usStates().then(function(usStates) {
                    $scope.usStates = usStates;
                })
            ]).then(function() {
                $scope.chooseRegion = _.defaults({}, settingsService.buyBTCRegion, {
                    code: null,
                    name: null
                });
                $scope.chooseState.gettingStarted = !$scope.chooseRegion.code;

                buyBTCService.regionBrokers($scope.chooseRegion.code).then(function(brokers) {
                    $scope.brokers = brokers;
                    $scope.chooseRegion.regionOk = $scope.brokers.length;
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

                settingsService.$isLoaded().then(function() {
                    settingsService.buyBTCRegion = _.defaults({}, $scope.chooseRegion);
                    return settingsService.$store().then(function() {
                        return settingsService.$syncSettingsUp();
                    });
                })
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
                            return settingsService.$isLoaded().then(function() {
                                // 2: Additional user verification information is required
                                if (settingsService.glideraAccessToken.userCanTransactInfo.code == 2) {
                                    trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_SETUP_UPDATE);

                                    return $cordovaDialogs.confirm(
                                        $translate.instant('MSG_BUYBTC_SETUP_MORE_GLIDERA_BODY', {
                                            message: settingsService.glideraAccessToken.userCanTransactInfo.message
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

                                } else if (settingsService.glideraAccessToken.userCanTransactInfo) {
                                    throw new Error("User can't transact because: " + settingsService.glideraAccessToken.userCanTransactInfo.message);
                                } else {
                                    throw new Error("User can't transact for unknown reason!");
                                }
                            });

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
            return settingsService.$isLoaded().then(function() {
                settingsService.glideraAccessToken = null;
                settingsService.glideraTransactions = [];
                settingsService.buyBTCRegion = null;

                return settingsService.$store().then(function() {
                    return settingsService.$syncSettingsUp();
                })
            })
                .then(function() {
                    $state.go('app.wallet.summary');
                }, function(err) {
                    alert(err);
                })
            ;
        };
    })
;

angular.module('blocktrail.wallet')
    .controller('BuyBTCChooseRegionCtrl', function($q, $scope, $log) {
        $scope.usSelected = false;

        $scope.selectUS = function() {
            $scope.usSelected = true;
        };
    })
;

angular.module('blocktrail.wallet')
    .controller('BuyBTCGlideraOauthCallbackCtrl', function($scope, $state, $rootScope, $ionicLoading, glideraService) {
        glideraService.handleOauthCallback($rootScope.glideraCallback)
            .then(function() {
                return glideraService.userCanTransact().then(function(userCanTransact) {
                    if (userCanTransact) {
                        $state.go('app.wallet.buybtc.buy', {broker: 'glidera'});
                    } else {
                        $state.go('app.wallet.buybtc.choose');
                    }
                })
            }, function(err) {
                $state.go('app.wallet.buybtc.choose');
            })
        ;
    })
;

angular.module('blocktrail.wallet')
    .controller('BuyBTCBrokerCtrl', function($scope, $state, $rootScope, $ionicLoading, $cordovaDialogs, glideraService, buyBTCService,
                                          bitonicService, $stateParams, $log, $timeout, $interval, $translate, $filter, CONFIG, trackingService) {
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
                case 'bitonic':
                    trackingService.trackEvent(trackingService.EVENTS.BUYBTC.BITONIC_OPEN);
                    $scope.buyInput.currencyType = 'EUR';
                    $scope.buyInput.fiatCurrency = 'EUR';
                    return bitonicService;
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
                case 'bitonic':
                    $scope.currencies = [{code: 'EUR', symbol: 'EUR'}];
                    return true;
                    break;
                default:
                    return false;
                    break;
            }
        };

        var evaluateResponseErrors = function(result) {
            // These are Bitonic-specific - 'success' key in result object
            if ("success" in result) {
                if (!result.success && result.error.indexOf('Invalid value') !== -1) {

                    console.log(result.error);

                    return $cordovaDialogs.confirm(
                        $translate.instant('MSG_BUYBTC_ERROR_INVALID_AMOUNT'),
                        $translate.instant('MSG_INVALID_AMOUNT'),
                        [$translate.instant('OK')]);
                }

                if (!result.success) {
                    return $cordovaDialogs.confirm(
                        $translate.instant('MSG_BUYBTC_ERROR_TRY_AGAIN_LATER'),
                        $translate.instant('ERROR_TITLE_3'),
                        [$translate.instant('OK')]);
                }
            }
        };

        $scope.swapInputs = function() {
            if (!$scope.fiatFirst && $scope.settings.localCurrency != $scope.buyInput.currencyType) {
                return $cordovaDialogs.confirm(
                    $translate.instant('MSG_BUYBTC_FIAT_USD_ONLY', {
                        currency: $scope.currencies[0].code,
                        yourCurrency: $scope.settings.localCurrency
                    }).sentenceCase(),
                    $translate.instant('MSG_BUYBTC_FIAT_USD_ONLY_TITLE').sentenceCase(),
                    [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
                )
                    .then(function(dialogResult) {
                        if (dialogResult == 2) {
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
            clearTimeout(typingTimer);
            typingTimer = setTimeout(function () {
                $scope.fetchingInputPrice = true;
                $ionicLoading.show();

                $scope.updateInputPrice().then(
                    function () {
                        $scope.fetchingInputPrice = false;
                        $ionicLoading.hide();
                    }).catch(function () {
                        $scope.fetchingInputPrice = false;
                        $ionicLoading.hide();
                });
            }, doneTypingInterval);
        };

        var updateMainPrice = function() {
            $scope.fetchingMainPrice = true;

            if (fetchBrokerService() == null) {
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

                $scope.fetchingInputPrice = true;

                if (!$scope.fiatFirst) {

                    $scope.buyInput.btcValue = parseFloat($scope.buyInput.btcValue);
                    $scope.buyInput.fiatValue = null;
                    $scope.buyInput.feeValue = null;
                    $scope.altCurrency = {};

                    if (!$scope.buyInput.btcValue) {
                        return new Promise(function (resolve, reject) {
                            resolve();
                        });
                    }

                    return fetchBrokerService().buyPrices($scope.buyInput.btcValue, null).then(function(result) {
                            lastPriceResponse = result;

                            if(lastPriceResponse.error) {
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

                    $scope.buyInput.fiatValue = parseFloat($scope.buyInput.fiatValue);
                    $scope.buyInput.btcValue = null;
                    $scope.buyInput.feeValue = null;
                    $scope.altCurrency = {};

                    if (!$scope.buyInput.fiatValue) {
                        return new Promise(function (resolve, reject) {
                            resolve();
                        });
                    }

                    return fetchBrokerService().buyPrices(null, $scope.buyInput.fiatValue).then(function(result) {
                            lastPriceResponse = result;

                            if(lastPriceResponse.error) {
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
                }// else
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

            if (lastPriceResponse.error) {
                return evaluateResponseErrors(lastPriceResponse);
            }

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
                                    if (dialogResult == 2) {
                                        $ionicLoading.hide();
                                        return;
                                    }
                                    $ionicLoading.show();

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
                        })
                        .then(function () {
                            // -
                        }, function (err) {
                            $ionicLoading.hide();
                            if (err != "CANCELLED") {
                                // TODO: Alert on mobile?
                            }
                        });
                    break;

                case 'bitonic':
                    return bitonicService.buyPrices(btcValue, fiatValue).then(function (result) {
                        return $cordovaDialogs.confirm(
                            $translate.instant('MSG_BUYBTC_CONFIRM_BODY', {
                                qty: $filter('number')(result.qty, 6),
                                price: $filter('number')(result.total, 2),
                                fee: $filter('number')(result.fees, 2),
                                currencySymbol: $filter('toCurrencySymbol')('EUR')
                            }).sentenceCase(),
                            $translate.instant('MSG_BUYBTC_CONFIRM_TITLE').sentenceCase(),
                            [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()]
                        ).then(function (dialogResult) {
                            if (dialogResult == 2) {
                                $ionicLoading.hide();
                                return;
                            }

                            $ionicLoading.hide();

                            if ($scope.fiatFirst) {
                                console.log('fiat first');
                                bitonicService.buy(null, result.total);
                            } else {
                                bitonicService.buy(result.qty, null);
                            }
                            trackingService.trackEvent(trackingService.EVENTS.BUYBTC.BITONIC_BUY_CONFIRM);
                        })
                    });
                    break;
            }// switch
        };
    })
;
