(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("confirmations", confirmations);

    function confirmations(walletsManagerService) {
        var activeWallet = walletsManagerService.getActiveWallet();
        var walletData = activeWallet.getReadOnlyWalletData();

        return function(input) {
            if (input) {
                return (parseInt(walletData.blockHeight) - parseInt(input)) + 1;
            } else {
                return 0;
            }
        };
    }

})();
