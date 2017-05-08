module.exports = function (grunt) {

    var browsers = [{
        // latest chrome
        browserName: 'googlechrome',
        platform: 'Windows 10',
        version: 'latest'
    }, {
        // latest chrome as of writing
        browserName: 'googlechrome',
        platform: 'Windows 10',
        version: '54.0'
    }, {
        // latest firefox
        browserName: 'firefox',
        platform: 'Windows 10',
        version: 'latest'
    }, {
        // latest firefox as of writing
        browserName: 'firefox',
        platform: 'Windows 10',
        version: '49.0'
    }, {
        // latest Safari
        browserName: 'Safari',
        version: 'latest'
    }, {
        // latest Safari as of writing
        browserName: 'Safari',
        version: '10.0'
    }, {
        // latest edge
        browserName: 'MicrosoftEdge',
        platform: 'Windows 10',
        version: 'latest'
    }, {
        // latest edge as of writing
        browserName: 'MicrosoftEdge',
        platform: 'Windows 10',
        version: '14.14393'
    }, {
        // latest IE (EOL)
        browserName: 'internet explorer',
        platform: 'Windows 10',
        version: '11.103'
    }, {
        // android 5.0
        browserName: 'android',
        platform: 'Linux',
        version: '5.0'
    }, {
    //     // android 4.4
    //     browserName: 'android',
    //     platform: 'Linux',
    //     version: '4.4'
    // }, {
        // iphone iOS 9.2
        browserName: 'iphone',
        platform: 'OS X 10.10',
        version: '9.2'
    }, {
        // on FF < 48 there's no crypto.getRandomValues in webworkers
        browserName: 'firefox',
        platform: 'Windows 10',
        version: '47'
    }];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        connect: {
            server: {
                options: {
                    base: '',
                    port: 9999
                }
            }
        },

        'saucelabs-mocha': {
            all: {
                options: {
                    // username: 'saucelabs-user-name', // if not provided it'll default to ENV SAUCE_USERNAME (if applicable)
                    // key: 'saucelabs-key', // if not provided it'll default to ENV SAUCE_ACCESS_KEY (if applicable)
                    urls: [
                        // subset of the tests to make sure it doesn't take forever and timeout (on IE and phone simulators)
                        'http://127.0.0.1:9999/test/run-tests.html?grep=' + encodeURIComponent("test new blank wallet|test wallet, do transaction")
                    ],
                    browsers: browsers,
                    build: process.env.TRAVIS_JOB_ID || ('99' + ((new Date).getTime() / 1000).toFixed(0) + (Math.random() * 1000).toFixed(0)),
                    testname: 'mocha tests',
                    throttled: 2,
                    statusCheckAttempts: 360, // statusCheckAttempts * pollInterval = total time
                    pollInterval: 4000,
                    sauceConfig: {
                        'command-timeout': 600,
                        'idle-timeout': 360,
                        'max-duration': 900, // doesn't seem to take effect
                        'video-upload-on-pass': true
                    }
                }
            }
        },

        template: {
            runtests: {
                options: {
                    data: {
                        process: {
                            env: process.env
                        }
                    }
                },
                files: {
                    'test/run-tests.html': ['test/run-tests.tpl.html']
                }
            }
        },

        exec: {
            // does 'sources concat' as tasks, because we don't want it minified by the asmcrypto grunt
            asmcryptobuild: 'cd ./vendor/asmcrypto.js; npm install; grunt sources concat --with pbkdf2-hmac-sha512'
        },

        /*
         * Javascript concatenation
         */
        concat : {
            jsPDF: {
                src : [
                    'vendor/jsPDF/jspdf.js',
                    'vendor/jsPDF/jspdf.plugin.split_text_to_size.js',
                    'vendor/jsPDF/jspdf.plugin.addimage.js',
                    'vendor/jsPDF/libs/FileSaver.js/FileSaver.js',
                    'vendor/jsPDF/jspdf.plugin.png_support.js',
                    'vendor/jsPDF/libs/png_support/zlib.js',
                    'vendor/jsPDF/libs/png_support/png.js'
                ],
                dest : 'build/jsPDF.js'
            },
            sdkfull: {
                src : [
                    '<%= concat.jsPDF.dest %>',
                    '<%= browserify.sdk.dest %>'
                ],
                dest : 'build/blocktrail-sdk-full.js'
            }
        },

        /*
         * Javascript uglifying
         */
        uglify : {
            options: {
                mangle: {
                    except: ['Buffer', 'BigInteger', 'Point', 'Script', 'ECPubKey', 'ECKey', 'sha512_asm', 'asm']
                }
            },
            sdk: {
                files : {
                    'build/blocktrail-sdk.min.js'      : ['<%= browserify.sdk.dest %>'],
                    'build/blocktrail-sdk-full.min.js' : ['<%= concat.sdkfull.dest %>']
                }
            },
            test: {
                files : {
                    'build/test.min.js' : ['<%= browserify.test.dest %>']
                }
            }
        },

        /*
         *
         */
        browserify: {
            sdk: {
                options : {
                    browserifyOptions : {
                        standalone: 'blocktrailSDK'
                    },
                    transform : ['brfs']
                },
                src: 'main.js',
                dest: 'build/blocktrail-sdk.js'
            },
            test: {
                options : {
                    browserifyOptions : {
                        standalone: 'blocktrailTEST'
                    },
                    transform : ['brfs']
                },
                src: 'test.js',
                dest: 'build/test.js'
            }
        },

        /*
         * Watch
         */
        watch : {
            options : {},
            gruntfile : {
                files : ['Gruntfile.js'],
                tasks : ['default']
            },
            browserify : {
                files : ['main.js', 'lib/*', 'lib/**/*'],
                tasks : ['browserify:sdk', 'concat:sdkfull']
            },
            browserify_test : {
                files : ['main.js', 'test.js', 'test/*', 'test/**/*', 'lib/*', 'lib/**/*', '!test/run-tests.html'],
                tasks : ['browserify:test', 'uglify:test', 'template']
            },
            deps : {
                files : ['vendor/**/*.js'],
                tasks : ['concat']
            }
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-saucelabs');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-notify');
    grunt.loadNpmTasks('grunt-template');
    grunt.loadNpmTasks('grunt-exec');

    grunt.registerTask('dev', ['browserify', 'concat:sdkfull']);
    grunt.registerTask('asmcrypto', ['exec:asmcryptobuild']);
    grunt.registerTask('build', ['asmcrypto', 'browserify', 'concat', 'uglify']);
    grunt.registerTask('test-browser', ['template', 'connect', 'saucelabs-mocha']);
    grunt.registerTask('default', ['build']);
};

