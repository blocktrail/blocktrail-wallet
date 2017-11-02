(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("characters", characters);

    function characters() {
        return function (input, chars, breakOnWord) {
            if (isNaN(chars)) return input;

            if (chars <= 0) return "";

            if (input && input.length >= chars) {
                input = input.substring(0, chars);

                if (!breakOnWord) {
                    var lastSpace = input.lastIndexOf(" ");
                    //get last space
                    if (lastSpace !== -1) {
                        input = input.substr(0, lastSpace);
                    }
                } else {
                    while(input.charAt(input.length-1) === " "){
                        input = input.substr(0, input.length -1);
                    }
                }
                return input + "...";
            }
            
            return input;
        };
    }

})();
