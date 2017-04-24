/* globals blocktrailSDK, window */
// bind a few things from the browserified blocktrailSDK to the window
window.CryptoJS = blocktrailSDK.CryptoJS;
window.bitcoinjs = blocktrailSDK.bitcoin;
window.randomBytes = blocktrailSDK.randomBytes;
window._ = blocktrailSDK.lodash;

var blocktrail = angular.module('blocktrail.wallet', [
    'ionic',
    'ngCordova',
    NG_CORDOVA_MOCKS ? 'ngCordovaMocks' : null,
    'angularMoment',
    'ja.qr',
    'ngImgCrop',
    'blocktrail.localisation',

    'angulartics',
    'angulartics.google.analytics.cordova',

    'blocktrail.config',

    'ngIOS9UIWebViewPatch'
].filter(function filterNull(r) { return !!r; }));

angular.module('blocktrail.wallet').factory(
    '$ionicCoreSettings',
    function(CONFIG) {
        return {
            get: function(setting) {
                if (CONFIG.IO_CONFIG[setting]) {
                    return CONFIG.IO_CONFIG[setting];
                }
                return null;
            }
        }
    }
);

angular.module('blocktrail.wallet').config(function() {
    //merge in sdk error classes
    Object.keys(blocktrailSDK).forEach(function(val) {
        if (blocktrailSDK[val].super_ == Error) {
            blocktrail[val] = blocktrailSDK[val];
        }
    });

    blocktrail.ContactsPermissionError = Error.extend("ContactsPermissionError", 400);
    blocktrail.ContactsDisabledError = Error.extend("ContactsDisabledError", 400);
    blocktrail.ContactsError = Error.extend("ContactsError", 400);
    blocktrail.ContactAddressError = Error.extend("ContactAddressError", 400);
    blocktrail.WalletPinError = Error.extend("WalletPinError", 400);
    blocktrail.WalletPollError = Error.extend("WalletPollError", 400);

    window._ = window._ || blocktrailSDK.lodash;
});

