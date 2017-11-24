(function() {
    "use strict";

    // TODO Add later
    angular.module("blocktrail.core")
        .factory("walletBackupService", function($q, $log, $window,  $translate, $cordovaFile, $cordovaFileOpener2, sdkService) {
            return new WalletBackupService($q, $log, $window, $translate, $cordovaFile, $cordovaFileOpener2, sdkService);
        });

    function WalletBackupService($q, $log, $window, $translate, $cordovaFile, $cordovaFileOpener2, sdkService) {
        var self = this;

        self._$q = $q;
        self._$log = $log;
        self._$window = $window;
        self._$translate = $translate;
        self._$cordovaFile = $cordovaFile;
        self._$cordovaFileOpener2 = $cordovaFileOpener2;
        self._sdkService = sdkService;
    }

    /**
     * Email the backup PDF
     * @param walletBackupData
     * @param extraInfo
     * @return {*}
     */
    WalletBackupService.prototype.emailBackupPdf = function(walletBackupData, extraInfo) {
        var self = this;

        self._$log.debug("M:CORE:walletBackupService:emailBackupPdf", walletBackupData.identifier);

        return self._generatePdf(walletBackupData, extraInfo)
            .then(self._emailPdf.bind(self, walletBackupData));
    };

    /**
     * Open the backup PDF
     * @param walletBackupData
     * @param extraInfo
     * @return {*}
     */
    WalletBackupService.prototype.openBackupPdf = function(walletBackupData, extraInfo) {
        var self = this;

        self._$log.debug("M:CORE:walletBackupService:openBackupPdf", walletBackupData.identifier);

        return self._generatePdf(walletBackupData, extraInfo)
            .then(self._openPdf.bind(self, walletBackupData));
    };

    /**
     * Clear the backup PDF, remove the file
     * @param identifier
     * @return {*}
     */
    WalletBackupService.prototype.clearBackupPdf = function(identifier) {
        var self = this;

        self._$log.debug("M:CORE:walletBackupService:openBackupPdf", walletBackupData.identifier);

        return self._$cordovaFile.removeFile(self._preparePath() + self._prepareFileName(identifier));
    };

    /**
     * Generate the PDF
     * @param walletBackupData
     * @param extraInfo
     * @return { promise }
     * @private
     */
    WalletBackupService.prototype._generatePdf = function(walletBackupData, extraInfo) {
        var self = this;

        return self._generatePdfFormSdk(walletBackupData, extraInfo)
            .then(self._bufferPdf.bind(self))
            .then(self._writeFilePdf.bind(self, walletBackupData));
    };

    /**
     * Generate the PDF from SDK
     * @param walletBackupData
     * @param extraInfo
     * @return { promise }
     * @private
     */
    WalletBackupService.prototype._generatePdfFormSdk = function(walletBackupData, extraInfo) {
        var self = this;

        var deferred = self._$q.defer();

        var blocktrailPublicKeys = [];
        angular.forEach(walletBackupData.blocktrailPublicKeys, function (blocktrailPublicKey, index) {
          blocktrailPublicKeys.push(blocktrailSDK.bitcoin.HDNode.fromBase58(blocktrailPublicKey.pubKey))
        })

        var backupInfo = {
            encryptedPrimarySeed: walletBackupData.encryptedPrimarySeed,
            encryptedSecret: walletBackupData.encryptedSecret,
            backupSeed: walletBackupData.backupSeed,
            recoveryEncryptedSecret: walletBackupData.recoveryEncryptedSecret,
            walletVersion: walletBackupData.walletVersion,
            blocktrailPublicKeys: blocktrailPublicKeys,
        };

        self._sdkService.getBackupGenerator(walletBackupData.identifier, backupInfo, extraInfo)
            .generatePDF(function(err, pdf) {
                if (err) {
                    return deferred.reject(err);
                }

                deferred.resolve(pdf.output());
            });

        return deferred.promise;
    };

    /**
     * Buffer the PDF
     * @param pdfData
     * @return { ArrayBuffer }
     * @private
     */
    WalletBackupService.prototype._bufferPdf = function(pdfData) {
        // FUNKY ASS HACK
        // https://coderwall.com/p/nc8hia/making-work-cordova-phonegap-jspdf
        var buffer = new ArrayBuffer(pdfData.length);
        var array = new Uint8Array(buffer);

        for (var i = 0; i < pdfData.length; i++) {
            array[i] = pdfData.charCodeAt(i);
        }

        return buffer;
    };

    /**
     * Write PDF to the file
     * @param walletBackupData
     * @param buffer
     * @return {*}
     * @private
     */
    WalletBackupService.prototype._writeFilePdf = function(walletBackupData, buffer) {
        var self = this;

        var path = self._preparePath();
        var fileName = self._prepareFileName(walletBackupData.identifier);

        // save file temporarily
        return self._$cordovaFile.writeFile(path, fileName, buffer, true);
    };

    /**
     * Prepare the path
     * @return { string | null }
     * @private
     */
    WalletBackupService.prototype._preparePath = function() {
        var self = this;

        return self._$window.cordova ? (self._$window.ionic.Platform.isAndroid() ? self._$window.cordova.file.externalDataDirectory : self._$window.cordova.file.documentsDirectory) : null;
    };

    /**
     * Prepare the name
     * @param identifier
     * @return { string }
     * @private
     */
    WalletBackupService.prototype._prepareFileName = function(identifier) {
        return "btc-wallet-backup-" + identifier + ".pdf";
    };

    /**
     * Email the PDF
     * @param walletBackupData
     * @return { promise }
     * @private
     */
    WalletBackupService.prototype._emailPdf = function(walletBackupData) {
        var self = this;

        // email the backup pdf
        var options = {
            to: "",
            attachments: [
                self._preparePath() + self._prepareFileName(walletBackupData.identifier)
            ],
            subject: self._$translate.instant("MSG_BACKUP_EMAIL_SUBJECT_1"),
            body: self._$translate.instant("MSG_BACKUP_EMAIL_BODY_1"),
            isHtml: true
        };

        var deferred = self._$q.defer();

        // check that emails can be sent (try with normal mail, can't do attachments with gmail)
        self._$window.cordova.plugins.email.isAvailable(function(isAvailable) {
            if (isAvailable) {
                self._$window.cordova.plugins.email.open(options, function(result) {
                    deferred.resolve(result);
                });
            } else {
                // no mail support ...sad times :(
                deferred.reject("MSG_EMAIL_NOT_SETUP");
            }
        });

        return deferred.promise;
    };

    /**
     * Open the PDF
     * @param walletBackupData
     * @private
     */
    WalletBackupService.prototype._openPdf = function(walletBackupData) {
        var self = this;

        if (ionic.Platform.isIOS()) {
            self._$window.cordova.plugins.disusered.open(self._preparePath() + self._prepareFileName(walletBackupData.identifier));
        } else {
            return self._$cordovaFileOpener2.open(self._preparePath() + self._prepareFileName(walletBackupData.identifier), "application/pdf");
        }
    };
    
})();
