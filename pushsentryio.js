var SentryCli = require('@sentry/cli');
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var semver = require('semver');

if (process.argv.length !== 4) {
    console.log('platform version required as arg');
    process.exit(1);
}

var platform = process.argv[2];
if (['iOS', 'Android'].indexOf(platform) === false) {
    console.log('platform invalid; iOS or Android');
    process.exit(1);
}

var version = semver.parse(process.argv[3]);
if (!version) {
    console.log('version invalid');
    process.exit(1);
}
version = "v" + version;

// Adding files to include
var srcPath = './www/js';
var includes = [path.join(srcPath, '/../index.html')];
var files = fs.readdirSync(srcPath);
files.forEach(function (file, index) {
    var f = path.basename(file);
    var fsplit = f.split('.');
    var name = fsplit[0],
        ext1 = fsplit[1],
        ext2 = fsplit[2];

    // we only want js source files and the according sourcemaps (no css etc.)
    if (ext1 === 'js' || (ext1 === 'js' && ext2 === 'map')) {
        includes.push(path.join(srcPath, f));
    }
});

var algorithm = 'sha1';
var allHash = '';

includes.forEach(function (file) {
    var shasum = crypto.createHash(algorithm);
    shasum.update(fs.readFileSync(file));
    allHash += shasum.digest('hex');
});

var shasum2 = crypto.createHash(algorithm);
shasum2.update(allHash);
var fileHash = shasum2.digest('hex');
var releaseHash = fileHash.slice(0, 20);

console.log('new version: ' + version + ' releaseHash: ' + releaseHash);
console.log(includes);

var ignore = ['node_modules'];

if (typeof process.env.SENTRY_AUTH_TOKEN === "undefined") {
    console.log('SENTRY_AUTH_TOKEN required');
    process.exit(1);
}

process.env.SENTRY_ORG = 'blocktrail-bv';
process.env.SENTRY_PROJECT = 'btccom-mobile-wallet';

var sentryCli = new SentryCli();

return sentryCli
    .releases.new(version)
    .then(function () {
        // unfortunately we need to provide the files seperately for both iOS and android because their paths differ

        // Android
        sentryCli.releases.uploadSourceMaps(version, {
            include: includes,
            ignore: ignore,
            // ~ will wildcard any protocol/host
            urlPrefix: 'app://' + platform + '/www/js'
        });
    })
    .then(function () {
        sentryCli.releases.finalize(version)
    });
