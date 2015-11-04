var _ = require('lodash');
var gulp = require('gulp');
var stripJsonComments = require('strip-json-comments');
var gutil = require('gulp-util');
var bower = require('bower');
var ngAnnotate = require('gulp-ng-annotate');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var gitRev = require('git-rev');
var template = require('gulp-template');
var uglify = require('gulp-uglify');
var fs = require('fs');
var Q = require('q');
var gulpif = require('gulp-if');
var notifier = require('node-notifier');

var isWatch = false;

var buildAppConfig = function() {
    var def = Q.defer();

    gitRev.branch(function(branch) {
        gitRev.short(function(rev) {
            var config = {
                VERSION: branch + ":" + rev
            };

            ['./appconfig.json', './appconfig.default.json'].forEach(function(filename) {
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

    return def.promise;
};

var appConfig = Q.fcall(buildAppConfig);

gulp.task('appconfig', function() {
    appConfig = Q.fcall(buildAppConfig);
});

gulp.task('templates:index', ['appconfig'], function(done) {

    appConfig.then(function(APPCONFIG) {
        var readTranslations = function(filename) {
            var raw = fs.readFileSync(filename);

            if (!raw) {
                throw new Error("Missing translations!");
            }

            return JSON.parse(stripJsonComments(raw.toString('utf8')));
        };

        var translations = {
            english: readTranslations('./src/translations/translations/english.json'),
            americanEnglish: readTranslations('./src/translations/translations/americanEnglish.json'),
            french: readTranslations('./src/translations/translations/french.json'),
            dutch: readTranslations('./src/translations/translations/dutch.json'),

            mobile: {
                english: readTranslations('./src/translations/translations/mobile/english.json'),
                americanEnglish: readTranslations('./src/translations/translations/mobile/americanEnglish.json'),
                french: readTranslations('./src/translations/translations/mobile/french.json'),
                dutch: readTranslations('./src/translations/translations/mobile/dutch.json')
            }
        };
    
        gulp.src("./src/index.html")
            .pipe(template({
                APPCONFIG_JSON: JSON.stringify(APPCONFIG),
                NG_CORDOVA_MOCKS: APPCONFIG.NG_CORDOVA_MOCKS,
                TRANSLATIONS: JSON.stringify(translations)
            }))
            .pipe(gulp.dest("./www"))
            .on('end', done);
    });
});

gulp.task('templates:rest', ['appconfig'], function(done) {

    appConfig.then(function(APPCONFIG) {
        gulp.src(["./src/templates/*", "./src/templates/**/*"])
            .pipe(gulp.dest("./www/templates"))
            .on('end', done);
    });
});

gulp.task('js:ng-cordova', ['appconfig'], function(done) {

    appConfig.then(function(APPCONFIG) {
        var files = ['./src/lib/ngCordova/dist/ng-cordova.js'];

        if (APPCONFIG.NG_CORDOVA_MOCKS) {
            files.push("./src/lib/ngCordova/dist/ng-cordova-mocks.js");
        }

        gulp.src(files)
            .pipe(concat('ng-cordova.js'))
            .pipe(gulpif(APPCONFIG.MINIFY, uglify()))
            .pipe(gulp.dest('./www/js/'))
            .on('end', done);
    });
});

gulp.task('js:libs', ['appconfig'], function(done) {

    appConfig.then(function(APPCONFIG) {
        gulp.src([
            "./src/lib/q/q.js",
            "./src/lib/ionic/release/js/ionic.bundle.js",
            "./src/lib/ionic-service-core/ionic-core.js",
            "./src/lib/ionic-service-analytics/ionic-analytics.js",
            "./src/lib/pouchdb/dist/pouchdb.js",

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

            "./src/lib/moment/moment.js",
            "./src/lib/moment/locale/nl.js",
            "./src/lib/moment/locale/fr.js",
            "./src/lib/angular-moment/angular-moment.js",
            "./src/lib/ngImgCrop/compile/unminified/ng-img-crop.js",
            "./src/lib/qrcode/lib/qrcode.js",
            "./src/lib/angular-qr/src/angular-qr.js",
        ])
            .pipe(concat('libs.js'))
            .pipe(gulpif(APPCONFIG.MINIFY, uglify()))
            .pipe(gulp.dest('./www/js/'))
            .on('end', done);
    });
});

gulp.task('js:app', ['appconfig'], function(done) {

    appConfig.then(function(APPCONFIG) {
        gulp.src([
            './src/js/**/*.js',
        ])
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
            .pipe(gulpif(APPCONFIG.MINIFY, uglify()))
            .pipe(gulp.dest('./www/js/'))
            .on('end', done)
        ;
    });
});

gulp.task('js:sdk', ['appconfig'], function(done) {

    appConfig.then(function(APPCONFIG) {
        gulp.src([
            "./src/lib/blocktrail-sdk/build/blocktrail-sdk-full.js"
        ])
            .pipe(concat('sdk.js'))
            .pipe(gulpif(APPCONFIG.MINIFY, uglify({
                mangle: {
                    except: ['Buffer', 'BigInteger', 'Point', 'Script', 'ECPubKey', 'ECKey']
                }
            })))
            .pipe(gulp.dest('./www/js/'))
            .on('end', done);
    });
});

gulp.task('sass', ['appconfig'], function(done) {

    appConfig.then(function(APPCONFIG) {
        gulp.src('./src/scss/ionic.app.scss')
            .pipe(sass({errLogToConsole: true}))
            .pipe(gulp.dest('./www/css/'))
            .pipe(gulpif(APPCONFIG.MINIFY, minifyCss({keepSpecialComments: 0})))
            .pipe(gulp.dest('./www/css/'))
            .on('end', done);
    });
});

gulp.task('copyfonts', ['appconfig'], function(done) {

    appConfig.then(function(APPCONFIG) {
        gulp.src('./src/lib/ionic/release/fonts/**/*.{ttf,woff,eof,eot,svg}')
            .pipe(gulp.dest('./www/fonts'))
            .on('end', done);
    });
});

gulp.task('watch', function() {
    isWatch = true;

    gulp.watch(['./src/scss/**/*.scss'], ['sass']);
    gulp.watch(['./src/js/**/*.js'], ['js:app']);
    gulp.watch(['./src/lib/**/*.js'], ['js:libs', 'js:sdk', 'js:ng-cordova']);
    gulp.watch(['./src/templates/**/*', './src/index.html'], ['templates']);
    gulp.watch(['./appconfig.json', './appconfig.default.json'], ['default']);
});

gulp.task('js', ['js:libs', 'js:app', 'js:ng-cordova', 'js:sdk']);
gulp.task('templates', ['templates:index', 'templates:rest']);
gulp.task('default', ['sass', 'templates', 'js', 'copyfonts']);
