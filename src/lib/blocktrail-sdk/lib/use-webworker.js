/* globals window, navigator */
var isNodeJS = !process.browser;
var useWebWorker = !isNodeJS && typeof window !== "undefined" && typeof window.Worker !== "undefined";

var androidVersion = ((typeof navigator !== "undefined" && navigator.userAgent) || "").match(/Android (\d)\.(\d)(\.(\d))/);

if (androidVersion) {
    if (androidVersion[1] <= 4) {
        useWebWorker = false;
    }
}

module.exports = exports = function() {
    return useWebWorker;
};