angular.module('blocktrail.wallet').run(
    function($rootScope, $state, $q, $log, $interval, $timeout, CONFIG, $ionicPlatform, $ionicHistory, $cordovaNetwork,
             $analytics, $ionicSideMenuDelegate, $locale, $btBackButtonDelegate, $cordovaAppVersion,
             $cordovaStatusbar, settingsService, $window, $cordovaClipboard, $cordovaToast, $translate, $cordovaDevice,
             amMoment, tuneTrackingService, trackingService, blocktrailLocalisation) {
        $rootScope.CONFIG = CONFIG || {};
        $rootScope.$state = $state;
        $rootScope.$translate = $translate;
        $rootScope.$cordovaNetwork = $cordovaNetwork;
        $rootScope.showSideMenu = true;
        $rootScope.hideLoadingScreen = false;
        $rootScope.appVersion = CONFIG.VERSION;
        $rootScope.isAndroid = ionic.Platform.isAndroid();
        $rootScope.isIOS = ionic.Platform.isIOS();

        if (CONFIG.DEBUGLIBS) {
            blocktrailSDK.debug.enable('*,-pouchdb:*');
        } else {
            blocktrailSDK.debug.disable();
        }

        facebookConnectPlugin.activateApp();

        if (CONFIG.GAPPTRACK_ID) {
            if ($rootScope.isIOS && CONFIG.GAPPTRACK_ACTIVATE_LABELS.iOS) {
                GappTrack.track(CONFIG.GAPPTRACK_ID, CONFIG.GAPPTRACK_ACTIVATE_LABELS.iOS, "1.00", false);
            } else if ($rootScope.isAndroid && CONFIG.GAPPTRACK_ACTIVATE_LABELS.android) {
                GappTrack.track(CONFIG.GAPPTRACK_ID, CONFIG.GAPPTRACK_ACTIVATE_LABELS.android, "1.00", false);
            }
        }

        /*---- push notification init----*/
        var options = {
            android: {
                senderID: CONFIG.GCM_PUSH_SENDER_ID,
                icon: "notification_icon",
                iconColor: "#3c78c2"
            },
            ios: {
                alert: "true",
                badge: "true",
                sound: "true"
            },
            windows: {}
        };

        $ionicPlatform.ready(function () {
            // initialize
            $cordovaPushV5.initialize(options).then(function() {
                // start listening for new notifications
                $cordovaPushV5.onNotification();
                // start listening for errors
                $cordovaPushV5.onError();
                // register to get registrationId
                $cordovaPushV5.register().then(function(registrationId) {
                    // save `registrationId` somewhere;
                    console.log("regid:" + registrationId);

                    gcmService.register(registrationId);

                    gcmService.enableNotifications($rootScope);

                })
            });
        });

        /*----iOS Keyboard fix---*/
        //fix for a quirk where the keyboard is triggered randomly without input focus (usually only happens on send screen)
        var keyboardShow = function(e) {
            $log.debug('keyboard is opening', e);
            if (document.activeElement == document.body) {
                $log.error('keyboard opened in error. Closing it.');
                cordova.plugins.Keyboard.close();
                $timeout(function(){
                    cordova.plugins.Keyboard.close();
                });
            }
        };
        var keyboardHide = function(e) {
            $log.debug('keyboard is closing', e);
        };
        window.addEventListener('native.keyboardshow', keyboardShow);
        window.addEventListener('native.keyboardhide', keyboardHide);

        $rootScope.$on('$destroy', function(e) {
            window.removeEventListener('native.keyboardshow', keyboardShow);
            window.removeEventListener('native.keyboardhide', keyboardHide);
        });
        /*----/iOS keyboard fix---*/


        /*---Samsung keyboard fix---*/
        //detect if device is samsung, and use input type=text instead of type=number
        $rootScope.isSamsung = !!$cordovaDevice.getModel().toLowerCase().match(/samsung/);

        $rootScope.changeLanguage = function(language) {
            $log.debug('changeLanguage: ' + language);
            settingsService.language = language || blocktrailLocalisation.preferredAvailableLanguage() || CONFIG.FALLBACK_LANGUAGE || 'en';

            var momentLocale = settingsService.language;
            if (momentLocale == 'cn') {
                momentLocale = 'zh-cn';
            }

            amMoment.changeLocale(momentLocale);
            $translate.use(settingsService.language);
        };

        // trigger loading of settings
        settingsService.$isLoaded().then(function() {
            if (settingsService.permissionUsageData) {
                if (!settingsService.installTracked) {
                    $analytics.eventTrack('install', {category: 'Events'});

                    settingsService.installTracked = true;
                    settingsService.$store();
                    tuneTrackingService.init(/* existingUser= */false)
                } else {
                    tuneTrackingService.init(/* existingUser= */true);
                }
            }
        });

        $rootScope.$btBackButtonDelegate = $btBackButtonDelegate;
        //register our hardware back button handler
        $ionicPlatform.registerBackButtonAction($btBackButtonDelegate.hardwareBack, 101);

        //get the real app version
        if (window.cordova) {
            $cordovaAppVersion.getAppVersion()
                .then(function(version) {
                    $rootScope.appVersion = version;
                });
        }

        // track state on rootScope using $ionicPlatform event
        //NB: remember to unbind from $ionicPlatform  on $destroy if binding in $scopes
        $rootScope.STATE = {
            ACTIVE: true
        };
        trackingService.trackEvent(trackingService.EVENTS.OPEN);
        $ionicPlatform.on('pause', function() {
            $log.debug('PAUSE');
            $rootScope.STATE.ACTIVE = false;
            $rootScope.$broadcast('appPause');
        });
        $ionicPlatform.on('resume', function() {
            $log.debug('RESUME');
            $rootScope.STATE.ACTIVE = true;
            $rootScope.$broadcast('appResume');
            facebookConnectPlugin.activateApp();
            trackingService.trackEvent(trackingService.EVENTS.OPEN);
        });

        //indicate when keyboard is displayed
        $rootScope.isKeyboardShown = false;
        window.addEventListener('native.keyboardshow', function(e) {
            $timeout(function() {
                $rootScope.isKeyboardShown = true;
            });
        });
        window.addEventListener('native.keyboardhide', function(e) {
            $timeout(function() {
                $rootScope.isKeyboardShown = false;
            });
        });


        /**
         * remove focus from the element triggering the event
         * @param $event
         */
        $rootScope.blurInput = function($event) {
            $event.srcElement.blur();
        };

        $rootScope.$on("$stateChangeError", function(event, toState, toParams, fromState, fromParams, error) {
            $log.error('Error transitioning to '+toState.name + ' from  '+fromState.name, toState, fromState, error);
            $state.go('app.error');
            event.preventDefault();
        });

        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            cordova.plugins.Keyboard.disableScroll(true);
        }

        //set the iOS status bar style to light
        if (window.StatusBar) {
            $cordovaStatusbar.overlaysWebView(true);
            $cordovaStatusbar.style(1);
        }


        //--- Debugging info ---
        $log.debug("Plugins; ", Object.keys(navigator));
        $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams) {
            $log.debug("$stateChangeStart", toState.name, Object.keys(toParams).map(function(k) { return k + ":" + toParams[k]; }));
        });

        $rootScope.$on("$stateChangeSuccess", function(event, toState, toParams, fromState, fromParams) {
            $log.debug("$stateChangeSuccess", toState.name, Object.keys(toParams).map(function(k) { return k + ":" + toParams[k]; }));
        });

        $rootScope.$on("$stateChangeError", function(event, toState, toParams, fromState, fromParams) {
            $log.debug("$stateChangeError", toState.name, Object.keys(toParams).map(function(k) { return k + ":" + toParams[k]; }));
        });

        $log.debug('window.sqlitePlugin? ' + !!window.sqlitePlugin);

        // $cordovaNetwork.isConnected = false;
        $log.debug('isOnline?', $cordovaNetwork.isOnline());

        $rootScope.toClipboard = function(text, confirmPopup) {
            $log.debug('copy to clipboard: ' + text);
            return $cordovaClipboard.copy(text).then(function () {
                if (confirmPopup) {
                    $cordovaToast.showShortTop($translate.instant(confirmPopup).sentenceCase());
                }
                return true;
            });
        };

        // uri intent handler, rest is handled by LaunchController
        $window.handleOpenURL = function(url) {
            $log.debug('handleOpenURL: ' + url + ' (' + $state.is('app.launch') + ')');
            $rootScope.handleOpenURL = "" + url;

            if (!$state.is('app.launch')) {
                $state.go('app.launch');
            }
        };
    }
);

