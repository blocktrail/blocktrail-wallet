(function() {
    "use strict";

    angular.module("blocktrail.setup")
        .controller("SetupProfileCtrl", SetupProfileCtrl);

    function SetupProfileCtrl($btBackButtonDelegate) {
        /*-- Profile setup uses ProfileSettingsCtrl in SettingsControllers, this controller just modifies some things --*/
        $btBackButtonDelegate.rootState = null;
    }
})();
