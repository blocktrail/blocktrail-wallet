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

    function ProfilePictureCtrl($scope, $window, $q, $cordovaImagePicker, $cordovaCamera, $translate, modalService, settingsService) {
        var picSelectOptions = {
            targetWidth: 800,
            targetHeight: 0,
            quality: 80,
            sourceType: $window.Camera.PictureSourceType.PHOTOLIBRARY
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
            _checkPermission(true).then(function (hasReadPermission) {
                if (!hasReadPermission) {
                    return;
                } else {

                    // Do not test it with live reload, img.src = results[0] doesn't work because of cross-domain request
                    $cordovaCamera.getPicture(picSelectOptions)
                        .then(function(result) {
                            if (result) {
                                // convert image URL into data URL
                                var img = new Image();
                                img.crossOrigin = "Anonymous";
                                img.onload = function () {
                                    var canvas = document.createElement('CANVAS');
                                    var ctx = canvas.getContext('2d');
                                    canvas.height = this.height;
                                    canvas.width = this.width;
                                    ctx.drawImage(this, 0, 0);
                                    var picData = canvas.toDataURL('image/jpeg');
                                    canvas = null;
                                    showPicCrop(picData);
                                };
                                img.src = result;
                            }
                        });
                }
            }).catch(function (e) {
                modalService.hideSpinner();
                modalService.alert({body: e.message ? e.message : e.toString()});
            })
        }

        function _checkPermission(requestPermission) {
            var deferred = $q.defer();
            // Request permission
            var permissions = cordova.plugins.permissions;
            var requiredPermissions = [permissions.CAMERA, permissions.READ_EXTERNAL_STORAGE, permissions.WRITE_EXTERNAL_STORAGE];

            permissions.hasPermission(requiredPermissions, function (status) {
                if (!status.hasPermission) {
                    var potentialErr = $translate.instant('PERMISSION_REQUIRED_PHOTOS');
                    if (requestPermission) {
                        permissions.requestPermissions(requiredPermissions,
                            function () {
                                deferred.resolve(true);
                            }, function () {
                                deferred.reject(new Error(potentialErr));
                            });
                    } else {
                        deferred.reject(new Error(potentialErr));
                    }
                } else {
                    deferred.resolve(true);
                }
            });


            return deferred.promise;
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
                        modalService.showSpinner();

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
