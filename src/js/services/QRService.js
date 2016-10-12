angular.module('blocktrail.wallet')
    .service( 'QRMock', function($log, $q, $interval) {
        var self = this;

        this.canvasElm = null;
        this.videoElm = null;
        this.videoStream = null;
        this.interval = null;

        /**
         * open camera feed and start scanning for qr code
         * @param success
         * @param error
         */
        this.scan = function(success, error) {
            $log.debug('start scanning');
            //start webcam
            this._webcamToCanvas().then(function() {
                //periodically draw frame from video to canvas and check the canvas obj for a QR code
                self.interval = $interval(function(){
                    self.canvasElm[0].getContext('2d').drawImage(self.videoElm[0], 0, 0, 600, 480);

                    self.decode().then(function(data) {
                        self.stop();    //maybe don't stop? do this in the controller instead
                        success(data);
                    }, function(err) {});
                }, 500);
            }, error);
        };

        /**
         * decode QR in image or from canvas
         * @param img   (optional)
         * @returns {*}
         */
        this.decode = function(img) {
            var deferred = $q.defer();

            qrcode.callback = function(data) {
                $log.debug('decoded QR image', data);
                deferred.resolve(data);
            };

            try {
                if (typeof img != "undefined") {
                    qrcode.decode(img);
                } else {
                    //will decode from canvas object with ID "qr-canvas"
                    qrcode.decode();
                }
            } catch (e) {
                $log.debug(e);
                deferred.reject(e);
            }

            return deferred.promise;
        };

        this._webcamToCanvas = function() {
            var deferred = $q.defer();

            //start webcam
            window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
            navigator.getUserMedia({video: true},
                function(stream) {
                    self.videoStream = stream;
                    self.videoElm[0].src = (window.URL && window.URL.createObjectURL(stream)) || stream;
                    self.videoElm[0].play();

                    deferred.resolve(stream);
                }, function(error) {
                    $log.error(error);
                    deferred.reject(error);
                }
            );

            return deferred.promise;
        };

        /**
         * cancel the camera feed and decoding loop (when in browser mock)
         */
        this.stop = function() {
            if (this.interval) {
                $interval.cancel(this.interval);
            }
            if (this.videoStream) {
                this.videoStream.stop();
            }
        };

        /**
         * prepare the camera for scanning
         * @param canvasElm
         * @returns {*}
         */
        this.init = function(canvasElm) {
            //create a video element over the canvas. we will write snapshots to the canvas periodically for the decoder
            this.canvasElm = angular.element(canvasElm);
            var width = 600, height = 480;
            self.videoElm = angular.element('<video style="background:#666; margin-top: 160px" width="' + width + 'px" height="' + height + 'px"></video>');
            self.canvasElm.after(self.videoElm);
            self.canvasElm.attr('id', 'qr-canvas').attr({'width': width, 'height': height});
            self.canvasElm.css('display', 'none');
        };
    })
    .service( 'QRZBar', function($ionicPlatform, $log, $rootScope, $translate) {
        //old zBar version of QR scanner
        var self = this;
        var ENABLED = (typeof cloudSky != "undefined" && !!cloudSky.zBar);

        //For mock scanner - used in browser dev
        var MOCK_ENABLED = !ENABLED;

        $log.debug('qrScanner enabled? ' + ENABLED);


        /**
         * open camera feed and start scanning for qr code
         * @param success
         * @param error
         */
        this.scan = function(success, error) {
            if (ENABLED) {
                $log.debug('start scanning');
                var params = {
                    text_title: $translate.instant('QR_SCAN_OVERLAY').sentenceCase(), // Android only
                    text_instructions: "",      // Android only
                    camera: "back",             // defaults to "back"
                    flash: "off",               // defaults to "auto". anoying when scanning a QR on a screen
                    drawSight: true             // defaults to true, create a red sight/line in the center of the scanner view.
                };

                cloudSky.zBar.scan(params, function(result) {
                    $rootScope.$evalAsync(function(){success(result);});
                }, function(error) {
                    $rootScope.$evalAsync(function(){success(error);});
                });
            } else if (MOCK_ENABLED) {
                //...
            }
        };

    })
.service( 'QR', function($ionicPlatform, $log, $rootScope, $translate, $cordovaBarcodeScanner) {
    var self = this;
    var ENABLED = window.cordova && window.cordova.plugins.barcodeScanner;

    //For mock scanner - used in browser dev
    var MOCK_ENABLED = !ENABLED;

    $log.debug('qrScanner enabled? ' + ENABLED);


    /**
     * open camera feed and start scanning for qr code
     * @param success
     * @param error
     */
    this.scan = function(success, error) {
        if (ENABLED) {
            $log.debug('start scanning');
            $cordovaBarcodeScanner.scan()
                .then(function(result) {
                    if (result.cancelled) {
                        success("CANCELLED");
                    } else {
                        success(result.text);
                    }
                })
                .catch(error);
        } else if (MOCK_ENABLED) {
            //...
        }
    };

});

