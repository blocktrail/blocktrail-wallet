(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("satoshiToCurrency", satoshiToCurrency);

    function satoshiToCurrency($rootScope, Currencies) {
        var coin = 100000000;
        var precision = 8;

        var CURRENCY_DISPLAY_MODE = {
            SHORT: 'short',
            HIDE: 'hide',
            LONG: 'long'
        };

        return function(input, currency, currencyRates, fractionSize, useMarkup, currencyDisplayMode) {
            if (typeof currencyDisplayMode === "undefined" || currencyDisplayMode === false) {
                currencyDisplayMode = CURRENCY_DISPLAY_MODE.SHORT;
            } else if (currencyDisplayMode === true) {
                currencyDisplayMode = CURRENCY_DISPLAY_MODE.HIDE;
            }

            currency = currency.toUpperCase();

            // deprecated
            if (currency === "BTC") {
                throw new Error("use satoshiToCoin filter instead");
            }

            if (typeof fractionSize === "undefined") {
                fractionSize = 2;
            } else {
                fractionSize = parseInt(fractionSize);
            }

            var btc = parseFloat((input/ coin).toFixed(precision));
            var localValue;
            var symbol, long;
            var currencyDisplay;

            // use global prices if not provided
            if (typeof currencyRates === "undefined") {
                currencyRates = $rootScope.bitcoinPrices;
            }

            // calculate value in specified currency
            if (typeof currencyRates[currency] !== "undefined") {
                localValue = (btc * currencyRates[currency]).toFixed(fractionSize);
            } else {
                localValue = (0).toFixed(fractionSize);
            }

            // if currency is unknown we use the currency for it
            if (typeof Currencies.currencies[currency] === "undefined") {
                symbol = currency;
                long = currency;
            } else {
                symbol = Currencies.currencies[currency].symbol || currency;
                long = Currencies.currencies[currency].code || currency;
            }

            currencyDisplay = currencyDisplayMode === CURRENCY_DISPLAY_MODE.LONG ? long : symbol;
            currencyDisplay = useMarkup ? ('<span class="disp">' + (currencyDisplay) + '</span>') : (" " + currencyDisplay);

            return currencyDisplayMode === CURRENCY_DISPLAY_MODE.HIDE ? localValue : currencyDisplay + localValue;
        };
    }

})();
