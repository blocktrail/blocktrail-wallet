#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var spawnSync = require('child_process').spawnSync;

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

    // figure out our local IPs from `ifconfig`
    var r = spawnSync('ifconfig');
    var ifconfig = r.stdout.toString('ascii');
    var localaddrlist = ifconfig.match(/inet addr:(.+?) /g).map(function(inetaddr) {
      var ip = inetaddr.substr('inet addr:'.length);
      return 'http://' + ip.substr(0, ip.length - 1);
    });

    // add localaddrs which aren't in config.xml yet
    doc.widget.access.forEach(function(access) {
      var k = localaddrlist.indexOf(access.$.origin);
      if (k !== -1) {
        localaddrlist.splice(k, 1);
      }
    });
    localaddrlist.forEach(function(localaddr) {
      doc.widget.access.push({'$': {'origin': localaddr}});
    });

    /*
    // remove instead of add
    doc.widget.access = doc.widget.access.filter(function(access) {
      return localaddrlist.indexOf(access.$.origin) == -1;
    });
    //*/

    // write the strings file
    var xmlBuilder = new xml2js.Builder({
      renderOpts: {
        pretty: true,
        indent: '    '
      },
      xmldec: {
        'version': '1.0', 'encoding': 'UTF-8'
      }
    });

    fs.writeFileSync(xmlPath, xmlBuilder.buildObject(doc).replace(/\/>/g, ' />'), 'utf-8');
  });
}