/*--- Angular Moment Config ---*/
angular.module('blocktrail.wallet')
    .constant('angularMomentConfig', {
        //preprocess: 'unix', // optional
        //timezone: 'Europe/London' // optional
    })
    .run(function(TRANSLATIONS, CONFIG, $filter) {
        var translate = function(key, language) {
            return TRANSLATIONS[language][key] || (CONFIG.FALLBACK_LANGUAGE && TRANSLATIONS['english'][key]) || key;
        };

        var MMMMDoYYYYLocales = {
            'en': 'english',
            'en-US': 'english'
        };
        Object.keys(MMMMDoYYYYLocales).forEach(function(locale) {
            var translationsKey = MMMMDoYYYYLocales[locale];

            moment.locale(locale, {
                calendar: {
                    lastDay: '[' + translate('YESTERDAY', translationsKey).sentenceCase() + ']',
                    sameDay: '[' + translate('TODAY', translationsKey).sentenceCase() + ']',
                    nextDay: '[' + translate('TOMORROW', translationsKey).sentenceCase() + ']',
                    lastWeek : 'MMMM D',
                    nextWeek : 'MMMM Do YYYY',
                    sameElse : 'MMMM Do YYYY'
                }
            });
        });

        moment.locale('es', {
            calendar : {
                lastDay : '[' + translate('YESTERDAY', 'spanish').sentenceCase() + ']',
                sameDay : '[' + translate('TODAY', 'spanish').sentenceCase() + ']',
                nextDay : '[' + translate('TOMORROW', 'spanish').sentenceCase() + ']',
                lastWeek : 'D [de] MMMM',
                nextWeek : 'D [de] MMMM [de] YYYY',
                sameElse : 'D [de] MMMM [de] YYYY'
            }
        });

        var DMMMMYYYYLocales = {
            'ru': 'russian',
            'fr': 'french',
            'nl': 'dutch'
        };
        Object.keys(DMMMMYYYYLocales).forEach(function(locale) {
            var translationsKey = DMMMMYYYYLocales[locale];

            moment.locale(locale, {
                calendar: {
                    lastDay: '[' + translate('YESTERDAY', translationsKey).sentenceCase() + ']',
                    sameDay: '[' + translate('TODAY', translationsKey).sentenceCase() + ']',
                    nextDay: '[' + translate('TOMORROW', translationsKey).sentenceCase() + ']',
                    lastWeek: 'YYYY-MM-DD',
                    nextWeek: 'YYYY-MM-DD',
                    sameElse: 'YYYY-MM-DD'
                }
            });
        });

        var yyyymmddLocales = {
            'zh-cn': 'chinese',
            'sw': 'swahili',
            'ar': 'arabic',
            'hi': 'hindi'
        };
        Object.keys(yyyymmddLocales).forEach(function(locale) {
            var translationsKey = yyyymmddLocales[locale];

            moment.locale(locale, {
                calendar: {
                    lastDay: '[' + translate('YESTERDAY', translationsKey).sentenceCase() + ']',
                    sameDay: '[' + translate('TODAY', translationsKey).sentenceCase() + ']',
                    nextDay: '[' + translate('TOMORROW', translationsKey).sentenceCase() + ']',
                    lastWeek: 'YYYY-MM-DD',
                    nextWeek: 'YYYY-MM-DD',
                    sameElse: 'YYYY-MM-DD'
                }
            });
        });
    });
