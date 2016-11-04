angular.module('blocktrail.wallet')
    .factory('trackingService', function(tuneTrackingService, $analytics) {

        var EVENTS = {
            OPEN: "open",
            REGISTRATION: "registration",
            LOGIN: "login",
            ACTIVATED: "activated"
        };

        var ANALYTICS_META = {
            "open": {  category: 'events' },
            "registration": {  category: 'events' },
            "login": {  category: 'events' },
            "activated": {  category: 'events' }
        };

        var trackEvent = function(event) {
            tuneTrackingService.measureEvent(event);
            $analytics.eventTrack(event, ANALYTICS_META[event] || {});
        };

        return {
            EVENTS: EVENTS,
            trackEvent: trackEvent
        }
    })
;
