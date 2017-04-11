angular.module('blocktrail.wallet')
    .factory('AppRateService', function($ionicPopover, $rootScope, settingsService, CONFIG, $log, $q, storageService) {
        var db = storageService.db('apprate');
        var _counter = null;

        var APPRATE_STATUS = {};
        APPRATE_STATUS.NEW = null;
        APPRATE_STATUS.NEGATIVE = 'negative';
        APPRATE_STATUS.REMIND = 'remind';
        APPRATE_STATUS.NO = 'no';
        APPRATE_STATUS.DONE = 'done';

        $rootScope.hadErrDuringSend = false;

        var popover = function() {
            $ionicPopover.fromTemplateUrl('templates/misc/popover.apprate.html', {
                hardwareBackButtonClose: true
            }).then(function(popover) {
                popover.hideDelay = 1000;
                popover.show();
            });
        };

        var counter = function(incr) {
            if (typeof incr === "undefined") {
                incr = true;
            }

            if (incr) {
                return incrCounter().then(function() {
                    return _counter;
                })
            } else {
                if (_counter !== null) {
                    return $q.when(_counter);
                } else {
                    return db.get('counter').then(function (doc) {
                        _counter = doc.counter;
                    }, function () {
                        _counter = 0;
                    });
                }
            }
        };

        var incrCounter = function() {
            return db.get('counter').catch(function() {
                return {_id: "counter", counter: 0};
            })
                .then(function(doc) {
                    doc.counter++;

                    _counter = doc.counter;

                    return db.put(doc);
                })
                .catch(function(e) {
                    return 0;
                });
        };

        var resetCounter = function() {
            return db.get('counter').then(function(doc) {
                _counter = 0;
                return db.remove(doc);
            }, function() {});
        };

        return {
            APPRATE_STATUS: APPRATE_STATUS,

            counter: counter,
            incrCounter: incrCounter,
            resetCounter: resetCounter,
            popover: popover,

            updateStatus: function(status) {
                settingsService.apprateStatus = status;
                settingsService.$store().then(function() { settingsService.$syncSettingsUp(); });

                if (status === APPRATE_STATUS.REMIND) {
                    resetCounter();
                }
            },

            navigateToAppStore: function() {
                if (ionic.Platform.isAndroid()) {
                    $log.debug('navigateToAppStore: ' + CONFIG.APPSTORE_URLS.ANDROID);
                    window.open(CONFIG.APPSTORE_URLS.ANDROID, '_system');
                } else if (ionic.Platform.isIOS()) {
                    $log.debug('navigateToAppStore: ' + CONFIG.APPSTORE_URLS.IOS);
                    window.open(CONFIG.APPSTORE_URLS.IOS, '_system');
                } else {
                    $log.debug("navigateToAppStore: UNKNOWN PLATFORM");
                }
            },

            sendCompleted: function() {
                var unsub = $rootScope.$on("$stateChangeSuccess", function(event, toState, toParams, fromState, fromParams) {
                    if (toState.name === 'app.wallet.summary') {
                        unsub();

                        if (!$rootScope.hadErrDuringSend) {
                            settingsService.$isLoaded().then(function() {
                                $log.debug('settingsService.apprateStatus: ' + settingsService.apprateStatus);

                                if (settingsService.apprateStatus === APPRATE_STATUS.NEW) {
                                    popover();
                                }
                            });
                        }
                    }
                });
            },

            init: function() {
                settingsService.$isLoaded().then(function () {
                    $log.debug('settingsService.apprateStatus: ' + settingsService.apprateStatus);

                    if (settingsService.apprateStatus === APPRATE_STATUS.REMIND) {
                        return counter().then(function (counter) {
                            $log.debug('settingsService.init:counter: ' + counter);
                            if (counter > 5) {
                                popover();
                            }
                        });
                    }
                });
            }
        };
    })
;
