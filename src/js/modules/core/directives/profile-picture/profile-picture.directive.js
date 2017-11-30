(function() {
    "use strict";

    angular.module("blocktrail.core")
        .directive("profilePicture", profilePicture);
    
    function profilePicture() {
        return {
            restrict: "E",
            transclude: false,
            replace: true,
            scope: {
                isShowRemoveButton: "="
            },
            templateUrl: "js/modules/core/directives/profile-picture/profile-picture.directive.tpl.html",
            controller: ProfilePictureCtrl
        };
    }

    function ProfilePictureCtrl($scope, $window, $cordovaImagePicker, $cordovaCamera, modalService, settingsService) {
        var picSelectOptions = {
            maximumImagesCount: 1,
            width: 800,
            height: 0,
            quality: 80
        };
        var picTakeOptions = {
            quality: 80,
            destinationType: $window.Camera.DestinationType.DATA_URL,
            sourceType: $window.Camera.PictureSourceType.CAMERA,
            allowEdit: false,
            encodingType: $window.Camera.EncodingType.JPEG,
            targetWidth: 800,
            targetHeight: 800,
            popoverOptions: $window.CameraPopoverOptions ? null : $window.CameraPopoverOptions,
            saveToPhotoAlbum: true
        };

        $scope.settingsData = settingsService.getReadOnlySettingsData();

        // Methods
        $scope.removePic = removePic;
        $scope.choosePic = choosePic;
        $scope.takePic = takePic;

        /**
         * Choose the picture
         */
        function choosePic() {
            // Do not test it with live reload, img.src = results[0] doesn't work because of cross-domain request
            $cordovaImagePicker.getPictures(picSelectOptions)
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
                            var picData = canvas.toDataURL('image/jpeg');
                            canvas = null;
                            showPicCrop(picData);
                        };
                        img.src = results[0];
                    }
                });
        }

        /**
         * Take the picture
         */
        function takePic() {
            $cordovaCamera.getPicture(picTakeOptions)
                .then(function(picData) {
                    var picData = "data:image/jpeg;base64," + picData;
                    showPicCrop(picData);
                }, function(e) {
                    if(e !== "Camera cancelled.") {
                        modalService.alert({ body: e.message ? e.message : e.toString() });
                    }
                });
        }

        /**
         * Remove the picture
         */
        function removePic() {
            modalService.confirm({
                    body: "SETTINGS_REMOVE_PHOTO"
                })
                .then(function(dialogResult) {
                    if(dialogResult) {
                        settingsService.updateSettingsUp({
                                profilePic: null
                            })
                            .then(function() {
                                modalService.hideSpinner();
                            })
                            .catch(function(e) {
                                modalService.hideSpinner();
                                modalService.alert({ body: e.message ? e.message : e.toString() });
                            });
                    }
                });
        }

        /**
         * Show the picture crop modal
         * @param picData
         */
        function showPicCrop(picData) {
            modalService.cropPic({
                    picData: picData,
                    buttonConfirm: "APPLY"
                })
                .then(function(croppedPicData) {
                    if(croppedPicData) {
                        modalService.showSpinner();
                        settingsService.updateSettingsUp({
                                profilePic: croppedPicData
                            })
                            .then(function() {
                                modalService.hideSpinner();
                            })
                            .catch(function(e) {
                                modalService.hideSpinner();
                                modalService.alert({ body: e.message ? e.message : e.toString() });
                            });
                    }
                });
        }
    }

})();
