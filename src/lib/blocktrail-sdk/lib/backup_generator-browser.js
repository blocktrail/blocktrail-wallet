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
            'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAGwAbAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAAeAJoDAREAAhEBAxEB/8QAGwAAAgIDAQAAAAAAAAAAAAAABgcABQIDBAj/xAAaAQACAwEBAAAAAAAAAAAAAAAEBQADBgEC/9oADAMBAAIQAxAAAAHXuMoVAlU5FNpRaPFjnaw+hKHy505WnNBK0kkkkkkkkkkkkkkk8ybLMM9K0XzZe/Ms+TehTnSw4XNFcefcySScFta/aLy8AwRPDw7DJeYHnh8lnnd56SBkqV8oemZepfRJWclaLpuuZKdkrnSt95h9lzskWzdaerD662qlJp2+e1N9V2NeMGimK8zzHs8x11++jz6uxr3zmHyoeKXfm3iwcq1C/UMRSxNVxtwPcrnSpjKGQG0Az50+Vn4yD5Y5QEV581We/8QAJBAAAgMAAgICAQUAAAAAAAAABAUCAwYBEgAVETUQExYgITD/2gAIAQEAAQUCWrbWpMsSyjEG6c7rsYwoqVqb29wGKnVYc8ndZDItSOMrny1Jv+eeZ1qGMt6F1UfDfRsvrsF9ptCJUJMEDCX8Dja1wgxb11FXydXRBwze33NWyC1sdIdOAxcOwR9OcJcwI0CumnUBWU4+ishx6gHzZhihHCEzMy+C+01AEmCfHu61t8ZcTj+N5zL1IfTgN729Njevodf19BZ2/Y2U4+EF0eOd7ov7R9ufIV2V89yfE6C1ySTRAdThauYM/HmNgXOVFw08R+p7HVklCLyQPaKpNGWW5STKNCKpLx9g0DNhy8H7pM5TyOlsDnzsndXNyn0d/n//xAArEQACAgECBAUDBQAAAAAAAAABAgADBBESEyExMxAUIiNRMjRxIDBBUoH/2gAIAQMBAT8BrrNrbVnkrYhJPCeHDtA1lVTXHRZXhEHW3pHvJO2kaCDEubnpMXHepiW/cx7RU+4zz9fwZT71+5pZ9BmB3D+Jmttq/MwEHN/0O4rXcYrZN3qXkJVxADxZxrbz7PIQ23Y593mJa+2ousrsvuT0couTYhNbjVpY2TUN5PKDKrI1mGoa3Qzg1/1EzERHGyIxfH1PxMDuH8TKr4lRAmHeKztboZ18c/tiJptGkv7TTD04ImZ2TD9p/kxeysP3gmR2m8ACOk1f5lOObm6xlC1lR8TBGlh8L8MP6k5Tay8pg67zrMpnRNUMavi17XnFtxfb6ygu662fzGD4Z1Q8oofM+s8peutRUTHG2oCFD5oNLxrWwnAaf//EADARAAEDAgQEBAQHAAAAAAAAAAEAAgMEEQUSEyEUMUFRECIzcRUjYfAgMDQ1UpGx/9oACAECAQE/AZpmwNzuQxGAqRoA1o+f+puIQuNgpp2QDM9S4iCMsI3UVMGjPObn68ka+nbsCq6qjnYGs/Mq4XTx5Gr4XL1IU/yKbK3foofUb7rFPSHusOYHT79FicpFox+CKN0rwxqeykp/I+7ip9IuGgjTwUzRr7nsmwU1UCIdnKCPNMI3qWKmpn2k3+idRwyASxmzeqiZRzHTaDdOopQSAq9zmQ3abLXm/mf7WHySSRnOpGCOqyt7rFPSHuqKURTAlV9MZmhzOYRFufjhltY+ykvnN1TW1mX7rEL8QbqgvxDbIW4/buq79Q5N/bz99VSeuzwJB5qzOyqKptO3kmOLpg491iZvEPfwpsQMYySboOa8XssStpi3dULI5JLSC6ZLoy540IYK35u4VSI435YuiY6OvFpB5gnmLD/TF3FUz7TtcVVuzTuIQkHBFn3zVMcszSuJYv/EAD0QAAIBAwIDAwcGDwAAAAAAAAECAwAEERITITFRIjJhBRRBUnFzwRAVQoGRkiAjMDM0Q1NicpOhsbLC0f/aAAgBAQAGPwLYh068Z7RokCJvAPXzfdZMbtt4fnE3UdKeRtrSg1HtU0UGnUq6u0cUZPKMiLboNRCNzrzbyZF5rBnCiFcO9a2jAJ9d+NSyXAUK0ekYbPp/Kb8qsy6SMJzo6YJyfED/ALSzTOkWqTdwTz48hV17pv7VP7n4imC/rXCfH4VPdsMup0L4dfwJLiU9hBW/bmGytz3NYyT/AEqX5xMZZTwdORFSDyYEgtkON6Uc6jbyht3Vq5xuRjBFTXVuwyE1I1I1sYoNPB5pB3j4CprG7h3r0cItPDUa87llgkiHejVeVI7NoZlBK9KCSxrKug9lxkV+hW/8oVF5sqxOy5dE5DpW7Jxc27ZPXgan9z8RUqIMyJ+MUeypIJzphl+kfomgykMD6R8sWO7vDP2GoNvuaBp9mKvdPPaaodPPU2r25q51fu4+8K7XPYFWnsP+RqD+D/U1ee7rnWVfSeoNfn3++aOqUKo4u3M1NDGNKLCVA+qp8/sviPka4tGEMh4sjd00U3MY9U1PrcsNrr4ikktZdo6wGNC3ujlmQamX1uooWZaG5jHc1A8BTyXpjfd7qoOAXpTyWsqSWkhztSeikNzJHFZxnJjizk1cQx4XsYHQVbRtjIB5e01FcZGgJ9fdNXSDmyemu9H9pr//xAAmEAACAgECBgMAAwAAAAAAAAABEQAhMUFRYXGBkaHBELHwIDDx/9oACAEBAAE/IQTK8QIQ2QF5R7iDdPFhJQ4A5GocsOlF0A9pmdxUTA9zOccBNyqEWR3UCSLvaAttK+6b2WhEPr+wcG6oCx5kQKhtAEHrAjUtKNYb1qfg755qRWkzI2soTwMfwsvrz/BcJgrJOgHMxn6UQepd6g8eesjk+dBMrfSE+x7KXQptHsL5i94QoAUYIKR8y6FNTeFGgFagPZwVQqTVJFuo1Xwa5zyBXIw+lADYjEbyui6tDP2vqN+BRWWWjvtH3IYbJAD6pzzUmuoANTkOzjWdBGIO/A+hL8JAjB+QAM30aCARa2KFDC7stlfiac0ji+lNCN9X/SAAdQ2YXhQCQVsHAAc+shDO6I1Tm/aB+OBJbQJKOHGcMkdAHCIQzx8TvOOmakLEHNpItAmvCUSMg4KoWQXit4EQJrwn2TMngxobdrgSoWzBM+u8TCuCSS/auDLpBAXr9vpEmGg8ABELITw4SuEkJnQQz4BoBwn7j1P/2gAMAwEAAgADAAAAEI//AKoSSSSSSoOGyQfNXzYu6bGTBhrbn0SxxANuPSP/xAAoEQEAAgECBAUFAQAAAAAAAAABABFBITFRYcHwgZGhseEQIHHR8TD/2gAIAQMBAT8Qz4iZZT4zGRa1w8ThrvHTqjXeKd8L1ihgGujOUoVu9YNbzMLspK35n+lX1KxGrT0P3KAgW38E9O+07jmRFDIOvSKv3NDr9jzbIbeYr/j0iupZk4QXKDl76Q40XJ2R0OLIOaU3XLyNZwaRWXvWUTOQHxfrCKaWUREp31n8QlSKU1D0mUaus7jmRNwGp4fETrWTgwQWP1TpbX0ZRiUS+hwZtHFvz/Upr8vclt8GvG92EfwdGa/xS2JWqnMebNTUM8ZtEiPSOh4dT6KL2yY+IpbTdl6dSGKGusLJIa8+JFdkGN/iI2HgOEeAXh76xoQDgmw3SOnj9sRg10YpmScw78J//8QAKBEBAAIAAwcFAAMAAAAAAAAAAQARITFBUWFxgaGx8BCRwdHhIDDx/9oACAECAQE/EMStZYRalTlMqwLw0Zo7bMnRg+61rLbzhOylrCClLwxPLZtRttg4GXP2iek2GEXhsby3P9lrAbHHxhZkuf1LsbQ7KVnRO88LcwE6C/HzLrYOLv2fwzUGL0hzrCup8wVhp0c783sTGro07e98JYSWNOvV74bIJzWki0G2Q0N7Ziu+a59toGzfpKPCyVz6p0gMWC4y8hWYjU/2H3LlqDguu3jNCgeqM8LcxGcHB5/tQor0Np+RFQp9Skc7dyJau2+NzlR3m6VFcK+7nvTsz3h2x6xLfu7EScX4RVxpRB6Fk3f2JgOy5bIq9qF94ITxT6HBoZJn+wZ1gmTq/DEOUYRNMFodmx5QVArnVY9/iCwTUud7fKhZhqFecq4QBEBm1h5w5zMHjbCyk12IShjfwgp5DNw9Puf/xAAkEAEBAAICAQQCAwEAAAAAAAABEQAhMVFBEGFxgZGhIDCxwf/aAAgBAQABPxCVZCtrLuO94EF4+rEC/KYn66nRPd6IWoEsRKdjdpKHnDEaCrsOgg7oxji1SIVIpgqm+pyXaYvFYDb9Dd7VwWg6830qj7O8Q+hiXVHsv7OO5TQIwE13jQHS5ngQ0PePxjMYEI9u5MO4Lzp9DAd1jUkRwfer7Liz8iLtA90Reo8v8GnTo1TBeVAPnrGTTQSGWpfoHwYzOUMcrIJHy4OPOUVX/EAQKbhIJUoZFOglDcJwhZCEBjqewHGg8iYUeDYNTAYgq2bOHJYt5Qw1VAg0EYtJ4JuRABVtIVUvW8c3BNELfmLL7Y3m67DRglPRuDgFI0ERpjgTgzde4gUBP3/Y9A7Cd1ZsgeVZDyzA5+YtQPQGL4aQqDCKOB2JpPWPoSPlD7X9hkxBP0g9pMYfyRt/6YD+YNwL7/rmffBc9T3n4XAG9sxofkFU8rRzkJO54Tf0YIilfsif5gIAA8XOIomiuqHoC7FSypuUiu1178YLXpuEXv5xokS2f8fR3chPLKCt6BH2y28wWP4M6jENHkjh27KkqCkHBfj5Fql0AMMmaLQ1TTzmu2L1WxRQb5acDDHT7UBxQCtfJ0efGNrZ9EhNhCBQKaM2Zjujl23KeCs2wLmb0ABoYATjAzrpVVNUHz1hWuF7HjScveNSxhAvcH0M/wD/2Q==',
            'jpeg',
            154,
            30
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
                        "This document holds the information and instructions required for you to recover your BTC Wallet should anything happen. \n" +
                        "Print it out and keep it in a safe location; if you lose these details you will never be able to recover your wallet."
                    );

                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Wallet Identifier (" + self.backupInfo.walletVersion + ")");
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
                            pdf.TEXT("BTC Wallet Public Keys");
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
                        "You can recover the bitcoins in your wallet on https://recovery.blocktrail.com using this backup sheet.\n" +
                        "For a more technical aproach on how to recover your wallet yourself, " +
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
