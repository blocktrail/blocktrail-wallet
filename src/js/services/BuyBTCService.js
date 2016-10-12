angular.module('blocktrail.wallet').factory(
    'buyBTCService',
    function(CONFIG, $log, $q, Wallet, $cordovaDialogs, $translate, $http) {
        var SUPPORTED_BROKERS = ['glidera'];

        var _regions = [
            {code: 'NL', name: 'NETHERLANDS'}
        ];
        var _usStates = [
            {code: 'US-AL', name: 'Alabama'},
            {code: 'US-AK', name: 'Alaska'},
            {code: 'US-AZ', name: 'Arizona'},
            {code: 'US-AR', name: 'Arkansas'},
            {code: 'US-CA', name: 'California'},
            {code: 'US-CO', name: 'Colorado'},
            {code: 'US-CT', name: 'Connecticut'},
            {code: 'US-DE', name: 'Delaware'},
            {code: 'US-DC', name: 'District of Columbia'},
            {code: 'US-FL', name: 'Florida'},
            {code: 'US-GA', name: 'Georgia'},
            {code: 'US-HI', name: 'Hawaii'},
            {code: 'US-ID', name: 'Idaho'},
            {code: 'US-IL', name: 'Illinois'},
            {code: 'US-IN', name: 'Indiana'},
            {code: 'US-IA', name: 'Iowa'},
            {code: 'US-KS', name: 'Kansas'},
            {code: 'US-KY', name: 'Kentucky'},
            {code: 'US-LA', name: 'Louisiana'},
            {code: 'US-ME', name: 'Maine'},
            {code: 'US-MD', name: 'Maryland'},
            {code: 'US-MA', name: 'Massachusetts'},
            {code: 'US-MI', name: 'Michigan'},
            {code: 'US-MN', name: 'Minnesota'},
            {code: 'US-MS', name: 'Mississippi'},
            {code: 'US-MO', name: 'Missouri'},
            {code: 'US-MT', name: 'Montana'},
            {code: 'US-NE', name: 'Nebraska'},
            {code: 'US-NV', name: 'Nevada'},
            {code: 'US-NH', name: 'New Hampshire'},
            {code: 'US-NJ', name: 'New Jersey'},
            {code: 'US-NM', name: 'New Mexico'},
            {code: 'US-NY', name: 'New York'},
            {code: 'US-NC', name: 'North Carolina'},
            {code: 'US-ND', name: 'North Dakota'},
            {code: 'US-OH', name: 'Ohio'},
            {code: 'US-OK', name: 'Oklahoma'},
            {code: 'US-OR', name: 'Oregon'},
            {code: 'US-PA', name: 'Pennsylvania'},
            {code: 'US-RI', name: 'Rhode Island'},
            {code: 'US-SC', name: 'South Carolina'},
            {code: 'US-SD', name: 'South Dakota'},
            {code: 'US-TN', name: 'Tennessee'},
            {code: 'US-TX', name: 'Texas'},
            {code: 'US-UT', name: 'Utah'},
            {code: 'US-VT', name: 'Vermont'},
            {code: 'US-VA', name: 'Virginia'},
            {code: 'US-WA', name: 'Washington'},
            {code: 'US-WV', name: 'West Virginia'},
            {code: 'US-WI', name: 'Wisconsin'},
            {code: 'US-WY', name: 'Wyoming'}
        ];

        var _brokers = null;
        var getBrokers = function() {
            return $http.get(CONFIG.API_URL + "/v1/" + (CONFIG.TESTNET ? "tBTC" : "BTC") + "/mywallet/config?v=" + CONFIG.VERSION)
                .then(function(result) {
                    return result.data.brokers;
                })
                .then(function(brokers) {
                    _.each(_regions, function(region, idx) {
                        // set brokers if known
                        if (brokers[region.code]) {
                            _regions[idx].brokers = brokers[region.code].filter(function(broker) {
                                return SUPPORTED_BROKERS.indexOf(broker) !== -1;
                            });
                        } else {
                            // otherwise unset
                            _regions[idx].brokers = [];
                        }
                    });

                    _.each(_usStates, function(region, idx) {
                        // set brokers if known
                        if (brokers[region.code] && region.code) {
                            _usStates[idx].brokers = brokers[region.code].filter(function(broker) {
                                return SUPPORTED_BROKERS.indexOf(broker) !== -1;
                            });
                        } else {
                            // otherwise unset
                            _usStates[idx].brokers = [];
                        }
                    });
                })
                .then(function(r) { return r; }, function(e) { console.error('getBrokers' + (e.msg || e.message || "" + e)); return getBrokers(); })
        };

        var brokers = function() {
            if (!_brokers) {
                _brokers = getBrokers();
            }

            return _brokers;
        };
        brokers();

        var regions = function() {
            return brokers().then(function() {
                return _regions;
            });
        };


        var usStates = function() {
            return brokers().then(function() {
                return _usStates;
            });
        };

        var regionBrokers = function(chosenRegion) {
            if (!chosenRegion) {
                return $q.when([]);
            }

            if (chosenRegion.match(/^US-..$/)) {
                return usStates().then(function(usStates) {
                    var brokers = [];
                    usStates.filter(function(usState) {
                        if (usState.code == chosenRegion) {
                            brokers = usState.brokers;
                        }
                    });
                    return brokers;
                });
            } else {
                return regions().then(function(regions) {
                    var brokers = [];
                    regions.filter(function(region) {
                        if (region.code == chosenRegion) {
                            brokers = region.brokers;
                        }
                    });
                    return brokers;
                });
            }
        };

        return {
            brokers: brokers,
            regions: regions,
            usStates: usStates,
            regionBrokers: regionBrokers
        };
    }
);
