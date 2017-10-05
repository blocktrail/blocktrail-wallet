(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsProfileCtrl", SettingsProfileCtrl);

    function SettingsProfileCtrl($scope, settingsService, $btBackButtonDelegate, $ionicActionSheet,
                          $translate, $cordovaImagePicker, $cordovaCamera, $timeout, $log) {
        $scope.appControl = {
            showImageCrop: false
        };
        $scope.photoSelectOptions = {
            maximumImagesCount: 1,
            width: 800,
            height: 0,
            quality: 80
        };
        $scope.photoTakeOptions = {
            quality: 80,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: Camera.PictureSourceType.CAMERA,
            allowEdit: false,
            encodingType: Camera.EncodingType.JPEG,
            targetWidth: 800,
            targetHeight: 800,
            popoverOptions: (typeof CameraPopoverOptions == "undefined") ? null : CameraPopoverOptions,
            saveToPhotoAlbum: true
        };
        $scope.newProfileImage = '';
        $scope.croppedProfileImage = '';

        $scope.showPhotoCrop = function() {
            $scope.appControl.showImageCrop = true;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                    $scope.dismissPhotoCrop();
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.dismissPhotoCrop();
                });
            }, true);
        };

        $scope.dismissPhotoCrop = function() {
            $scope.appControl.showImageCrop = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };

        $scope.updatePicture = function() {
            // Show the action sheet
            $ionicActionSheet.show({
                buttons: [
                    { text: $translate.instant('SETTINGS_TAKE_PHOTO') },
                    { text: $translate.instant('SETTINGS_CHOOSE_PHOTO') }
                ],
                cancelText: $translate.instant('CANCEL'),
                cancel: function() {},
                buttonClicked: function(index) {
                    $scope.newProfileImage = '';
                    $scope.croppedProfileImage = '';

                    if (index == 0) {
                        //take photo
                        $cordovaCamera.getPicture($scope.photoTakeOptions).then(function(imageData) {
                            $scope.newProfileImage = "data:image/jpeg;base64," + imageData;
                            $scope.showPhotoCrop();
                        }, function(err) {
                            $log.error(err);
                        });
                    }
                    else if (index == 1) {
                        //select picture
                        $cordovaImagePicker.getPictures($scope.photoSelectOptions)
                            .then(function(results) {
                                if (results[0]) {
                                    //convert image URL into data URL
                                    var img = new Image();
                                    img.crossOrigin = 'Anonymous';
                                    img.onload = function() {
                                        var canvas = document.createElement('CANVAS');
                                        var ctx = canvas.getContext('2d');
                                        canvas.height = this.height;
                                        canvas.width = this.width;
                                        ctx.drawImage(this, 0, 0);
                                        $timeout(function() {
                                            $scope.newProfileImage = canvas.toDataURL('image/jpeg');
                                            canvas = null;
                                        });
                                    };
                                    img.src = results[0];

                                    $scope.showPhotoCrop();
                                }
                            }, function(err) {
                                $log.error(err);
                            });
                    }
                    return true;
                }
            });
        };

        $scope.assignProfileImage = function(dataURL) {
            settingsService.profilePic = dataURL;
            settingsService.$store().then(function() {
                //try to update the server with the new profile
                settingsService.$syncProfileUp();
            });

            $scope.dismissPhotoCrop();
        };

        $scope.removePicture = function() {
            // Show the action sheet
            $ionicActionSheet.show({
                destructiveText: $translate.instant('SETTINGS_REMOVE_PHOTO'),
                cancelText: $translate.instant('CANCEL'),
                cancel: function() {},
                destructiveButtonClicked: function() {
                    settingsService.profilePic = null;
                    settingsService.$store().then(function() {
                        //try to update the server with the new profile
                        settingsService.$syncProfileUp();
                    });
                    return true;
                }
            });
        };

        $scope.updateSettings = function(){
            settingsService.$store();
        };
    }
})();
