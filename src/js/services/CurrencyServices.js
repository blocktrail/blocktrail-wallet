angular.module('blocktrail.wallet')
    .service( 'CurrencyConverter', function($rootScope) {
        var coin = 100000000;
        var precision = 8;

        /**
         * convert from BTC value to a given currency
         * @param value
         * @param currency
         * @param fractionSize (optional)
         */
        this.fromBTC = function(value, currency, fractionSize) {
            if (typeof(fractionSize) == "undefined") {
                fractionSize = 2;
            }

            if (currency in $rootScope.bitcoinPrices) {
                return (parseFloat(value) * $rootScope.bitcoinPrices[currency]).toFixed(fractionSize);
            } else {
                return (0).toFixed(fractionSize);
                //return null;      //return 0 or null? meh
            }
        };

        /**
         * converts from a given currency value to BTC
         * @param value
         * @param currency
         * @param fractionSize (optional)
         */
        this.toBTC = function(value, currency, fractionSize) {
            if (typeof(fractionSize) == "undefined") {
                fractionSize = 8;
            }

            if (currency in $rootScope.bitcoinPrices) {
                return (parseFloat(value) / $rootScope.bitcoinPrices[currency]).toFixed(fractionSize);
            } else {
                return (0).toFixed(fractionSize);
                //return null;      //return 0 or null? meh
            }
        };

        /**
         * convert from Satoshi value to a given currency
         * @param value
         * @param currency
         * @param fractionSize (optional)
         */
        this.fromSatoshi = function(value, currency, fractionSize) {
            var btcValue = parseFloat((value/ coin).toFixed(precision));
            if (typeof(fractionSize) == "undefined") {
                fractionSize = 2;
            }

            if (currency in $rootScope.bitcoinPrices) {
                return (btcValue * $rootScope.bitcoinPrices[currency]).toFixed(fractionSize);
            } else {
                return (0).toFixed(fractionSize);
                //return null;      //return 0 or null? meh
            }
        };

        /**
         * converts from a given currency value to Satoshi
         * @param value
         * @param currency
         */
        this.toSatoshi = function(value, currency) {
            if (currency == "BTC") {
                var btcValue = parseFloat(value);
            } else {
                var btcValue = this.toBTC(value, currency, precision);
            }

            return parseFloat((btcValue * coin).toFixed(0));
        };

    });
