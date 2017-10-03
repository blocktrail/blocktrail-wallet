(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupContactsCtrl", SetupContactsCtrl);

    function SetupContactsCtrl($scope, Contacts, settingsService, $q, $btBackButtonDelegate, $cordovaDialogs, $translate, $log) {
        $btBackButtonDelegate.rootState = null;

        $scope.syncContacts = function() {
            if ($scope.appControl.syncing) {
                return false;
            }
            $scope.appControl.syncing = true;

            $q.when(Contacts.sync(true))
                .then(function() {
                    //build the cached contacts list
                    return Contacts.list(true);
                })
                .then(function() {
                    //load the settings so we can update them
                    return settingsService.$isLoaded();
                })
                .then(function(list) {
                    settingsService.contactsLastSync = new Date().valueOf();
                    settingsService.permissionContacts = true;
                    settingsService.enableContacts = true;
                    settingsService.contactsWebSync = false;
                    return settingsService.$store();
                })
                .then(function() {
                    $scope.appControl.syncing = false;
                    $scope.appControl.syncComplete = true;
                })
                .catch(function(err) {
                    $log.error(err);
                    //check if permission related error happened and update settings accordingly
                    if (err instanceof blocktrail.ContactsPermissionError) {
                        settingsService.permissionContacts = false;
                        settingsService.$store();
                        $cordovaDialogs.alert(
                            $translate.instant('MSG_CONTACTS_PERMISSIONS'),
                            $translate.instant('PERMISSION_REQUIRED_CONTACTS'),
                            $translate.instant('OK')
                        );
                    }
                    $scope.appControl.syncing = false;
                    $scope.appControl.syncComplete = false;
                });
        };
    }
})();
