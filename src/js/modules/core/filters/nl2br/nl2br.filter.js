(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("nl2br", nl2br);

    function nl2br($sce) {
        return function(msg) {
            return $sce.trustAsHtml((msg + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2'));
        }
    }

})();