angular.module('blocktrail.wallet').config(
    function($stateProvider, $urlRouterProvider, $logProvider, $provide, CONFIG,
             $ionicConfigProvider, $analyticsProvider, googleAnalyticsCordovaProvider) {

        googleAnalyticsCordovaProvider.trackingId = CONFIG.GA_TRACKING_ID;

        //disable default iOS behaviour to navigate back in history via swipe (ionic history results in a lot of problems)
        $ionicConfigProvider.views.swipeBackEnabled(false);

        if (window.device && device.platform === "amazon-fireos") {
            $stateProvider
                .state('app', {
                    url: "/android43",
                    templateUrl: "templates/android43.html",
                    controller: "Android43Ctrl",
                    resolve: {
                        altNotice: function() {
                            return "Amazon Fire OS";
                        }
                    }
                })
            ;

            $urlRouterProvider.otherwise('android43');

            return;
        }

        // android 4.3 catch
        if (window.device && device.platform === "Android") {
            var v = device.version.split(".");

            if (v[0] == 4 && v[1] <= 3) {
                $stateProvider
                    .state('app', {
                        url: "/android43",
                        templateUrl: "templates/android43.html",
                        controller: "Android43Ctrl"
                    })
                ;

                $urlRouterProvider.otherwise('android43');

                return;
            }
        }

        $logProvider.debugEnabled(CONFIG.DEBUG);
        $stateProvider
            .state('app', {
                abstract: true,
                template: "<ion-nav-view />",
                resolve: {
                    /**
                     * load extra languages we are aware of
                     */
                    extraLanguages: function(settingsService, blocktrailLocalisation) {
                        return settingsService.$isLoaded().then(function() {
                            _.each(settingsService.extraLanguages, function(extraLanguage) {
                                blocktrailLocalisation.enableLanguage(extraLanguage);
                            });
                        });
                    }
                }
            })

            /*---Launch---*/
            .state('app.launch', {
                url: "/launch",
                cache: false,
                data: {
                    excludeFromHistory: true,
                    clearHistory: true  //always clear history when entering this state
                },
                controller: "LaunchCtrl"
            })
            .state('app.reset', {
                url: "/reset",
                data: {
                    excludeFromHistory: true,
                    clearHistory: true
                },
                controller: "ResetCtrl"
            })
            .state('app.rebrand', {
                url: "/rebrand",
                data: {
                    excludeFromHistory: true,
                    clearHistory: true
                },
                templateUrl: "templates/rebrand.html",
                controller: "RebrandCtrl"
            })

            /*---Setup---*/
            .state('app.setup', {
                url: "/setup",
                abstract: true,
                controller: "SetupCtrl",
                templateUrl: "templates/setup/setup.html",
                resolve: {
                    /**
                     * check for extra languages to enable
                     * if new language is new preferred, set it
                     */
                    preferredLanguage: function(CONFIG, $rootScope, settingsService, blocktrailLocalisation, launchService, AppVersionService) {
                        return launchService.getWalletConfig()
                            .then(function(result) {
                                AppVersionService.checkVersion(
                                    null,
                                    null,
                                    result.versionInfo.mobile,
                                    AppVersionService.CHECKS.SETUP
                                );

                                return result.extraLanguages.concat(CONFIG.EXTRA_LANGUAGES).unique();
                            })
                            .then(function(extraLanguages) {
                                return settingsService.$isLoaded().then(function() {
                                    // parse extra languages to determine if there's any new
                                    var r = blocktrailLocalisation.parseExtraLanguages(extraLanguages);
                                    var preferredLanguage;

                                    // if there's any new we should store those
                                    if (r) {
                                        var newLanguages = r[0];
                                        preferredLanguage = r[1];
                                        settingsService.extraLanguages = settingsService.extraLanguages.concat(newLanguages).unique();
                                    } else {
                                        preferredLanguage = blocktrailLocalisation.setupPreferredLanguage();
                                    }

                                    // activate preferred language
                                    $rootScope.changeLanguage(preferredLanguage);

                                    // store preferred language
                                    settingsService.language = preferredLanguage;

                                    return settingsService.$store();
                                });
                            })
                            .then(function() {}, function(e) { console.error(e); });
                    },
                    settings: function(settingsService, $rootScope) {
                        //do an initial load of the user's settings (will return defaults if none have been saved yet)
                        return settingsService.$isLoaded().then(function() {
                            $rootScope.settings = settingsService;
                            return settingsService;
                        });
                    }
                }
            })
            .state('app.setup.start', {
                url: "/start",
                cache: false,
                controller: "SetupStartCtrl",
                templateUrl: "templates/setup/setup.start.html",
                data: {
                    clearHistory: true
                }
            })
            .state('app.setup.login', {
                url: "/login",
                cache: false,
                controller: "SetupLoginCtrl",
                templateUrl: "templates/setup/setup.login.html"
            })
            .state('app.setup.register', {
                url: "/register",
                cache: false,
                controller: "SetupNewAccountCtrl",
                templateUrl: "templates/setup/setup.register.html"
            })
            .state('app.setup.pin', {
                url: "/pin",
                cache: false,
                controller: "SetupWalletPinCtrl",
                templateUrl: "templates/setup/setup.pin.html",
                resolve: {
                    accountInfo: function($state, launchService) {
                        return launchService.getAccountInfo().then(
                            function(accountInfo) {
                                return accountInfo;
                            },
                            function() {
                                return $state.go('app.setup.start');
                            }
                        );
                    }
                }
            })
            .state('app.setup.backup', {
                url: "/wallet-backup",
                cache: false,
                controller: "SetupWalletBackupCtrl",
                templateUrl: "templates/setup/setup.wallet-backup.html",
                resolve: {
                    backupInfo: function($state, launchService) {
                        return launchService.getBackupInfo().then(
                            function(backupInfo) {
                                return backupInfo;
                            },
                            function() {
                                return $state.go('app.setup.start');
                            }
                        );
                    }
                }
            })
            .state('app.setup.phone', {
                url: "/phone",
                controller: "SetupPhoneCtrl",
                templateUrl: "templates/setup/setup.phone.html",
                data: {
                    clearHistory: true  //clear any previous history
                },
                resolve: {
                    walletInfo: function($state, launchService) {
                        return launchService.getWalletInfo().then(
                            function(walletInfo) {
                                return walletInfo;
                            },
                            function() {
                                return $state.go('app.setup.start');
                            }
                        );
                    }
                }
            })
            //NB: create a copy of the app.wallet.settings.phone to bypass the WalletController which inits the wallet and starts polling
            .state('app.setup.phone-verify', {
                url: "/phone?goBackTo",
                templateUrl: "templates/settings/settings.phone.html",
                controller: 'PhoneSettingsCtrl',
                resolve: {
                    settings: function(settingsService, $rootScope, $translate) {
                        //do an initial load of the user's settings
                        return settingsService.$isLoaded().then(function(data) {
                            $rootScope.settings = settingsService;
                            //set the preferred language
                            $rootScope.changeLanguage(settingsService.language);

                            return data;
                        });
                    }
                }
            })
            .state('app.setup.contacts', {
                url: "/contacts",
                controller: "SetupContactsCtrl",
                templateUrl: "templates/setup/setup.contacts.html",
                resolve: {
                    walletInfo: function($state, launchService) {
                        return launchService.getWalletInfo().then(
                            function(walletInfo) {
                                return walletInfo;
                            },
                            function() {
                                return $state.go('app.setup.start');
                            }
                        );
                    }
                }
            })
            .state('app.setup.profile', {
                url: "/profile",
                controller: "ProfileSettingsCtrl",
                templateUrl: "templates/setup/setup.profile.html",
                resolve: {
                    walletInfo: function($state, launchService) {
                        return launchService.getWalletInfo().then(
                            function(walletInfo) {
                                return walletInfo;
                            },
                            function() {
                                return $state.go('app.setup.start');
                            }
                        );
                    }
                }
            })
            .state('app.setup.complete', {
                url: "/complete",
                controller: "SetupCompleteCtrl",
                templateUrl: "templates/setup/setup.complete.html"
            })


            /*---Wallet Home---*/
            .state('app.wallet', {
                abstract: true,
                url: "/wallet",
                controller: "WalletCtrl",
                templateUrl: "templates/common/ion-side-menus.html",
                resolve: {
                    settings: function(settingsService, $rootScope, $translate) {
                        //do an initial load of the user's settings
                        return settingsService.$isLoaded().then(function(data){
                            $rootScope.settings = settingsService;
                            //set the preferred language
                            $rootScope.changeLanguage(settingsService.language);

                            return data;
                        });
                    },
                    brokers: function($rootScope, buyBTCService, CONFIG) {
                        return buyBTCService.enabled()
                            .then(function(enabled) {
                                $rootScope.BUYBTC_ENABLED = CONFIG.BUYBTC || enabled;
                            });
                    },
                    loadingDone: function(Wallet, Currencies, $q, $rootScope, $log, $cordovaDialogs, $translate, $state) {
                        //do an initial load of cached user data
                        return $q.all([
                            Wallet.balance(true),
                            Currencies.updatePrices(true),
                            Wallet.blockHeight(true)
                        ]).then(function(data) {
                            $log.debug('initial load complete');
                            $rootScope.balance = data[0].balance;
                            $rootScope.uncBalance = data[0].uncBalance;

                            $rootScope.bitcoinPrices = data[1];
                            $rootScope.blockHeight = data[2].height;
                            return true;
                        }).catch(function(error) {
                            if (error.message && error.message == "missing") {
                                //missing account info, go to reset state to force user to log in again
                                $cordovaDialogs.alert(
                                    $translate.instant('MSG_CORRUPT_DATA').sentenceCase(),
                                    $translate.instant('ERROR_TITLE_3').sentenceCase(),
                                    $translate.instant('OK')
                                ).then(function() {
                                    $state.go('app.reset');
                                });
                            }
                        });
                    }
                }
            })

            .state('app.wallet.summary', {
                url: "?refresh",
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/wallet/wallet.summary.html",
                        controller: 'WalletSummaryCtrl'
                    }
                }
            })

            .state('app.wallet.buybtc', {
                url: "/buy",
                abstract: true,
                template: "<ion-nav-view />"
            })
            .state('app.wallet.buybtc.choose', {
                url: "/choose",
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/buybtc/buybtc.choose.html",
                        controller: 'BuyBTCChooseCtrl'
                    }
                }
            })
            .state('app.wallet.buybtc.glidera_oauth2_callback', {
                cache: false,
                url: "/glidera/oaoth2/callback",
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/buybtc/buybtc.glidera_callback.html",
                        controller: 'BuyBTCGlideraOauthCallbackCtrl'
                    }
                }
            })
            .state('app.wallet.buybtc.buy', {
                url: "/buy?broker",
                cache: false,
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/buybtc/buybtc.buy.html",
                        controller: 'BuyBTCBuyCtrl'
                    }
                }
            })

            /*--- Send ---*/
            .state('app.wallet.send', {
                url: "/send",
                cache: false,
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/send/send.input-screen.html",
                        controller: 'SendCtrl'
                    }
                }
            })
            .state('app.wallet.send.qrcode', {
                url: "/scan?backdrop",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true        //never add this state to the history stack
                },
                views: {
                     "overlayView": {
                         templateProvider: function($stateParams, $log) {
                             $log.debug('set the backdrop', $stateParams);
                             if ($stateParams.backdrop) {
                                 return '<div class="scan-screen"><h1>Loading...</h1></div>';
                             } else {
                                 return '';
                             }
                        },
                         controller: 'ScanQRCtrl'
                     }
                }
            })
            .state('app.wallet.send.contacts', {
                url: "/contacts",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "templates/send/partials/send.partial.contacts-list.html",
                        controller: 'ContactsListCtrl'
                    }
                }
            })
            .state('app.wallet.send.address', {
                url: "/address-input",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "templates/send/partials/send.partial.address-input.html",
                        controller: 'AddressInputCtrl'
                    }
                }
            })
            .state('app.wallet.send.confirm', {
                url: "/confirm",
                data: {
                    clearHistory: false,
                    excludeFromHistory: true
                },
                views: {
                    "overlayView": {
                        templateUrl: "templates/send/partials/send.partial.pin-input.html",
                        controller: 'ConfirmSendCtrl'
                    }
                }
            })

            /*--- Receive ---*/
            .state('app.wallet.receive', {
                url: "/receive",
                cache: false,
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/receive/receive.new-address.html",
                        controller: 'ReceiveCtrl'
                    }
                }
            })

            /*--- Promo Codes ---*/
            .state('app.wallet.promo', {
                url: "/promo",
                cache: false,
                data: {
                    clearHistory: true  //always clear history when entering this state
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/promo/promo.redeem-code.html",
                        controller: 'PromoCodeRedeemCtrl'
                    }
                }
            })


            /*--- Settings ---*/
            .state('app.wallet.settings', {
                url: "/settings",
                cache: false,
                data: {
                    clearHistory: true
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/settings/settings.html",
                        controller: 'SettingsCtrl'
                    }
                }
            })
            .state('app.wallet.settings.profile', {
                url: "/profile",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/settings/settings.profile.html",
                        controller: 'ProfileSettingsCtrl'
                    }
                }
            })
            .state('app.wallet.settings.phone', {
                url: "/phone?goBackTo",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/settings/settings.phone.html",
                        controller: 'PhoneSettingsCtrl'
                    }
                }
            })
            .state('app.wallet.settings.currency', {
                url: "/currency",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/settings/settings.currency.html",
                        controller: 'CurrencySettingsCtrl'
                    }
                }
            })
            .state('app.wallet.settings.language', {
                url: "/language",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/settings/settings.language.html",
                        controller: 'LanguageSettingsCtrl'
                    }
                }
            })
            .state('app.wallet.settings.wallet', {
                url: "/wallet",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/settings/settings.wallet.html",
                        controller: 'WalletSettingsCtrl'
                    }
                }
            })
            .state('app.wallet.settings.backup', {
                url: "/wallet-backup",
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/setup/setup.wallet-backup.html",
                        controller: 'SettingsWalletBackupCtrl'
                    }
                },
                resolve: {
                    backupInfo: function($state, launchService) {
                        return launchService.getBackupInfo().then(
                            function(backupInfo) {
                                return backupInfo;
                            },
                            function() {
                                return null;
                            }
                        );
                    }
                }
            })
            .state('app.wallet.settings.about', {
                url: "/about",
                cache: true,
                data: {
                    clearHistory: false
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/settings/settings.about.html",
                        controller: 'AboutSettingsCtrl'
                    }
                }
            })


            /*--- Feedback ---*/
            .state('app.wallet.feedback', {
                url: "/feedback",
                data: {
                    clearHistory: true,
                    excludeFromHistory: true
                },
                views: {
                    "mainView@app.wallet": {
                        templateUrl: "templates/feedback/feedback.html",
                        controller: 'FeedbackCtrl'
                    }
                }
            })

            /*--- Error ---*/
            .state('app.error', {
                data: {
                    excludeFromHistory: true
                },
                views: {
                    "mainView@app.wallet": {
                        template: "<h1 style='text-align: center; margin-top: 5rem'>Ooops!<br><small>Something went wrong</small></h1>"
                    }
                },
                onEnter: function($ionicHistory) {
                    // always set this state as root state when coming from any other state
                    //  workaround to make sure menu button is show when redirected here from transaction views etc
                    //  instead of having to put it on all the buttons that redirect here
                    $ionicHistory.nextViewOptions({
                        historyRoot: true
                    });
                }
            })
        ;

        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('launch');
        //$urlRouterProvider.otherwise('blank');            //for promo-shots, to allow photoshopping
    }
);

