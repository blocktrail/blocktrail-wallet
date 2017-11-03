(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SendConfirmCtrl", SendConfirmCtrl);

    function SendConfirmCtrl($scope) {
        $scope.appControl.showPinInput = true;

        /*-- simply a nested state for template control --*/
    }
})();
