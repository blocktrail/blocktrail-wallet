angular.module('blocktrail.wallet').factory(
    'glideraService',
    function(CONFIG, $log, $q, walletsManagerService, $cordovaDialogs, $translate,
             $http, $timeout, $ionicLoading, settingsService, launchService, $rootScope, trackingService) {
        var clientId;
        var returnuri = "btccomwallet://glideraCallback/oauth2";
        var GLIDERA_URL = CONFIG.GLIDERA_URL;
        var GLIDERA_HOST = GLIDERA_URL.replace(/https?:\/\//, '');

        var GLIDERA_ERRORS = {
            INVALID_ACCESS_TOKEN: 2001,
            ACCESS_TOKEN_REVOKED: 2002
        };

        var encodeOpenURI = function(uri) {
            return uri.replace('#', '%23');
        };

        var decryptedAccessToken = null;

        var setDecryptedAccessToken = function(accessToken) {
            decryptedAccessToken = accessToken;

            $timeout(function() {
                decryptedAccessToken = null;
            }, 30 * 60 * 1000); // 30min
        };

        var createRequest = function(options, accessToken, twoFactor) {
            options = options || {};
            var headers = {};
            if (accessToken) {
                headers['Authorization'] = 'Bearer ' + accessToken;
            }
            if (twoFactor) {
                headers['X-2FA-CODE'] = twoFactor;
            }

            options = _.defaults({}, (options || {}), {
                https: true,
                host: GLIDERA_HOST,
                endpoint: '/api/v1',
                params: {
                    platform: 'web'
                },
                headers: _.defaults({}, (options.headers || {}), headers),
                contentMd5: false
            });

            return new blocktrailSDK.Request(options);
        };

        var oauth2 = function() {
            var uuid = Math.ceil((new Date).getTime() / 1000);
            var scope = ['transact', 'transaction_history'].join(' ');
            var qs = [
                'response_type=code',
                'client_id=' + clientId,
                'state=' + uuid,
                'scope=' + scope,
                'required_scope=' + scope,
                'login_hint=' + (settingsService.email || "").replace(/\+.*@/, "@"), // name+label@mail.com isn't supported by glidera
                'redirect_uri=' + returnuri
            ];

            var glideraUrl = GLIDERA_URL + "/oauth2/auth?" + qs.join("&");

            $log.debug('oauth2', glideraUrl);

            window.open(encodeOpenURI(glideraUrl), '_system');
        };

        var setup = function() {
            return accessToken().then(function(accessToken) {
                var qs = [
                    'redirect_uri=' + returnuri,
                    'access_token=' + accessToken
                ];

                var glideraUrl = GLIDERA_URL + "/user/setup?" + qs.join("&");

                $log.debug('setup', glideraUrl);

                window.open(encodeOpenURI(glideraUrl), '_system');
            });
        };

        var handleOauthCallback = function(glideraCallback) {
            if (!glideraCallback) {
                return $q.reject(new Error("no glideraCallback"));
            }

            return $q.when(glideraCallback)
                .then(function(glideraCallback) {
                    var qs = parseQuery(glideraCallback);

                    $log.debug('qs? ', JSON.stringify(qs, null, 4));

                    if (!qs.code) {
                        throw new Error(qs.error_message.replace("+", " "));
                    }

                    var activeWallet = walletsManagerService.getActiveWallet();
                    var sdk = activeWallet.getSdkWallet().sdk;

                    return sdk.glideraOauth(qs.code, returnuri)
                        .then(function(result) {
                            $log.debug('oauthtoken', JSON.stringify(result, null, 4));
                            trackingService.trackEvent(trackingService.EVENTS.BUYBTC.GLIDERA_SETUP_DONE);

                            var accessToken = result.access_token;
                            var glideraAccessToken = {
                                scope: result.scope
                            };

                            return settingsService.$isLoaded().then(function() {
                                return $cordovaDialogs.prompt(
                                    $translate.instant('MSG_BUYBTC_PIN_TO_ENCRYPT').sentenceCase(),
                                    $translate.instant('MSG_ENTER_PIN').sentenceCase(),
                                    [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()],
                                    "",
                                    true,   //isPassword
                                    "tel"   //input type (uses html5 style)
                                );
                            })
                                .then(function(dialogResult) {
                                    if (dialogResult.buttonIndex == 2) {
                                        return $q.reject('CANCELLED');
                                    }
                                    //decrypt password with the provided PIN
                                    $ionicLoading.show({
                                        template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>",
                                        hideOnStateChange: true
                                    });

                                    return activeWallet.unlock(dialogResult.input1).then(function(wallet) {
                                        var secretBuf = wallet.secret;
                                        if (wallet.walletVersion === 'v2') {
                                            secretBuf = new blocktrailSDK.Buffer(secretBuf, 'hex');
                                        }
                                        var accessTokenBuf = new blocktrailSDK.Buffer(accessToken, 'utf8');
                                        glideraAccessToken.encryptedAccessToken = blocktrailSDK.Encryption.encrypt(
                                            accessTokenBuf, secretBuf, blocktrailSDK.KeyDerivation.subkeyIterations
                                        ).toString('base64');
                                    })
                                })
                                .then(function() {
                                    setDecryptedAccessToken(accessToken);
                                    settingsService.glideraAccessToken = glideraAccessToken;

                                    return settingsService.$store().then(function() {
                                        $log.debug('SAVED');
                                        return settingsService.$syncSettingsUp();
                                    })
                                        .then(function() {
                                            updateAllTransactions();
                                        })
                                    ;
                                })
                                .then(function() {
                                    $ionicLoading.hide();
                                }, function(err) {
                                    $ionicLoading.hide();
                                    throw err;
                                });
                        });
                })
                .then(function(result) { return result }, function(err) { $log.log(err); throw err; })
            ;
        };

        var userCanTransact = function() {
            return settingsService.$isLoaded().then(function() {
                if (!settingsService.glideraAccessToken) {
                    return false;
                }

                if (settingsService.glideraAccessToken.userCanTransact === true) {
                    return settingsService.glideraAccessToken.userCanTransact;
                }

                return accessToken().then(function(accessToken) {
                    if (!accessToken) {
                        return false;
                    }

                    var r = createRequest(null, accessToken);

                    return r.request('GET', '/user/status ', {}, null)
                        .then(function(result) {
                            $log.debug('status', JSON.stringify(result, null, 4));

                            return settingsService.$isLoaded().then(function() {
                                settingsService.glideraAccessToken.userCanTransact = result.userCanTransact;
                                settingsService.glideraAccessToken.userCanTransactInfo = _.defaults({}, result.userCanTransactInfo);

                                return settingsService.$store().then(function() {
                                    return result.userCanTransact;
                                });
                            });
                        }, function(err) {
                            if (err.code === GLIDERA_ERRORS.ACCESS_TOKEN_REVOKED || err.code === GLIDERA_ERRORS.INVALID_ACCESS_TOKEN) {
                                setDecryptedAccessToken(null);
                                settingsService.glideraAccessToken = null;

                                settingsService.$store().then(function() {
                                    settingsService.$syncSettingsUp();
                                });
                            } else {
                                throw err;
                            }
                        })
                        ;
                });
            })
                .then(function(userCanTransact) { return userCanTransact; }, function(err) { $log.log(err); throw err; })
                ;
        };

        var twoFactor = function() {
            return twoFactorMode().then(function(twoFactorMode) {
                if (twoFactorMode === "NONE") {
                    return;
                } else {
                    return $cordovaDialogs.prompt(
                        $translate.instant('MSG_BUYBTC_GLIDERA_2FA_BODY', {
                            mode: twoFactorMode
                        }).sentenceCase(),
                        $translate.instant('MSG_BUYBTC_GLIDERA_2FA_TITLE').sentenceCase(),
                        [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()],
                        "",
                        false,  // isPassword
                        "tel"   // input type (uses html5 style)
                    )
                    .then(function(dialogResult) {
                        if (dialogResult.buttonIndex == 2) {
                            return $q.reject('CANCELLED');
                        }

                        return dialogResult.input1;
                    });
                }
            });
        };

        var twoFactorMode = function() {
            return settingsService.$isLoaded().then(function() {
                if (!settingsService.glideraAccessToken) {
                    return false;
                }

                return accessToken().then(function(accessToken) {
                    if (!accessToken) {
                        return false;
                    }

                    var r = createRequest(null, accessToken);

                    return r.request('GET', '/authentication/get2faCode', {}, null)
                        .then(function(result) {
                            $log.debug('get2faCode', JSON.stringify(result, null, 4));

                            return result.mode;
                        })
                    ;
                });
            })
                .then(function(userCanTransact) { return userCanTransact; }, function(err) { $log.log(err); throw err; })
            ;
        };

        var decryptAccessToken = function(secretBuf) {
            return settingsService.$isLoaded().then(function() {
                $log.debug('glideraAccessToken', JSON.stringify(settingsService.glideraAccessToken, null, 4));

                return settingsService.glideraAccessToken ? settingsService.glideraAccessToken.encryptedAccessToken : null;
            }).then(function(encryptedAccessToken) {
                if (!encryptedAccessToken) {
                    return;
                }

                var accessToken = blocktrailSDK.Encryption.decrypt(new blocktrailSDK.Buffer(encryptedAccessToken, 'base64'), secretBuf).toString('utf8');

                setDecryptedAccessToken(accessToken);

                return accessToken;
            });
        };

        var accessTokenPromise = null; // use promise to avoid doing things twice
        var accessToken = function() {
            var activeWallet = walletsManagerService.getActiveWallet();

            if (decryptedAccessToken) {
                $log.debug('decryptedAccessToken');
                return $q.when(decryptedAccessToken);
            } else if (accessTokenPromise) {
                $log.debug('accessTokenPromise');
                return accessTokenPromise;
            }

            var def = $q.defer();

            accessTokenPromise = def.promise;

            $timeout(function() {
                settingsService.$isLoaded().then(function() {
                    $log.debug('glideraAccessToken', JSON.stringify(settingsService.glideraAccessToken, null, 4));

                    return settingsService.glideraAccessToken ? settingsService.glideraAccessToken.encryptedAccessToken : null;
                }).then(function(encryptedAccessToken) {
                    if (!encryptedAccessToken) {
                        return;
                    }

                    var promptForPin = function() {
                        return $cordovaDialogs.prompt(
                            $translate.instant('MSG_BUYBTC_PIN_TO_DECRYPT').sentenceCase(),
                            $translate.instant('MSG_BUYBTC_PIN_TO_DECRYPT_TITLE').sentenceCase(),
                            [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()],
                            "",
                            true,   //isPassword
                            "tel"   //input type (uses html5 style)
                        )
                            .then(function(dialogResult) {
                                if (dialogResult.buttonIndex == 2) {
                                    return $q.reject('CANCELLED');
                                }

                                return dialogResult.input1;
                            }, function(err) {
                                $log.error('dialogErr ' + err);
                            });
                    };

                    var unlockWallet = function() {
                        return promptForPin()
                            .then(function(pin) {
                                return activeWallet.unlockWithPin(pin)
                                    .catch(function(e) {
                                        console.log('unlock ERR', e);
                                        return unlockWallet();
                                    })
                            });
                    };

                    return unlockWallet()
                        .then(function(wallet) {
                            var walletSecretBuf = wallet.secret;
                            if (wallet.walletVersion === 'v2') {
                                walletSecretBuf = new blocktrailSDK.Buffer(walletSecretBuf, 'hex');
                            }

                            wallet.lock();

                            return decryptAccessToken(walletSecretBuf)
                                .then(function(r) {
                                    $ionicLoading.hide();
                                    return r;
                                }, function(err) {
                                    $ionicLoading.hide();
                                    throw err;
                                });
                        });
                })
                    .then(function(r) {
                        accessTokenPromise = null;
                        def.resolve(r);
                    }, function(err) {
                        accessTokenPromise = null;
                        $log.debug(err);
                        def.reject(err);
                    });
            }, 100);

            return accessTokenPromise;
        };

        var buyPrices = function(qty, fiat) {
            var activeWallet = walletsManagerService.getActiveWallet();
            var sdk = activeWallet.getSdkWallet().sdk;

            return sdk.glideraBuyPrices(qty, fiat)
                .then(function(result) {
                    console.log('buyPrices ' + JSON.stringify(result));

                    return result;
                });
        };

        var buyPricesUuid = function(qty, fiat) {
            return accessToken().then(function(accessToken) {
                var r = createRequest(null, accessToken, null);
                return r.request('POST', '/prices/buy', {}, qty && {qty: qty} || {fiat: fiat})
                    .then(function(result) {
                        console.log('buyPricesUuid ' + JSON.stringify(result));

                        return result;
                    });
            });
        };

        var buy = function(qty, priceUuid) {
            var activeWallet = walletsManagerService.getActiveWallet();

            return userCanTransact().then(function(userCanTransact) {
                if (!userCanTransact) {
                    throw new Error("User can't transact!");
                }

                return accessToken().then(function(accessToken) {
                    return activeWallet.getNewAddress().then(function (address) {
                        return twoFactor().then(function (twoFactor) {
                            var r = createRequest(null, accessToken, twoFactor);
                            $log.debug('buy', JSON.stringify({
                                destinationAddress: address,
                                qty: qty,
                                priceUuid: priceUuid,
                                useCurrentPrice: false
                            }, null, 4));
                            return r.request('POST', '/buy', {}, {
                                destinationAddress: address,
                                qty: qty,
                                priceUuid: priceUuid,
                                useCurrentPrice: false
                            })
                                .then(function (result) {
                                    $log.debug('buy', JSON.stringify(result, null, 4));

                                    var gTx = {
                                        address: address,
                                        time: Math.floor((new Date()).getTime() / 1000),
                                        transactionUuid: result.transactionUuid,
                                        transactionHash: result.transactionHash || null,
                                        status: result.status,
                                        qty: result.qty,
                                        price: result.price,
                                        total: result.total,
                                        currency: result.currency,
                                        estimatedDeliveryDate: Math.floor(Date.parse(result.estimatedDeliveryDate) / 1000),
                                        walletIdentifier: activeWallet.getReadOnlyWalletData().identifier
                                    };

                                    console.log(gTx);

                                    settingsService.glideraTransactions.push(gTx);

                                    return settingsService.$store().then(function () {
                                        console.log('d1');
                                        return settingsService.$syncSettingsUp().then(function () {
                                            console.log('d2');
                                            updatePendingTransactions();
                                            console.log('d3');

                                            return result;
                                        });
                                    });
                                });
                        });
                    });
                });
            });
        };


        var setClientId = function(_clientId) {
            clientId = _clientId;
        };

        var pollPendingTransactions = true;
        var updatePendingTransactions = function() {
            var _update = function() {
                pollPendingTransactions = false;
                var delay = 10000;

                return $q.when(decryptedAccessToken).then(function(accessToken) {
                    if (accessToken) {
                        var updateStatus = {};

                        $q.all(settingsService.glideraTransactions.map(function(transaction) {
                            if (transaction.status === 'PROCESSING' || !transaction.transactionHash) {
                                pollPendingTransactions = true;
                                var r = createRequest(null, accessToken);
                                return r.request('GET', '/transaction/' + transaction.transactionUuid, {})
                                    .then(function(result) {
                                        updateStatus[transaction.transactionUuid] = result;
                                    })
                                    ;
                            } else {
                                return $q.when(null);
                            }
                        }))
                            .then(function() {
                                settingsService.glideraTransactions = settingsService.glideraTransactions.map(function(transaction) {
                                    if (typeof updateStatus[transaction.transactionUuid] !== "undefined") {
                                        var newTxInfo = updateStatus[transaction.transactionUuid];
                                        var oldStatus = transaction.status;

                                        // sometimes a tx is marked COMPLETE but missing a transactionHash,
                                        //  in that case we force another update
                                        if (newTxInfo.status === 'COMPLETE' && !newTxInfo.transactionHash) {
                                            delay = 0;
                                        } else {
                                            transaction.qty = newTxInfo.qty;
                                            transaction.status = newTxInfo.status;
                                            transaction.transactionHash = newTxInfo.transactionHash;
                                            transaction.estimatedDeliveryDate = Math.floor(Date.parse(newTxInfo.estimatedDeliveryDate) / 1000);

                                            if (oldStatus === 'PROCESSING' && transaction.status === 'COMPLETE') {
                                                $rootScope.$broadcast('glidera_complete', transaction);
                                            }
                                        }
                                    }

                                    return transaction;
                                });

                                return settingsService.$store().then(function() {
                                    return settingsService.$syncSettingsUp();
                                });
                            })
                        ;
                    }
                })
                    .then(function() {
                    }, function(e) {
                        $log.error('updatePendingTransactions ' + e);
                    })
                    .then(function() {
                        if (delay) {
                            if (pollPendingTransactions) {
                                $timeout(updatePendingTransactions, delay);
                            }
                        } else {
                            // do it again
                            return _update();
                        }
                    })
                    ;
            };

            _update();
        };
        var updateAllTransactions = function(initLoop) {
            return $q.when(decryptedAccessToken).then(function(accessToken) {
                if (accessToken) {
                    var updateTxs = [];

                    var r = createRequest(null, accessToken);
                    return r.request('GET', '/transaction', {})
                        .then(function(results) {
                            results.transactions.forEach(function(result) {
                                updateTxs.push(result);
                            });
                        })
                        .then(function() {
                            var oldTxMap = {};
                            settingsService.glideraTransactions.forEach(function(tx) {
                                oldTxMap[tx.transactionUuid] = tx;
                            });

                            settingsService.glideraTransactions = updateTxs.map(function(updateTx) {
                                var tx = oldTxMap[updateTx.transactionUuid] || {};

                                return {
                                    address: tx.address || null,
                                    time: tx.time || null,
                                    transactionUuid: updateTx.transactionUuid,
                                    transactionHash: updateTx.transactionHash || tx.transactionHash || null,
                                    qty: updateTx.qty,
                                    status: updateTx.status,
                                    price: updateTx.price,
                                    total: updateTx.total,
                                    currency: updateTx.currency,
                                    walletIdentifier: null
                                };
                            });

                            return settingsService.$store().then(function() {
                                return settingsService.$syncSettingsUp().then(function() {
                                    return true;
                                });
                            });
                        })
                        ;
                } else {
                    return false;
                }
            })
                .then(function(r) { return r; }, function(e) { $log.error('updateAllTransactions ' + e); })
                .then(function(r) {
                    if (initLoop) {
                        if (r) {
                            $timeout(updatePendingTransactions, 10000);
                        } else {
                            $timeout(updateAllTransactions, 10000);
                        }
                    }
                })
                ;
        };

        var initialized = false;
        var init = function() {
            if (initialized) {
                return;
            }

            // only initialize if we're on a network that supports it
            if (CONFIG.NETWORKS[walletsManagerService.getActiveWallet().getReadOnlyWalletData().networkType].BUYBTC) {
                initialized = true;

                $q.when(launchService.getWalletSecret())
                    .then(function(walletSecret) {
                        if (!walletSecret) {
                            return;
                        }
                        var walletSecretBuf = new blocktrailSDK.Buffer(walletSecret, 'hex');

                        return decryptAccessToken(walletSecretBuf);
                    })
                    .then(function() {
                        // return updateAllTransactions(); // @TODO: DEBUG
                        return updatePendingTransactions();
                    }, function(e) {
                        $log.debug('initDecryptAccessToken2 ERR ' + e);
                    });
            }
        };

        return {
            init: init,
            setClientId: setClientId,
            createRequest: createRequest,
            oauth2: oauth2,
            setup: setup,
            twoFactor: twoFactor,
            handleOauthCallback: handleOauthCallback,
            accessToken: accessToken,
            userCanTransact: userCanTransact,
            buyPrices: buyPrices,
            buyPricesUuid: buyPricesUuid,
            buy: buy
        };
    }
);
