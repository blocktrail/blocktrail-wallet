(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalPromptCtrl", ModalPromptCtrl);

    function ModalPromptCtrl($scope, $controller, parameters) {
        // Extend from base controller
        $controller('ModalBaseCtrl', { $scope: $scope });

        $scope.title = parameters.title;
        $scope.titleClass = parameters.titleClass;
        $scope.body = parameters.body;
        $scope.bodyClass = parameters.bodyClass;
        $scope.placeholder = parameters.placeholder;
        $scope.buttonConfirm = parameters.buttonConfirm;
        $scope.buttonCancel = parameters.buttonCancel;

        $scope.form = {
            confirmValue: parameters.preFill || ""
        };

        // Methods
        $scope.confirm = confirm;

        /**
         * Confirm
         * @param confirmValue
         */
        function confirm(confirmValue) {
            $scope.closeModal(confirmValue);
        }
    }

})();
