(function() {
    "use strict";

    angular.module("blocktrail.core")
        .directive("profileAvatar", profileAvatar);
    
    function profileAvatar() {
        return {
            restrict: "E",
            transclude: false,
            replace: true,
            scope: {
                settingsData: "="
            },
            templateUrl: "js/modules/core/directives/profile-avatar/profile-avatar.directive.tpl.html"
        };
    }

})();
