var async = require('async');
var _ = require('lodash');
var fs = require('fs');
var QRCode = require('./qrCode-browser');
var PdfWriter = require('./pdf_writer');
var bowser = require('bowser');

/**
 * @param identifier            string          identifier
 * @param backupInfo            array
 * @param extraInfo             array
 * @param options
 * @constructor
 */
var BackupGenerator = function(identifier, backupInfo, extraInfo, options) {
    var self = this;

    backupInfo = backupInfo || {};
    extraInfo = extraInfo || {};

    self.identifier = identifier;
    self.backupInfo = backupInfo;
    self.extraInfo = extraInfo;
    self.options = _.merge({page1: true, page2: true, page3: true}, options);
    self.blocktrailPublicKeys = [];

    if (backupInfo.blocktrailPublicKeys) {
        _.each(backupInfo.blocktrailPublicKeys, function(pubKey, keyIndex) {
            self.blocktrailPublicKeys.push({
                keyIndex: keyIndex,
                pubKey:   pubKey,
                path:     "M/" + keyIndex + "'"
            });
        });
    }
};

/**
 * determine if current browser supports the saveAs for the PDF backup
 *
 * @return {boolean}
 */
BackupGenerator.saveAsSupported = function() {
    // a whole bunch of mobile OSs that are unsupported
    if (bowser.browser.ios || bowser.browser.blackberry || bowser.browser.firefoxos ||
        bowser.browser.webos || bowser.browser.bada || bowser.browser.tizen || bowser.browser.sailfish) {
        return false;
    }

    if (bowser.browser.android) {
        if (!bowser.browser.chrome) {
            return false;
        }

        if (bowser.browser.version.split('.')[0] < 41) {
            return false;
        }

        // not sure if this is required if the chrome version is >= 41
        if (bowser.browser.osversion.split('.')[0] <= 4) {
            return false;
        }
    }

    return true;
};

/**
 * create an HTML version of the backup document
 *
 */
BackupGenerator.prototype.generateHTML = function(cb) {
    var self = this;

    var data = {
        identifier: self.identifier,
        backupInfo: self.backupInfo,
        totalPubKeys: self.blocktrailPublicKeys.length,
        pubKeysHtml: "",
        extraInfo: _.map(self.extraInfo, function(value, key) {
            if (typeof value !== "string") {
                return value;
            } else {
                return {
                    title: key,
                    value: value
                };
            }
        }),
        options: self.options
    };

    async.forEach(Object.keys(self.blocktrailPublicKeys), function(keyIndex, cb) {
        var pubKey = self.blocktrailPublicKeys[keyIndex];

        QRCode.toDataURL(pubKey.pubKey.toBase58(), {
            errorCorrectLevel: 'medium'
        }, function(err, dataURI) {
            pubKey.qr = dataURI;
            cb(err);
        });
    }, function(err) {
        if (err) {
            return cb(err);
        }

        _.each(self.blocktrailPublicKeys, function(pubKey) {
            data.pubKeysHtml += "<figure><img src='" + pubKey.qr + "' /><figcaption>";
            data.pubKeysHtml += "<span>KeyIndex: " + pubKey.keyIndex + " </span> ";
            data.pubKeysHtml += "<span>Path: " + pubKey.path + "</span>";
            data.pubKeysHtml += "</figcaption></figure>";
        });

        //load and compile the html
        var compiledHtml;
        try {
            compiledHtml = _.template(fs.readFileSync(__dirname + "/resources/backup_info_template.html", {encoding: 'utf8'}));
        } catch (e) {
            return cb(e);
        }

        cb(null, compiledHtml(data));
    });
};

/**
 * create a PDF version of the backup document
 */
