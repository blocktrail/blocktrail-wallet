(function() {
    "use strict";

    // TODO Add later
    angular.module("blocktrail.core")
        .factory("modalService", function($ionicModal, $rootScope, $q, $injector, $controller) {
                return new ModalService($ionicModal, $rootScope, $q, $injector, $controller);
            }
        );

    function ModalService($ionicModal, $rootScope, $q, $injector, $controller) {
        var self = this;

        self._$ionicModal = $ionicModal;
        self._$rootScope = $rootScope;
        self._$q = $q;
        self._$injector = $injector;
        self._$controller = $controller;
    }

    ModalService.prototype.show = function(templateUrl, controller, parameters, options) {
        var self = this;
        // Grab the injector and create a new scope
        var deferred       = self._$q.defer(),
            ctrlInstance,
            modalScope     = self._$rootScope.$new(),
            thisScopeId    = modalScope.$id,
            defaultOptions = {
                animation: "slide-in-up",
                focusFirstInput: false,
                backdropClickToClose: false,
                hardwareBackButtonClose: false,
                modalCallback: null
            };

        options = angular.extend({}, defaultOptions, options);

        self._$ionicModal.fromTemplateUrl(templateUrl, {
            scope: modalScope,
            animation: options.animation,
            focusFirstInput: options.focusFirstInput,
            backdropClickToClose: options.backdropClickToClose,
            hardwareBackButtonClose: options.hardwareBackButtonClose
        }).then(function(modal) {
            modalScope.modal = modal;

            modalScope.openModal = function() {
                modalScope.modal.show();
            };

            modalScope.closeModal = function(result) {
                deferred.resolve(result);
                modalScope.modal.hide();
            };

            modalScope.$on("modal.hidden", function(thisModal) {
                if (thisModal.currentScope) {
                    var modalScopeId = thisModal.currentScope.$id;
                    if (thisScopeId === modalScopeId) {
                        deferred.resolve(null);
                        self._cleanup(thisModal.currentScope);
                    }
                }
            });

            // Invoke the controller
            var locals = {"$scope": modalScope, "parameters": parameters};
            var ctrlEval = self._evalController(controller);

            ctrlInstance = self._$controller(controller, locals);

            if (ctrlEval.isControllerAs) {
                ctrlInstance.openModal = modalScope.openModal;
                ctrlInstance.closeModal = modalScope.closeModal;
            }

            modalScope.modal.show()
                .then(function() {
                    modalScope.$broadcast("modal.afterShow", modalScope.modal);
                });

            if (angular.isFunction(options.modalCallback)) {
                options.modalCallback(modal);
            }

        }, function(err) {
            deferred.reject(err);
        });

        return deferred.promise;
    };

    ModalService.prototype.alert = function(parameters) {
        var self = this;

        return self.show("js/modules/core/dialog/alert/alert.tpl.html", "DialogAlertCtrl", parameters || {});
    };

    ModalService.prototype.confirmPassword = function(parameters) {
        var self = this;

        return self.show("js/modules/core/dialog/confirm-password/confirm-password.tpl.html", "DialogConfirmPasswordCtrl", parameters || {});
    };

    ModalService.prototype._cleanup = function(scope) {
        scope.$destroy();

        if (scope.modal) {
            scope.modal.remove();
        }
    };

    ModalService.prototype._evalController = function(ctrlName) {
        var result = {
            isControllerAs: false,
            controllerName: "",
            propName: ""
        };
        var fragments = (ctrlName || "").trim().split(/\s+/);

        result.isControllerAs = fragments.length === 3 && (fragments[1] || "").toLowerCase() === "as";

        if (result.isControllerAs) {
            result.controllerName = fragments[0];
            result.propName = fragments[2];
        } else {
            result.controllerName = ctrlName;
        }

        return result;
    };

})();
