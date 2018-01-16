angular.module('blocktrail.wallet').factory(
    'buyBTCService',
    function(CONFIG, $log, $q, $cordovaDialogs, $translate, $rootScope, $timeout, $http, glideraService, launchService) {
        var SUPPORTED_BROKERS = ['glidera', 'simplex'];

        var _brokers = [];
        var getBrokers = function() {
            return launchService.getWalletConfig()
                .then(function(result) {
                    glideraService.setClientId(result.glidera_client_id);

                    return result.brokers;
                })
                .then(function(brokers) {
                    if (CONFIG.DEBUG_OVERLOAD_BROKERS) {
                        Object.keys(CONFIG.DEBUG_OVERLOAD_BROKERS).forEach(function(region) {
                            brokers[region] = CONFIG.DEBUG_OVERLOAD_BROKERS[region];
                        });
                    }

                    SUPPORTED_BROKERS.forEach(function(broker) {
                        if (brokers['ALL'].indexOf(broker) !== -1) {
                            _brokers = _brokers.concat([broker]).unique();
                        }
                    });
                })
                .then(function() {
                    return _brokers;
                }, function(e) {
                    console.error('getBrokers' + (e.msg || e.message || "" + e), e);
                    var deferred = $q.defer();
                    $timeout(function() {
                        deferred.resolve(getBrokers());
                    }, 3000);
                    return deferred.promise;
                })
        };

        var _brokersPromise = null;
        var brokers = function() {
            if (!_brokersPromise) {
                _brokersPromise = getBrokers();
            }

            return _brokersPromise;
        };
        brokers();

        return {
            BROKERS: {
                glidera: {
                    name: "glidera",
                    displayName: "Glidera",
                    avatarUrl: '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'
                }
            },
            brokers: brokers
        };
    }
);
