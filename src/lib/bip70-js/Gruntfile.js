module.exports = function(grunt) {

    var saucelabsBrowsers = [
        {
            // latest chrome
            browserName: 'googlechrome',
            platform: 'Windows 10',
            version: 'latest'
        },
        {
            // latest firefox
            browserName: 'firefox',
            platform: 'Windows 10',
            version: 'latest'
        },
        {
            // latest Safari
            browserName: 'Safari',
            version: 'latest'
        },
        {
            // latest edge
            browserName: 'MicrosoftEdge',
            platform: 'Windows 10',
            version: 'latest'
        }
    ];

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

        'saucelabs-mocha': {
            all: {
                options: {
                    // username: 'saucelabs-user-name', // if not provided it'll default to ENV SAUCE_USERNAME (if applicable)
                    // key: 'saucelabs-key', // if not provided it'll default to ENV SAUCE_ACCESS_KEY (if applicable)
                    urls: [
                        // subset of the tests to make sure it doesn't take forever and timeout (on IE and phone simulators)
                        'http://127.0.0.1:9999/test/run-tests.html'
                    ],
                    browsers: saucelabsBrowsers,
                    build: process.env.TRAVIS_JOB_ID || ('99' + ((new Date).getTime() / 1000).toFixed(0) + (Math.random() * 1000).toFixed(0)),
                    testname: 'bip70 tests',
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

        browserify: {
            bip70: {
                options : {
                    browserifyOptions : {
                        standalone: 'bip70'
                    },
                    transform : ['brfs']
                },
                src: 'main.js',
                dest: 'build/bip70.js'
            },
            test: {
                options : {
                    browserifyOptions : {
                        standalone: 'bip70TEST'
                    },
                    transform : ['brfs']
                },
                src: 'test.js',
                dest: 'build/test.js'
            }
        },

        /*
         * Javascript uglifying
        */
        uglify : {
            options: {
                mangle: {
                    except: ['Buffer', 'BigInteger', 'Point', 'ECPubKey', 'ECKey', 'sha512_asm', 'asm', 'ECPair', 'HDNode']
                }
            },
            bip70: {
                files : {
                    'build/bip70.min.js'                       : ['<%= browserify.bip70.dest %>'],
                }
            },
            test: {
                files : {
                    'build/test.min.js' : ['<%= browserify.test.dest %>']
                }
            }
        },

        watch : {
            options : {},
            gruntfile : {
                files : ['Gruntfile.js'],
                tasks : ['default']
            },
            browserify : {
                files : ['main.js', 'lib/*', 'lib/**/*'],
                tasks : ['browserify:bip70']
            },
            browserify_test : {
                files : ['main.js', 'test.js', 'test/*', 'test/**/*', 'lib/*', 'lib/**/*', '!test/run-tests.html'],
                tasks : ['browserify:test', 'uglify:test', 'template']
            }
        },

        exec: {
            build_proto: {
                cmd: function() {
                    var inputFiles = ['proto/*.proto'];
                    var protoFiles = grunt.file.expand(inputFiles);

                    var command = '"./node_modules/.bin/pbjs" -t json ';
                    for (var i = 0; i < protoFiles.length; i++) {
                        command +=  " " + protoFiles[i] + " ";
                    }

                    command += " > lib/protofile.json";
                    console.log(command);
                    return command + ' && echo "completed compile"';
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-saucelabs');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-notify');
    grunt.loadNpmTasks('grunt-template');

    grunt.registerTask('build', ['exec:build_proto', 'browserify', 'uglify:bip70', 'uglify:test', 'template']);
    grunt.registerTask('test-browser', ['template', 'connect', 'saucelabs-mocha']);
    grunt.registerTask('default', ['build']);
};
