(function () {
    "use strict";

    angular.module("blocktrail.core")
        .filter("confirmations", confirmations);

    function confirmations(walletsManagerService) {
        return function(input) {
            if (input) {
                var activeWallet = walletsManagerService.getActiveWallet();
                var walletData = activeWallet.getReadOnlyWalletData();

                return (parseInt(walletData.blockHeight) - parseInt(input)) + 1;
            } else {
                return 0;
            }
        };
    }

})();
