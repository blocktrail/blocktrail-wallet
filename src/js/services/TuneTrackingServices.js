angular.module('blocktrail.wallet')
    .factory('tuneTrackingService', function(CONFIG, $q) {

        var EVENT_ALIASES = {
            "open": 1844683089
        };

        var tune = window.plugins.tunePlugin;
        var initialized = $q.defer();

        if (ionic.Platform.isIOS() && CONFIG.TUNE.ADVERTISER_ID.iOS) {
            tune.init(CONFIG.TUNE.ADVERTISER_ID.iOS, CONFIG.TUNE.CONVERSION_KEY.iOS);
        } else if (ionic.Platform.isAndroid() && CONFIG.TUNE.ADVERTISER_ID.android) {
            tune.init(CONFIG.TUNE.ADVERTISER_ID.android, CONFIG.TUNE.CONVERSION_KEY.android);
        }

        var init = function(existingUser) {
            tune.setDebugMode(true); // @TODO: DEBUG
            tune.setExistingUser(existingUser);
            tune.measureSession();

            initialized.resolve();
        };

        var measureEvent = function(event) {
            return initialized.promise.then(function() {
                return tune.measureEvent(EVENT_ALIASES[event] || event);
            })
        };

        return {
            init: init,
            measureEvent: measureEvent
        }
    })
;
