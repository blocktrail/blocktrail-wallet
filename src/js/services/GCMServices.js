angular.module('blocktrail.wallet')
    .factory('gcmService', function($http, CONFIG, $cordovaToast) {

        var baseURL = CONFIG.PUSH_SRV_URL;

        var register = function(userId) {
            $http.post(baseURL + '/register', {"id": userId.toString()})
                .then(function success(res) {
                    console.log(res);
                }, function err(res) {
                    console.log(res);
                });
        };

        var enableNotifications = function($rootScope) {
            // triggered every time notification received
            $rootScope.$on('$cordovaPushV5:notificationReceived', function(event, data){
                // data.message,
                // data.title,
                // data.count,
                // data.sound,
                // data.image,
                // data.additionalData

                console.log(data);

                // Show promo code for example
                if(data && data.additionalData && data.additionalData.type) {
                    switch(data.additionalData.type) {
                        case "promo":
                            $cordovaToast.showLongCenter(data.additionalData.promoCode);
                            break;
                        case "nocosign":
                            $cordovaToast.showLongCenter("Wallet disabled, contact support.");
                            break;
                        case "receive":
                            $cordovaToast.showLongCenter(data.additionalData.txData.txid);
                            break;
                        default:
                            console.log("unknown notification type");
                    }
                }

                console.log("notification received");
            });

            // triggered every time error occurs
            $rootScope.$on('$cordovaPushV5:errorOcurred', function(event, e){
                // e.message
                console.log("notification error!");
            });

        }

        return {
            register: register,
            enableNotifications: enableNotifications
        }
    })
;
