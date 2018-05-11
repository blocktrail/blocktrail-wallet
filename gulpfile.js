var _ = require('lodash');
var gulp = require('gulp');
var stripJsonComments = require('strip-json-comments');
var gutil = require('gulp-util');
var bower = require('bower');
var ngAnnotate = require('gulp-ng-annotate');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var xml2js = require('xml2js');
var sh = require('shelljs');
var gitRev = require('git-rev');
var template = require('gulp-template');
var uglify = require('gulp-uglify');
var fs = require('fs');
var Q = require('q');
var gulpif = require('gulp-if');
var notifier = require('node-notifier');
var fontello = require('gulp-fontello');
var clean = require('gulp-clean');
var path = require('path');
var sequence = require('run-sequence');
var semver = require('semver');
var html2js = require('gulp-html2js');

var rootdir = __dirname;
var isWatch = false;
var noFontello = process.argv.indexOf('--no-fontello') !== -1 || process.argv.indexOf('--nofontello') !== -1;
var DONT_MANGLE = ['Buffer', 'BigInteger', 'Point', 'Script', 'ECPubKey', 'ECKey', 'sha512_asm', 'asm', 'ECPair', 'HDNode', 'ngRaven'];

/**
 * helper to wrap a stream with a promise for easy chaining
 * @param stream
 * @returns {Q.Promise}
 */
var streamAsPromise = function(stream) {
    var def = Q.defer();

    stream
        .on('end', function() {
            def.resolve();
        })
        .on('error', function(e) {
            def.reject(e);
        })
    ;

    return def.promise;
};

var getAppVersion = function() {
    var def = Q.defer();

    var xmlPath = path.join(rootdir, '/config.xml');

    var xmlSrc = fs.readFileSync(xmlPath);

    xml2js.parseString(xmlSrc, function(err, doc) {
        if (err) {
            def.reject(err);
        }

        var appVersion = doc.widget.$.version;

        if (!semver.valid(appVersion)) {
            throw new Error("appversion not a valid version: " + appVersion);
        }

        def.resolve(appVersion);
    });

    return def.promise;
}

/**
 * build appconfig from .json files
 *
 * @returns {Q.Promise}
 */
var buildAppConfig = function() {
    var def = Q.defer();
    var p = def.promise;

    gitRev.branch(function(branch) {
        gitRev.short(function(rev) {
            getAppVersion().then(function(appVersion) {
                var config = {
                    VERSION_REV: branch + ":" + rev,
                    VERSION: appVersion
                };

                ['./appconfig.json', './appconfig.default.json'].forEach(function (filename) {
                    var json = fs.readFileSync(filename);

                    if (json) {
                        var data = JSON.parse(stripJsonComments(json.toString('utf8')));
                        config = _.defaults(config, data);
                    }
                });

                if (typeof config.API_HTTPS !== "undefined" && config.API_HTTPS === false) {
                    config.API_URL = "http://" + config.API_HOST;
                } else {
                    config.API_URL = "https://" + config.API_HOST;
                }

                def.resolve(config);
            });
        });
    });

    return p;
};

var appConfig = Q.fcall(buildAppConfig);

gulp.task('appconfig', function() {
    // update global promise with a rebuild
    appConfig = Q.fcall(buildAppConfig);
    return appConfig;
});

gulp.task('templates:index', ['appconfig'], function() {
    var readTranslations = function(filename) {
        var def = Q.defer();

        fs.readFile(filename, function(err, raw) {
            if (!raw) {
                throw new Error("Missing translations [" + filename + "]!");
            }

            def.resolve(JSON.parse(stripJsonComments(raw.toString('utf8'))));
        });

        return def.promise;
    };

    return appConfig.then(function(APPCONFIG) {
        var translations = {
            'mobile': {}
        };

        return Q.all(_.map([
            './src/translations/translations/english.json',
            './src/translations/translations/americanEnglish.json',
            './src/translations/translations/french.json',
            './src/translations/translations/dutch.json',
            './src/translations/translations/chinese.json',
            './src/translations/translations/spanish.json',
            './src/translations/translations/russian.json',
            './src/translations/translations/swahili.json',
            './src/translations/translations/arabic.json',
            './src/translations/translations/hindi.json',
            './src/translations/translations/german.json',
            './src/translations/translations/korean.json',
            './src/translations/translations/portuguese.json',
            './src/translations/translations/japanese.json',

            './src/translations/translations/mobile/english.json',
            './src/translations/translations/mobile/americanEnglish.json',
            './src/translations/translations/mobile/french.json',
            './src/translations/translations/mobile/dutch.json',
            './src/translations/translations/mobile/chinese.json',
            './src/translations/translations/mobile/spanish.json',
            './src/translations/translations/mobile/russian.json',
            './src/translations/translations/mobile/swahili.json',
            './src/translations/translations/mobile/arabic.json',
            './src/translations/translations/mobile/hindi.json',
            './src/translations/translations/mobile/german.json',
            './src/translations/translations/mobile/korean.json',
            './src/translations/translations/mobile/portuguese.json',
            './src/translations/translations/mobile/japanese.json'
        ], function(filename) {
            var language = path.basename(filename, '.json');
            var isMobile = filename.indexOf('mobile/') !== -1;

            return readTranslations(filename).then(function(result) {
                if (isMobile) {
                    translations['mobile'][language] = result;
                } else {
                    translations[language] = result;
                }
            })
        })).then(function() {
            return streamAsPromise(gulp.src("./src/index.html")
                .pipe(template({
                    CSP: APPCONFIG.DEBUG ? ['*'] : APPCONFIG.CSP,
                    VERSION: APPCONFIG.VERSION,
                    APPCONFIG: APPCONFIG,
                    APPCONFIG_JSON: JSON.stringify(APPCONFIG),
                    NG_CORDOVA_MOCKS: APPCONFIG.NG_CORDOVA_MOCKS,
                    TRANSLATIONS: JSON.stringify(translations)
                }))
                .pipe(gulp.dest("./www"))
            );
        });
    });
});

