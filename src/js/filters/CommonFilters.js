angular.module('blocktrail.wallet')
    .filter('satoshiToCurrency', function($rootScope) {
        return function(input, currency, currencyRates, fractionSize, useMarkup, hideCurrencyDisplay) {

            //convert satoshi to btc
            currency = currency.toUpperCase();
            var coin = 100000000;
            var precision = 8;
            var btc = parseFloat((input/ coin).toFixed(precision));
            var currencyDisplay = "BTC";
            if (typeof(fractionSize) == "undefined") {
                fractionSize = 2;
            } else {
                fractionSize = parseInt(fractionSize);
            }
            if (typeof(currencyRates) == "undefined") {
                currencyRates = $rootScope.bitcoinPrices;
            }
            if (currency in currencyRates) {
                var localValue = (btc * currencyRates[currency]).toFixed(fractionSize);
            } else {
                var localValue = (0).toFixed(fractionSize);
            }

            switch(currency){
                case 'GBP':
                    currencyDisplay = useMarkup ? ('<span class="disp">£</span>') : "£";
                    return hideCurrencyDisplay ? localValue : currencyDisplay + localValue;
                case 'EUR':
                    currencyDisplay = useMarkup ? ('<span class="disp">€</span>') : "€";
                    return hideCurrencyDisplay ? localValue : currencyDisplay + localValue;
                case 'USD':
                    currencyDisplay = useMarkup ? ('<span class="disp">$</span>') : "$";
                    return hideCurrencyDisplay ? localValue : currencyDisplay + localValue;
                case 'AUD':
                    currencyDisplay = useMarkup ? ('<span class="disp">$</span>') : "$";
                    return hideCurrencyDisplay ? localValue : currencyDisplay + localValue;
                case 'BTC':
                    currencyDisplay = useMarkup ? (' <span class="disp">BTC</span>') : " BTC";
                    return hideCurrencyDisplay ? btc.toFixed(fractionSize) : btc.toFixed(fractionSize) + currencyDisplay;
                default:
                    return currency;
            }
        };
    })
    .filter('toCurrencySymbol', function($rootScope) {
        return function(input) {
            switch(input){
                case 'GBP':
                    return "£";
                case 'EUR':
                    return "€";
                case 'USD':
                    return "$";
                case 'AUD':
                    return "$";
                case 'BTC':
                    return "฿";
                default:
                    return input;
            }
        };
    })
    .filter('languageName', function($filter) {
        return function(input) {
            var languages = [
                {code: 'nl-NL', name: 'DUTCH'},
                {code: 'en-GB', name: 'ENGLISH'},
                {code: 'en-US', name: 'ENGLISH_US'},
                {code: 'fr-FR', name: 'FRENCH'},
                {code: 'de-DE', name: 'GERMAN'}
            ];
            var language = ($filter('filter')(languages, function(value, key) {
                return (value.code.toLowerCase() == input.toLowerCase()) || (value.code.split('-')[0] == input.toLowerCase());
            }));
            return language.length && language[0].name || input;
        };
    })
    .filter('confirmations', function($rootScope) {
        return function(input) {
            if (input) {
                return (parseInt($rootScope.blockHeight) - parseInt(input))+1;
            } else {
                return 0;
            }
        };
    })
    .filter('mathAbs', function() {
        return function(input) {
            return Math.abs(input);
        };
    })
    .filter('nl2br', function($sce){
        return function(msg) {
            return $sce.trustAsHtml((msg + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2'));
        }
    })
    .filter('contactInitials', function($rootScope) {
        return function(input) {
            //take the first and last word and return initials
            if (!input) {
                return input;
            }
            var regex = /\S+\s*/g;
            var words = input.trim().match(regex);
            if (words && words.length >= 2) {
                return (words[0][0]+words[words.length-1][0]).toUpperCase();
            } else if (words){
                return words[0][0].toUpperCase();
            } else {
                return input;
            }
        };
    })
    .filter('shortenCountryName', function() {
        return function(input) {
            //remove the bracket version of the country name
            if (!input) {
                return input;
            }
            var regex = /\(.+\)/g;
            return input.replace(regex, '');
        };
    })
    .filter('characters', function () {
        return function (input, chars, breakOnWord) {
            if (isNaN(chars)) return input;
            if (chars <= 0) return '';
            if (input && input.length >= chars) {
                input = input.substring(0, chars);

                if (!breakOnWord) {
                    var lastspace = input.lastIndexOf(' ');
                    //get last space
                    if (lastspace !== -1) {
                        input = input.substr(0, lastspace);
                    }
                }else{
                    while(input.charAt(input.length-1) == ' '){
                        input = input.substr(0, input.length -1);
                    }
                }
                return input + '...';
            }
            return input;
        };
    });
