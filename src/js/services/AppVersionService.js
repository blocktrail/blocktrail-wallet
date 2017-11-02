angular.module('blocktrail.wallet').factory(
    'AppVersionService',
    function(AppVersionBaseService, settingsService, $state, $translate, CONFIG, $ionicPopover, $rootScope, AppRateService) {
        var _CHECKS = AppVersionBaseService.CHECKS;
        var isCheck = AppVersionBaseService.isCheck;
        var activeWallet = walletsManagerService.getActiveWallet();
        var walletData = activeWallet.getReadOnlyWalletData();

        var GLIDERA_VERSION = 'v3.4.8';

        // priority order, first one met is used (allows older version update messages to be prioritized)
        var UPDATE_MESSAGES = [
            ["3.6.8", "UPDATE_NOTICE_BCC_MOBILE"]
        ];

        var checkGlideraActivated = function() {
            if (CONFIG.NETWORKS[walletData.networkType].BUYBTC && $state.includes('app.wallet')) {
                return settingsService.$isLoaded().then(function () {
                    var p;

                    if (settingsService.glideraActivationNoticePending) {
                        settingsService.glideraActivationNoticePending = false;
                        p = settingsService.$store().then(function () {
                            return settingsService.$syncSettingsUp();
                        });


                        popover($translate.instant('UPDATED_NOTICE'), $translate.instant('GLIDERA_UPDATE'));
                    }

                    return p;
                });
            }
        };

        checkGlideraActivated();

        var CHECKS = {
            SETUP: _CHECKS.DEPRECATED | _CHECKS.UNSUPPORTED,
            LOGGEDIN: _CHECKS.DEPRECATED | _CHECKS.UNSUPPORTED | _CHECKS.OUTDATED | _CHECKS.UPDATED
        };

        var popover = function(title, body, unclosable) {
            var modalScope = $rootScope.$new(true);
            modalScope.body = body;
            modalScope.title = title;
            modalScope.appstoreButton = false;
            modalScope.unclosable = !!unclosable;

            // size class, small when unclosable (no footer)
            modalScope.popoverSizeCls = modalScope.unclosable ? "small-popover" : "medium-popover";

            modalScope.openAppStore = function() {
                AppRateService.navigateToAppStore();
                modalScope.popover.destroy();
            };

            return $ionicPopover.fromTemplateUrl('templates/misc/popover.appversion.html', {
                scope: modalScope,
                hardwareBackButtonClose: !unclosable
            }).then(function(popover) {
                modalScope.popover = popover;
                popover.hideDelay = 1000;
                popover.show();
            });
        };

        var checkVersion = function(latestVersion, latestOutdatedNoticeVersion, versionInfo, checks) {
            // if this version of the app supports glidera and it's new we glideraActivationNoticePending=true so that when glidera is activated we can display update notice
            //  this is a special case because glidera is pending server activation
            if (latestVersion && isCheck(checks, _CHECKS.UPDATED) && $state.includes('app.wallet') && semver.lt(latestVersion, GLIDERA_VERSION) && semver.gte(CONFIG.VERSION, GLIDERA_VERSION)) {
                settingsService.$isLoaded().then(function() {
                    if (settingsService.glideraActivationNoticePending === null) {
                        settingsService.glideraActivationNoticePending = true;
                        settingsService.$store()
                            .then(function () {
                                return settingsService.$syncSettingsUp();
                            })
                            .then(function () {
                                return checkGlideraActivated();
                            });
                    }
                });
            }

            var results = AppVersionBaseService.checkVersion(latestVersion, versionInfo, checks, UPDATE_MESSAGES);
            if (results) {
                var match = results[0];
                var meta = results.length > 1 ? results[1] : null;

                if (match === _CHECKS.DEPRECATED) {
                    popover($translate.instant('DEPRECATED_NOTICE'), $translate.instant('DEPRECATED_NOTICE_BODY'));
                } else if (match === _CHECKS.OUTDATED) {
                    if (!latestOutdatedNoticeVersion || semver.lt(latestOutdatedNoticeVersion, versionInfo.latest)) {
                        popover($translate.instant('UPDATE_AVAILABLE_NOTICE'), $translate.instant('UPDATE_AVAILABLE_NOTICE_BODY'));
                    }
                } else if (match === _CHECKS.UNSUPPORTED) {
                    popover($translate.instant('UNSUPPORTED_NOTICE'), $translate.instant('UNSUPPORTED_NOTICE_BODY'), true);
                } else if (match === _CHECKS.UPDATED) {
                    if (meta) {
                        popover($translate.instant('UPDATED_NOTICE'), $translate.instant(meta));
                    }
                }
            }
        };

        return {
            CHECKS: CHECKS,
            checkVersion: checkVersion
        };
    }
)
    .factory(
    'AppVersionBaseService',
    function($translate, $log, CONFIG) {
        var CHECKS = {
            DEPRECATED: 1 << 0,
            OUTDATED: 1 << 1,
            UPDATED: 1 << 2,
            UNSUPPORTED: 1 << 3
        };

        var isCheck = function(checks, check) {
            return (checks & check) === check;
        };

        var checkVersion = function(latestVersion, versionInfo, checks, UPDATE_MESSAGES) {
            $log.debug('latestVersion: ' + latestVersion);
            $log.debug('versionInfo: ' + JSON.stringify(versionInfo, null, 4));

            if (isCheck(checks, CHECKS.UNSUPPORTED)) {
                if (versionInfo.unsupported && semver.lte(CONFIG.VERSION, versionInfo.unsupported)) {
                    return [CHECKS.UNSUPPORTED];
                }
            }

            if (isCheck(checks, CHECKS.DEPRECATED)) {
                if (versionInfo.deprecated && semver.lte(CONFIG.VERSION, versionInfo.deprecated)) {
                    return [CHECKS.DEPRECATED];
                }
            }

            if (isCheck(checks, CHECKS.OUTDATED)) {
                if (versionInfo.latest && semver.lt(CONFIG.VERSION, versionInfo.latest)) {
                    return [CHECKS.OUTDATED];
                }
            }

            if (isCheck(checks, CHECKS.UPDATED) && UPDATE_MESSAGES) {
                if (latestVersion) {
                    if (semver.lt(latestVersion, CONFIG.VERSION)) {
                        var updateMsg;
                        UPDATE_MESSAGES.forEach(function(_updateMsg) {
                            if (!updateMsg && semver.gt(_updateMsg[0], latestVersion)) {
                                updateMsg = _updateMsg;
                            }
                        });

                        return [CHECKS.UPDATED, updateMsg && updateMsg[1]];
                    }
                }
            }
        };

        return {
            CHECKS: CHECKS,
            isCheck: isCheck,
            checkVersion: checkVersion
        };
    }
);