gulp.task('templates:rest', ['appconfig'], function() {

    return appConfig.then(function(APPCONFIG) {
        return streamAsPromise(gulp.src([
                "./src/js/modules/**/*.html",
                "./src/templates/**/*.html"
            ])
                .pipe(html2js('templates.js', {
                    adapter: 'angular',
                    base: './src/',
                    name: 'blocktrail.templates'
                }))
                .pipe(gulp.dest("./www/js/"))
        );
    });
});

gulp.task('js:ng-cordova', ['appconfig'], function() {

    return appConfig.then(function(APPCONFIG) {
        var files = ['./src/lib/ngCordova/dist/ng-cordova.js'];

        if (APPCONFIG.NG_CORDOVA_MOCKS) {
            files.push("./src/lib/ngCordova/dist/ng-cordova-mocks.js");
        }

        return streamAsPromise(gulp.src(files)
            .pipe(concat('ng-cordova.js'))
            .pipe(gulpif(APPCONFIG.MINIFY, uglify({
                mangle: {
                    except: DONT_MANGLE
                }
            })))
            .pipe(gulp.dest('./www/js/'))
        );
    });
});

gulp.task('js:libs', ['appconfig'], function() {

    return appConfig.then(function(APPCONFIG) {
        return streamAsPromise(gulp.src([
            "./src/lib/q/q.js",
            "./src/lib/ionic/release/js/ionic.bundle.js",
            "./src/lib/pouchdb/dist/pouchdb.js",

            "./src/lib/angulartics/src/angulartics.js",
            "./src/lib/angulartics/src/angulartics-ga-cordova-google-analytics-plugin.js",

            "./src/lib/browserify-cryptojs/components/core.js",
            "./src/lib/browserify-cryptojs/components/x64-core.js",
            "./src/lib/browserify-cryptojs/components/sha256.js",
            "./src/lib/browserify-cryptojs/components/sha512.js",
            "./src/lib/browserify-cryptojs/components/enc-base64.js",
            "./src/lib/browserify-cryptojs/components/md5.js",
            "./src/lib/browserify-cryptojs/components/evpkdf.js",
            "./src/lib/browserify-cryptojs/components/cipher-core.js",
            "./src/lib/browserify-cryptojs/components/aes.js",

            "./src/lib/angular-translate/angular-translate.js",
            "./src/lib/libphonenumber/dist/libphonenumber.js",
            "./src/lib/intl-tel-input/src/js/data.js",

            "./src/lib/semver/semver.browser.js",

            "./src/lib/moment/moment.js",
            "./src/lib/moment/locale/nl.js",
            "./src/lib/moment/locale/fr.js",
            "./src/lib/moment/locale/es.js",
            "./src/lib/moment/locale/ru.js",
            "./src/lib/moment/locale/zh-cn.js",
            "./src/lib/angular-moment/angular-moment.js",
            "./src/lib/ngImgCrop/compile/unminified/ng-img-crop.js",
            "./src/lib/qrcode/lib/qrcode.js",
            "./src/lib/angular-qr/src/angular-qr.js",
            "./src/lib/raven-js/dist/raven.js",
            "./src/lib/raven-js/dist/plugins/angular.js",
            "./src/lib/bip70-js/build/bip70.js"
        ])
            .pipe(sourcemaps.init({largeFile: true}))
            .pipe(concat('libs.js'))
            .pipe(gulpif(APPCONFIG.MINIFY, uglify({
                mangle: {
                    except: DONT_MANGLE
                }
            })))
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./www/js/'))
        );
    });
});

