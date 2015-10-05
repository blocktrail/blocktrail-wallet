angular.module('blocktrail.wallet')
    .controller('LaunchCtrl', function($state, $log, launchService, settingsService, $ionicHistory) {
        $log.debug('starting');

        //disable animation on transition from this state
        $ionicHistory.nextViewOptions({
            disableAnimate: true
        });

        settingsService.$isLoaded()
            .then(function() {

                //setup not started yet
                if (!settingsService.setupStarted) {
                    $state.go('app.setup.start');
                    return;
                }

                if (navigator.splashscreen) {
                    navigator.splashscreen.hide();
                }
                //setup has been started: resume from the relevant step
                if (settingsService.setupComplete) {
                    $state.go('app.wallet.summary');
                } else if(!settingsService.backupSaved && !settingsService.backupSkipped) {
                    //backup saving
                    $state.go('app.setup.backup');
                } else if(!settingsService.phoneVerified) {
                    //phone setup
                    $state.go('app.setup.phone');
                } else if (!settingsService.contactsLastSync) {
                    //contacts sync
                    $state.go('app.setup.contacts');
                } else {
                    //profile
                    $state.go('app.setup.profile');
                }
        });
    });

angular.module('blocktrail.wallet')
    .controller('ResetCtrl', function($state, storageService) {
        storageService.resetAll().then(
            function() {
                alert('reset!');
                window.location.replace('');
            }
        );
    }
);

angular.module('blocktrail.wallet')
    .controller('Android43Ctrl', function($rootScope) {
        $rootScope.hideLoadingScreen = true;

        if (navigator.splashscreen) {
            navigator.splashscreen.hide();
        }
    }
);
