#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var hookUtils = require('../utils');

var rootdir = process.argv[2];


if (rootdir) {
    var xmlPath = path.join(rootdir, 'platforms/android/AndroidManifest.xml');

    var xmlSrc = fs.readFileSync(xmlPath);
    xml2js.parseString(xmlSrc, function(err, doc) {
        if (err) {
            throw err;
        }

        if (!doc.manifest) {
            throw new Error(xmlPath + ' has incorrect root node name (expected "manifest")');
        }

        // https://stackoverflow.com/a/44925089 | https://stackoverflow.com/a/39361989
        doc.manifest.$['android:versionCode'] += '8';

        // disable automatic backups to gdrive
        doc.manifest.application[0].$['android:allowBackup'] = false;

        //write the manifest file
        var xmlBuilder = new xml2js.Builder({
            renderOpts: {
                pretty: true,
                indent: '    '
            },
            xmldec: hookUtils.parseXmlDec(xmlSrc.toString('utf8'))
        });
        fs.writeFileSync(xmlPath, xmlBuilder.buildObject(doc).replace(/\/>/g, ' />'), 'utf-8');
    });
}
