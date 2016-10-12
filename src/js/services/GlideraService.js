angular.module('blocktrail.wallet').factory(
    'glideraService',
    function(CONFIG, $log, $q, Wallet, $cordovaDialogs, $translate, $http, $timeout, $ionicLoading, settingsService) {
        var clientId = "9074010d6e573bd7b06645735ba315c8";
        var clientSecret = "02cc9562bd2049b6fadb88578bc4c723";
        var returnuri = "btccomwallet://glideraCallback";

        var decryptedAccessToken = null;

        var SUPPORTED_BROKERS = ['glidera'];

        var _regions = [
            {code: 'NL', name: 'NETHERLANDS'}
        ];
        var _usStates = [
            {code: 'US-AL', name: 'Alabama'},
            {code: 'US-AK', name: 'Alaska'},
            {code: 'US-AZ', name: 'Arizona'},
            {code: 'US-AR', name: 'Arkansas'},
            {code: 'US-CA', name: 'California'},
            {code: 'US-CO', name: 'Colorado'},
            {code: 'US-CT', name: 'Connecticut'},
            {code: 'US-DE', name: 'Delaware'},
            {code: 'US-DC', name: 'District of Columbia'},
            {code: 'US-FL', name: 'Florida'},
            {code: 'US-GA', name: 'Georgia'},
            {code: 'US-HI', name: 'Hawaii'},
            {code: 'US-ID', name: 'Idaho'},
            {code: 'US-IL', name: 'Illinois'},
            {code: 'US-IN', name: 'Indiana'},
            {code: 'US-IA', name: 'Iowa'},
            {code: 'US-KS', name: 'Kansas'},
            {code: 'US-KY', name: 'Kentucky'},
            {code: 'US-LA', name: 'Louisiana'},
            {code: 'US-ME', name: 'Maine'},
            {code: 'US-MD', name: 'Maryland'},
            {code: 'US-MA', name: 'Massachusetts'},
            {code: 'US-MI', name: 'Michigan'},
            {code: 'US-MN', name: 'Minnesota'},
            {code: 'US-MS', name: 'Mississippi'},
            {code: 'US-MO', name: 'Missouri'},
            {code: 'US-MT', name: 'Montana'},
            {code: 'US-NE', name: 'Nebraska'},
            {code: 'US-NV', name: 'Nevada'},
            {code: 'US-NH', name: 'New Hampshire'},
            {code: 'US-NJ', name: 'New Jersey'},
            {code: 'US-NM', name: 'New Mexico'},
            {code: 'US-NY', name: 'New York'},
            {code: 'US-NC', name: 'North Carolina'},
            {code: 'US-ND', name: 'North Dakota'},
            {code: 'US-OH', name: 'Ohio'},
            {code: 'US-OK', name: 'Oklahoma'},
            {code: 'US-OR', name: 'Oregon'},
            {code: 'US-PA', name: 'Pennsylvania'},
            {code: 'US-RI', name: 'Rhode Island'},
            {code: 'US-SC', name: 'South Carolina'},
            {code: 'US-SD', name: 'South Dakota'},
            {code: 'US-TN', name: 'Tennessee'},
            {code: 'US-TX', name: 'Texas'},
            {code: 'US-UT', name: 'Utah'},
            {code: 'US-VT', name: 'Vermont'},
            {code: 'US-VA', name: 'Virginia'},
            {code: 'US-WA', name: 'Washington'},
            {code: 'US-WV', name: 'West Virginia'},
            {code: 'US-WI', name: 'Wisconsin'},
            {code: 'US-WY', name: 'Wyoming'}
        ];

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
                host: 'sandbox.glidera.io',
                endpoint: '/api/v1',
                params: {},
                headers: _.defaults({}, (options.headers || {}), headers),
                contentMd5: false
            });

            return new blocktrailSDK.Request(options);
        };

        var oauth2 = function() {
            var uuid = Math.ceil((new Date).getTime() / 1000);
            var scope = ['transact'].join(',');
            var qs = [
                'response_type=code',
                'client_id=' + clientId,
                'state=' + uuid,
                'scope=' + scope,
                'required_scope=' + scope,
                'login_hint=' + (settingsService.email || "").replace(/\+.*@/, "@"), // name+label@mail.com isn't supported by glidera
                'redirect_uri=' + returnuri + "/oauth2"
            ];

            var glideraUrl = "https://sandbox.glidera.io/oauth2/auth?" + qs.join("&");

            $log.debug('oauth2', glideraUrl);

            window.open(glideraUrl, '_system');
        };

        var setup = function() {
            return accessToken().then(function(accessToken) {
                var qs = [
                    'redirect_uri=' + returnuri + "/oauth2",
                    'access_token=' + accessToken
                ];

                var glideraUrl = "https://sandbox.glidera.io/user/setup?" + qs.join("&");

                $log.debug('setup', glideraUrl);

                window.open(glideraUrl, '_system');
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

                    var r = createRequest();

                    return r.request('POST', '/oauth/token', {}, {
                        grant_type: "authorization_code",
                        code: qs.code,
                        redirect_uri: returnuri + "/oauth2",
                        client_id: clientId,
                        client_secret: clientSecret
                    })
                        .then(function(result) {
                            $log.debug('oauthtoken', JSON.stringify(result, null, 4));

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

                                        return Wallet.unlockData(dialogResult.input1).then(function(unlockData) {

                                            // still gotta support legacy wallet where we encrypted the password instead of secret
                                            if (unlockData.secret) {
                                                glideraAccessToken.encryptedWith = 'secret';
                                                glideraAccessToken.encryptedAccessToken = CryptoJS.AES.encrypt(accessToken, unlockData.secret).toString();
                                            } else {
                                                glideraAccessToken.encryptedWith = 'password';
                                                glideraAccessToken.encryptedAccessToken = CryptoJS.AES.encrypt(accessToken, unlockData.password).toString();
                                            }
                                        })
                                    })
                                    .then(function() {
                                        setDecryptedAccessToken(accessToken);
                                        settingsService.glideraAccessToken = glideraAccessToken;

                                        return settingsService.$store().then(function() {
                                            $log.debug('SAVED');
                                            return settingsService.$syncSettingsUp();
                                        });
                                    })
                                    .then(function() {
                                        $ionicLoading.hide();
                                    }, function(err) {
                                        $ionicLoading.hide();
                                        throw err;
                                    })
                                ;
                            })
                        ;
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
                        ""
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

        var accessTokenPromise = null; // use promise to avoid doing things twice
        var accessToken = function() {
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
                        console.log('promptForPin');
                        return $cordovaDialogs.prompt(
                            $translate.instant('MSG_BUYBTC_PIN_TO_DECRYPT').sentenceCase(),
                            $translate.instant('MSG_ENTER_PIN').sentenceCase(),
                            [$translate.instant('OK'), $translate.instant('CANCEL').sentenceCase()],
                            "",
                            true,   //isPassword
                            "tel"   //input type (uses html5 style)
                        )
                            .then(function(dialogResult) {
                                console.log('dialogResult');
                                if (dialogResult.buttonIndex == 2) {
                                    return $q.reject('CANCELLED');
                                }

                                return dialogResult.input1;
                            }, function(err) {
                                console.log('dialogErr ' + err);
                            });
                    };

                    var decryptAccessToken = function() {
                        console.log('decryptAccessToken');
                        return promptForPin().then(function(pin) {
                            console.log('pin');
                            //decrypt password with the provided PIN
                            $ionicLoading.show({
                                template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>",
                                hideOnStateChange: true
                            });

                            return Wallet.unlockData(pin).then(function(unlockData) {
                                console.log('unlockData');
                                // still gotta support legacy wallet where we encrypted the password instead of secret
                                var accessToken;
                                if (unlockData.secret) {
                                    accessToken = CryptoJS.AES.decrypt(encryptedAccessToken, unlockData.secret).toString(CryptoJS.enc.Utf8);
                                } else {
                                    accessToken = CryptoJS.AES.decrypt(encryptedAccessToken, unlockData.password).toString(CryptoJS.enc.Utf8);
                                }

                                setDecryptedAccessToken(accessToken);

                                return accessToken;
                            }, function(err) {
                                console.log('decryptAccessToken AGAIN');
                                return decryptAccessToken();
                            })
                                .then(function(r) {
                                    $ionicLoading.hide();
                                    return r;
                                }, function(err) {
                                    $ionicLoading.hide();
                                    throw err;
                                })
                            ;
                        })
                    };

                    return decryptAccessToken();
                })
                    .then(function(r) {
                        console.log('DONE');
                        accessTokenPromise = null;
                        def.resolve(r);
                    }, function(err) {
                        console.log('DONE ERR');
                        accessTokenPromise = null;
                        $log.debug(err);
                        def.reject(err);
                    });
            }, 100);

            return accessTokenPromise;
        };

        var buyPrices = function(qty, fiat) {
            return userCanTransact().then(function(userCanTransact) {
                if (!userCanTransact) {
                    throw new Error("User can't transact!");
                }

                return accessToken().then(function(accessToken) {
                    var r = createRequest(null, accessToken);
                    return r.request('POST', '/prices/buy', {}, {
                        qty: qty,
                        fiat: fiat
                    })
                        .then(function(result) {
                            $log.debug('buyPrices', JSON.stringify(result, null, 4));

                            return result;
                        })
                    ;
                });
            });
        };

        var buy = function(qty, priceUuid) {
            return userCanTransact().then(function(userCanTransact) {
                if (!userCanTransact) {
                    throw new Error("User can't transact!");
                }

                return accessToken().then(function(accessToken) {

                    return Wallet.getNewAddress().then(function(address) {

                        return twoFactor().then(function(twoFactor) {
                            var r = createRequest(null, accessToken, twoFactor);
                            return r.request('POST', '/buy', {}, {
                                destinationAddress: address,
                                qty: qty,
                                priceUuid: priceUuid,
                                useCurrentPrice: false
                            })
                                .then(function(result) {
                                    $log.debug('buy', JSON.stringify(result, null, 4));

                                    return result;
                                })
                            ;
                        });
                    });
                });
            });
        };


        var _brokers = null;
        var getBrokers = function() {
            return $http.get(CONFIG.API_URL + "/v1/" + (CONFIG.TESTNET ? "tBTC" : "BTC") + "/mywallet/config?v=" + CONFIG.VERSION)
                .then(function(result) {
                    return result.data.brokers;
                })
                .then(function(brokers) {
                    _.each(_regions, function(region, idx) {
                        // set brokers if known
                        if (brokers[region.code]) {
                            _regions[idx].brokers = brokers[region.code].filter(function(broker) {
                                return SUPPORTED_BROKERS.indexOf(broker) !== -1;
                            });
                        } else {
                            // otherwise unset
                            _regions[idx].brokers = [];
                        }
                    });

                    _.each(_usStates, function(region, idx) {
                        // set brokers if known
                        if (brokers[region.code] && region.code) {
                            _usStates[idx].brokers = brokers[region.code].filter(function(broker) {
                                return SUPPORTED_BROKERS.indexOf(broker) !== -1;
                            });
                        } else {
                            // otherwise unset
                            _usStates[idx].brokers = [];
                        }
                    });
                })
                .then(function(r) { return r; }, function(e) { console.error('getBrokers' + (e.msg || e.message || "" + e)); return getBrokers(); })
        };

        var brokers = function() {
            if (!_brokers) {
                _brokers = getBrokers();
            }

            return _brokers;
        };
        brokers();

        var regions = function() {
            return brokers().then(function() {
                return _regions;
            });
        };


        var usStates = function() {
            return brokers().then(function() {
                return _usStates;
            });
        };

        var regionBrokers = function(chosenRegion) {
            if (!chosenRegion) {
                return $q.when([]);
            }

            if (chosenRegion.match(/^US-..$/)) {
                return usStates().then(function(usStates) {
                    var brokers = [];
                    usStates.filter(function(usState) {
                        if (usState.code == chosenRegion) {
                            brokers = usState.brokers;
                        }
                    });
                    return brokers;
                });
            } else {
                return regions().then(function(regions) {
                    var brokers = [];
                    regions.filter(function(region) {
                        if (region.code == chosenRegion) {
                            brokers = region.brokers;
                        }
                    });
                    return brokers;
                });
            }
        };

        return {
            createRequest: createRequest,
            oauth2: oauth2,
            setup: setup,
            twoFactor: twoFactor,
            handleOauthCallback: handleOauthCallback,
            accessToken: accessToken,
            userCanTransact: userCanTransact,
            buyPrices: buyPrices,
            buy: buy,
            brokers: brokers,
            regions: regions,
            usStates: usStates,
            regionBrokers: regionBrokers
        };
    }
);
