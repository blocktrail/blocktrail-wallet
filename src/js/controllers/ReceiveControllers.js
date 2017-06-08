angular.module('blocktrail.wallet')
    .controller('ReceiveCtrl', function($scope, $rootScope, Wallet, CurrencyConverter, $q, $cordovaClipboard, $cordovaEmailComposer,
                                        $timeout, $btBackButtonDelegate, $translate, $cordovaSms, $log, $cordovaToast) {
        $scope.address = null;
        $scope.path = null;
        $scope.bitcoinUri = null;
        $scope.qrcode = null;
        $scope.newRequest = {
            address: null,
            path: null,
            btcValue: 0,
            fiatValue: 0,
            message: null,
            bitcoinUri: ""
        };
        //control status of the app (allows for child scope modification)
        $scope.appControl = {
            working: false,
            showMessage: false,
            showRequestOptions: false
        };
        $scope.message = {};
        $scope.qrSettings = {
            correctionLevel: 7,
            SIZE: 225,
            inputMode: 'M',
            image: true
        };
        $scope.smsOptions = {
            replaceLineBreaks: false, // true to replace \n by a new line, false by default
            android: {
                intent: 'INTENT'  // send SMS with the native android SMS messaging
                //intent: '' // send SMS without open any other app
            }
        };


        $scope.swapInputs = function() {
            $scope.fiatFirst = !$scope.fiatFirst;
        };

        $scope.setFiat = function() {
            //converts and sets the FIAT value from the BTC value
            $scope.newRequest.fiatValue = parseFloat(CurrencyConverter.fromBTC($scope.newRequest.btcValue, $scope.settings.localCurrency, 2)) || 0;
            //$scope.newRequest.fiatValue.$setDirty();   //ideally set the other input to dirty as well
        };
        $scope.setBTC = function() {
            //converts and sets the BTC value from the FIAT value
            $scope.newRequest.btcValue = parseFloat(CurrencyConverter.toBTC($scope.newRequest.fiatValue, $scope.settings.localCurrency, 6)) || 0;
            //$scope.newRequest.btcValue.$setDirty();    //ideally set the other input to dirty as well
        };
        $scope.newAddress = function() {
            $q.when(Wallet.getNewAddress()).then(function(address) {
                $scope.newRequest.address = address;
            });
        };

        $scope.generateQR = function() {
            if (!$scope.newRequest.address) {
                return false;
            }
            $scope.newRequest.bitcoinUri = "bitcoin:" + $scope.newRequest.address;
            if ($scope.newRequest.btcValue) {
                $scope.newRequest.bitcoinUri += "?amount=" + $scope.newRequest.btcValue.toFixed(8);
            }
        };

        $scope.showExportOptions = function() {
            $scope.appControl.showRequestOptions = true;
            $scope.appControl.showMessage = false;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                    $scope.appControl.showRequestOptions = false;
                    $scope.appControl.showMessage = false;
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.appControl.showRequestOptions = false;
                    $scope.appControl.showMessage = false;
                });
            }, true);
        };

        $scope.hideExportOptions = function() {
            $scope.appControl.showRequestOptions = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };

        $scope.showMessage = function() {
            $scope.appControl.showMessage = true;
            //set alternative back button function (just fires once)
            $btBackButtonDelegate.setBackButton(function() {
                $timeout(function() {
                $scope.appControl.showMessage = false;
                });
            }, true);
            $btBackButtonDelegate.setHardwareBackButton(function() {
                $timeout(function() {
                    $scope.appControl.showMessage = false;
                });
            }, true);
        };

        $scope.dismissMessage = function() {
            $scope.appControl.showMessage = false;
            //reset back button functionality
            $btBackButtonDelegate.setBackButton($btBackButtonDelegate._default);
            $btBackButtonDelegate.setHardwareBackButton($btBackButtonDelegate._default);
        };

        $scope.toClipboard = function() {
            $cordovaClipboard.copy($scope.newRequest.address).then(function () {
                $cordovaToast.showShortCenter($translate.instant('MSG_ADDRESS_COPIED').sentenceCase())
                    .catch(function (err) {
                        console.error(err);
                    });
            }, function () {
                // error
                $scope.message = {title: 'Oops', body: 'unable to copy to clipboard'};
                $scope.showMessage();
            });
        };

        $scope.toEmail = function() {
            //get the QRCode
            var qrcode = document.querySelector('qr img');
            var params = {
                address: $scope.newRequest.address,
                addressURI: $scope.newRequest.bitcoinUri,
                btcValue: $scope.newRequest.btcValue,
                fiatValue: $scope.newRequest.fiatValue,
                localCurrency: $rootScope.settings.localCurrency,
                qrcode: qrcode.src
            };

            //launch email
            var options = {
                to: '',
                attachments: [
                    'base64:qrcode.png//' + qrcode.src.replace(/^data\:([^\;]+)\;base64,/gmi, '')
                ],
                subject: $scope.newRequest.btcValue ? $translate.instant('MSG_REQUEST_EMAIL_SUBJECT_2', params).sentenceCase() : $translate.instant('MSG_REQUEST_EMAIL_SUBJECT_1', params).sentenceCase(),
                body: $scope.newRequest.btcValue ? $translate.instant('MSG_REQUEST_EMAIL_BODY_2', params) : $translate.instant('MSG_REQUEST_EMAIL_BODY_1', params),
                isHtml: true
            };

            return $cordovaEmailComposer.open(options)
                .then(function() {
                    $log.debug('email success');
                    $scope.hideExportOptions();
                }, function() {
                    // user cancelled email
                    $log.error('email cancelled');
                    $scope.hideExportOptions();
                });
        };

        $scope.toSMS = function() {
            var params = {
                address: $scope.newRequest.address,
                btcValue: $scope.newRequest.btcValue,
                fiatValue: $scope.newRequest.fiatValue,
                localCurrency: $rootScope.settings.localCurrency
            };

            var smsMessage = $scope.newRequest.btcValue ? $translate.instant('MSG_REQUEST_SMS_2', params) : $translate.instant('MSG_REQUEST_SMS_1', params);
            return $cordovaSms.send('', smsMessage, $scope.smsOptions)
                .then(function() {
                    $scope.hideExportOptions();
                })
                .catch(function(err) {
                    // An error occurred
                    $log.error(err);
                });
        };

        //update the URI and QR code when address or value change
        $scope.$watchGroup(['newRequest.btcValue', 'newRequest.address'], function(newValues, oldValues) {
            if (oldValues != newValues) {
                //ignore call from scope initialisation
                $scope.generateQR();
            }
        });

        //generate the first address
        $scope.newAddress();
    })
    .controller('RequestContactCtrl', function($scope, $log, CurrencyConverter, Wallet, $timeout) {
        //...
    })
    .controller('AddressLookupCtrl', function($scope, $rootScope, Wallet, $q, $timeout, $cacheFactory, $log,
                                              $ionicPopover, $translate, $cordovaClipboard, $cordovaToast, $ionicActionSheet) {

        var $cache = $cacheFactory.get('address-lookup') || $cacheFactory('address-lookup', {capacity: 10});
        $scope.onScroll = angular.noop;

        $scope.items = [];
        $scope.totalItems = null;
        $scope.itemsPerPage = 15;
        $scope.currentPage = 1;

        // Search related
        $scope.search = {
            searchText : "",
            isLoading: false,
            checkOnlyUsed: false,
            checkOnlyLabeled: false,
            searchSortOrder : 'asc'
        };

        // Label edit related
        $scope.labelEdit = {
            labelInput: "",
            currentPopover: {},
            selectedAddress: null,
            remove: function () {
                this.currentPopover.remove();
            }
        };
        // Stores current label on edit so the edit-popover can reach it
        $scope.popoverLabel = "";

        $scope.$on("$destroy", function(){
            $log.log("Address cache cleared on leaving lookup state");
            $cache.removeAll();
        });

        /**
         * Filters addresses (uses pagination, max 20 res per request) by a search text, usage and labels.
         * @param page Page of search results
         * @param limit Limit of results per page (max 20)
         * @param sort_dir Sort order ('asc' or 'desc')
         * @param searchText Search for this text (in addresses and labels)
         * @param hideUnused Hide unused addresses
         * @param hideUnlabeled Hide unlabeled addresses
         */
        $scope.filterAddresses = function(page, limit, sort_dir, searchText, hideUnused, hideUnlabeled) {
            $scope.search.isLoading = true;
            if (!searchText) searchText = "";

            var cacheKey = [searchText, limit, sort_dir, hideUnused, hideUnlabeled, page].join(":");
            var cached = $cache.get(cacheKey);

            return $q.when(cached)
                .then(function(cached) {
                    if (cached) {
                        return cached;
                    } else {
                        return Wallet.wallet.then(function (wallet) {
                            var options = {
                                page: page,
                                limit: limit,
                                sort_dir: sort_dir,
                                hide_unused: hideUnused,
                                hide_unlabeled: hideUnlabeled
                            };

                            if (searchText.length > 0) {
                                options.search = searchText;
                                options.search_label = searchText;
                            }

                            return wallet.addresses(options).then(function (addrs) {
                                $cache.put(cacheKey, addrs);
                                return $q.when(addrs);
                            });
                        });
                    }
                }).finally(function() {
                    // Just show a little loading, even from cache
                    $timeout(function() {
                        $scope.search.isLoading = false;
                    }, 200);
                });
        };

        /**
         * Show actionsheet with options for the current address
         * @param addrItem
         */
        $scope.showAddressOptions = function(addrItem) {

            var optionLabels = [];
            optionLabels.push({ text: $translate.instant('EDIT_LABEL') });
            if(addrItem.label) optionLabels.push({ 'text': $translate.instant('DELETE_LABEL') });
            optionLabels.push({ 'text': $translate.instant('COPY_TO_CLIPBOARD') });
            optionLabels.push({ 'text': $translate.instant('MORE_DETAILS') });

            var options = {
                buttons: optionLabels,
                addCancelButtonWithLabel: $translate.instant('CANCEL'),
                cancelText: $translate.instant('CANCEL'),
                cancel: function () {},
                buttonClicked: function(btnIndex) {
                    switch (btnIndex) {
                        case 0:
                            showAddLabelPopover(addrItem);
                            break;
                        case 1:
                            if(addrItem.label) showRemoveLabelPopover(addrItem);
                            else toClipboard(addrItem.address);
                            break;
                        case 2:
                            if(addrItem.label) toClipboard(addrItem.address);
                            else window.open('https://btc.com/' + addrItem.address, '_system');
                            break;
                        case 3:
                            window.open('https://btc.com/' + addrItem.address, '_system');
                            break;
                        default:
                            return false;
                    }
                    return true;
                }
            };
            $ionicActionSheet.show(options);
        };

        /**
         * Displays popover to remove a Label
         * @param addrItem Selected Item from ion-list
         */
        var showAddLabelPopover = function (addrItem) {

            $ionicPopover.fromTemplateUrl('templates/misc/popover.editlabel.html', {
                hardwareBackButtonClose: true,
                scope: $scope
            }).then(function(popover) {
                popover.hideDelay = 1000;
                $scope.labelEdit.labelInput = addrItem.label;
                $scope.labelEdit.currentPopover = popover;
                $scope.labelEdit.selectedAddress = addrItem;
                popover.show();
            });
        };

        /**
         * Displays popover to add a Label
         * @param addrItem Selected Item from ion-list
         */
        var showRemoveLabelPopover = function (addrItem) {
            $ionicPopover.fromTemplateUrl('templates/misc/popover.removelabel.html', {
                    hardwareBackButtonClose: true,
                    focusFirstInput: true,
                    scope: $scope
            }).then(function(popover) {
                popover.hideDelay = 1000;
                $scope.labelEdit.labelInput = ""; // Remove == Write empty label
                $scope.labelEdit.currentPopover = popover;
                $scope.labelEdit.selectedAddress = addrItem;
                popover.show();
            });
        };

        $scope.removePopover = function () {
            $scope.labelEdit.remove();
        };

        $scope.alterLabel = function() {
            // Remove popover
            $scope.removePopover();

            var idx = $scope.items.indexOf($scope.labelEdit.selectedAddress);
            var label = $scope.labelEdit.labelInput;

            return Wallet.wallet.then(function (wallet) {
                return wallet.labelAddress($scope.items[idx].address, label).then(function () {
                    $scope.items[idx].label = label;
                    $cache.removeAll(); // flush cache
                });
            }).catch(function(err) {
                $log.log("Labeling address failed", err);
            });
        };

        $scope.refreshResults = function () {
            $cache.removeAll();
            loadInit();
            $scope.$broadcast('scroll.refreshComplete');
        };

        /**
         * Loads addresses upon scrolling down
         */
        $scope.loadAddresses = function(initLoad){
            if(initLoad) $scope.currentPage = 1;
            else $scope.currentPage += 1;

            $scope.filterAddresses(
                $scope.currentPage,
                $scope.itemsPerPage,
                $scope.search.searchSortOrder,
                $scope.search.searchText,
                $scope.search.checkOnlyUsed,
                $scope.search.checkOnlyLabeled
            ).then(
                function (addrs) {
                    if(!initLoad) {
                        if(addrs.current_page && addrs.current_page === $scope.currentPage)
                            $scope.items = $scope.items.concat(addrs.data);
                    } else {
                        $scope.items = addrs.data;
                    }
                    $scope.totalItems = addrs.total;
                    $scope.pagesCount = Math.ceil($scope.totalItems / $scope.itemsPerPage);

                    $timeout(function() {
                        $scope.$broadcast('scroll.infiniteScrollComplete');
                    }, 200);
                });

        };

        var loadInit = function () {
            $log.log('init loading');
            $scope.loadAddresses(true);
        };

        /**
         * Watch search bar and checkboxes for changes
         */
        $scope.$watchGroup(['search.searchText', 'search.checkOnlyUsed', 'search.checkOnlyLabeled'], loadInit);

        var toClipboard = function(newClipboard) {
            $cordovaClipboard.copy(newClipboard).then(function () {
                $cordovaToast.showShortCenter($translate.instant('MSG_ADDRESS_COPIED').sentenceCase())
                    .catch(function (err) {
                        console.error(err);
                    });
            }, function () {
                // error
                $scope.message = {title: 'Oops', body: 'unable to copy to clipboard'};
                $scope.showMessage();
            });
        };
    })
;
