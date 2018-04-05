(function() {
    "use strict";

    /**
     * TODO Review $btBackButtonDelegate
     * $btBackButtonDelegate -> backButtonService
     * get rid of the $rootScope
     * clean the controllers
     * review the logic with disable/enable the back button / menu button
     */
    angular.module("blocktrail.core")
        .factory("backButtonService", function() {
                return new BackButtonService();
            }
        );


    function BackButtonService() {
    }

})();

angular.module('blocktrail.wallet')
    .factory('$btBackButtonDelegate', function($ionicHistory, $state, $rootScope, $ionicPlatform, $log, $ionicSideMenuDelegate, $ionicViewSwitcher, settingsService) {
        var priorityLevel = 101;    //priority level for the hardware back button handler
        var goingBack = false;      //flag to indicate if going back so we don't add previous state to stack
        var fireOnce = false;       //flag to indicate if an assigned back button handler should be used once and then returned to default
        var self;

        var BackButtonDelegate = function(){
            self = this;        //assign instance to variable in parent scope for hardware button handler 
            this.history = [];
            this.onBack = this._default;
            this.onHardwareBack = this._default;
            this.rootState = "app.wallet.summary";      //used as a fake "back" state before closing app on hardware back button (android)

            this.isDisplayed = false;
            this.backButtonText = "";
            this.enableBackButton = true;
            this.enableHardwareBackButton = true;
            this.enableMenuButton = true;

            //watch the "isDisplayed" value to enable/disable the side menu
            $rootScope.$watch(function() {
                    return !self.isDisplayed && self.enableMenuButton;
                }, function watchCallback(newValue, oldValue) {
                    $ionicSideMenuDelegate.canDragContent(newValue);
                }
            );

            $rootScope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
                // don't add the last state if we're going back, we're at root, or the state says not to
                if (!goingBack && fromState.name && !(fromState.data && fromState.data.excludeFromHistory)) {
                    $log.debug('pushing state to stack', fromState.name, fromState);
                    self.history.push({state: fromState.name, params: fromParams});
                } else {
                    //$log.debug('no state added to history', goingBack, fromState.name, toState.name);
                }
                //clear history if the entering state/toParams says to
                if ( (toState.data && toState.data.clearHistory) || toParams.clearHistory) {
                    self.clearHistory();
                }

                //show/hide the back button (and thus the side menu)
                if (self.enableBackButton && self.history.length > 0) {
                    $log.debug('show back button');
                    self.isDisplayed = true;
                } else {
                    $log.debug('hide back button');
                    self.isDisplayed = false;
                }

                //reset flags
                goingBack = false;
            });
        };


        /**
         * default function to call when back button pressed (assign to this.onBack)
         * @param $event
         * @private
         */
        BackButtonDelegate.prototype._default = function($event){
            var self = this;

            $log.debug('state history', self.history);
            if (self.history.length > 0) {
                // there is a back view, go to it
                var back = self.history.pop();
                $log.debug('going back!!!', back.state);
                goingBack = true;
                $state.go(back.state, back.params);
            } else {
                // there is no back view. If a "root" state is defined and we're not on it, go to it otherwise close the app
                if (self.rootState && $state.current.name != self.rootState && $state.current.name.startsWith("app.wallet")) {
                    $state.go(self.rootState);
                } else {
                    ionic.Platform.exitApp();
                }
            }
            $event && $event.preventDefault();
        };

        /**
         * alternative onBack function, which goes up a level ignoring the history stack
         * @param e
         * @private
         */
        BackButtonDelegate.prototype._goUpState = function(e){
            $state.go('^');
        };

        /**
         * clear the history
         */
        BackButtonDelegate.prototype.clearHistory = function(){
            $log.debug('clearing history');
            this.history = [];

            //show/hide the back button (and thus the side menu)
            if (self.enableBackButton && self.history.length > 0) {
                $log.debug('show back button');
                self.isDisplayed = true;
            } else {
                $log.debug('hide back button');
                self.isDisplayed = false;
            }
        };

        /**
         * assign a function to call when the UI back button is pressed
         * @param fn
         * @param justOnce  bool    indicates if the new function is to be fired only once and then returned to default
         */
        BackButtonDelegate.prototype.setBackButton = function(fn, justOnce) {
            this.onBack = fn;
            fireOnce = !!justOnce;

            $log.debug('set back button fn');
        };

        /**
         * assign a function to call when the hardware back button is pressed (android phones)
         * @param fn
         * @param justOnce  bool    indicates if the new function is to be fired only once and then returned to default
         */
        BackButtonDelegate.prototype.setHardwareBackButton = function(fn, justOnce) {
            this.onHardwareBack = fn;
            fireOnce = !!justOnce;

            $log.debug('set hardware back button fn');
        };

        /**
         * fires the UI back button handler
         * @param $event
         */
        BackButtonDelegate.prototype.goBack = function($event) {
            //call the function set to the back button
            if (self.enableBackButton) {
                //decide the animation style to use
                if (self.history.length > 0) {
                    $ionicViewSwitcher.nextDirection('back');
                } else {
                    $ionicViewSwitcher.nextDirection('forward');
                }

                self.onBack($event);
                if (fireOnce) {
                    self.onBack = self._default;
                    self.onHardwareBack = self._default;
                    fireOnce = false;
                }
            }
        };

        BackButtonDelegate.prototype.addHistory = function(stateName, stateParams) {
            this.history.push({state: stateName, params: stateParams});

            //show/hide the back button (and thus the side menu)
            if (self.enableBackButton && self.history.length > 0) {
                $log.debug('show back button');
                self.isDisplayed = true;
            } else {
                $log.debug('hide back button');
                self.isDisplayed = false;
            }
        };

        /**
         * fires the hardware back button handler (android phones)
         * @param $event
         */
        BackButtonDelegate.prototype.hardwareBack = function($event) {
            //var self = context;
            //call the function set to the hardware back button
            if (self.enableHardwareBackButton) {
                $log.debug('go back button hardware style');
                self.onHardwareBack($event);
                if (fireOnce) {
                    self.onBack = self._default;
                    self.onHardwareBack = self._default;
                    fireOnce = false;
                }
            } else {
                $log.debug('Hardware back button disabled', this, context);
            }
        };

        /**
         * toggle the side menu function (enable and display, or disable and hide
         * @param state
         */
        BackButtonDelegate.prototype.toggleMenuButton = function(state) {
            this.enableMenuButton = typeof state == "undefined" ? !this.enableMenuButton : !!state;
        };

        /**
         * toggle the back button (NB doesn't affect display)
         * @param state
         */
        BackButtonDelegate.prototype.toggleBackButton = function(state) {
            this.enableBackButton = typeof state == "undefined" ? !this.enableBackButton : !!state;
            this.enableHardwareBackButton = this.enableBackButton;
        };

        return new BackButtonDelegate();
    });

