angular.module('blocktrail.wallet').service(
    'settingsServiceOLD',
    function($q, storageService, genericSdkService, $log, $window) {
    // TODO Remove it

    var DEFAULT_ACCOUNT_CREATED = 1478097190;

    var defaultBtcPrecision = $window.innerWidth <= 375 ? 4 : 8;

    var defaults = {
        displayName:  null,
        username:  '',
        email:  null,
        language: null,
        extraLanguages: [],
        localCurrency:  "USD",
        profilePic:  null,
        profileSynced: true,
        profilePosX: 50,
        profilePosY: 50,

        apprateStatus: null,

        showRebrandMessage: true,

        glideraRequest: null,
        glideraAccessToken: null,
        glideraTransactions: [],

        buyBTCRegion: null,

        phoneNumber: null,
        phoneNationalNumber: null,
        phoneRegionCode: null,
        phoneHash: null,
        phoneVerified: false,
        enableContacts: true,       //contacts access and syncing. default to true for previous installs
        contactsLastSync: null,
        contactsWebSync: true,      //enable syncing contacts to web wallet

        // defaults to an arbitrary timestamp prior to when this was added
        // so that we can use this to check for activation of new stuff etc
        accountCreated: DEFAULT_ACCOUNT_CREATED,
        backupSaved: false,
        backupNotifyTimestamp: 0,// notification if backup PDF is not yet saved
        backupSavedPersistent: false,
        backupSkipped: false,

        setupStarted: false,
        setupComplete: false,

        installTracked: false,
        walletActivated: false, // balance > 0

        //display options
        btcPrecision: defaultBtcPrecision,        //show 8 decimals by default, 4 on smaller screens
        vibrateOnTx: true,

        enablePolling: true,    //dev setting - disables auto polling for transactions
        useTestnet: false,      //dev setting - enables testnet for SDK

        latestVersionMobile: null,
        latestOutdatedNoticeVersion: null,
        glideraActivationNoticePending: null,


        permissionUsageData: true,      //permission to send anonymous usage data
        permissionCamera: false,        //iOS camera access
        permissionPhotos: false,        //iOS photo access
        permissionContacts: false,      //iOS contacts access
        permissionNotifications: false, //push notification allowed

        showArchived: false,

        /* PIN lock */
        // TODO Move it to local settings
        pinOnOpen: true,            // ask for pin on each wallet open
        pinFailureCount: 0,         // counter of pin input failures
        pinLastFailure: null        // last pin input failure
    };
    angular.extend(this, defaults);

    var storage = storageService.db('settings');

    this.DEFAULT_ACCOUNT_CREATED = DEFAULT_ACCOUNT_CREATED;

    this._id = "user_settings";

    this._$isLoaded = null;
    /**
     * returns a promise to get the data, does not force update
     * @returns {null|*}
     */
    this.$isLoaded = function() {
        if (!this._$isLoaded) {
            this._$isLoaded = this.$load().then(
                function(r) { return true; },
                function(e) { if (e.status === 404) { return true; } else { $log.error(e); this._$isLoaded = null; } }
            );
        }

        return this._$isLoaded;
    };

    this.getSettings = function() {
        return this.$load();
    };

    /**
     * load the data from the database
     * @returns {*}
     */
    this.$load = function() {
        var self = this;

        return storage.get('user_settings')
            .then(
                function(doc) {
                    return angular.extend(self, doc);
                },
                function() {
                    return angular.extend(self, defaults);
                }
            )
        ;
    };

    /**
     * update database copy of the data
     * @returns {*}     promise
     */
    this.$store = function() {
        var self = this;

        return storage.get('user_settings')
            .then(
                function(doc) { return doc; },
                function() { return {_id: "user_settings"}; }
            )
            .then(function(doc) {
                //update each of the values as defined in the defaults array
                angular.forEach(defaults, function(value, key) {
                    doc[key] = self[key];
                });

                return storage.put(doc).then(function() {
                    return doc;
                });
            })
        ;
    };

    /**
     * update server copy of profile data, and store in settings the success/failure of syncing
     * @returns {*}     promise
     */
    this.$syncProfileUp = function() {
        var self = this;

        return $q.when(genericSdkService.getSdk())
            .then(function(sdk) {
                var profileData = {
                    profilePic: self.profilePic
                };
                return sdk.syncProfile(profileData).then(function(result) {
                    //profile synced successfully
                    return $q.when(self.profileSynced = true);
                }, function(err) {
                    //profile not synced
                    return $q.when(self.profileSynced = false);
                });
            })
            .then(function(result) {
                return storage.get('user_settings').then(function(doc) {
                    doc.profileSynced = self.profileSynced;
                    $log.debug('syncing profile');
                    return storage.put(doc).then(function() {
                        $log.debug('profile synced');
                        return doc;
                    });
                });
            });
    };

    /**
     * update local copy of profile data from server
     * @returns {*}     promise
     */
    this.$syncProfileDown = function() {
        var self = this;

        return $q.when(genericSdkService.getSdk())
            .then(function(sdk) {
                return sdk.getProfile();
            })
            .then(function(result) {
                return storage.get('user_settings').then(function(doc) {
                    //store profile data
                    doc.profilePic = result.profilePic && ("data:image/jpeg;base64, " + result.profilePic) || null;
                    return $q.when(storage.put(doc)).then(function() {
                        //update service attrs
                        self.profilePic = doc.profilePic;
                        return doc;
                    });
                });
            });
    };

    this.$syncSettingsUp = function() {
        var self = this;

        return $q.when(genericSdkService.getSdk())
            .then(function(sdk) {
                var settingsData = {
                    localCurrency: self.localCurrency,
                    username: self.username,
                    email: self.email,
                    walletActivated: self.walletActivated,
                    glideraAccessToken: self.glideraAccessToken,
                    glideraTransactions: self.glideraTransactions || [],
                    buyBTCRegion: self.buyBTCRegion,
                    glideraActivationNoticePending: self.glideraActivationNoticePending,
                    latestVersionMobile: self.latestVersionMobile,
                    showArchived: self.showArchived
                };

                return sdk.syncSettings(settingsData);
            });
    };

    this.$syncSettingsDown = function() {
        var self = this;

        return $q.when(genericSdkService.getSdk())
            .then(function(sdk) {
                return sdk.getSettings();
            })
            .then(function(result) {
                return self.$isLoaded().then(function() {
                    self.localCurrency = result.localCurrency !== null ? result.localCurrency : self.localCurrency;
                    self.username = result.username;
                    self.email = result.email;
                    self.walletActivated = result.walletActivated;
                    self.glideraAccessToken = result.glideraAccessToken;
                    self.glideraTransactions = result.glideraTransactions || [];
                    self.buyBTCRegion = result.buyBTCRegion;
                    self.glideraActivationNoticePending = result.glideraActivationNoticePending;
                    self.latestVersionMobile = result.latestVersionMobile;
                    self.showArchived = result.showArchived;

                    return self.$store();
                });
            });
    };
});
