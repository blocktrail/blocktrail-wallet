angular.module('blocktrail.wallet')
    .factory('trackingService', function($analytics, $rootScope, CONFIG, sdkService) {
        var FirebasePlugin = window.FirebasePlugin;

        var EVENTS = {
            APP_OPEN: "app_open",
            SIGN_UP: "sign_up",
            LOGIN: "login",
            ACTIVATED: "activated",
            TELLAFRIEND: "tellafriend",
            PROMO_ATTEMPT: "promo_attempt",
            PROMO_REDEEM: "promo_redeem",
            BUYBTC: {
                REGION_OK: "region_ok",
                REGION_NOTOK: "region_notok",
                GLIDERA_SETUP_INIT: "glidera_setup_init",
                GLIDERA_SETUP_UPDATE: "glidera_setup_update",
                GLIDERA_SETUP_DONE: "glidera_setup_done",
                GLIDERA_OPEN: "glidera_open",
                GLIDERA_BUY: "glidera_buy",
                GLIDERA_BUY_CONFIRM: "glidera_buy_confirm",
                GLIDERA_BUY_ERR: "glidera_buy_error",
                GLIDERA_BUY_DONE: "glidera_buy_done",

                SIMPLEX_OPEN: "simplex_BTC_open",
                SIMPLEX_REDIRECT: "simplex_BTC_redirect"
            },
            BUYBCH: {
                SIMPLEX_OPEN: "simplex_BCH_open",
                SIMPLEX_REDIRECT: "simplex_BCH_redirect"
            },
            APPRATE_STAR: "apprate_star",
            APPRATE: "apprate",
            PAY: "pay",
            PREPAY: "pre_pay"
        };

        var USER_PROPERTIES = {
            FIAT_CURRENCY: "fiat_currency"
        };

        var USER_NETWORK_PROPERTIES = {
            ACTIVATED: "activated",
            HAS_BALANCE: "has_balance"
        };

        var APPSFLYER_EVENTS = {};
        APPSFLYER_EVENTS[EVENTS.SIGN_UP] = "af_complete_registration";
        APPSFLYER_EVENTS[EVENTS.ACTIVATED] = "af_achievement_unlocked";
        APPSFLYER_EVENTS[EVENTS.LOGIN] = "af_login";
        APPSFLYER_EVENTS[EVENTS.APP_OPEN] = "af_re_engage";
        // APPSFLYER_EVENTS[EVENTS.BUYBTC.SIMPLEX_REDIRECT] = "af_initiated_checkout"; // once implemented

        var ANALYTICS_META = {};
        Object.keys(EVENTS.BUYBTC).forEach(function(eventKey) {
            var eventVal = EVENTS.BUYBTC[eventKey];
            ANALYTICS_META[eventVal] = { category: "BuyBTC" };
        });

        var trackEvent = function(event, meta) {
            trackAnalyticsEvent(event, meta);
            trackFirebaseEvent(event, meta);
            trackAppsflyerEvent(event, meta);
        };

        var trackAnalyticsEvent = function(event, meta) {
            var analyticsMeta = angular.extend({}, ANALYTICS_META[event] || {}, meta);
            analyticsMeta.network = sdkService.getNetworkType();

            $analytics.eventTrack(event, analyticsMeta);
        };

        var trackFirebaseEvent = function(event, meta) {
            var firebaseMeta = angular.extend({}, ANALYTICS_META[event] || {}, meta);
            delete firebaseMeta.category;
            firebaseMeta.network = sdkService.getNetworkType();

            FirebasePlugin.logEvent(event, firebaseMeta);
        };

        var trackAppsflyerEvent = function(event, meta) {
            if (!!CONFIG.APPSFLYER && typeof APPSFLYER_EVENTS[event] !== "undefined") {
                var appsFlyerMeta = {};
                appsFlyerMeta.af_content_type = sdkService.getNetworkType();

                window.plugins.appsFlyer.trackEvent(APPSFLYER_EVENTS[event], appsFlyerMeta);
            }
        };

        var setUserTrackingId = function(trackingId) {
            FirebasePlugin.setUserId(trackingId);
        };

        var setUserProperty = function(property, value) {
            FirebasePlugin.setUserProperty(property, value);
        };

        var setUserNetworkProperty = function(property, value) {
            FirebasePlugin.setUserProperty(CONFIG.NETWORK + "_" + property, value);
        };

        $rootScope.$on("$stateChangeSuccess", function(event, toState, toParams, fromState, fromParams) {
            FirebasePlugin.setScreenName(toState.name);
            trackFirebaseEvent("state_change", {
                label: toState.name
            });
        });

        return {
            EVENTS: EVENTS,
            USER_PROPERTIES: USER_PROPERTIES,
            USER_NETWORK_PROPERTIES: USER_NETWORK_PROPERTIES,
            trackEvent: trackEvent,
            setUserTrackingId: setUserTrackingId,
            setUserProperty: setUserProperty,
            setUserNetworkProperty: setUserNetworkProperty
        }
    })
;
