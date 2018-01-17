

/**
 * 
 * <row-data-directive 
            button-text="'initSDK'"
            data-text='viewModel.initSdkResponse'
            on-click="onClick(action)">                
        </row-data-directive>
 */
app.directive('rowDataDirective', function ($timeout) {
    return {
        restrict: 'E',
        scope: {
            data: '=',
            buttonText: '@',
            onClick: '&'
        },
        templateUrl: 'templates/row-data-directive.html',
        link: function (scope, element, attr) {
             
            function run() {
               console.log(scope.data);
            }
            
           scope.onTap = function(){
               scope.onClick({
                   data:{
                       type: scope.buttonText
                   }
               });
           };
           
           scope.onDataChange = function(_data){
               $timeout(function(){
                        scope.localData = _data;            
                  },1); 
           };
            
            
            run();
            
            
            scope.$watch('data', function (newVal, oldVal) {
                
                scope.localData = newVal;
                
                if (newVal !== oldVal) {
                    scope.onDataChange(newVal);
                }
            });
        }
    }
});