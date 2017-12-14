(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("ModalPinCtrl", ModalPinCtrl);

    function ModalPinCtrl($scope, $controller, parameters) {
        // Extend from base controller
        $controller('ModalBaseCtrl', { $scope: $scope });

        $scope.title = parameters.title || "";
        $scope.body = parameters.body || "";
        $scope.placeholderPin = parameters.placeholderPin || "";
        $scope.placeholderRepeatPin = parameters.placeholderRepeatPin || "";
        $scope.isRepeatPin = parameters.isRepeatPin;

        $scope.form = {
            pin: "",
            pinRepeat: ""
        };

        // Methods
        $scope.confirm = confirm;

        /**
         * Confirm
         * @param pin
         * @param pinRepeat
         */
        function confirm(pin, pinRepeat) {
            $scope.closeModal({
                pin: pin,
                pinRepeat: pinRepeat
            });
        }
    }

})();
