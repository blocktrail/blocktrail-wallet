var fs = require('fs');
var pkg = require('../package.json');

module.exports = {
  banner:
    '/*!\n' +
    ' * Ionic Analytics Client\n' +
    ' * Copyright 2014 Drifty Co. http://drifty.com/\n' +
    ' * See LICENSE in this repository for license information\n' +
    ' */\n',
  closureStart: '(function(){\n',
  closureEnd: '\n})();',

  dist: '.',

  jsFiles: ['src/js/ionicAnalytics.js', 'src/js/bucketStorage.js', 'src/js/autoTrack.js'],

  versionData: {
    version: pkg.version
  }
};
