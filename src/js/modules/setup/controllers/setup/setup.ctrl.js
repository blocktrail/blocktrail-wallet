(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupCtrl", SetupCtrl);

    function SetupCtrl($scope, CONFIG, $rootScope, $timeout) {
        $scope.setupInfo = {
            // force uniqueness of the identifier to make it easier to force a
            identifier: CONFIG.DEFAULT_IDENTIFIER + "-" + randomBytes(8).toString('hex'),
            password: "",
            primaryMnemonic: "",
            backupMnemonic: "",
            blocktrailPublicKeys: null,
            networkType: null
        };

        $timeout(function() {
            $rootScope.hideLoadingScreen = true;
            $timeout(function() {
                if (navigator.splashscreen) {
                    navigator.splashscreen.hide();
                }
            });
        });
    }
})();
