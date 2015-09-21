/* globals document */

/*
 * we're requiring qrcode-draw from the vendor dir to avoid having to npm install it
 *  this is because for using it with node it comes with a big amount of deps and we only need it for the browserify version
 */
var qrcodelib = require("qrcode-canvas");

var QrCode = function() {
};

QrCode.prototype.init = function() {
    if (this.qrcodedraw) {
        return;
    }

    this.qrcodedraw = new qrcodelib.QRCodeDraw();
    this.canvasEl = document.createElement("canvas");
};

QrCode.prototype.draw = function(text, options, cb) {
    this.init();
    this.qrcodedraw.draw(this.canvasEl, text, options, cb);
};

QrCode.prototype.toDataURL = function(text, options, cb) {
    this.draw(text, options, function(err, canvas) {
        if (err) {
            return cb ? cb(err) : null;
        }

        cb(null, canvas.toDataURL("image/jpeg"));
    });
};

module.exports = new QrCode();
