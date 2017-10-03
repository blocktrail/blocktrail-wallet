(function() {
    "use strict";

    angular.module("blocktrail.core")
        .directive("autoFocus", autoFocus);
    
    function autoFocus($window, $timeout, $ionicPlatform) {
        return {
            restrict: "A",
            transclude: false,
            scope: {},
            link: function(scope, element, attrs) {
                if (!!attrs.disabled) {
                    return;
                }

                $timeout(function() {
                    if ($window.cordova && $window.cordova.plugins && $window.cordova.plugins.Keyboard) {
                        element[0].focus();
                        $window.cordova.plugins.Keyboard.show(); // open keyboard manually
                    }
                }, 500);
            }
        };
    }

})();