gulp.task('js:app', ['appconfig'], function() {

    return appConfig.then(function(APPCONFIG) {
        return streamAsPromise(gulp.src([
            './src/js/**/*.js',
        ])
            .pipe(sourcemaps.init({largeFile: true}))
            .pipe(concat('app.js'))
            .pipe(ngAnnotate())
            .on('error', function(e) {
                if (isWatch) {
                    notifier.notify({
                        title: 'GULP watch + js:app + ngAnnotate ERR',
                        message: e.message
                    });
                    console.error(e);
                    this.emit('end');
                } else {
                    throw e;
                }
            })
            .pipe(gulpif(APPCONFIG.MINIFY, uglify({
                mangle: {
                    except: DONT_MANGLE
                }
            })))
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./www/js/'))
        );
    });
});

gulp.task('js:sdk', ['appconfig'], function() {

    return appConfig.then(function(APPCONFIG) {

        return streamAsPromise(gulp.src([
            "./src/lib/blocktrail-sdk/build/blocktrail-sdk-full.js"
        ])
            .pipe(sourcemaps.init({largeFile: true}))
            .pipe(concat('sdk.js'))
            .pipe(gulpif(APPCONFIG.MINIFY, uglify({
                mangle: {
                    except: DONT_MANGLE
                }
            })))
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./www/js/'))
        );
    });
});

gulp.task('js:sdk:asmcrypto', ['appconfig'], function() {

    return appConfig.then(function(APPCONFIG) {
        return streamAsPromise(gulp.src([
                "./src/lib/blocktrail-sdk/build/asmcrypto.js"
            ])
                .pipe(sourcemaps.init({largeFile: true}))
                .pipe(concat('asmcrypto.js'))
                .pipe(sourcemaps.write('./'))
                .pipe(gulp.dest('./www/js/'))
        );
    });
});

gulp.task('js:zxcvbn', ['appconfig'], function() {

    return appConfig.then(function(APPCONFIG) {

        return streamAsPromise(gulp.src([
            "./src/lib/zxcvbn/dist/zxcvbn.js"
        ])
            .pipe(concat('zxcvbn.js'))
            .pipe(gulpif(APPCONFIG.MINIFY, uglify()))
            .pipe(gulp.dest('./www/js/'))
        );
    });
});

var sassTask = function() {
    return appConfig.then(function(APPCONFIG) {
        return streamAsPromise(gulp.src(['./src/scss/ionic.*-app.scss'])
            .pipe(sass({errLogToConsole: true}))
            .pipe(gulp.dest('./www/css/'))
            .pipe(gulpif(APPCONFIG.MINIFY, minifyCss({keepSpecialComments: 0})))
            .pipe(gulp.dest('./www/css/'))
        );
    });
};

// create a sass with and without dependancy on fontello
gulp.task('sass', ['appconfig'], sassTask);
gulp.task('sassfontello', ['appconfig', 'fontello'], sassTask);


gulp.task('fontello-dl', function() {
    if (noFontello) {
        return;
    }

    return gulp.src('./fontello-config.json')
        .pipe(fontello())
        .pipe(gulp.dest('./www/fontello/'))
    ;
});

gulp.task('fontello-rename', ['fontello-dl'], function() {

    return gulp.src(['./www/fontello/css/fontello-codes.css'])
        .pipe(rename('fontello-codes.scss'))
        .pipe(gulp.dest('./www/fontello/css'))
    ;
});

gulp.task('fontello-clean', ['fontello-rename'], function() {

    return gulp.src(['./www/fontello/css/*.css'])
        .pipe(clean());
});

gulp.task('fontello', ['fontello-dl', 'fontello-rename', 'fontello-clean'], function() {

    return gulp.src('./www/fontello/font/*')
        .pipe(gulp.dest('./www/fonts'))
    ;
});

gulp.task('copyfonts', ['appconfig'], function() {

    return appConfig.then(function(APPCONFIG) {
        return streamAsPromise(gulp.src('./src/lib/ionic/release/fonts/**/*.{ttf,woff,eof,eot,svg}')
            .pipe(gulp.dest('./www/fonts'))
        );
    });
});

gulp.task('watch', function() {
    isWatch = true;

    gulp.watch(['./src/scss/**/*.scss'], ['sass']);
    gulp.watch(['./src/js/**/*.js'], ['js:app']);
    gulp.watch(['./src/lib/**/*.js', '!./src/lib/blocktrail-sdk/**'], ['js:libs', 'js:ng-cordova']);
    gulp.watch(['./src/lib/blocktrail-sdk/build/blocktrail-sdk-full.js'], ['js:sdk']);
    gulp.watch(['./src/templates/**/*', './src/js/**/*.tpl.html', './src/translations/translations/*', './src/translations/translations/mobile/*', './src/index.html'], ['templates']);
    gulp.watch(['./appconfig.json', './appconfig.default.json'], ['default']);
});

gulp.task('js', ['js:libs', 'js:app', 'js:ng-cordova', 'js:sdk:asmcrypto', 'js:sdk', 'js:zxcvbn']);
gulp.task('templates', ['templates:index', 'templates:rest']);
gulp.task('default', function (done) {
    sequence('fontello', 'nofontello', done);
});

gulp.task('nofontello', ['sass', 'templates', 'js', 'copyfonts']);
