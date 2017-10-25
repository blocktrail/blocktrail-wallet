(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("satoshiToCoin", satoshiToCoin);

    function satoshiToCoin(CONFIG) {
        var coin = 100000000;
        var precision = 8;

        var CURRENCY_DISPLAY_MODE = {
            SHORT: 'short',
            HIDE: 'hide',
            LONG: 'long'
        };

        return function(input, networkType, fractionSize, useMarkup, currencyDisplayMode) {
            if (!networkType || typeof CONFIG.NETWORKS[networkType] === "undefined") {
                throw new Error("Unknown networkType [" + networkType + "]");
            }

            if (typeof currencyDisplayMode === "undefined" || currencyDisplayMode === false) {
                currencyDisplayMode = CURRENCY_DISPLAY_MODE.SHORT;
            } else if (currencyDisplayMode === true) {
                currencyDisplayMode = CURRENCY_DISPLAY_MODE.HIDE;
            }

            if (typeof fractionSize === "undefined") {
                fractionSize = 8;
            } else {
                fractionSize = parseInt(fractionSize);
            }

            var symbol = CONFIG.NETWORKS[networkType].TICKER;
            var long = CONFIG.NETWORKS[networkType].TICKER_LONG;

            var btc = parseFloat((input/ coin).toFixed(precision));

            var currencyDisplay = currencyDisplayMode === CURRENCY_DISPLAY_MODE.LONG ? long : symbol;
            currencyDisplay = useMarkup ? ('<span class="disp">' + (currencyDisplay) + '</span>') : (" " + currencyDisplay);

            return currencyDisplayMode === CURRENCY_DISPLAY_MODE.HIDE ? btc.toFixed(fractionSize) : btc.toFixed(fractionSize) + currencyDisplay;
        };
    }

})();
