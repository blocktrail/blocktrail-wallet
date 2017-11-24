/**
 * Created by ranvirsingh on 09-12-2015.
 */


var clipboard = Windows.ApplicationModel.DataTransfer.Clipboard;

module.exports =  {

    copy: function(win, fail, args){
        var dataPackage = new Windows.ApplicationModel.DataTransfer.DataPackage();
        dataPackage.setText(args[0]);
        clipboard.setContent(dataPackage);

    },

    paste:function(win, fail, args){
        var dataPackageView = clipboard.getContent();
        if (dataPackageView.contains(Windows.ApplicationModel.DataTransfer.StandardDataFormats.text)) {
            dataPackageView.getTextAsync().then(function (text) {
                win(text)
            });
        }
    }
};

require("cordova/exec/proxy").add("Clipboard", module.exports);