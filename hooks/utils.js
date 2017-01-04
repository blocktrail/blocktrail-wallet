var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var stripJsonComments = require('strip-json-comments');
var spawnSync = require('child_process').spawnSync;

function parseXmlDec(xmlSrc) {
    var xmldec = {
        'version': '1.0',
        'encoding': 'UTF-8'
    };
    var version = xmlSrc.match(/<\?xml .*?version="(.+?)".*?\?>/);
    if (version) {
        xmldec['version'] = version[1];
    }
    var encoding = xmlSrc.match(/<\?xml .*?encoding="(.+?)".*?\?>/);
    if (encoding) {
        xmldec['encoding'] = encoding[1];
    }
    var standalone = xmlSrc.match(/<\?xml .*?standalone="(.+?)".*?\?>/);
    if (standalone) {
        xmldec['standalone'] = standalone[1];
    }

    return xmldec;
}

function getAppConfig(rootdir) {
    var config = {};

    rootdir = rootdir || './';

    [path.join(rootdir, 'appconfig.json'), path.join(rootdir, '/appconfig.default.json')].forEach(function (filename) {
        var json = fs.readFileSync(filename);

        if (json) {
            var data = JSON.parse(stripJsonComments(json.toString('utf8')));
            config = _.defaults(config, data);
        }
    });

    return config;
}

function localAddrs() {
    // figure out our local IPs from `ifconfig`
    var r = spawnSync('ifconfig');
    var ifconfig = r.stdout.toString('ascii');
    return ifconfig.match(/inet (addr:)?(\d.+?) /g).map(function (inetaddr) {
        return inetaddr.match(/inet (addr:)?(\d.+?) /)[2];
    });
}

module.exports = exports = {
    getAppConfig: getAppConfig,
    localAddrs: localAddrs,
    parseXmlDec: parseXmlDec
};