String.prototype.sentenceCase = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.capitalize = function() {
    return this.replace(/\w\S*/g, function(txt) {
        return txt.sentenceCase();
    });
};

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(s) {
        return this.substr(0, s.length) === s;
    };
}

Array.prototype.unique = function() {
    return this.filter(function onlyUnique(value, index, self) {
        return value && self.indexOf(value) === index;
    });
};

Array.prototype.any = function(fn) {
    var any = false;

    this.forEach(function(value, index) {
        any = any || fn(value, index);
    });

    return any;
};

Array.prototype.clean = function() {
    return this.filter(function onlyNotNull(value) {
        return value;
    });
};

if (!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length - 1];
    };
}

if (!Array.prototype.sample) {
    Array.prototype.sample = function(size) {
        var shuffled = this.slice(0), i = this.length, temp, index;

        while (i--) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }

        return shuffled.slice(0, size);
    };
}

if (!window.repeat) {
    window.repeat = function(n, fn) {
        var r = [];
        for (var i = 0; i < n; i++) {
            r.push(fn(i));
        }

        return r;
    };
}

function parseQuery(url) {
    url = (url || "").split("?");
    if (url.length < 2) {
        return {};
    }
    var qstr = url[1];
    var query = {};
    var a = qstr.split('&');
    for (var i = 0; i < a.length; i++) {
        var b = a[i].split('=');
        query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
    }
    return query;
}

