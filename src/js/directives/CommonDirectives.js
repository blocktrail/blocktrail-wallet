angular.module('blocktrail.wallet')
    .directive('rawModel', function ($parse) {
        //assigns the raw value of the element's ng-model to the given scope model
        return {
            restrict: "A",
            require: 'ngModel',
            scope: "=",
            link: function (scope, elem, attrs, ngModel) {
                //get the model to update with the raw value
                var updateModel = $parse(attrs.rawModel);

                ngModel.$parsers.unshift(function(value) {
                    //console.log('parse', value, ngModel.$viewValue);
                    updateModel.assign(scope, ngModel.$viewValue);
                    return value;
                });
                ngModel.$formatters.unshift(function(value) {
                    //console.log('format', value);
                    updateModel.assign(scope, ngModel.$modelValue);
                    return value;
                });
            }
        };
    })
    .directive('selectOnFocus', function () {
        //clear the input value on focus if input is pristine (used to remove the initial 0 on send input)
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                element.on('focus', function () {
                    if (ngModel.$pristine) {
                        ngModel.$setViewValue();
                        ngModel.$setPristine();
                        ngModel.$render();
                    }
                });
                element.on('blur', function () {
                    if (ngModel.$pristine) {
                        ngModel.$setViewValue(0);
                        ngModel.$setPristine();
                        ngModel.$render();
                    }
                });
            }
        };
    })
    .directive('ngEnter', function () {
        //captures enter key press and evaluates the given arguments
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which == 13) {
                    scope.$apply(function (){
                        scope.$eval(attrs.ngEnter, {$event: event});
                    });
                    event.preventDefault();
                }
            });
        };
    })
    .directive('ngTab', function () {
        //captures enter key press and evaluates the given arguments
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which == 9) {
                    scope.$apply(function (){
                        scope.$eval(attrs.ngTab, {$event: event});
                    });
                    event.preventDefault();
                }
            });
        };
    })
    .directive('convertToNumber', function() {
        return {
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                ngModel.$parsers.push(function(val) {
                    return parseInt(val, 10);
                });
                ngModel.$formatters.push(function(val) {
                    return '' + val;
                });
            }
        };
    })
    .directive('userBalanceDisplay', function ($rootScope, $btBackButtonDelegate) {
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'templates/common/template.user-balance.html',
            link: function(scope, element, attrs) {
                //@todo remove, replaced by generic canvas directive
            }
        }
    })
    .directive('canvasDisplay', function ($rootScope, $log, $window) {
        return {
            restrict: 'EA',
            replace: true,
            scope: {
                text: '=',
                classes: '=',
                width: '@',
                height: '@',
                color: '@',
                font: '@',
                textBaseline: '@'
            },
            template: '<canvas class="canvas-display" width="{{width}}" height="{{height}}"></canvas>',
            link: function(scope, element, attrs) {
                scope.font = scope.font || '30px "Helvetica Neue", "Roboto", "Segoe UI", sans-serif';
                scope.color = scope.color || "#434A54";
                scope.width = scope.width || "100%";
                scope.height = parseFloat(scope.height) || 40;
                scope.textBaseline = scope.textBaseline || "hanging";

                scope.yDrawStart = scope.height;
                switch(scope.textBaseline) {
                    case 'top':
                        scope.yDrawStart = 0;
                        break;
                    case 'hanging':
                        scope.yDrawStart = 5;
                        break;
                    case 'middle':
                        scope.yDrawStart = scope.height/2;
                        break;
                    case 'alphabetic':
                        scope.yDrawStart = scope.height;
                        break;
                    default:
                        //bottom
                        scope.textBaseline = "bottom";
                        scope.yDrawStart = scope.height;
                }

                scope.$watch('text', function() {
                    /*
                    draw the bitcoin amount on the canvas element - this allows us to have text scaled via css according to the screen size.
                    either use width:100% to always scale text to take up the full width (will always result in reduction in sharpness)
                    or use max-width:100% to scale back just when text is too long - (reduces sharpness only when text is too long)
                    */

                    //reset the canvas width to undo any previous scaling
                    var canvas = element[0];
                    canvas.width = scope.width;
                    canvas.height = scope.height;

                    //get color and font settings from element  @todo needs refinement and optimisation
                    //console.log('Color', $window.getComputedStyle(canvas));
                    //console.log('Color', canvas.style.color);
                    //scope.color = $window.getComputedStyle(canvas)['color'];

                    //resize the canvas to fit the text width (either always fit, or just if overflow would happen)
                    var ctx = canvas.getContext('2d');
                    ctx.font = scope.font;


                    var txtWidth = ctx.measureText(scope.text).width;
                    //$log.debug('CANVAS TEXT DIMENSIONS', txtWidth);
                    //$log.debug(canvas, ctx, canvas.width);
                    canvas.width  = txtWidth > canvas.width ? txtWidth : canvas.width;

                    // query the various pixel ratios (for hidpi screens)
                    var devicePixelRatio = window.devicePixelRatio || 1;
                    var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                    ctx.mozBackingStorePixelRatio ||
                    ctx.msBackingStorePixelRatio ||
                    ctx.oBackingStorePixelRatio ||
                    ctx.backingStorePixelRatio || 1;
                    var ratio = devicePixelRatio / backingStoreRatio;

                    // upscale the canvas if the two ratios don't match
                    if (devicePixelRatio !== backingStoreRatio) {
                        var oldWidth = canvas.width;
                        var oldHeight = canvas.height;

                        canvas.width = oldWidth * ratio;
                        canvas.height = oldHeight * ratio;

                        canvas.style.width = oldWidth + 'px';
                        canvas.style.height = oldHeight + 'px';

                        // now scale the context to counter
                        // the fact that we've manually scaled
                        // our canvas element
                        ctx.scale(ratio, ratio);
                    }

                    //now draw the final text
                    ctx.font = scope.font;   //gotta set the font again apparently
                    ctx.fillStyle = scope.color;
                    ctx.textBaseline =  scope.textBaseline;
                    ctx.fillText(scope.text,0,scope.yDrawStart);
                });
            }
        }
    })
    .directive('overlayScreen', function ($rootScope, $btBackButtonDelegate) {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                display: '=',
                hideLeft: '=',
                data: '=?',
                template: '=?',
                onClose: '&'
            },
            templateUrl: 'templates/common/template.overlay-screen.html',
            link: function(scope, element, attrs) {
                if (typeof(scope.onClose) != "function") {
                    scope.onClose = function(){};
                }

                var swipeLeftClose = scope.$eval(attrs.swipeLeftClose) || false;
                var swipeDownClose = scope.$eval(attrs.swipeDownClose) || false;

                scope.dismiss = function() {
                    scope.display = false;
                    scope.onClose();
                };

                scope.onSwipeDown = function($event) {
                    if (swipeDownClose) {
                        //only allow swipe down outside of scroll content?
                        //we can use the $event object to control this...
                        //console.log($event);
                        scope.hideLeft = false;
                        scope.dismiss();
                    }
                };

                scope.onSwipeLeft = function($event) {
                    if (swipeLeftClose) {
                        scope.hideLeft = true;
                        scope.dismiss();
                    }
                };

                scope.$watch('display', function() {
                    if (scope.display) {
                        //temporarily set the back button to close this display (in a 'fire once' manner)
                        $btBackButtonDelegate.setBackButton(function() {
                            scope.$apply(scope.dismiss);
                        }, true);
                        $btBackButtonDelegate.setHardwareBackButton(function() {
                            scope.$apply(scope.dismiss);
                        }, true);
                    } else {
                        //return the backbutton to its previous function
                        $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default, true);
                        $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default, true);
                    }
                    $rootScope.showOverlay = scope.display;
                });
            }
        }
    })
    .directive('browseTo', function () {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attrs) {
                var handleTap = function (e) {
                    window.open(encodeURI($attrs.browseTo || $element[0].href), '_system');
                    e.preventDefault();
                    return false;
                };
                var handler = $element.on('click', handleTap);
                $scope.$on('$destroy', function () {
                    // Clean up - unbind drag gesture handler
                    $element.off('click', handleTap);
                });
            }
        }
    })
    .directive('browseToChildren', function () {
        return {
            restrict: 'A',
            link: function ($scope, $element, $attrs) {
                var handleTap = function (e) {
                    if (e.srcElement.href) {
                        window.open(encodeURI(e.srcElement.href), '_system');
                        e.preventDefault();
                        return false;
                    }
                };
                var handler = $element.on('click', handleTap);
                $scope.$on('$destroy', function ($event) {
                    // Clean up - unbind drag gesture handler
                    $element.off('click', handleTap);
                });
            }
        }
    })
    .directive('toClipboard', function ($rootScope) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                element.bind("click", function (event) {
                    $rootScope.toClipboard(scope.$eval(attrs.toClipboard), 'MSG_COPIED_TO_CLIPBOARD');
                });
            }
        }
    });

