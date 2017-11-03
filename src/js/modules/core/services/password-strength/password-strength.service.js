(function () {
    "use strict";

    angular.module('blocktrail.wallet')
        .factory('passwordStrengthService', function($q, zxcvbn) {
            return new PasswordStrengthService($q, zxcvbn)
        });

    function PasswordStrengthService($q) {
        var self = this;

        self._$q = $q;
        self._zxcvbn = zxcvbn;
    }


    PasswordStrengthService.prototype.checkPassword = function(password, extraWords) {
        var self = this;

        return self._$q.when(self._zxcvbn(password, extraWords || []));
    };

})();
