angular.module('blocktrail.wallet')
    .factory( 'AppRateService', function($translate, CONFIG) {
        AppRate.preferences = {
            openStoreInApp: true,
            displayAppName: 'BTC.com Wallet',
            usesUntilPrompt: CONFIG.APPRATE_COUNTER,
            promptAgainForEachNewVersion: false,
            storeAppURL: {
                ios: '1019614423',
                android: CONFIG.DEBUG ? 'https://www.google.com/search?q=BTC.com%20Wallet' : 'market://details?id=com.blocktrail.mywallet'
            },
            customLocale: {
                title: $translate.instant('APPRATE_TITLE'),
                message: $translate.instant('APPRATE_BODY'),
                cancelButtonLabel: $translate.instant('APPRATE_NO'),
                laterButtonLabel: $translate.instant('APPRATE_LATER'),
                rateButtonLabel: $translate.instant('APPRATE_RATE')
            },
            callbacks: {}
        };

        return {
            init: function() {
                AppRate.promptForRating(false);
            }
        };
    });
