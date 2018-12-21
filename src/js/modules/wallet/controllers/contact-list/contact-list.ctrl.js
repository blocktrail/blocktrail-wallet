(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("ContactsListCtrl", ContactsListCtrl);

    function ContactsListCtrl($scope, $state, $q, Contacts, $timeout, $translate,
                      $ionicScrollDelegate, $ionicActionSheet, $ionicLoading, $cordovaDialogs,
                      $log, localSettingsService) {

        var localSettingsData = localSettingsService.getReadOnlyLocalSettingsData();

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
                    'ADVANCED_SEND_OPTIONS',
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
                        { text: transactions['CONTACTS_RESYNC'].sentenceCase() }
                    ],
                    cancelText: transactions['CANCEL'].sentenceCase(),
                    titleText: transactions['ADVANCED_SEND_OPTIONS'].sentenceCase(),
                    destructiveText: transactions['CANCEL'].sentenceCase(),
                    cancel: function() {},
                    buttonClicked: function(index) {
                        if (index == 0) {
                            $ionicLoading.show({template: "<div>{{ 'WORKING' | translate }}...</div><ion-spinner></ion-spinner>", hideOnStateChange: true});
                            $scope.reloadContacts()
                                .then(function() {
                                    $ionicLoading.hide();
                                }, function(err) {
                                    $ionicLoading.hide();
                                    return $cordovaDialogs.alert(err.toString(), $scope.translations['ERROR'].sentenceCase(), $scope.translations['OK']);
                                });
                            return true;

                            $scope.contactsWithWalletOnly = true;
                            $scope.contactsWithPhoneOnly = false;
                            //$scope.contactsWithEmailOnly = false;
                        }
                        $scope.getContacts();
                        return true;
                    },
                    destructiveButtonClicked: function() {
                        return true;
                    }
                });
            });
        };

        $scope.getContacts = function(forceRebuild) {
            // TODO @Roman replace localSettingsService.isEnableContacts
            //if user manages to get here (i.e. after verifying phone) automatically enable contacts and force a first sync
            if (!localSettingsData.isEnableContacts) {
                return $scope.reloadContacts();
            }

            return $scope.getTranslations()
                .then(function() {
                    return $q.when(Contacts.list(forceRebuild));
                })
                .then(function(list) {
                    var data = {
                        isEnableContacts: true,
                        isPermissionContacts: true
                    };

                    localSettingsService.setLocalSettings(data)
                        .then(function() {
                            $scope.contacts = list.contacts.filter(function(contact) {
                                var walletOnlyFilter = ($scope.contactsWithWalletOnly && contact.matches.length || !$scope.contactsWithWalletOnly); //apply the walletOnly filter if enabled
                                var phoneOnlyFilter = ($scope.contactsWithPhoneOnly && contact.phoneNumbers || !$scope.contactsWithPhoneOnly);      //apply the phoneOnly filter if enabled
                                return walletOnlyFilter && phoneOnlyFilter;
                            });
                            return $q.when($scope.contacts);
                        });
                })
                .catch(function(err) {
                    $log.error(err);
                    if (err instanceof blocktrail.ContactsPermissionError) {
                        var data = {
                            isEnableContacts: false,
                            isPermissionContacts: false,
                            isContactsWebSync: false
                        };

                        localSettingsService.setLocalSettings(data)
                            .then(function() {
                                $scope.$broadcast('scroll.refreshComplete')
                            });
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
                    var data = {
                        isEnableContacts: true,
                        isPermissionContacts: true,
                        isContactsWebSync: true,
                        contactsLastSync: new Date().valueOf()
                    };

                    localSettingsService.setLocalSettings(data)
                        .then(function() {
                            $scope.$broadcast('scroll.refreshComplete')
                        });
                })
                .catch(function(err) {
                    $log.error(err);

                    if (err instanceof blocktrail.ContactsPermissionError) {
                        var data = {
                            isEnableContacts: false,
                            isPermissionContacts: false,
                            isContactsWebSync: false
                        };

                        localSettingsService.setLocalSettings(data)
                            .then(function() {
                                $scope.$broadcast('scroll.refreshComplete')
                            });

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
            }
        };

        //init controller
        $timeout(function() {
            $scope.getContacts();
        });

    }
})();
