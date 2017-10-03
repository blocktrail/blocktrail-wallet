(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupCtrl", SetupCtrl);

    function SetupCtrl($scope, CONFIG, $rootScope) {
        $scope.setupInfo = {
            // force uniqueness of the identifier to make it easier to force a
            identifier: CONFIG.DEFAULT_IDENTIFIER + "-" + randomBytes(8).toString('hex'),
            password: "",
            primaryMnemonic: "",
            backupMnemonic: "",
            blocktrailPublicKeys: null,
            networkType: null
        };

        $rootScope.hideLoadingScreen = true;
    }
})();
