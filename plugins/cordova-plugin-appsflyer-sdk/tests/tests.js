/* jshint jasmine: true */
/* global cordova */

exports.defineAutoTests = function () {

var isIOS = cordova.platformId == 'ios';
var isAndroid = cordova.platformId == 'android';


var AppsFlyerError = {
    INVALID_ARGUMENT_ERROR: "INVALID_ARGUMENT_ERROR",
    NO_DEVKEY_FOUND: "No 'devKey' found or its empty",
    APPID_NOT_VALID: "'appId' is not valid",
    NO_APPID_FOUND: "No 'appId' found or its empty",
    SUCCESS: "Success"
};


var fail = function(done) {
            expect(true).toBe(false);
            done();
        };

  describe("AppsFlyer", function () {

    it("appsflyer.spec.1 should exist", function() {
        expect(window.plugins.appsFlyer).toBeDefined();
    });
   

    it("appsFlyer.initSdk method", function(){        
        expect(window.plugins.appsFlyer.initSdk).toBeDefined();
        expect(typeof window.plugins.appsFlyer.initSdk).toBe('function');    
    });

    it("appsFlyer.setCurrencyCode method", function(){        
       expect(window.plugins.appsFlyer.setCurrencyCode).toBeDefined();
        expect(typeof window.plugins.appsFlyer.setCurrencyCode).toBe('function');
    });

    it("appsFlyer.setAppUserId method", function(){        
        expect(window.plugins.appsFlyer.setAppUserId).toBeDefined();
        expect(typeof window.plugins.appsFlyer.setAppUserId).toBe('function'); 
    });

    it("appsFlyer.setGCMProjectID method", function(){        
         expect(window.plugins.appsFlyer.setGCMProjectID).toBeDefined();
        expect(typeof window.plugins.appsFlyer.setGCMProjectID).toBe('function');  
    });

    it("appsFlyer.enableUninstallTracking method", function(){        
         expect(window.plugins.appsFlyer.enableUninstallTracking).toBeDefined();
        expect(typeof window.plugins.appsFlyer.enableUninstallTracking).toBe('function');
    });

    it("appsFlyer.getAppsFlyerUID method", function(){        
       expect(window.plugins.appsFlyer.getAppsFlyerUID).toBeDefined();
        expect(typeof window.plugins.appsFlyer.getAppsFlyerUID).toBe('function');
    });

    it("appsFlyer.trackEvent method", function(){        
        expect(window.plugins.appsFlyer.trackEvent).toBeDefined();
        expect(typeof window.plugins.appsFlyer.trackEvent).toBe('function');   
    });
   

  });


describe("AppsFlyer -> initSdk", function () {

    

    /*
##################   SUCCESS testing   ################################
*/                

    it("appsflyer.spec.2 success callback devKey is defined", function(done) {  

        //ios uses appId, this test will fail
        if (isIOS) {
            pending();
            return;
        }

        var successCB = function(result) {
                         expect(result).toBeDefined();
                         expect(typeof result === "string").toBe(true);
                         expect(result).toBe(AppsFlyerError.SUCCESS);
                        done();
                        return;
                    };
      

        function errorCB(err) {
            expect(err).toBeDefined();
                expect(typeof err === "string").toBe(true);
                fail(done);
                return;
        }


         var options = {
               devKey:  'd3Ac9qPnrpXYZxfWmCdpwL'
            };
        window.plugins.appsFlyer.initSdk(options, successCB, errorCB);
    });   


    it("appsflyer.spec.2 success callback devKey | AppId | isDebug is defined", function(done) {  

                var successCB = function(result) {
                         expect(result).toBeDefined();
                         expect(typeof result === "string").toBe(true);
                         expect(result).toBe(AppsFlyerError.SUCCESS);
                        done();
                        return;
                    };

                function errorCB(err) {
                    expect(err).toBeDefined();
                        fail(done);
                        return;
                }


                 var options = {
                       devKey:  'd3Ac9qPnrpXYZxfWmCdpwL',
                       appId: '123456789',
                       isDebug: false
                    };
                window.plugins.appsFlyer.initSdk(options, successCB, errorCB);
    });   

    it("appsflyer.spec.2 success callback devKey and AppId is defined", function(done) {  

                var successCB = function(result) {
                         expect(result).toBeDefined();
                         expect(typeof result === "string").toBe(true);
                         expect(result).toBe(AppsFlyerError.SUCCESS);
                        done();
                        return;
                    };

                function errorCB(err) {
                    expect(err).toBeDefined();
                        fail(done);
                        return;
                }


                 var options = {
                       devKey:  'd3Ac9qPnrpXYZxfWmCdpwL',
                       appId: '123456789'
                    };
                window.plugins.appsFlyer.initSdk(options, successCB, errorCB);
    });   



/*
##################   ERROR testing   ################################
*/
    it("appsflyer.spec.2 error callback devKey is undefined", function(done) {
       var successCB = function(result) {
                        fail(done);
                        return;
                    };
                    
                function errorCB(err) {
                    expect(err).toBeDefined();
                    expect(typeof err === "string").toBe(true);
                    expect(err).toBe(AppsFlyerError.NO_DEVKEY_FOUND);
                    done();
                    return;                        
                }

                var options = {};
                window.plugins.appsFlyer.initSdk(options, successCB, errorCB);
    }); 


    it("appsflyer.spec.2 error callback appId is undefined", function(done) {

      if(isAndroid){
        pending();
        return;
      }

       var successCB = function(result) {
                        fail(done);
                        return;
                    };
                    
                function errorCB(err) {
                    expect(err).toBeDefined();
                    expect(typeof err === "string").toBe(true);
                    expect(err).toBe(AppsFlyerError.NO_APPID_FOUND);
                    done();
                    return;                        
                }

                var options = {
                    devKey:  'd3Ac9qPnrpXYZxfWmCdpwL',
                };
                window.plugins.appsFlyer.initSdk(options, successCB, errorCB);
    });   


    it("appsflyer.spec.2 error callback appId defined as Integer", function(done) {

      if(isAndroid){
        pending();
        return;
      }

       var successCB = function(result) {
                        fail(done);
                        return;
                    };
                    
                function errorCB(err) {
                    expect(err).toBeDefined();
                    expect(typeof err === "string").toBe(true);
                    expect(err).toBe(AppsFlyerError.APPID_NOT_VALID);
                    done();
                    return;                        
                }

                var options = {
                    devKey:  'd3Ac9qPnrpXYZxfWmCdpwL',
                    appId: 123456789
                };
                window.plugins.appsFlyer.initSdk(options, successCB, errorCB);
    });   

    it("appsflyer.spec.2 error callback devKey is Empty", function(done) {

       var successCB = function(result) {
                        fail(done);
                        return;
                    };
                    
                function errorCB(err) {
                    expect(err).toBeDefined();
                    expect(typeof err === "string").toBe(true);
                    expect(err).toBe(AppsFlyerError.NO_DEVKEY_FOUND);
                    done();
                    return;                        
                }

                var options = {
                    devKey:  '',
                    appId: '123456789'
                };
                window.plugins.appsFlyer.initSdk(options, successCB, errorCB);
    });   

  });


};





exports.defineManualTests = function (contentEl, createActionButton) {};