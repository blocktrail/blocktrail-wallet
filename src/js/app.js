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

    "blocktrail.config",
    "blocktrail.core",
    "blocktrail.launch",
    "blocktrail.setup",
    "blocktrail.templates",

    window.loadNgRaven && "ngRaven",
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
             $cordovaStatusbar, settingsService, localSettingsService, $window, $cordovaClipboard, $cordovaToast, $translate, $cordovaDevice,
             amMoment, trackingService, blocktrailLocalisation, sdkService) {

        $rootScope.readOnlySdkServiceData = sdkService.getReadOnlySdkServiceData();
        $rootScope.networkClassType = "";

        $rootScope.CONFIG = CONFIG || {};
        $rootScope.$state = $state;
        $rootScope.$translate = $translate;
        $rootScope.$cordovaNetwork = $cordovaNetwork;
        $rootScope.showSideMenu = true;
        $rootScope.hideLoadingScreen = false;
        $rootScope.appVersion = CONFIG.VERSION;
        $rootScope.isAndroid = ionic.Platform.isAndroid();
        $rootScope.isIOS = ionic.Platform.isIOS();

        $rootScope.$watch("readOnlySdkServiceData.networkType", function(newValue, oldValue) {
            if (newValue !== oldValue) {
                var network = CONFIG.NETWORKS[newValue].NETWORK;
                if (network.substr(0, 1) === "t" || network.substr(0, 1) === "r") {
                    network = network.substr(1);
                }
                network = network.replace(/BCH$/, 'BCC');

                $rootScope.networkClassType = newValue ? ("network-" + network).toLowerCase() : "";

                var cssEl = document.getElementById('css-ionic-app');

                switch (network) {
                    case 'BTC':
                        cssEl.href = cssEl.href.replace("bcc-", "btc-");
                        break;
                    case 'BCC':
                        cssEl.href = cssEl.href.replace("btc-", "bcc-");
                        break;
                }
            }
        });

        if (CONFIG.APPSFLYER) {
            if ($rootScope.isIOS) {
                window.plugins.appsFlyer.initSdk({
                    devKey: CONFIG.APPSFLYER.KEY.iOS,
                    appId: CONFIG.APPSFLYER.APPID.iOS
                });
            } else {
                window.plugins.appsFlyer.initSdk({
                    devKey: CONFIG.APPSFLYER.KEY.android
                });
            }
        }

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

        /*---- iOS Keyboard fix ---*/
        // fix for a quirk where the keyboard is triggered randomly without input focus (usually only happens on send screen)
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
        // detect if device is samsung, and use input type=text instead of type=number
        $rootScope.isSamsung = !!$cordovaDevice.getModel().toLowerCase().match(/samsung/);

        $rootScope.changeLanguage = function(language) {
            language = language || blocktrailLocalisation.preferredAvailableLanguage() || CONFIG.FALLBACK_LANGUAGE || "en";

            var momentLocale = language;

            if (momentLocale == "cn") {
                momentLocale = "zh-cn";
            }

            amMoment.changeLocale(momentLocale);

            $translate.use(language);
        };

        $rootScope.$btBackButtonDelegate = $btBackButtonDelegate;
        // register our hardware back button handler
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
            ACTIVE: true,
            LAST_ACTIVE: (new Date()).getTime(),
            INITIAL_PIN_DONE: false
        };

        trackingService.trackEvent(trackingService.EVENTS.APP_OPEN);

        $ionicPlatform.on('pause', function() {
            $log.debug('PAUSE');
            $rootScope.STATE.ACTIVE = false;
            $rootScope.STATE.LAST_ACTIVE = (new Date()).getTime();
            $rootScope.$broadcast('appPause');
        });

        $ionicPlatform.on('resume', function() {
            $log.debug('RESUME');
            $rootScope.STATE.ACTIVE = true;
            $rootScope.$broadcast('appResume');
            facebookConnectPlugin.activateApp();
            trackingService.trackEvent(trackingService.EVENTS.APP_OPEN);

            if ($state.includes("app.wallet") && (typeof CONFIG.PIN_ON_OPEN === "undefined" || CONFIG.PIN_ON_OPEN === true)) {
                localSettingsService.getLocalSettings()
                    .then(function (localSettings) {
                        var PIN_LAST_ACTIVE_DELAY = 5 * 60 * 1000; // 5 minutes
                        // if pinOnOpen is required and last time we asked for it was more than 5min ago
                        if (localSettings.isPinOnOpen && ($rootScope.STATE.PENDING_PIN_REQUEST || ($rootScope.STATE.LAST_ACTIVE < (new Date()).getTime() - PIN_LAST_ACTIVE_DELAY))) {
                            $rootScope.STATE.PENDING_PIN_REQUEST = true;

                            $state.go("app.pin", { nextState: $state.$current.name });
                        }
                    });
            }
        });

        // indicate when keyboard is displayed

        // TODO Review this part
        /*$rootScope.isKeyboardShown = false;

        window.addEventListener('native.keyboardshow', function(e) {
            $timeout(function() {
                $rootScope.isKeyboardShown = true;
            });
        });
        window.addEventListener('native.keyboardhide', function(e) {
            $timeout(function() {
                $rootScope.isKeyboardShown = false;
            });
        });*/


        /**
         * remove focus from the element triggering the event
         * @param $event
         */
        $rootScope.blurInput = function($event) {
            $event.srcElement.blur();
        };

        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideFormAccessoryBar(true);
        }

        // set the iOS status bar style to light
        if (window.StatusBar) {
            if (ionic.Platform.isIOS()) {
                $cordovaStatusbar.overlaysWebView(true);
            }
            $cordovaStatusbar.style(1);
        }

        // --- Debugging info ---
        $log.debug("Plugins; ", Object.keys(navigator));
        $rootScope.$on("$stateChangeStart", function(event, toState, toParams) {
            $log.debug("$stateChangeStart", toState.name, Object.keys(toParams).map(function(k) { return k + ":" + toParams[k]; }));

            if (window.Raven) {
                Raven.setTagsContext({
                    to_state: toState && toState.name
                });
            }
        });

        $rootScope.$on("$stateChangeSuccess", function(event, toState, toParams) {
            $log.debug("$stateChangeSuccess", toState.name, Object.keys(toParams).map(function(k) { return k + ":" + toParams[k]; }));

            if (window.Raven) {
                Raven.setTagsContext({
                    state: toState && toState.name,
                    to_state: null
                });
            }
        });

        $rootScope.$on("$stateChangeError", function(event, toState, toParams, fromState, fromParams, error) {
            $log.debug("$stateChangeError" + toState.name + " from  " + fromState.name, toState, fromState, error);
            $state.go('app.error');
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
        // TODO !!! Calls from CORDOVA
        $window.handleOpenURL = function(url) {
            $log.debug('handleOpenURL: ' + url + ' (' + $state.is('app.launch') + ')');
            $rootScope.handleOpenURL = "" + url;

            if (!$state.is('app.launch')) {
                // TODO Use state params
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
                        controller: "Android43Ctrl",
                        resolve: {
                            altNotice: function() {
                                return "Android 4.3";
                            }
                        }
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
                template: "<ion-nav-view></ion-nav-view>"
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
            });

        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('launch');
    }



);

String.prototype.sentenceCase = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
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

function randNumber() {
    do {
        var rand = parseInt(blocktrailSDK.randomBytes(1).toString('hex').substr(0, 1), 16);
    } while (rand > 9);

    return rand;
}

function randDigits(digits) {
    var res = [];
    for (var i = 0; i < digits; i++) {
        res.push(randNumber());
    }

    return res.join("");
}
