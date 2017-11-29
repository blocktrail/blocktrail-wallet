(function() {
    "use strict";

    angular.module("blocktrail.core")
        .directive("profilePicture", profilePicture);
    
    function profilePicture() {
        return {
            restrict: "E",
            transclude: false,
            replace: true,
            scope: {},
            templateUrl: "js/modules/core/directives/profile-picture/profile-picture.directive.tpl.html",
            controller: ProfilePictureCtrl
        };
    }

    function ProfilePictureCtrl($scope, $window, $cordovaImagePicker, $cordovaCamera, modalService, settingsService) {
        var photoSelectOptions = {
            maximumImagesCount: 1,
            width: 800,
            height: 0,
            quality: 80
        };
        var photoTakeOptions = {
            quality: 80,
            destinationType: $window.Camera.DestinationType.DATA_URL,
            sourceType: $window.Camera.PictureSourceType.CAMERA,
            allowEdit: false,
            encodingType: $window.Camera.EncodingType.JPEG,
            targetWidth: 800,
            targetHeight: 800,
            popoverOptions: (typeof $window.CameraPopoverOptions == "undefined") ? null : $window.CameraPopoverOptions,
            saveToPhotoAlbum: true
        };
        var actionButtonOptions = [
            {
                icon: "ion-images",
                value: "images"
            },
            {
                icon: "ion-camera",
                value: "camera"
            }
        ];


        $scope.newProfileImageSource = null;

        // Methods
        $scope.updatePicture = updatePicture;



        function updatePicture() {
            modalService.actionButtons({ options: actionButtonOptions })
                .then(function(action) {
                    switch (action) {
                        case "images":
                            choosePhoto();
                            break;
                        case "camera":
                            takePhoto();
                            break;
                    }
                });
        }

        function choosePhoto() {
            // Do not test it with live reload, img.src = results[0] doesn't work because of cross-domain request
            $cordovaImagePicker.getPictures(photoSelectOptions)
                .then(function(results) {
                    if (results[0]) {
                        // convert image URL into data URL
                        var img = new Image();
                        img.crossOrigin = "Anonymous";
                        img.onload = function() {
                            var canvas = document.createElement('CANVAS');
                            var ctx = canvas.getContext('2d');
                            canvas.height = this.height;
                            canvas.width = this.width;
                            ctx.drawImage(this, 0, 0);
                            var imageData = canvas.toDataURL('image/jpeg');
                            canvas = null;
                            showPhotoCrop(imageData);
                        };
                        img.src = results[0];


                    }
                }, function(e) {
                    modalService.alert({ body: e.message ? e.message : e.toString() });
                });
        }

        function takePhoto() {
            $cordovaCamera.getPicture(photoTakeOptions).then(function(imageData) {
                var imageData = "data:image/jpeg;base64," + imageData;
                showPhotoCrop(imageData);
            }, function(e) {
                modalService.alert({ body: e.message ? e.message : e.toString() });
            });
        }


        function showPhotoCrop(imageData) {
            debugger;

            imageData
        }


        // formSettingsService.saveData(saveObj)
        //    .then(saveDataSuccessHandler, saveDataErrorHandler);

    }

})();
