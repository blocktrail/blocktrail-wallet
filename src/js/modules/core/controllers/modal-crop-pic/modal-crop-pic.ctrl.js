(function() {
    "use strict";

    angular.module("blocktrail.core")
        .controller("ModalCropPicCtrl", ModalCropPicCtrl);

    function ModalCropPicCtrl($scope, $controller, parameters) {
        // Extend from base controller
        $controller('ModalBaseCtrl', { $scope: $scope });

        var isRotating = false;

        $scope.picData = parameters.picData;
        $scope.croppedPicData = "";
        $scope.buttonConfirm = parameters.buttonConfirm;
        $scope.buttonCancel = parameters.buttonCancel;

        // Methods
        $scope.confirm = confirm;
        $scope.rotate = rotate;

        /**
         * Confirm
         */
        function confirm(croppedPicData) {
            $scope.closeModal(croppedPicData);
        }

        /**
         * Rotate
         * @param isClockwise
         */
        function rotate(isClockwise) {
            if (!isRotating && !$scope.picData) return;

            isRotating = true;

            rotateBase64Image($scope.picData, isClockwise, function(result) {
                $scope.$apply(function() {  // $apply is required because we were called back outside of angular system
                    $scope.picData = result;
                    $scope.isRotating = false;
                });
            });
        }

        // http://stackoverflow.com/questions/17040360/javascript-function-to-rotate-a-base-64-image-by-x-degrees-and-return-new-base64
        function rotateBase64Image(base64data, isClockwise, callback) {
            var image = new Image();
            image.onload = function() {
                var canvas = document.createElement('canvas');
                canvas.width = image.height;
                canvas.height = image.width;
                var ctx = canvas.getContext("2d");
                var deg = isClockwise ? Math.PI / 2 : Math.PI / -2;
                // translate to center-canvas
                // the origin [0,0] is now center-canvas
                ctx.translate(canvas.width / 2, canvas.height / 2);
                // roate the canvas by +90% (==Math.PI/2)
                ctx.rotate(deg);
                // draw the signature
                // since images draw from top-left offset the draw by 1/2 width & height
                ctx.drawImage(image, -image.width / 2, -image.height / 2);
                // un-rotate the canvas by -90% (== -Math.PI/2)
                ctx.rotate(-deg);
                // un-translate the canvas back to origin==top-left canvas
                ctx.translate(-canvas.width / 2, -canvas.height / 2);
                callback(canvas.toDataURL());
            };

            image.crossOrigin = "Anonymous";
            image.src = base64data;
        }
    }

})();
