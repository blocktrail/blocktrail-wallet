module.exports = function (grunt) {
    grunt.initConfig({

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
                    except: ['Buffer', 'BitInteger', 'Point', 'Script', 'ECPubKey', 'ECKey']
                }
            },
            dist : {
                files : {
                    'build/jsPDF.min.js'                : ['<%= concat.jsPDF.dest %>'],
                    'build/blocktrail-sdk.min.js'       : ['<%= browserify.sdk.dest %>'],
                    'build/blocktrail-sdk-full.min.js'  : ['<%= concat.sdkfull.dest %>']
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
                tasks : ['browserify', 'concat']
            },
            deps : {
                files : ['vendor/**/*.js'],
                tasks : ['concat']
            }
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-notify');

    grunt.registerTask('build', ['browserify', 'concat', 'uglify']);
    grunt.registerTask('default', ['build']);
};

