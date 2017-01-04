#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var hookUtils = require('../utils');

var rootdir = process.argv[2];

if (rootdir) {
  var xmlPath = path.join(rootdir, 'platforms/android/res/xml/config.xml');

  var xmlSrc = fs.readFileSync(xmlPath);
  xml2js.parseString(xmlSrc, function(err, doc) {
    if (err) {
      throw err;
    }

    if (!doc.widget) {
      throw new Error(xmlPath + ' has incorrect root node name (expected "widget")');
    }

    // change name to BTC Wallet
    doc.widget.name[0] = 'BTC Wallet';

    // write the strings file
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
