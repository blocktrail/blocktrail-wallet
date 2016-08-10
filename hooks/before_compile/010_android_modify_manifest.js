#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var rootdir = process.argv[2];


if (rootdir) {
    var manifestPath = path.join(rootdir, 'platforms/android/AndroidManifest.xml');

    var manifestXml = fs.readFileSync(manifestPath);
    xml2js.parseString(manifestXml, function(err, doc) {
        if (err) {
            throw err;
        }

        if (!doc.manifest) {
            throw new Error(manifestPath + ' has incorrect root node name (expected "manifest")');
        }

        doc.manifest.application[0].$['android:allowBackup'] = false;

        //write the manifest file
        var xmlBuilder = new xml2js.Builder({
            renderOpts: {
                pretty: true,
                indent: '    '
            },
            xmldec: {
                'version': '1.0', 'encoding': 'UTF-8'
            }
        });
        console.log(xmlBuilder.buildObject(doc));
        fs.writeFileSync(manifestPath, xmlBuilder.buildObject(doc), 'utf-8');
    });
}
