(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SendCtrl", SendCtrl);

    function SendCtrl($scope, trackingService, $log, Contacts, activeWallet, CurrencyConverter,
                         $timeout, $q, $btBackButtonDelegate, $state, settingsService,
                         $rootScope, $translate, $cordovaDialogs, AppRateService) {
        $scope.OPTIMAL_FEE = 'optimal';
        $scope.LOW_PRIORITY_FEE = 'low_priority';
        $scope.PRIOBOOST = 'prioboost';
        $scope.PRIOBOOST_MAX_SIZE = 1300;

        $scope.walletData = activeWallet.getReadOnlyWalletData();

        $scope.fiatFirst = false;
        $scope.prioboost = {
            discountP: null,
            credits: 1,
            possible: null,
            estSize: null,
            tooLarge: false,
            zeroConf: false
        };
        $scope.sendInput = {
            btcValue: 0.00,
            fiatValue: 0.00,
            recipientAddress: "",
            referenceMessage: "",
            pin: null,
            feeChoice: $scope.OPTIMAL_FEE,

            recipient: null,        //contact object when sending to contact
            recipientDisplay: "",  //recipient as displayed on screen
            recipientSource: null
        };
        //control status of the app (allows for child scope modification)
        $scope.appControl = {
            working: false,
            complete: false,
            showMessage: false,
            isSending: false,
            showPinInput: false,
            displayFee: false,
            result: {}
        };
        $scope.message = {
            title: "",
            title_class: "",
            body: "",
            body_class: ""
        };
        $scope.transactions = null;

        $scope.pay = {};
        $scope.useZeroConf = true;
        $scope.fees = {
            optimal: null,
            lowPriority: null,
            minRelayFee: null
        };

        $scope.getTranslations = function() {
            if ($scope.translations) {
                return $q.when($scope.translations);
            } else {
                var requiredTranslations = [
                    'OK',
                    'CANCEL',
                    'SETTINGS_PHONE_REQUIRE_VERIFY',
                    'MSG_PHONE_REQUIRE_VERIFY'
                ];
                return $translate(requiredTranslations).then(function(translations) {
                    $scope.translations = translations;
                    return $q.when(translations);
                });
            }
        };

        $scope.swapInputs = function() {
            $scope.fiatFirst = !$scope.fiatFirst;
        };

        $scope.setFiat = function() {
            //converts and sets the FIAT value from the BTC value
            $scope.sendInput.fiatValue = parseFloat(CurrencyConverter.fromBTC($scope.sendInput.btcValue, $scope.settings.localCurrency, 2)) || 0;
        };
        $scope.setBTC = function() {
            //converts and sets the BTC value from the FIAT value
            $scope.sendInput.btcValue = parseFloat(CurrencyConverter.toBTC($scope.sendInput.fiatValue, $scope.settings.localCurrency, 6)) || 0;
        };

        $scope.clearRecipient = function() {
            $scope.sendInput.recipient = null;
            $scope.sendInput.recipientDisplay = null;
            $scope.sendInput.recipientAddress = null;
            $scope.sendInput.recipientSource = null;
        };

        $scope.showMessage = function() {
            $scope.appControl.showMessage = true;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                    $scope.dismissMessage();
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.dismissMessage();
                });
            }, true);
        };

        $scope.dismissMessage = function() {
            $scope.appControl.showMessage = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };

        $scope.parseForAddress = function(input) {
            // bitcoin cash ppl care so little for standards or consensus that we actually need to do this ...
            input = input.replace(/^bitcoin cash:/, 'bitcoincash:');

            return $q.when(input).then(function(input) {
                //parse input for a bitcoin link (with value if present)
                var elm = angular.element('<a>').attr('href', input)[0];
                $log.debug(elm.protocol, elm.pathname, elm.search, elm.hostname);

                if (elm.protocol === 'bitcoin:' || elm.protocol === 'bitcoincash:') {
                    //check for bitcoin amount in qsa
                    if (elm.search) {
                        var reg = new RegExp(/amount=([0-9]*\.?[0-9]*)/);
                        var amount = elm.search.match(reg);
                        if (amount && amount[1]) {
                            return {address: elm.pathname, amount: amount[1]}
                        } else {
                            return {address: elm.pathname};
                        }
                    } else {
                        return {address: elm.pathname};
                    }
                } else {
                    //no bitcoin protocol, check all text for possible address
                    var regex = new RegExp(/([\s|\W]+|^)([123mn][a-km-zA-HJ-NP-Z0-9]{25,34})([\s|\W]+|$)/);
                    var matches = input.match(regex);
                    if (matches != null) {
                        $log.debug(matches);
                        return {address: matches[2]};
                    } else {
                        return {address: null};
                    }
                }
            });
        };

        $scope.selectContact = function() {
            //check if phone has been verified yet
            if (!settingsService.phoneVerified) {
                $scope.getTranslations()
                    .then(function() {
                        return $cordovaDialogs.alert($scope.translations['MSG_PHONE_REQUIRE_VERIFY'].sentenceCase(), $scope.translations['SETTINGS_PHONE_REQUIRE_VERIFY'].sentenceCase(), $scope.translations['OK']);
                    })
                    .then(function() {
                        $state.go('app.wallet.settings.phone', {goBackTo: 'app.wallet.send.contacts'});
                    });
                return false;
            } else if(!settingsService.enableContacts) {
                $cordovaDialogs.alert(
                    $translate.instant('MSG_REQUIRE_CONTACTS_ACCESS').sentenceCase(),
                    $translate.instant('CONTACTS_DISABLED').sentenceCase(),
                    $translate.instant('OK')
                );
            } else {
                $state.go('app.wallet.send.contacts');
            }
        };

        var _maxSpendable = null;
        var _maxSpendablePromise = null;
        var maxSpendable = function() {
            if (_maxSpendable !== null) {
                return $q.when(_maxSpendable);
            } else if (_maxSpendablePromise !== null) {
                return _maxSpendablePromise;
            } else {
                _maxSpendablePromise = $q.all([
                        activeWallet.getSdkWallet().maxSpendable($scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL),
                        activeWallet.getSdkWallet().maxSpendable($scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY),
                        activeWallet.getSdkWallet().maxSpendable($scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE)
                ]).then(function (results) {
                    // set the local stored value
                    _maxSpendable = {};
                    _maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL] = results[0];
                    _maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY] = results[1];
                    _maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE] = results[2];

                    _maxSpendablePromise = null; // unset promise, it's done
                    return _maxSpendable;
                });

                return _maxSpendablePromise;
            }
        };

        maxSpendable().then(function(maxSpendable) {
            var _maxSpendable = maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE];

            $scope.prioboost.credits = _maxSpendable.prioboost_remaining;
            $scope.prioboost.discountP = (1 - (_maxSpendable.fees.min_relay_fee / _maxSpendable.fees.optimal)) * 100;
        });

        $scope.fetchFee = function() {
            // reset state
            $scope.fees.lowPriority = null;
            $scope.fees.optimal = null;
            $scope.fees.minRelayFee = null;
            $scope.displayFee = false;
            $scope.prioboost.possible = null;
            $scope.prioboost.estSize = null;
            $scope.prioboost.zeroConf = null;

            return $q.when(activeWallet.getSdkWallet()).then(function(sdkWallet) {
                var localPay = {};
                var amount = 0;

                // parse input
                if ($scope.walletData.balance < CurrencyConverter.toSatoshi($scope.sendInput.btcValue, "BTC")) {
                    amount = parseInt($scope.walletData.balance, "BTC");
                } else {
                    amount = parseInt(CurrencyConverter.toSatoshi($scope.sendInput.btcValue, "BTC"));
                }

                // halt if input is 0
                if (amount <= 0) {
                    return;
                }

                // either use the real destination address or otherwise use a fake address
                if ($scope.sendInput.recipientAddress) {
                    localPay[$scope.sendInput.recipientAddress] = amount;
                } else {
                    var fakeP2SHScript = bitcoinjs.script.scriptHash.output.encode(new blocktrailSDK.Buffer("0000000000000000000000000000000000000000", 'hex'));
                    var fakeAddress = bitcoinjs.address.fromOutputScript(fakeP2SHScript, sdkWallet.network);
                    localPay[fakeAddress.toString()] = amount;
                }

                return $q.all([
                    sdkWallet.coinSelection(localPay, false, $scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY)
                        .spread(function (utxos, fee, change, res) {
                            $log.debug('lowPriority fee: ' + fee);

                            return fee;
                        })
                        .catch(function(e) {
                            // when we get a fee error we use maxspendable fee
                            if (e instanceof blocktrail.WalletFeeError) {
                                return maxSpendable().then(function(maxSpendable) {
                                    var fee = maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY].fee;
                                    $log.debug('lowPriority fee MAXSPENDABLE: ' + fee);
                                    return fee;
                                })
                            } else {
                                throw e;
                            }
                        }),
                    sdkWallet.coinSelection(localPay, false, $scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL)
                        .spread(function (utxos, fee, change, res) {
                            $log.debug('optimal fee: ' + fee);

                            return fee;
                        })
                        .catch(function(e) {
                            // when we get a fee error we use maxspendable fee
                            if (e instanceof blocktrail.WalletFeeError) {
                                return maxSpendable().then(function(maxSpendable) {
                                    var fee = maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL].fee;
                                    $log.debug('optiomal fee MAXSPENDABLE: ' + fee);
                                    return fee;
                                })
                            } else {
                                throw e;
                            }
                        }),
                    sdkWallet.coinSelection(localPay, false, $scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE)
                        .spread(function (utxos, fee, change, res) {
                            $log.debug('minRelayFee fee: ' + fee);

                            $scope.prioboost.estSize = res.size;
                            $scope.prioboost.credits = res.prioboost_remaining;
                            $scope.prioboost.zeroConf = res.zeroconf;
                            $scope.prioboost.tooLarge = $scope.prioboost.estSize > $scope.PRIOBOOST_MAX_SIZE;
                            $scope.prioboost.possible = !$scope.prioboost.zeroConf && !$scope.prioboost.tooLarge && $scope.prioboost.credits > 0;

                            return fee;
                        })
                        .catch(function(e) {
                            // when we get a fee error we use maxspendable fee
                            if (e instanceof blocktrail.WalletFeeError) {
                                return maxSpendable().then(function(maxSpendable) {
                                    var fee = maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE].fee;
                                    $log.debug('minRelayFee fee MAXSPENDABLE: ' + fee);
                                    return fee;
                                })
                            } else {
                                throw e;
                            }
                        })
                ])
                    .then(function (res) {
                        var lowPriorityFee = res[0];
                        var optimalFee = res[1];
                        var minRelayFee = res[2];

                        $scope.fees.lowPriority = lowPriorityFee;
                        $scope.fees.optimal = optimalFee;
                        $scope.fees.minRelayFee = minRelayFee;
                        $scope.displayFee = true;

                        return $scope.updateFee();
                    }, function (e) {
                        $log.debug("fetchFee ERR " + e);
                    });
            });
        };

        $scope.$watch('sendInput.feeChoice', function() {
            $scope.updateFee();
        });

        $scope.updateFee = function() {
            if ($scope.sendInput.feeChoice === $scope.OPTIMAL_FEE) {
                $scope.fee = $scope.fees.optimal;
            } else if ($scope.sendInput.feeChoice === $scope.LOW_PRIORITY_FEE) {
                $scope.fee = $scope.fees.lowPriority;
            } else if ($scope.sendInput.feeChoice === $scope.PRIOBOOST) {
                $scope.fee = $scope.fees.minRelayFee;
            } else {
                throw new Error("Invalid");
            }

            $scope.appControl.displayFee = true;
        };

        $scope.confirmSend = function() {
            if ($scope.appControl.working) {
                return false;
            }
            $scope.appControl.result = {};
            $scope.appControl.prepareSending = true;
            $scope.appControl.isSending = false;
            $scope.appControl.pinInputError = false;
            $scope.appControl.showPinInputError = false;

            //validate input
            return $scope.fetchFee().then(function() {
                $scope.appControl.prepareSending = false;

                if ($scope.sendInput.feeChoice === $scope.PRIOBOOST && $scope.prioboost.possible === false) {
                    var e = new blocktrail.Error($scope.prioboost.credits <= 0 ? "PRIOBOOST_NO_CREDITS" : ($scope.prioboost.tooLarge ? "PRIOBOOST_TOO_LARGE" : "PRIOBOOST_ZERO_CONF"));
                    e.title = "PRIOBOOST_NOT_POSSIBLE_ERR_TITLE";
                    throw e;
                }

                //input amount
                if (!$scope.sendInput.btcValue) {
                    throw blocktrail.Error('MSG_MISSING_AMOUNT');
                }
                //insufficient funds
                if (parseInt(CurrencyConverter.toSatoshi($scope.sendInput.btcValue, "BTC")) >= ($scope.walletData.balance + $scope.walletData.uncBalance)) {
                    // TODO: Does it need rootscope?
                    $rootScope.hadErrDuringSend = true;
                    throw blocktrail.Error('MSG_INSUFFICIENT_FUNDS');
                }
                //no send address
                if (!$scope.sendInput.recipientDisplay) {
                    throw blocktrail.Error('MSG_MISSING_RECIPIENT');
                }

                return $scope.getSendingAddress();
            }).then(function() {
                //validate address
                return activeWallet.validateAddress($scope.sendInput.recipientAddress);
            }).then(function() {
                $scope.pay = {};
                $scope.pay[$scope.sendInput.recipientAddress] = parseInt(CurrencyConverter.toSatoshi($scope.sendInput.btcValue, "BTC"));
            }).then(function() {
                //show the pin input screen for confirmation
                $scope.appControl.showPinInput = true;
                $scope.appControl.pinInputError = false;
                $scope.appControl.showPinInputError = false;
                $scope.appControl.complete = false;
                return $state.go('app.wallet.send.confirm');
            }).catch(function(err) {
                $scope.appControl.prepareSending = false;
                $rootScope.hadErrDuringSend = true;
                $log.error(err);
                if (err instanceof blocktrail.InvalidAddressError) {
                    $scope.message = {title: err.title || 'ERROR_TITLE_2', title_class: 'text-bad', body: 'MSG_BAD_ADDRESS'};
                } else {
                    $scope.message = {title: err.title || 'ERROR_TITLE_2', title_class: 'text-bad', body: err.message};
                }

                $scope.showMessage();
                return false;
            });
        };

        $scope.getSendingAddress = function() {
            var deferred = $q.defer();
            if ($scope.sendInput.recipient && !$scope.sendInput.recipientAddress) {
                Contacts.getSendingAddress($scope.sendInput.recipient).then(function(result){
                    $scope.sendInput.recipientAddress = result.address;
                    deferred.resolve();
                }, function(err) {
                    deferred.reject(new blocktrail.ContactAddressError(err));
                })
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        };

        $scope.send = function() {
            if ($scope.appControl.working) {
                return false;
            }
            $scope.appControl.result = {working: true, message: 'MSG_GET_CONTACT_ADDR'};
            $scope.appControl.working = true;

            $scope.appControl.pinInputError = false;
            $scope.appControl.showPinInputError = false;

            //disable back button and menu button
            $timeout(function() {
                $btBackButtonDelegate.toggleMenuButton(false);
                $btBackButtonDelegate.toggleBackButton(false);
            });

            // ceil value to make it a bit more anonymous
            var trackingBtcValue = blocktrailSDK.toBTC(Math.ceil($scope.sendInput.btcValue / 1000000) * 1000000);

            //get an address for the contact
            $scope.getSendingAddress()
                .then(function() {
                    $scope.appControl.result = {working: true, message: 'MSG_INIT_WALLET'};
                    return $q.when(activeWallet.unlockWithPin($scope.sendInput.pin));
                })
                .then(function(wallet) {
                    $log.info("wallet: unlocked");
                    $scope.sendInput.pin = null;
                    $scope.appControl.showPinInput = false;
                    $scope.appControl.isSending = true;
                    $scope.appControl.result = {message: 'MSG_SENDING'};

                    trackingService.trackEvent(trackingService.EVENTS.PRE_PAY, {
                        value: trackingBtcValue,
                        label: trackingBtcValue + " BTC " + ($scope.sendInput.recipientSource || 'NaN')
                    });

                    //attempt to make the payment
                    $log.info("wallet: paying", $scope.pay);

                    var feeStrategy = $scope.sendInput.feeChoice === 'prioboost' ? blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE : $scope.sendInput.feeChoice;
                    // wallet is returned by promise chain
                    return $q.when(wallet.pay($scope.pay, null, $scope.useZeroConf, true, feeStrategy, null, {prioboost: $scope.sendInput.feeChoice === $scope.PRIOBOOST})).then(function(txHash) {
                        wallet.lock();
                        return $q.when(txHash);
                    }, function(err) {
                        wallet.lock();
                        return $q.reject(err);
                    });
                })
                .then(function(txHash) {
                    trackingService.trackEvent(trackingService.EVENTS.PAY, {
                        value: trackingBtcValue,
                        label: trackingBtcValue + " BTC " + ($scope.sendInput.recipientSource || 'NaN')
                    });

                    $log.info("wallet: paid", txHash);
                    $scope.appControl.complete = true;
                    $scope.appControl.working = false;
                    $scope.appControl.result = {message: 'SUCCESS', txHash: txHash};
                    //re-enable back button and menu, with alternative back function (just fires once)
                    $btBackButtonDelegate.setBackButton(function() {
                        $state.go('app.wallet.summary');
                    }, true);
                    $btBackButtonDelegate.setHardwareBackButton(function() {
                        $state.go('app.wallet.summary');
                    }, true);
                    $timeout(function() {
                        $btBackButtonDelegate.toggleMenuButton(true);
                        $btBackButtonDelegate.toggleBackButton(true);
                    });

                    activeWallet.forcePolling();
                    AppRateService.sendCompleted();
                })
                .catch(function(err) {
                    $log.error(err);
                    $rootScope.hadErrDuringSend = true;
                    $scope.appControl.working = false;
                    if (err instanceof blocktrail.ContactAddressError) {
                        //Error getting sending address
                        $scope.appControl.result = {message: 'ERROR_TITLE_1', error: 'MSG_BAD_CONTACT'};
                    } else if (err instanceof blocktrail.WalletPinError || err instanceof blocktrail.WalletChecksumError || err instanceof blocktrail.WalletDecryptError) {
                        //PIN or password error
                        var errorDetails = err instanceof blocktrail.WalletPinError ? 'MSG_BAD_PIN' : 'MSG_BAD_PWD';
                        $scope.appControl.result = {message: 'ERROR_TITLE_2', error: errorDetails, pinInputError: true};
                        $scope.appControl.showPinInputError = true;
                        $scope.appControl.showPinInput = true;
                        $timeout(function () {
                            $scope.sendInput.pin = null;
                        }, 650);
                    } else if (err instanceof blocktrail.WalletFeeError) {
                        var m = err.message.match('\\[([0-9]+)\\]$');

                        if (!m) {
                            //other error
                            $scope.appControl.showPinInputError = true;
                            $scope.appControl.result = {message: 'FAIL', error: 'MSG_SEND_FAIL_UNKNOWN', detailed: ("" + err).replace(/^Error: /, '')};
                        } else {
                            var requiredFee = parseInt(m[1], 10);

                            //other error
                            $scope.appControl.showPinInputError = true;
                            $scope.appControl.result = {
                                message: 'FAIL',
                                error: 'MSG_SEND_FAIL_FEE',
                                detailed: $translate.instant('MSG_SEND_FAIL_FEE_DETAILED', {fee: blocktrailSDK.toBTC(requiredFee)})
                            };
                        }
                    } else {
                        //other error
                        $scope.appControl.showPinInputError = true;
                        $scope.appControl.result = {message: 'FAIL', error: 'MSG_SEND_FAIL_UNKNOWN', detailed: ("" + err).replace(/^Error: /, '')};
                    }

                    //enable menu button
                    $timeout(function() {
                        $btBackButtonDelegate.toggleMenuButton(true);
                        $btBackButtonDelegate.toggleBackButton(true);
                    });
                });
        };

        $scope.checkBitcoinUri = function() {
            if ($rootScope.bitcoinuri) {
                //if the app is launched via uri, check for address and amount to send to
                $scope.parseForAddress($rootScope.bitcoinuri)
                    .then(function(result) {
                        $scope.sendInput.recipientDisplay = "test";
                        $log.debug('found address in uri: ' + result.address);
                        $q.when(activeWallet.validateAddress(result.address)).then(function() {
                            $scope.sendInput.recipientDisplay = result.address;
                            $scope.sendInput.recipientAddress = result.address;
                            $scope.sendInput.recipientSource = 'BitcoinURI';
                            if (result.amount) {
                                $scope.sendInput.btcValue = parseFloat(result.amount);
                            }
                        });
                    }).catch(function(err) {
                    //not a valid bitcoin link
                    console.error(err);
                });
                $rootScope.bitcoinuri = null;
            }
        };

        $scope.$on('appResume', function() {
            $scope.checkBitcoinUri();
        });

        $scope.$on('$ionicView.enter', function() {
            $scope.checkBitcoinUri();
        });
    }
})();
