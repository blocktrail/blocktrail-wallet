#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var _ = require('lodash');
var hookUtils = require('../utils');

var rootdir = process.argv[2];

if (rootdir) {
  var stringsPath = path.join(rootdir, 'platforms/android/res/values/strings.xml');

  var stringsXml = fs.readFileSync(stringsPath);
  xml2js.parseString(stringsXml, function(err, doc) {
    if (err) {
      throw err;
    }

    if (!doc.resources) {
      throw new Error(stringsPath + ' has incorrect root node name (expected "resources")');
    }

    // find `app_name` string and change to BTC Wallet
    _.forEach(doc.resources.string, function(v, k) {
      if (v.$['name'] == 'app_name') {
        doc.resources.string[k]._ = 'BTC Wallet';
      }
    });

    // write the strings file
    var xmlBuilder = new xml2js.Builder({
      renderOpts: {
        pretty: true,
        indent: '    '
      },
      xmldec: hookUtils.parseXmlDec(stringsXml.toString('utf8'))
    });

    fs.writeFileSync(stringsPath, xmlBuilder.buildObject(doc).replace(/\/>/g, ' />'), 'utf-8');
  });
}
