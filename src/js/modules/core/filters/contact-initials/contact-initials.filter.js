(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("contactInitials", contactInitials);

    function contactInitials() {
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
    }

})();