/**
 * use promises to loop over a `list` of items and execute `fn`
 * with a trailing window of `n` items to avoid blocking
 *
 * @param list
 * @param n
 * @param fn
 */
window.QforEachLimit = function(list, n, fn) {
    // copy list (we'll by popping and we don't want to modify the list)
    var queue = list.slice();
    var results = [];

    if (typeof n === "function") {
        fn = n;
        n = null;
    }

    // exec batch() which is recursive
    return (function batch() {
        var b = [], v;

        if (n === null) {
            b = queue;
        } else {
            // pop until you drop
            for (var i = 0; i < n; i++) {
                v = queue.shift();
                if (v) {
                    b.push(v);
                }
            }
        }

        // when there's nothing left pop'd we'll return the final results
        if (!b.length) {
            return Q.when(results);
        }

        // create a .all promise for this batch
        return Q.all(
            b.map(function(i) {
                return Q.when(i).then(fn);
            })
        )
            // when the batch is done we concat the results and continue
            .then(function(_results) {
                if (n === null) {
                    return _results;
                } else {
                    results = results.concat(_results);

                    return batch();
                }
            })
        ;
    })();
};

window.Qwaterfall = function(fns, arg) {
    var p = Q.when(arg);

    fns.slice().forEach(function(fn) {
        p = p.then(function(arg) {
            return fn(arg);
        });
    });

    return p;
};
