(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("ContactsListCtrl", ContactsListCtrl);

    function ContactsListCtrl($scope, $state, $q, Contacts, $timeout, $translate,
                      $ionicScrollDelegate, $ionicActionSheet, $ionicLoading, $cordovaDialogs,
                      $log, settingsService, $cordovaSms) {
        $scope.contactsFilter = {};
        $scope.contactsWithWalletOnly = true;
        $scope.contactsWithPhoneOnly = true;
        $scope.contactsWithEmailOnly = false;
        $scope.translations = null;
        $scope.smsOptions = {
            replaceLineBreaks: false, // true to replace \n by a new line, false by default
            android: {
                intent: 'INTENT'  // send SMS with the native android SMS messaging
                //intent: '' // send SMS without open any other app
            }
        };

        $scope.getTranslations = function() {
            if ($scope.translations) {
                return $q.when($scope.translations);
            } else {
                var requiredTranslations = [
                    'OK',
                    'CANCEL',
                    'ERROR',
                    'CONTACTS_FILTER_TITLE',
                    'CONTACTS_SHOW_ALL',
                    'CONTACTS_WALLETS_ONLY',
                    'CONTACTS_RESYNC',
                    'MSG_CONTACTS_PERMISSIONS',
                    'PERMISSION_REQUIRED_CONTACTS',
                    'MSG_INVITE_CONTACT'
                ];
                return $translate(requiredTranslations).then(function(translations) {
                    $scope.translations = translations;
                    return $q.when(translations);
                });
            }
        };

        //NB: navbar button has to be declared in parent, so parent scope function is bound
        $scope.$parent.showFilterOptions = function() {
            $scope.getTranslations().then(function(transactions) {
                $scope.hideFilterOptions = $ionicActionSheet.show({
                    buttons: [
                        { text: transactions['CONTACTS_SHOW_ALL'].sentenceCase() },
                        { text: transactions['CONTACTS_WALLETS_ONLY'].sentenceCase() }
                    ],
                    cancelText: transactions['CANCEL'].sentenceCase(),
                    titleText: transactions['CONTACTS_FILTER_TITLE'].sentenceCase(),
                    destructiveText: transactions['CONTACTS_RESYNC'].sentenceCase(),
                    cancel: function() {},
                    buttonClicked: function(index) {
                        if (index == 0) {
                            $scope.contactsWithWalletOnly = false;
                            $scope.contactsWithPhoneOnly = true;
                            //$scope.contactsWithEmailOnly = false;
                        }
                        else if (index == 1) {
                            $scope.contactsWithWalletOnly = true;
                            $scope.contactsWithPhoneOnly = true;
                            //$scope.contactsWithEmailOnly = false;
                        }
                        $scope.getContacts();
                        return true;
                    },
                    destructiveButtonClicked: function() {
                        $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});
                        $scope.reloadContacts()
                            .then(function() {
                                $ionicLoading.hide();
                            }, function(err) {
                                $ionicLoading.hide();
                                return $cordovaDialogs.alert(err.toString(), $scope.translations['ERROR'].sentenceCase(), $scope.translations['OK']);
                            });
                        return true;
                    }
                });
            });
        };

        $scope.getContacts = function(forceRebuild) {
            //if user manages to get here (i.e. after verifying phone) automatically enable contacts and force a first sync
            if (!settingsService.enableContacts) {
                settingsService.enableContacts = true;
                settingsService.contactsWebSync = true;
                return $scope.reloadContacts();
            }

            return $scope.getTranslations()
                .then(function() {
                    return $q.when(Contacts.list(forceRebuild));
                })
                .then(function(list) {
                    settingsService.permissionContacts = true;      //ensure iOS permissions are up to date
                    settingsService.$store();

                    $scope.contacts = list.contacts.filter(function(contact) {
                        var walletOnlyFilter = ($scope.contactsWithWalletOnly && contact.matches.length || !$scope.contactsWithWalletOnly); //apply the walletOnly filter if enabled
                        var phoneOnlyFilter = ($scope.contactsWithPhoneOnly && contact.phoneNumbers || !$scope.contactsWithPhoneOnly);      //apply the phoneOnly filter if enabled
                        return walletOnlyFilter && phoneOnlyFilter;
                    });
                    return $q.when($scope.contacts);
                })
                .catch(function(err) {
                    $log.error(err);
                    if (err instanceof blocktrail.ContactsPermissionError) {
                        settingsService.permissionContacts = false;      //ensure iOS permissions are up to date
                        settingsService.enableContacts = false;
                        settingsService.$store();
                        $cordovaDialogs.alert($scope.translations['MSG_CONTACTS_PERMISSIONS'].sentenceCase(), $scope.translations['PERMISSION_REQUIRED_CONTACTS'].sentenceCase(), $scope.translations['OK'])
                    }

                    return $q.reject(err);
                });
        };

        $scope.toggleWalletContacts = function(state) {
            $scope.contactsWithWalletOnly = (typeof state == "undefined") ? !$scope.contactsWithWalletOnly : !!state;
            $scope.getContacts().then(function() {
                $ionicScrollDelegate.scrollTop();
            });
        };

        $scope.reloadContacts = function() {
            //resync and rebuild the contacts list
            return Contacts.sync(true)
                .then(function() {
                    return $scope.getContacts(true);
                }).then(function() {
                    settingsService.permissionContacts = true;      //ensure iOS permissions are up to date
                    settingsService.contactsLastSync = new Date().valueOf();
                    settingsService.$store();
                    return $q.when($scope.$broadcast('scroll.refreshComplete'));
                })
                .catch(function(err) {
                    $log.error(err);
                    if (err instanceof blocktrail.ContactsPermissionError) {
                        settingsService.enableContacts = false;
                        settingsService.permissionContacts = false; //ensure iOS permissions are up to date
                        settingsService.$store();
                        $cordovaDialogs.alert($scope.translations['MSG_CONTACTS_PERMISSIONS'].sentenceCase(), $scope.translations['PERMISSION_REQUIRED_CONTACTS'].sentenceCase(), $scope.translations['OK'])
                    }
                    return $q.when($scope.$broadcast('scroll.refreshComplete'));
                });
        };

        $scope.selectContact = function(contact) {
            //if the contact has a wallet, select them
            $log.debug(contact);
            if (contact.matches.length > 0) {
                $scope.sendInput.recipient = contact;
                $scope.sendInput.recipientDisplay = contact.displayName;
                $scope.sendInput.recipientSource = 'Contacts';

                $timeout(function() {
                    $state.go('^');
                }, 300);
            } else {
                //otherwise invite them
                $scope.getTranslations()
                    .then(function() {
                        return $cordovaSms.send(contact.phoneNumbers[0].number, $scope.translations['MSG_INVITE_CONTACT'], $scope.smsOptions);
                    })
                    .catch(function(err) {
                        // An error occurred
                        $log.error(err);
                    });
            }
        };

        //init controller
        $timeout(function() {
            $scope.getContacts();
        });

    }
})();
