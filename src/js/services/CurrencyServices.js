angular.module('blocktrail.wallet')
    .service( 'Currencies', function($rootScope, storageService, $log, sdkService, CONFIG) {
        var self = this;

        self.cache = storageService.db('currency-rates-cache');

        self.mainCurrencies = ["EUR", "USD", "CNY"];

        // currencies that the app supports and their symbols
        //  this list shouldn't be used directly `self.currencies` contains the enabled currencies
        var _currencies = {
            BTC: {code: 'BTC', ticker: 'BTC', symbol: "฿", isFiat: false},
            BCC: {code: 'BCC', ticker: 'BCC', symbol: "฿", isFiat: false},
            tBTC: {code: 'tBTC', ticker: 'tBTC', symbol: "t฿", isFiat: false},
            tBCC: {code: 'tBCC', ticker: 'tBCC', symbol: "t฿", isFiat: false},
            GBP: {code: "GBP", symbol: "£"},
            EUR: {code: "EUR", symbol: "€"},
            USD: {code: "USD", symbol: "$"},
            CAD: {code: "CAD", symbol: "$"},
            CNY: {code: "CNY", symbol: "¥"},
            PAB: {code: "PAB", symbol: "B/"},
            ARS: {code: "ARS", symbol: "$"},
            BOB: {code: "BOB", symbol: "$b"},
            CLP: {code: "CLP", symbol: "$"},
            PEN: {code: "PEN", symbol: "S/"},
            PYG: {code: "PYG", symbol: "Gs"},
            UYU: {code: "UYU", symbol: "$U"},
            VEF: {code: "VEF", symbol: "Bs"},
            CRC: {code: "CRC", symbol: "₡"},
            MXN: {code: "MXN", symbol: "$"},
            NGN: {code: "NGN", symbol: "₦"},
            INR: {code: "INR", symbol: "₹"},
            RUB: {code: "RUB", symbol: "₽"},
            AUD: {code: "AUD", symbol: "$"},
            BRL: {code: "BRL", symbol: "R$"},
            ZAR: {code: "ZAR", symbol: "R"},
            ILS: {code: "ILS", symbol: "₪"},
            SAR: {code: "SAR", symbol: "﷼"},
            JPY: {code: "JPY", symbol: "¥"},
            KRW: {code: "KRW", symbol: "₩"},
            COP: {code: "COP", symbol: "$"},
            GHS: {code: "GHS", symbol: "GH¢"},
            PLN: {code: "PLN", symbol: "zł"},
            PHP: {code: "PHP", symbol: "₱"}
        };

        self.currencies = {};

        self.getCurrencies = function() {
            var self = this;
            return Object.keys(self.currencies).map(function(code) {
                return self.currencies[code];
            });
        };

        self.getFiatCurrencies = function() {
            var self = this;
            return self.getCurrencies().filter(function(currency) { return !!currency.isFiat; });
        };

        self.price = function(currency) {
            var self = this;
            if (typeof self.currencies[currency] === "undefined") {
                return 0;
            } else {
                return self.currencies[currency].price || 0;
            }
        };

        self.prices = function() {
            var prices = {};

            Object.keys(self.currencies).forEach(function(code) {
                prices[code] = self.currencies[code].price;
            });

            return prices;
        };

        /**
         * get the current btc prices (defaults to live, can force getting a cached version)
         * @param getCached
         * @returns {*}
         */
        var updatePrices = null;
        self.updatePrices = function(getCached) {
            var self = this;

            var forceFetch = !getCached;

            if (updatePrices) {
                if (updatePrices.forceFetch !== forceFetch) {
                    return updatePrices.then(function() {
                        return self.updatePrices(getCached);
                    });
                } else {
                    return updatePrices;
                }
            } else {
                updatePrices = self.cache.get('price')
                    .then(function(b) {
                        return b;
                    }, function() {
                        forceFetch = true;
                        return {_id: "price"};
                    })
                    .then(function(pricesDoc) {
                        if (forceFetch) {
                            return sdkService.getSdkByActiveNetwork().price().then(function(result) {
                                angular.extend(pricesDoc, result);

                                //store in cache and then return
                                return self.cache.put(pricesDoc).then(function() {
                                    return pricesDoc;
                                });
                            });
                        } else {
                            return pricesDoc;
                        }
                    })
                    // use a .then because a .done would break the promise chains that rely on self.wallet
                    .then(function(pricesDoc) {
                        Object.keys(self.currencies).forEach(function(code) {
                            self.currencies[code].price = parseFloat(pricesDoc[code] || 0);
                        });
                        return pricesDoc;
                    }, function(e) {
                        $log.error('prices ERR ' + e);
                        throw e;
                    })
                    .then(function(r) {
                        updatePrices = null;
                        return r;
                    });

                // keep track if we forced for this
                updatePrices.forceFetch = forceFetch;

                return updatePrices;
            }
        };

        self.enableCurrency = function(code) {
            var self = this;

            if (typeof _currencies[code] === "undefined") {
                return false;
            }

            var isNew = typeof self.currencies[code] === "undefined";

            self.currencies[code] = _currencies[code];
            self.currencies[code].isFiat = typeof self.currencies[code].isFiat === "undefined" ? true : self.currencies[code].isFiat;
            self.currencies[code].btcRate = 0;

            if (isNew) {
                $rootScope.$broadcast("enabled_currency", code);
            }

            // Sort currencies
            var currencies = {};
            //Main currencies on top
            self.mainCurrencies.forEach(function (currency) {
                if (self.currencies[currency]) {
                    currencies[currency] = self.currencies[currency];
                }
            });
            // Sort the rest fiats and add them as well
            Object.keys(self.currencies).sort().forEach(function (key) {
                if (self.mainCurrencies.indexOf(key) === -1) {
                    currencies[key] = self.currencies[key];
                }
            });
            self.currencies = currencies;

            return true;
        };

        // enable all currencies that are in the config
        CONFIG.CURRENCIES.forEach(function(code) {
            self.enableCurrency(code);
        });
    })
    .service('CurrencyConverter', function($rootScope, Currencies) {
        var self = this;
        var coin = 100000000;
        var precision = 8;

        /**
         * convert from BTC value to a given currency
         * @param value
         * @param currency
         * @param fractionSize (optional)
         */
        self.fromBTC = function(value, currency, fractionSize) {
            if (typeof(fractionSize) === "undefined") {
                fractionSize = 2;
            }

            return Currencies.price(currency) ? (parseFloat(value) * Currencies.price(currency)).toFixed(fractionSize) : (0).toFixed(fractionSize);
        };

        /**
         * converts from a given currency value to BTC
         * @param value
         * @param currency
         * @param fractionSize (optional)
         */
        self.toBTC = function(value, currency, fractionSize) {
            if (typeof(fractionSize) === "undefined") {
                fractionSize = 8;
            }

            return Currencies.price(currency) ? (parseFloat(value) / Currencies.price(currency)).toFixed(fractionSize) : (0).toFixed(fractionSize);
        };

        /**
         * convert from Satoshi value to a given currency
         * @param value
         * @param currency
         * @param fractionSize (optional)
         */
        self.fromSatoshi = function(value, currency, fractionSize) {
            var btcValue = parseFloat((value/ coin).toFixed(precision));
            if (typeof(fractionSize) === "undefined") {
                fractionSize = 2;
            }

            return Currencies.price(currency) ? (btcValue * Currencies.price(currency)).toFixed(fractionSize) : (0).toFixed(fractionSize);
        };

        /**
         * converts from a given currency value to Satoshi
         * @param value
         * @param currency
         */
        self.toSatoshi = function(value, currency) {
            var btcValue;
            if (currency === 'BTC') {
                btcValue = parseFloat(value);
            } else {
                btcValue = self.toBTC(value, currency, precision);
            }

            return parseFloat((btcValue * coin).toFixed(0));
        };
    })
    .filter('currencySymbol', function(Currencies) {
        return function(input) {
            return Currencies.currencies[input].symbol;
        }
    });