BackupGenerator.prototype.generatePDF = function(callback) {
    /* jshint -W101 */
    var self = this;

    var pdf = new PdfWriter();

    var pageTop = function() {
        pdf.YAXIS(30); // top margin
        pdf.IMAGE(
            'data:image/jpeg;base64,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',
            'jpeg',
            183,
            25
        );
    };

    try {
        pdf.setFont('helvetica'); // default font

        pageTop();

        async.series([
            /**
             * page 1
             */
            function(callback) {
                if (self.options.page1) {
                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Wallet Recovery Data Sheet");
                    });

                    pdf.TEXT(
                        "This document holds the information and instructions required for you to recover your Blocktrail wallet should anything happen. \n" +
                        "Print it out and keep it in a safe location; if you lose these details you will never be able to recover your wallet."
                    );

                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Wallet Identifier");
                        pdf.HR(0, 0);
                    });

                    pdf.FONT_SIZE_SUBHEADER(function() {
                        pdf.TEXT_COLOR_GREY(function() {
                            pdf.TEXT(self.identifier);
                        });
                    });

                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Backup Info");
                        pdf.HR(0, 0);
                    });

                    if (self.backupInfo.primaryMnemonic) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Primary Mnemonic");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.primaryMnemonic);
                            });
                        });
                    }

                    if (self.backupInfo.backupMnemonic) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Backup Mnemonic");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.backupMnemonic);
                            });
                        });
                    }

                    if (self.backupInfo.encryptedPrimarySeed) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Encrypted Primary Seed");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.encryptedPrimarySeed);
                            });
                        });
                    }

                    if (self.backupInfo.backupSeed) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Backup Seed");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.backupSeed);
                            });
                        });
                    }

                    if (self.backupInfo.recoveryEncryptedSecret) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Encrypted Recovery Secret");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.recoveryEncryptedSecret);
                            });
                        });
                    }

                    pdf.NEXT_PAGE();
                    pageTop();
                    pdf.YAXIS(10); // need a little extra margin for QR codes

                    pdf.FONT_SIZE_SUBHEADER(function() {
                        pdf.TEXT_COLOR_GREY(function() {
                            pdf.TEXT("BlockTrail Public Keys");
                        });
                        pdf.FONT_SIZE_NORMAL(function() {
                            pdf.TEXT(self.blocktrailPublicKeys.length + " in total");
                        });
                    });
                    pdf.YAXIS(20);

                    async.forEach(Object.keys(self.blocktrailPublicKeys), function(keyIndex, cb) {
                        var pubKey = self.blocktrailPublicKeys[keyIndex];

                        QRCode.toDataURL(pubKey.pubKey.toBase58(), {
                            errorCorrectLevel: 'medium'
                        }, function(err, dataURI) {
                            pubKey.qr = dataURI;
                            cb(err);
                        });
                    }, function(err) {
                        if (err) {
                            return callback(err);
                        }

                        var qrSize = 180;
                        var qrSubtitleheight = 20;

                        Object.keys(self.blocktrailPublicKeys).forEach(function(keyIndex, i) {
                            var pubKey = self.blocktrailPublicKeys[i];

                            var x = i % 3;

                            // move the yPos back up
                            if (i > 0 && x !== 0) {
                                pdf.YAXIS(-qrSize);
                                pdf.YAXIS(-3);
                            }

                            pdf.IMAGE(pubKey.qr, 'jpeg', qrSize, qrSize, x * qrSize);
                            pdf.YAXIS(3);
                            pdf.FONT_SIZE_SMALL(function() {
                                pdf.TEXT("KeyIndex: " + pubKey.keyIndex + " Path: " + pubKey.path, (x * qrSize) + 20, false);
                            });
                        });
                        pdf.YAXIS(qrSubtitleheight);

                        if (self.extraInfo) {
                            _.each(self.extraInfo, function(value, key) {
                                var title;

                                if (typeof value !== "string") {
                                    title = value.title;
                                    value = value.value;
                                } else {
                                    title = key;
                                    // value = value;
                                }

                                pdf.FONT_SIZE_SUBHEADER(function() {
                                    pdf.TEXT_COLOR_GREY(function() {
                                        pdf.TEXT(title);
                                    });
                                    pdf.YAXIS(5);
                                    pdf.FONT_SIZE_NORMAL(function() {
                                        pdf.TEXT(value);
                                    });
                                });
                            });
                        }

                        callback();
                    });
                } else {
                    callback();
                }
            },
            function(callback) {
                if (self.backupInfo.encryptedSecret && self.options.page2) {
                    if (self.options.page1) {
                        pdf.NEXT_PAGE();
                        pageTop();
                    }

                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Backup Info - part 2");
                        pdf.HR(0, 0);
                    });

                    pdf.TEXT("This page needs to be replaced / updated when wallet password is changed!");

                    pdf.FONT_SIZE_SUBHEADER(function() {
                        pdf.TEXT_COLOR_GREY(function() {
                            pdf.TEXT("Password Encrypted Secret");
                        });
                        pdf.YAXIS(5);
                        pdf.FONT_SIZE_NORMAL(function() {
                            pdf.TEXT(self.backupInfo.encryptedSecret);
                        });
                    });
                }

                callback();
            },
            function(callback) {
                if (self.options.page3) {
                    // save some paper
                    // pdf.NEXT_PAGE();
                    // pageTop();

                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Wallet Recovery Instructions");
                        pdf.HR(0, 0);
                    });

                    pdf.TEXT(
                        "For instructions on how to recover your wallet, \n" +
                        "see the 'wallet_recovery_example.php' script in the examples folder of the Blocktrail SDK."
                    );
                }

                callback();
            }
        ], function(err) {
            if (err) {
                return callback(err);
            }

            callback(null, pdf.doc);
        });
    } catch (e) {
        callback(e);
        return;
    }
};

module.exports = BackupGenerator;
