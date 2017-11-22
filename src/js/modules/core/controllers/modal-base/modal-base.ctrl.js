(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalBaseCtrl", ModalBaseCtrl);

    function ModalBaseCtrl($scope, $ionicPlatform) {
        // Methods
        $scope.cancel = cancel;
        // The back button handler
        $ionicPlatform.onHardwareBackButton(cancel);
        // On scope destroy
        $scope.$on("$destroy", onScopeDestroy);

        /**
         * Cancel
         */
        function cancel() {
            $scope.closeModal(null);
        }

        /**
         * On scope destroy
         */
        function onScopeDestroy() {
            // Remove the back button handler
            $ionicPlatform.offHardwareBackButton(cancel);
        }
    }

})();
