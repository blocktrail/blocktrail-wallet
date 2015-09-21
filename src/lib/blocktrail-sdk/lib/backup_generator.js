var _ = require('lodash');
var htmlToFile = require('html-pdf');
var qrcode = require('qrcode-js/lib/qrcode.js');
var fs = require('fs');

var qrCode = function(text, size, typeNumber, errorCorrectLevel) {
    var qr = qrcode(typeNumber || 4, errorCorrectLevel || 'L');
    qr.addData(text);
    qr.make();
    var base64 = qr.createImgBase64(size);
    var dataURL = 'data:image/gif;base64,' + base64;

    return dataURL;
};

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
                pubKey: pubKey,
                path: "M/" + keyIndex + "'",
                qr: qrCode(pubKey.toBase58(), 3, 10)
            });
        });
    }
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

    _.each(self.blocktrailPublicKeys, function(pubKey) {
        data.pubKeysHtml += "<figure><img src='" + pubKey.qr + "' /><figcaption>";
        data.pubKeysHtml += "<span>KeyIndex: " + pubKey.keyIndex + " </span> ";
        data.pubKeysHtml += "<span>Path: " + pubKey.path + "</span>";
        data.pubKeysHtml += "</figcaption></figure>";
    });

    //load and compile the html
    var compiledHtml;
    try {
        compiledHtml =  _.template(fs.readFileSync(__dirname + "/resources/backup_info_template.html", {encoding: 'utf8'}));
    } catch (e) {
        return cb(e);
    }

    cb(null, compiledHtml(data));
};


/**
 * create file/stream of the backup document
 *
 */
BackupGenerator.prototype.generateBackup = function(options, filename, callback) {
    var self = this;
    self.generateHTML(function(err, html) {
        if (err) {
            callback(err);
            return;
        }

        if (typeof filename === 'undefined' || filename === null || filename === "") {
            htmlToFile.create(html, options).toBuffer(callback);
        } else {
            htmlToFile.create(html, options).toFile(filename, callback);
        }
    });
};

/**
 * create a PDF version of the backup document
 */
BackupGenerator.prototype.generatePDF = function(filename, callback) {
    /* jshint -W101 */
    var options = {
        format: "Letter",           // allowed units: A3, A4, A5, Legal, Letter, Tabloid
        orientation: "portrait",    // portrait or landscape

        // Page options
        border: "10mm",                // default is 0, units: mm, cm, in, px
        header: {
            height: "18mm",
            contents: '<div style="text-align: right;"><a class="logo-blocktrail-square" href="https://www.blocktrail.com/"><img src="data:image/png;base64,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"  alt="blocktrail" /></a></div>'
        },
        footer: {
            height: "12mm",
            contents: '<div style="float:right; font-size: 0.85em; color: #666;"><span style="color: #444;">{{page}}</span>/<span>{{pages}}</span></div>'
        },

        // File options
        type: "pdf"                 // allowed file types: png, jpeg, pdf
    };

    this.generateBackup(options, filename, callback);
};

module.exports = BackupGenerator;
