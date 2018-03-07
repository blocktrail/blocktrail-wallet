(function() {
    "use strict";

    angular.module("blocktrail.wallet")
        .controller("AddressLookupCtrl", AddressLookupCtrl);

    function AddressLookupCtrl($scope, CONFIG, $q, $timeout, $cacheFactory, $log, walletsManagerService,
                               $ionicPopover, $translate, $cordovaClipboard, $cordovaToast, $ionicActionSheet,
                               $filter, bitcoinJS, sdkService) {
        var displayAddr = $filter("displayAddr");
        var $cache = $cacheFactory.get('address-lookup') || $cacheFactory('address-lookup', {capacity: 10});
        $scope.onScroll = angular.noop;
        $scope.appControl = {
            useOldAddress: !CONFIG.NETWORKS[sdkService.getNetworkType()].CASHADDRESS
        };

        $scope.items = [];
        $scope.totalItems = null;
        $scope.itemsPerPage = 15;
        $scope.currentPage = 1;
        $scope.walletData = walletsManagerService.getActiveWalletReadOnlyData();

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

                        return walletsManagerService.getActiveSdkWallet()
                            .addresses(options)
                            .then(function (addrs) {
                                $cache.put(cacheKey, addrs);
                                return $q.when(addrs);
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
                            if(addrItem.label) {
                                showRemoveLabelPopover(addrItem);
                            } else {
                                toClipboard(displayAddr(addrItem.address, !$scope.appControl.useOldAddress));
                            }
                            break;
                        case 2:
                            if(addrItem.label) {
                                toClipboard(displayAddr(addrItem.address, !$scope.appControl.useOldAddress));
                            } else {
                                window.open(CONFIG.NETWORKS[$scope.walletData.networkType].EXPLORER_ADDRESS_URL + '/' + addrItem.address, '_system');
                            }
                            break;
                        case 3:
                            window.open(CONFIG.NETWORKS[$scope.walletData.networkType].EXPLORER_ADDRESS_URL + '/' + addrItem.address, '_system');
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

            return walletsManagerService.getActiveSdkWallet()
                .labelAddress($scope.items[idx].address, label)
                .then(function () {
                    $scope.items[idx].label = label;
                    $cache.removeAll(); // flush cache
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
    }
})();
