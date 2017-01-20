angular.module('blocktrail.wallet').factory(
    'PasswordStrength',
    function($q) {
        var _zxcvbn;
        var _zxcvbnWait;
        var zxcvbn = function(password, extraWords) {
            if (_zxcvbn) {
                return $q.when()
                    .then(function() {
                        return _zxcvbn(password, extraWords || []);
                    })
            } else {
                if (!_zxcvbnWait) {
                    var def = $q.defer();

                    _zxcvbnWait = def.promise;

                    var waitInterval = setInterval(function() {
                        if (window.zxcvbn) {
                            _zxcvbn = window.zxcvbn;
                            clearInterval(waitInterval);

                            def.resolve(_zxcvbn);
                        }
                    }, 100);
                }

                return _zxcvbnWait.then(function() {
                    return _zxcvbn(password, extraWords || []);
                });
            }
        };

        var check = function(password, extraWords) {
            return zxcvbn(password, extraWords);
        };

        return {
            check: check
        };
    }
);
