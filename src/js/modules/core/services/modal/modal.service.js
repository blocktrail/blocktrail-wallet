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

        self._spinnerModal = null;
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
            })
            .then(function(modal) {
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

    ModalService.prototype.message = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            title: (typeof parameters.title === "string") ? parameters.title : "WARNING",
            titleClass: (typeof parameters.titleClass === "string") ? parameters.titleClass : "",
            body: (typeof parameters.body === "string") ? parameters.body : "",
            bodyClass: (typeof parameters.bodyClass === "string") ? parameters.bodyClass : "",
            button: (typeof parameters.button === "string") ? parameters.button : "OK"
        };

        return self.show("js/modules/core/controllers/modal-message/modal-message.tpl.html", "ModalMessageCtrl", parameters);
    };

    ModalService.prototype.alert = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            title: (typeof parameters.title === "string") ? parameters.title : "FAIL",
            titleClass: (typeof parameters.titleClass === "string") ? parameters.titleClass : "text-bad",
            body: (typeof parameters.body === "string") ? parameters.body : "",
            bodyClass: (typeof parameters.bodyClass === "string") ? parameters.bodyClass : "",
            button: (typeof parameters.button === "string") ? parameters.button : "OK"
        };

        return self.message(parameters);
    };

    ModalService.prototype.confirm = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            title: (typeof parameters.title === "string") ? parameters.title : "WARNING",
            titleClass: (typeof parameters.titleClass === "string") ? parameters.titleClass : "",
            body: (typeof parameters.body === "string") ? parameters.body : "",
            bodyClass: (typeof parameters.bodyClass === "string") ? parameters.bodyClass : "",
            buttonConfirm: (typeof parameters.buttonConfirm === "string") ? parameters.buttonConfirm : "CONFIRM",
            buttonCancel: (typeof parameters.buttonCancel === "string") ? parameters.buttonCancel : "CANCEL"
        };

        return self.show("js/modules/core/controllers/modal-confirm/modal-confirm.tpl.html", "ModalConfirmCtrl", parameters);
    };


    ModalService.prototype.confirmPassword = function(parameters) {
        var self = this;

        return self.show("js/modules/core/controllers/modal-confirm-password/modal-confirm-password.tpl.html", "ModalConfirmPasswordCtrl", parameters);
    };

    ModalService.prototype.showSpinner = function(parameters) {
        var self = this;

        if (self._spinnerModal) {
            self.closeSpinner();
        }
        
        function spinnerModal(modal) {
            self._spinnerModal = modal;
        }

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            title: (typeof parameters.title === "string") ? parameters.title : "LOADING",
            titleClass: (typeof parameters.titleClass === "string") ? parameters.titleClass : "",
            body: (typeof parameters.body === "string") ? parameters.body : "",
            bodyClass: (typeof parameters.bodyClass === "string") ? parameters.bodyClass : ""
        };

        self.show("js/modules/core/controllers/modal-spinner/modal-spinner.tpl.html", "ModalSpinnerCtrl", parameters, {
            modalCallback: spinnerModal
        });

        return {
            closeSpinner: self.closeSpinner
        };
    };

    ModalService.prototype.hideSpinner = function() {
        var self = this;

        if(self._spinnerModal) {
            self._spinnerModal.hide();
            self._spinnerModal = null;
        }
    };

    ModalService.prototype.updateSpinner = function(parameters) {
        var self = this;

        if(self._spinnerModal) {
            // Check on undefined
            parameters = parameters ? parameters : {};

            // Set default values for undefined properties
            parameters = {
                title: (typeof parameters.title === "string") ? parameters.title : "LOADING",
                titleClass: (typeof parameters.titleClass === "string") ? parameters.titleClass : "",
                body: (typeof parameters.body === "string") ? parameters.body : "",
                bodyClass: (typeof parameters.bodyClass === "string") ? parameters.bodyClass : ""
            };

            self._spinnerModal.scope.updateData(parameters);
        } else {
            self.show(parameters);
        }
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
