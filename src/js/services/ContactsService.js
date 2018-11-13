angular.module('blocktrail.wallet').factory(
    'Contacts',
    function($log, $rootScope, $translate, settingsService, localSettingsService, launchService, sdkService, storageService, $q) {
        var localSettingsData = localSettingsService.getReadOnlyLocalSettingsData();

        var Contacts = function() {
            var self = this;

            self.contactsCache = storageService.db('contacts');

            self._list = null;
        };

        /**
         * get the list of contacts, with their avatars and presence of a Wallet
         * @param forceFetch
         * @returns {*}
         */
        Contacts.prototype.list = function(forceFetch) {
            var self = this;

            if (!self._list || forceFetch) {
                self._list = self.buildList();
            }

            return self._list;
        };

        /**
         * builds the list of contacts with Wallet matches and avatars assigned to each
         * @returns {*}     promise, resolves to object with list of contacts and list of contacts by their hashes
         */
        Contacts.prototype.buildList = function() {
            var self = this;

            return $q.when(self.contactsCache.get('synced'))
                .then(function(syncedDoc) {
                    return syncedDoc;
                }, function() {
                    $log.debug('contacts list: no previous sync');
                    return {_id: "synced", lastSynced: 0, synced: [], matches: [], avatars: {}};
                })
                .then(function(syncedDoc) {
                    syncedDoc.avatars = syncedDoc.avatars || {};

                    return self.getContacts()
                        .then(function(contacts) {
                            $log.debug('buildList', contacts);

                            var t = (new Date).getTime();

                            var contactsByHash = {};

                            // async.forEachLimit but with promises
                            return QforEachLimit(
                                contacts, 25,
                                function(contact) {
                                    contact.hashes = (contact.phoneNumbers || []).map(function(phoneNumber) {
                                        try {
                                            return CryptoJS.SHA256(self.formatE164(phoneNumber)).toString();
                                        } catch (e) {
                                            $log.error("[" + contact.displayName + "] [" + phoneNumber + "] :: " + e);
                                            return null;
                                        }
                                    }).clean().unique();

                                    contact.matches = contact.hashes.filter(function(hash) {
                                        if (contactsByHash[hash]) {
                                            $log.error('duplicate contacts [' + contact.displayName + '] and [' + contactsByHash[hash].displayName + ']');
                                        }

                                        contactsByHash[hash] = contact;

                                        return syncedDoc.matches.indexOf(hash) !== -1;
                                    });

                                    return contact;
                                })
                                .then(function(results) {
                                    // contacts are modified in place (they're objects) so we don't really care much for the return value

                                    // add contact avatar from sync list
                                    Object.keys(syncedDoc.avatars).forEach(function(hash) {
                                        if (contactsByHash[hash]) {
                                            contactsByHash[hash].avatarUrl = syncedDoc.avatars[hash];
                                        }
                                    });

                                    $log.debug('buildList took [' + ((new Date).getTime() - t) + 'ms]');

                                    return {contacts: contacts, contactsByHash: contactsByHash};
                                })
                            ;
                        });
                });
        };

        Contacts.prototype._checkPermission = function(requestPermission) {
            var deferred = $q.defer();
            // Request permission
            var permissions = cordova.plugins.permissions;
            permissions.hasPermission(permissions.READ_CONTACTS, function (status) {
                if (!status.hasPermission) {
                    var potentialErr = $translate.instant('PERMISSION_REQUIRED_CONTACTS');
                    if (requestPermission) {
                        permissions.requestPermission(permissions.READ_CONTACTS,
                            function () {
                                deferred.resolve(true);
                            }, function () {
                                deferred.reject(new blocktrail.ContactsPermissionError(potentialErr));
                        });
                    } else {
                        deferred.reject(new blocktrail.ContactsPermissionError(potentialErr));
                    }
                } else {
                    deferred.resolve(true);
                }
            });

            return deferred.promise;
        };

        Contacts.prototype.sync = function(forceAll, forcePermissionRequest) {
            var self = this;

            return $q.all([self.contactsCache.get('synced'), self._checkPermission(forcePermissionRequest)])
                .then(function(syncedDoc) {
                    $log.debug('contacts: notfirst sync');
                    return syncedDoc[0];
                }, function() {
                    $log.debug('contacts: first sync');
                    return {_id: "synced", lastSynced: 0, synced: [], matches: [], avatars: {}};
                })
                .then(function(syncedDoc) {
                    syncedDoc.avatars = syncedDoc.avatars || {};

                    return launchService.getAccountInfo()
                        .then(function(accountInfo) {
                            return $q.when(accountInfo.new_secret)
                                .then(function(newSecret) {
                                    // if a new secret is created then we need to resync everything
                                    if (newSecret) {
                                        forceAll = true;
                                        return launchService.setAccountInfo({ newSecret: false });
                                    }
                                })
                                .then(function() {
                                    //get a fresh list of contacts
                                    return self.list(true).then(function(list) {
                                        var contacts = list.contacts;
                                        var contactsByHash = list.contactsByHash;

                                        var syncContactsByHash = {};

                                        contacts.map(function(contact) {
                                            contact.hashes.forEach(function(hash) {
                                                if (hash && (forceAll || syncedDoc.synced.indexOf(hash) === -1) && !syncContactsByHash[hash]) {
                                                    syncContactsByHash[hash] =
                                                        localSettingsData.contactsWebSync ?
                                                            CryptoJS.AES.encrypt(contact.displayName, accountInfo.secret).toString() :
                                                            "";
                                                }
                                            });
                                        });

                                        // TODO CHECK IT
                                        return $q.when(sdkService.getGenericSdk()).then(function(sdk) {
                                            return sdk.syncContacts({
                                                contacts: syncContactsByHash,
                                                category: 'phone',
                                                last_synced: syncedDoc.lastSynced
                                            }).then(function(result) {
                                                $log.debug("contact updates", result.contacts.length);

                                                syncedDoc.lastSynced = result.last_synced;
                                                syncedDoc.synced = syncedDoc.synced.concat(Object.keys(syncContactsByHash)).unique();

                                                result.contacts.forEach(function(contact) {
                                                    if (contactsByHash[contact.phone_number_hash]) {
                                                        syncedDoc.matches.push(contact.phone_number_hash);
                                                        syncedDoc.avatars[contact.phone_number_hash] = contact.avatar_url;
                                                    }
                                                });

                                                syncedDoc.matches = syncedDoc.matches.unique();

                                                return self.contactsCache.put(syncedDoc);
                                            });
                                        });
                                    });
                                });
                        });
                });
        };

        /**
         * access the contacts on the device
         * @returns {*}
         */
        Contacts.prototype.getContacts = function(forcePermissionRequest) {
            var self = this;
            var deferred = $q.defer();

            $q.when(self._checkPermission(forcePermissionRequest))
                .then(function () {
                    navigator.contactsPhoneNumbers.list(function(contacts) {
                        contacts.sort(function(a, b) {
                            if (a.displayName < b.displayName) return -1;
                            if (a.displayName > b.displayName) return 1;
                            return 0;
                        });

                        $log.debug('contacts[' + contacts.length + ']');
                        deferred.resolve(contacts);
                    }, function(err) {
                        $log.error('contacts ERR ' + err);

                        if (err == "unauthorized") {
                            return deferred.reject(new blocktrail.ContactsPermissionError(err));
                        } else {
                            return deferred.reject(new blocktrail.ContactsError(err));
                        }
                    });
                }).catch(function () {
                    deferred.resolve([]);
                });

            return deferred.promise;
        };

        Contacts.prototype.formatE164 = function(phoneNumber, defaultRegionCode) {
            defaultRegionCode = typeof defaultRegionCode === 'undefined' ? localSettingsData.phoneCountryCode : defaultRegionCode;

            phoneNumber = phoneNumber.normalizedNumber || phoneNumber.number || phoneNumber;

            var options = [phoneNumber];

            if (phoneNumber.substr(0, 1) == "+") {
                // -
            } else if (defaultRegionCode) {
                options.push("+" + defaultRegionCode + phoneNumber);
            }

            if (phoneNumber.substr(0, 2) == "00") {
                options.push("+" + phoneNumber.substr(2));
            }

            var isPossibleNumber = false;

            var result = options.any(function(phoneNumber) {
                if (!phoneUtils.isPossibleNumber(phoneNumber)) {
                    return;
                } else {
                    isPossibleNumber = true;
                }

                if (phoneUtils.isValidNumber(phoneNumber)) {
                    return phoneUtils.formatE164(phoneNumber);
                }
            });

            if (!result) {
                if (!isPossibleNumber) {
                    throw new Error("Is not a possible phonenumber [" + phoneNumber + "]!");
                } else {
                    throw new Error("Can't normalize this phonenumber [" + phoneNumber + "]!");
                }

            }

            return result;
        };

        /**
         * find a contact by a phone hash
         * @param hash
         * @returns {*}
         */
        Contacts.prototype.findByHash = function(hash) {
            var self = this;

            return self.list().then(function(list) {
                return list.contactsByHash[hash];
            });
        };

        /**
         * get a bitcoin address to send to for a contact
         * @param contact
         * @param hashIndex
         * @returns {*}
         */
        Contacts.prototype.getSendingAddress = function(sdk, contact, hashIndex) {
            var self = this;
            hashIndex = hashIndex ? hashIndex: 0;

            return sdk.requestContactAddress(contact.hashes[hashIndex]).then(function(result) {
                return result;
            }, function(err) {
                //if more than one phone hash try them all
                if (contact.hashes.length > hashIndex+1) {
                    hashIndex++;
                    return self.getSendingAddress(contact, hashIndex);
                } else {
                    $log.error('contacts ERR ' + err);
                    throw err;
                }
            });
        };

        /**
         * clear all cached data for contacts
         */
        Contacts.prototype.clearCache = function() {
            var self = this;
            return storageService.reset('contacts').then(function(newCache) {
                return $q.when(self.contactsCache = newCache);
            });
        };


        // when not enabled return a mock object
        if (typeof navigator.contactsPhoneNumbers === "undefined") {
            $log.debug('MOCKING CONTACTS');

            Contacts.prototype.getContacts = function() {
                return $q.when(true).then(function() {
                    return [];
                });
            };
        }

        return new Contacts();
    }
);
