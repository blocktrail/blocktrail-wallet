#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var hookUtils = require('../utils');

var rootdir = process.argv[2];

if (rootdir) {
  var APPCONFIG = hookUtils.getAppConfig(rootdir);
  var xmlPath = path.join(rootdir, '/config.xml');

  var xmlSrc = fs.readFileSync(xmlPath);
  xml2js.parseString(xmlSrc, function(err, doc) {
    if (err) {
      throw err;
    }

    if (!doc.widget) {
      throw new Error(xmlPath + ' has incorrect root node name (expected "widget")');
    }

    if (APPCONFIG.DEBUG || APPCONFIG.ADD_LOCAL_ADDRS) {
      var localaddrlist = hookUtils.localAddrs().map(function(ip) {
        return "http://" + ip;
      });

      if (APPCONFIG.API_HOST) {
        var apiHostHttps = typeof APPCONFIG.API_HTTPS !== "undefined" ? APPCONFIG.API_HTTPS : true;
        localaddrlist.push((apiHostHttps ? "https://" : "http://") + APPCONFIG.API_HOST);
      }

      // add localaddrs which aren't in config.xml yet
      doc.widget.access.forEach(function (access) {
        var k = localaddrlist.indexOf(access.$.origin);
        if (k !== -1) {
          localaddrlist.splice(k, 1);
        }
      });

      localaddrlist.forEach(function (localaddr) {
        doc.widget.access.push({'$': {'origin': localaddr, 'dev': 'true'}});
      });
    } else {
      // remove instead of add
      doc.widget.access = doc.widget.access.filter(function (access) {
        return !access.$.dev || access.$.dev === "false";
      });
    }

    // write the strings file
    var xmlBuilder = new xml2js.Builder({
      renderOpts: {
        pretty: true,
        indent: '  '
      },
      xmldec: hookUtils.parseXmlDec(xmlSrc.toString('utf8'))
    });

    fs.writeFileSync(xmlPath, xmlBuilder.buildObject(doc).replace(/\/>/g, '/>'), 'utf-8');
  });
}
