(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupPhoneCtrl", SetupPhoneCtrl);

    function SetupPhoneCtrl($btBackButtonDelegate) {
        //re-enable back button, but remove the root state
        $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
        $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        $btBackButtonDelegate.rootState = null;
    }
})();
