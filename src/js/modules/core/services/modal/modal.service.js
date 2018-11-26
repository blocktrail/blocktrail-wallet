(function() {
    "use strict";

    // TODO Add later
    angular.module("blocktrail.core")
        .factory("modalService", function($ionicModal, $rootScope, $q, $injector, $controller, _) {
            return new ModalService($ionicModal, $rootScope, $q, $injector, $controller, _);
        });

    function ModalService($ionicModal, $rootScope, $q, $injector, $controller, _) {
        var self = this;

        self._$ionicModal = $ionicModal;
        self._$rootScope = $rootScope;
        self._$q = $q;
        self._$injector = $injector;
        self._$controller = $controller;
        self._lodash = _;

        self._spinnerModal = null;
    }

    /**
     * Show
     * @param templateUrl
     * @param controller
     * @param parameters
     * @param options
     */
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
                var locals = { "$scope": modalScope, "parameters": parameters };
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

    /**
     * Message
     * @param parameters
     */
    ModalService.prototype.message = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            title: self._lodash.isString(parameters.title) ? parameters.title : "WARNING",
            titleClass: self._lodash.isString(parameters.titleClass) ? parameters.titleClass : "",
            body: self._lodash.isString(parameters.body) ? parameters.body : "",
            bodyClass: self._lodash.isString(parameters.bodyClass) ? parameters.bodyClass : "",
            button: self._lodash.isString(parameters.button) ? parameters.button : "OK"
        };

        return self.show("js/modules/core/controllers/modal-message/modal-message.tpl.html", "ModalMessageCtrl", parameters);
    };

    /**
     * Alert
     * @param parameters
     */
    ModalService.prototype.alert = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            title: self._lodash.isString(parameters.title) ? parameters.title : "FAIL",
            titleClass: self._lodash.isString(parameters.titleClass) ? parameters.titleClass : "text-bad",
            body: self._lodash.isString(parameters.body) ? parameters.body : "",
            bodyClass: self._lodash.isString(parameters.bodyClass) ? parameters.bodyClass : "",
            button: self._lodash.isString(parameters.button) ? parameters.button : "OK"
        };

        return self.message(parameters);
    };

    /**
     * Confirm
     * @param parameters
     */
    ModalService.prototype.confirm = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            title: self._lodash.isString(parameters.title) ? parameters.title : "WARNING",
            titleClass: self._lodash.isString(parameters.titleClass) ? parameters.titleClass : "",
            body: self._lodash.isString(parameters.body) ? parameters.body : "",
            bodyClass: self._lodash.isString(parameters.bodyClass) ? parameters.bodyClass : "",
            buttonConfirm: self._lodash.isString(parameters.buttonConfirm) ? parameters.buttonConfirm : "CONFIRM",
            buttonCancel: self._lodash.isString(parameters.buttonCancel) ? parameters.buttonCancel : "CANCEL"
        };

        return self.show("js/modules/core/controllers/modal-confirm/modal-confirm.tpl.html", "ModalConfirmCtrl", parameters);
    };

    /**
     * Prompt
     * @param parameters
     */
    ModalService.prototype.prompt = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            title: self._lodash.isString(parameters.title) ? parameters.title : "",
            titleClass: self._lodash.isString(parameters.titleClass) ? parameters.titleClass : "",
            body: self._lodash.isString(parameters.body) ? parameters.body : "",
            bodyClass: self._lodash.isString(parameters.bodyClass) ? parameters.bodyClass : "",
            placeholder: self._lodash.isString(parameters.placeholder) ? parameters.placeholder : "",
            buttonConfirm: self._lodash.isString(parameters.buttonConfirm) ? parameters.buttonConfirm : "CONFIRM",
            buttonCancel: self._lodash.isString(parameters.buttonCancel) ? parameters.buttonCancel : "CANCEL",
            preFill: self._lodash.isString(parameters.preFill) ? parameters.preFill : ""
        };

        var options = {
            focusFirstInput: self._lodash.isBoolean(parameters.focusFirstInput) ? parameters.focusFirstInput : false
        };

        return self.show("js/modules/core/controllers/modal-prompt/modal-prompt.tpl.html", "ModalPromptCtrl", parameters, options);
    };

    /**
     * Select
     * @param parameters
     */
    ModalService.prototype.select = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            options: self._lodash.isArray(parameters.options) ? parameters.options : [],
            buttonCancel: self._lodash.isString(parameters.buttonCancel) ? parameters.buttonCancel : "CANCEL"
        };

        return self.show("js/modules/core/controllers/modal-select/modal-select.tpl.html", "ModalSelectCtrl", parameters);
    };

    /**
     * Action buttons
     * @param parameters
     */
    ModalService.prototype.actionButtons = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            options: self._lodash.isArray(parameters.options) ? parameters.options : [],
            buttonCancel: self._lodash.isString(parameters.buttonCancel) ? parameters.buttonCancel : "CANCEL"
        };

        return self.show("js/modules/core/controllers/modal-action-buttons/modal-action-buttons.tpl.html", "ModalActionButtonsCtrl", parameters);
    };

    /**
     * Action buttons
     * @param parameters
     */
    ModalService.prototype.cropPic = function(parameters) {
        var self = this;

        // Check on undefined
        parameters = parameters ? parameters : {};

        // Set default values for undefined properties
        parameters = {
            options: self._lodash.isArray(parameters.options) ? parameters.options : [],
            picData: self._lodash.isString(parameters.picData) ? parameters.picData : null,
            buttonConfirm: self._lodash.isString(parameters.buttonConfirm) ? parameters.buttonConfirm : "CONFIRM",
            buttonCancel: self._lodash.isString(parameters.buttonCancel) ? parameters.buttonCancel : "CANCEL"
        };

        return self.show("js/modules/core/controllers/modal-crop-pic/modal-crop-pic.tpl.html", "ModalCropPicCtrl", parameters);
    };

    /**
     * Show spinner
     * @param parameters
     * @return {{ closeSpinner: * }}
     */
    ModalService.prototype.showSpinner = function(parameters) {
        var self = this;

        if (self._spinnerModal) {
            self.hideSpinner();
        }
        
        function spinnerModal(modal) {
            if (self._spinnerModal) {
                self._spinnerModal.hide();
            }

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

    /**
     * Hide spinner
     */
    ModalService.prototype.hideSpinner = function() {
        var self = this;

        if(self._spinnerModal) {
            self._spinnerModal.hide();
            self._spinnerModal = null;
        }
    };

    /**
     * Update spinner
     * @param parameters
     */
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

    /**
     * Cleanup
     * @param scope
     * @private
     */
    ModalService.prototype._cleanup = function(scope) {
        scope.$destroy();

        if (scope.modal) {
            scope.modal.remove();
        }
    };

    /**
     * Eval controller
     * @param ctrlName
     * @return {{isControllerAs: boolean, controllerName: string, propName: string}}
     * @private
     */
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
