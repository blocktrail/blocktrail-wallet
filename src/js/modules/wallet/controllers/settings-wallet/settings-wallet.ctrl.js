(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("SettingsWalletCtrl", SettingsWalletCtrl);

    function SettingsWalletCtrl($cordovaVibration) {
        //...
        $cordovaVibration.vibrate(150);
    }
})();
