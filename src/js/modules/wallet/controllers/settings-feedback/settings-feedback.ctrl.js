(function() {
    "use strict";

    angular.module('blocktrail.wallet')
        .controller("SettingsFeedbackCtrl", SettingsFeedbackCtrl);

    function SettingsFeedbackCtrl($scope, $btBackButtonDelegate, modalService, feedbackFromService, formHelperService) {
        // Enable back button
        enableBackButton();

        // Flag for submitting form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
        var isFormSubmit = false;

        $scope.form = {
            msg: "",
            email: ""
        };

        // Methods
        $scope.onSubmitFormFeedback = onSubmitFormFeedback;

        /**
         * On submit form feedback
         * @param feedbackForm
         * @return {boolean}
         */
        function onSubmitFormFeedback(feedbackForm) {
            formHelperService.setAllDirty(feedbackForm);

            // Submit the form only once, to avoid user's freak clicks on button "go", "submit" while keyboard is open
            if(isFormSubmit) {
                return false;
            }

            if (feedbackForm.msg.$invalid) {
                // TODO @Tobias Add the translation message field is required
                modalService.alert({
                    body: "ERROR_TITLE_2"
                });
                return false;
            }

            if (feedbackForm.email.$invalid) {
                modalService.alert({
                    body: "MSG_BAD_EMAIL"
                });
                return false;
            }

            send();
        }

        /**
         * Send
         */
        function send() {
            isFormSubmit = true;

            // disable back button
            disableBackButton();

            modalService.showSpinner({
                body: "SENDING"
            });

            var data = {
                msg: $scope.form.msg,
                email: $scope.form.email
            };

            feedbackFromService.send(data)
                .then(feedbackFormSuccessHandler, feedbackFormErrorHandler);
        }

        /**
         * Feedback form success handler
         */
        function feedbackFormSuccessHandler() {
            isFormSubmit = false;
            enableBackButton();
            modalService.hideSpinner();
            modalService.message({
                title: "THANKS_1",
                body: "MSG_FEEDBACK_SUCCESS"
            })
        }

        /**
         * Feedback form error handler
         */
        function feedbackFormErrorHandler() {
            isFormSubmit = false;
            enableBackButton();
            modalService.hideSpinner();
            modalService.alert({
                title: "ERROR_TITLE_3",
                body: "MSG_BAD_FEEDBACK"
            })
        }

        /**
         * Enable the back button
         */
        function enableBackButton() {
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        }

        /**
         * Disable the back button
         */
        function disableBackButton() {
            $btBackButtonDelegate.setBackButton(angular.noop);
            $btBackButtonDelegate.setHardwareBackButton(angular.noop);
        }
    }

})();
