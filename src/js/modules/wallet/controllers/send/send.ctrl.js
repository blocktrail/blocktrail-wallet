(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SendCtrl", SendCtrl);

    function SendCtrl($scope, trackingService, $log, Contacts, walletsManagerService, Currencies, CurrencyConverter,
                         $timeout, $q, $btBackButtonDelegate, $state, settingsService, localSettingsService,
                         $rootScope, $translate, $cordovaDialogs, AppRateService, activeWallet, $stateParams,
                         launchService, modalService, CONFIG) {

        var sdkWallet = walletsManagerService.getActiveSdkWallet();
        var walletData = activeWallet.getReadOnlyWalletData();

        $scope.OPTIMAL_FEE = 'optimal';
        $scope.LOW_PRIORITY_FEE = 'low_priority';
        $scope.PRIOBOOST = 'prioboost';
        $scope.PRIOBOOST_MAX_SIZE = 1300;

        $scope.settingsData = settingsService.getReadOnlySettingsData();
        $scope.localSettingsData = localSettingsService.getReadOnlyLocalSettingsData();

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
            pin: CONFIG.DEBUG_PIN_PREFILL || null,
            password: CONFIG.DEBUG_PASSWORD_PREFILL || null,
            feeChoice: $scope.OPTIMAL_FEE,

            recipient: null,        //contact object when sending to contact
            recipientDisplay: "",  //recipient as displayed on screen
            recipientSource: null,

            inputDisabled: false
        };

        //control status of the app (allows for child scope modification)
        $scope.appControl = {
            working: false,
            complete: false,
            showMessage: false,
            isSending: false,
            showUnlockInput: false,
            unlockType: 'PIN',
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

        $scope.fee = null;
        $scope.fees = {
            optimal: null,
            lowPriority: null,
            minRelayFee: null
        };

        $scope.PRIOBOOST_ENABLED = false;
        launchService.getWalletConfig()
            .then(function(result) {
                // merge network specific config over the default config
                result = angular.extend({}, result, result.networks[$scope.walletData.networkType]);

                $scope.PRIOBOOST_ENABLED = CONFIG.NETWORKS[$scope.walletData.networkType].PRIOBOOST && result.prioboost;
            });

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
            $scope.sendInput.fiatValue = parseFloat(CurrencyConverter.fromBTC($scope.sendInput.btcValue, $scope.settingsData.localCurrency, 2)) || 0;
        };

        $scope.setBTC = function() {
            //converts and sets the BTC value from the FIAT value
            $scope.sendInput.btcValue = parseFloat(CurrencyConverter.toBTC($scope.sendInput.fiatValue, $scope.settingsData.localCurrency, 6)) || 0;
        };

        $scope.clearZeroBTCAmountOnFocus = function() {
            if ($scope.sendInput.btcValue == 0) {
                $scope.sendInput.btcValue = null;
            }
        };

        $scope.clearZeroFiatAmountOnFocus = function() {
            if ($scope.sendInput.fiatValue == 0) {
                $scope.sendInput.fiatValue = null;
            }
        };

        $scope.clearRecipient = function() {
            $scope.sendInput.recipient = null;
            $scope.sendInput.recipientDisplay = null;
            $scope.sendInput.recipientAddress = null;
            $scope.sendInput.recipientSource = null;
            if ($stateParams.sendInput) {
                $stateParams.sendInput.recipientAddress = null;
                $state.go('app.wallet.send', null, { reload: true, inherit: false });
            }

            // Clear values if amount is bound to recipient
            if ($scope.sendInput.inputDisabled) {
                $scope.sendInput.btcValue = null;
                $scope.sendInput.fiatValue = null;
                $scope.sendInput.inputDisabled = false;
            }
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

        $scope.selectContact = function() {
            // check if phone has been verified yet
            if (!$scope.localSettingsData.isPhoneVerified) {
                $scope.getTranslations()
                    .then(function() {
                        return $cordovaDialogs.alert($scope.translations['MSG_PHONE_REQUIRE_VERIFY'].sentenceCase(), $scope.translations['SETTINGS_PHONE_REQUIRE_VERIFY'].sentenceCase(), $scope.translations['OK']);
                    })
                    .then(function() {
                        $state.go('app.wallet.settings.phone', {goBackTo: 'app.wallet.send.contacts'});
                    });
                return false;
            } else if(!$scope.localSettingsData.isEnableContacts) {
                $cordovaDialogs.alert(
                    $translate.instant('MSG_REQUIRE_CONTACTS_ACCESS').sentenceCase(),
                    $translate.instant('CONTACTS_DISABLED').sentenceCase(),
                    $translate.instant('OK')
                );
            } else {
                $state.go('app.wallet.send.contacts');
            }
        };

        var minSpendable = null;
        var minSpendablePromise = null;
        /**
         * Get min spendable
         * @return {*}
         */
        function getMinSpendable(payParams) {
            for (var address in payParams) {
                if (payParams.hasOwnProperty(address)) {
                    payParams[address] = blocktrailSDK.DUST + 1;
                }
            }

            if (minSpendable !== null) {
                return $q.when(minSpendable);
            } else if (minSpendablePromise !== null) {
                return minSpendablePromise;
            } else {
                minSpendablePromise = $q.all([
                    _resolveFeeByPriority(payParams, blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL),
                    _resolveFeeByPriority(payParams, blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY),
                    _resolveFeeByPriority(payParams, blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE)
                ]).then(function(results) {
                    // set the local stored value
                    minSpendable = {};
                    minSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL] = results[1];
                    minSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY] = results[2];
                    minSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE] = results[3];

                    minSpendablePromise = null; // unset promise, it's done
                    return minSpendable;
                });

                return minSpendablePromise;
            }
        }

        /**
         * Fee resolver based on pay parameters, based on priority provided
         * @param payParams - Pay parameters for coinselection
         * @param priority - Fee strategy from blocktrailSDK.Wallet
         * @returns {*}
         * @private
         */
        function _resolveFeeByPriority(payParams, priority) {
            return activeWallet
                .getSdkWallet()
                .coinSelection(payParams, false, $scope.useZeroConf, priority)
                .spread(function(utxos, fee, change, res) {
                    return fee;
                })
        }

        /**
         * Applies fee result to scope
         * @param feeResult
         * @private
         */
        function _applyFeeResult(feeResult) {
            var lowPriorityFee = feeResult[0];
            var optimalFee = feeResult[1];
            var minRelayFee = feeResult[3];

            $scope.fees.lowPriority = lowPriorityFee;
            $scope.fees.optimal = optimalFee;
            $scope.fees.minRelayFee = minRelayFee;
            $scope.appControl.displayFee = true;

            return $scope.updateFee();
        }

        var _maxSpendable = null;
        var _maxSpendablePromise = null;
        var maxSpendable = function() {
            if (_maxSpendable !== null) {
                return $q.when(_maxSpendable);
            } else if (_maxSpendablePromise !== null) {
                return _maxSpendablePromise;
            } else {
                _maxSpendablePromise = $q.all([
                    sdkWallet.maxSpendable($scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL),
                    sdkWallet.maxSpendable($scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY),
                    sdkWallet.maxSpendable($scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE)
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
            $scope.appControl.displayFee = false;
            $scope.prioboost.possible = null;
            $scope.prioboost.estSize = null;
            $scope.prioboost.zeroConf = null;

            return $q.when(sdkWallet).then(function(sdkWallet) {
                var localPay = {};
                var amount = 0;

                // parse input
                if ($scope.walletData.balance < CurrencyConverter.toSatoshi($scope.sendInput.btcValue, "BTC")) {
                    amount = parseInt($scope.walletData.balance);
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
                    _resolveFeeByPriority(localPay, blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY),
                    _resolveFeeByPriority(localPay, blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL),
                    activeWallet
                        .getSdkWallet()
                        .coinSelection(localPay, false, $scope.useZeroConf, blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE)
                        .spread(function(utxos, fee, change, res) {
                            $log.debug("minRelayFee fee: " + fee);

                            $scope.prioboost.estSize = res.size;
                            $scope.prioboost.credits = res.prioboost_remaining;
                            $scope.prioboost.zeroConf = res.zeroconf;
                            $scope.prioboost.tooLarge = $scope.prioboost.estSize > $scope.PRIOBOOST_MAX_SIZE;
                            $scope.prioboost.possible = !$scope.prioboost.zeroConf && !$scope.prioboost.tooLarge && $scope.prioboost.credits > 0;

                            return fee;
                        })
                ])
                    .catch(function(e) {
                        // when we get a fee error we use minspendable or maxspendable fee
                        if (
                            e instanceof blocktrail.WalletFeeError ||
                            e instanceof blocktrail.WalletSendError
                        ) {
                            return getMinSpendable(localPay)
                                .then(function(minSpendable) {
                                    var lowPriorityFee = minSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY];
                                    var optimalFee = minSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL];
                                    var minRelayFee = minSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE];
                                    $log.debug("minRelayFee fee MINSPENDABLE: " + minRelayFee);
                                    _applyFeeResult([lowPriorityFee, optimalFee, minRelayFee]);
                                    throw e;
                                });
                        } else if (
                            (e instanceof Error && e.message.indexOf("Wallet balance is too low") !== -1) ||
                            e.message === "Due to additional transaction fee it's not possible to send selected amount"
                        ) {
                            return maxSpendable()
                                .then(function(maxSpendable) {
                                    var lowPriorityFee = maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_LOW_PRIORITY].fee;
                                    var optimalFee = maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_OPTIMAL].fee;
                                    var minRelayFee = maxSpendable[blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE].fee;
                                    $log.debug("minRelayFee fee MAXSPENDABLE: " + minRelayFee);
                                    _applyFeeResult([lowPriorityFee, optimalFee, minRelayFee])
                                    throw e;
                                });
                        } else {
                            throw e;
                        }
                    })
                    .then(function (res) {
                        return _applyFeeResult(res);
                    }, function(e) {
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

            if ($scope.fee) {
                $scope.appControl.displayFee = true;
            }
        };

        $scope.confirmSend = function() {
            if ($scope.appControl.working) {
                return false;
            }
            $scope.appControl.result = {};
            $scope.appControl.prepareSending = true;
            $scope.appControl.isSending = false;
            $scope.appControl.showPinInputError = false;

            // validate input
            return $scope.fetchFee().then(function() {
                $scope.appControl.prepareSending = false;

                if ($scope.sendInput.feeChoice === $scope.PRIOBOOST && $scope.prioboost.possible === false) {
                    var e = new blocktrail.Error($scope.prioboost.credits <= 0 ? "PRIOBOOST_NO_CREDITS" : ($scope.prioboost.tooLarge ? "PRIOBOOST_TOO_LARGE" : "PRIOBOOST_ZERO_CONF"));
                    e.title = "PRIOBOOST_NOT_POSSIBLE_ERR_TITLE";
                    throw e;
                }

                //input amount
                if (!$scope.sendInput.btcValue || $scope.sendInput.btcValue * 1e8 <= blocktrailSDK.DUST) {
                    throw blocktrail.Error('MSG_INVALID_AMOUNT');
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
                return walletsManagerService.getActiveWallet().validateAddress($scope.sendInput.recipientAddress);
            }).then(function() {
                $scope.pay = {};
                $scope.pay[$scope.sendInput.recipientAddress] = parseInt(CurrencyConverter.toSatoshi($scope.sendInput.btcValue, "BTC"));
            }).then(function() {
                return launchService.getWalletInfo().then(function(walletInfo) {
                    // can use PIN if walletInfo (which contains PIN encrypted wallet.secret) matches the active wallet
                    //  otherwise need to use password instead
                    if (walletInfo.identifier === $scope.walletData.identifier) {
                        $scope.appControl.showUnlockInput = true;
                        $scope.appControl.unlockType = 'PIN';
                        $scope.appControl.showPinInputError = false;
                        $scope.appControl.complete = false;
                        $timeout(function() {
                            $state.go('app.wallet.send.confirm');
                        }, 100);
                    } else {
                        $scope.appControl.showUnlockInput = true;
                        $scope.appControl.unlockType = 'PASSWORD';
                        $scope.appControl.showPasswordInputError = false;
                        $scope.appControl.complete = false;
                        $timeout(function() {
                            $state.go('app.wallet.send.confirm');
                        }, 100);
                    }
                });
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
                Contacts.getSendingAddress(sdkWallet.sdk, $scope.sendInput.recipient)
                    .then(function(result){
                        $scope.sendInput.recipientAddress = result.address;
                        deferred.resolve();
                    }, function(err) {
                        deferred.reject(new blocktrail.ContactAddressError(err));
                    });
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

            $scope.appControl.showPinInputError = false;
            $scope.appControl.showPasswordInputError = false;

            //disable back button and menu button
            $timeout(function() {
                $btBackButtonDelegate.toggleMenuButton(false);
                $btBackButtonDelegate.toggleBackButton(false);
            });

            // ceil value to make it a bit more anonymous
            var trackingBtcValue = blocktrailSDK.toBTC(Math.ceil($scope.sendInput.btcValue / 1000000) * 1000000);

            // get an address for the contact
            $scope.getSendingAddress()
                .then(function() {
                    $scope.appControl.result = {working: true, message: 'MSG_INIT_WALLET'};

                    if ($scope.appControl.unlockType === 'PIN') {
                        return $q.when(walletsManagerService.getActiveWallet().unlockWithPin($scope.sendInput.pin));
                    } else {
                        var deferred = $q.defer();

                        $timeout(function() {
                            deferred.resolve(walletsManagerService.getActiveWallet().unlockWithPassword($scope.sendInput.password));
                        }, 50);

                        return deferred.promise;
                    }
                })
                .then(function(wallet) {
                    $log.info("wallet: unlocked");

                    $scope.sendInput.pin = null;
                    $scope.sendInput.password = null;
                    $scope.appControl.showUnlockInput = false;
                    $scope.appControl.isSending = true;
                    $scope.appControl.result = {message: 'MSG_SENDING'};

                    trackingService.trackEvent(trackingService.EVENTS.PRE_PAY, {
                        value: trackingBtcValue,
                        label: trackingBtcValue + " BTC " + ($scope.sendInput.recipientSource || 'NaN')
                    });

                    //attempt to make the payment
                    $log.info("wallet: paying", $scope.pay);

                    var optionMerchantData = null;
                    if ($scope.sendInput.paymentDetails) {
                        try {
                            // Converting base64 string to (Uint8)Array
                            optionMerchantData
                                = atob($scope.sendInput.paymentDetails.merchantData).split('').map(function (c) { return c.charCodeAt(0); });
                            optionMerchantData = Uint8Array.from(optionMerchantData);
                            $scope.sendInput.paymentDetails.outputs[0].script
                                = atob($scope.sendInput.paymentDetails.outputs[0].script).split('').map(function (c) { return c.charCodeAt(0); });
                        } catch(e) {
                            throw new Error($translate.instant("MSG_SEND_FAIL_UNKNOWN").sentenceCase());
                        }
                    }

                    var payOptions = {
                        prioboost: $scope.sendInput.feeChoice === 'prioboost',
                        bip70PaymentUrl: $scope.sendInput.paymentDetails ? $scope.sendInput.paymentDetails.paymentUrl : null,
                        bip70MerchantData: $scope.sendInput.paymentDetails ? optionMerchantData : null
                    };

                    var feeStrategy = $scope.sendInput.feeChoice === 'prioboost' ? blocktrailSDK.Wallet.FEE_STRATEGY_MIN_RELAY_FEE : $scope.sendInput.feeChoice;
                    // wallet is returned by promise chain
                    return $q.when(wallet.pay($scope.pay, null, $scope.useZeroConf, true, feeStrategy, null, payOptions)).then(function(txHash) {
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

                    walletsManagerService.getActiveWallet().forcePolling();
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
                        $scope.appControl.result = {message: 'ERROR_TITLE_2', error: errorDetails};
                        $scope.appControl.showPinInputError = true;
                        $scope.appControl.showPasswordInputError = true;
                        $timeout(function () {
                            $scope.sendInput.pin = null;
                            $scope.sendInput.password = null;
                        }, 650);
                    } else if (err instanceof blocktrail.WalletFeeError) {
                        var m = err.message.match('\\[([0-9]+)\\]$');

                        if (!m) {
                            //other error
                            $scope.appControl.showPinInputError = true;
                            $scope.appControl.showPasswordInputError = true;
                            $scope.appControl.result = {message: 'FAIL', error: 'MSG_SEND_FAIL_UNKNOWN', detailed: ("" + err).replace(/^Error: /, '')};
                        } else {
                            var requiredFee = parseInt(m[1], 10);

                            //other error
                            $scope.appControl.showPinInputError = true;
                            $scope.appControl.showPasswordInputError = true;
                            $scope.appControl.result = {
                                message: 'FAIL',
                                error: 'MSG_SEND_FAIL_FEE',
                                detailed: $translate.instant('MSG_SEND_FAIL_FEE_DETAILED', {fee: blocktrailSDK.toBTC(requiredFee)})
                            };
                        }
                    } else if (err instanceof blocktrail.WalletMissing2FAError) {
                        $cordovaDialogs.alert(
                            $translate.instant('INVALID_SESSION_LOGOUT_NOW'),
                            $translate.instant('INVALID_SESSION'),
                            $translate.instant('OK')
                        )
                            .finally(function () {
                                $state.go('app.reset');
                            });
                    } else {
                        //other error
                        $scope.appControl.showPinInputError = true;
                        $scope.appControl.showPasswordInputError = true;
                        $scope.appControl.result = {message: 'FAIL', error: 'MSG_SEND_FAIL_UNKNOWN', detailed: ("" + err).replace(/^Error: /, '')};
                    }

                    //enable menu button
                    $timeout(function() {
                        $btBackButtonDelegate.toggleMenuButton(true);
                        $btBackButtonDelegate.toggleBackButton(true);
                    });
                });
        };

        /**
         * Switches the wallet interface based on the network type and identifier
         * @param networkType Network type
         * @param identifier Wallet identifier
         */
        function switchWalletByNetworkTypeAndIdentifier(networkType, identifier) {
            $scope.isLoading = true;
            return walletsManagerService.setActiveWalletByNetworkTypeAndIdentifier(networkType, identifier)
                .then(function () {
                    Currencies.updatePrices(false)
                        .then(function(prices) {
                            $rootScope.bitcoinPrices = prices;
                            $state.reload();
                            $scope.isLoading = false;
                        }).catch(function () {
                            $state.reload();
                            $scope.isLoading = false;
                    });
                });
        }

        /**
         * Applies the amount and address to the input fields for sending coins
         */
        $scope.applyBitcoinURIParams = function() {
            if ($stateParams.sendInput) {
                // Open send in correct wallet network
                if ($stateParams.sendInput.network === "bitcoin" || $stateParams.sendInput.network === "bitcoincash") {
                    if ($stateParams.sendInput.network === "bitcoin" && walletData.networkType === "BCC") {
                        return switchWalletByNetworkTypeAndIdentifier('BTC', walletData.identifier);
                    } else if ($stateParams.sendInput.network === "bitcoincash" && walletData.networkType === "BTC") {
                        return switchWalletByNetworkTypeAndIdentifier('BCC', walletData.identifier);
                    }
                }

                if ($stateParams.sendInput.recipientAddress) {
                    activeWallet.validateAddress($stateParams.sendInput.recipientAddress)
                        .then(function () {
                            $scope.sendInput.inputDisabled = $stateParams.sendInput.inputDisabled;
                            $scope.sendInput = Object.assign($scope.sendInput, $stateParams.sendInput);
                            // Calculate Fee and Fiat amount
                            $scope.setFiat();
                            $scope.fetchFee();
                        })
                        .catch(function (e) {
                            console.error(e);
                            $scope.clearRecipient();
                            modalService.alert({
                                title: "ERROR_TITLE_3",
                                body: "MSG_INVALID_RECIPIENT"
                            });
                        });
                }
            }
        }

        $scope.$on('$ionicView.enter', function() {
            $scope.$apply(function () {
                $scope.applyBitcoinURIParams();
            })
        });
    }
})();
