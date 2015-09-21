//=============================================================================
// Each bucket gets its own namespace in localStorage.
//=============================================================================

angular.module('ionic.service.analytics')

.factory('bucketStorage', [
  'persistentStorage',
  '$ionicCoreSettings',
  '$ionicApp',
function(persistentStorage, $ionicCoreSettings, $ionicApp) {

  function Bucket(name) {
    this.name = name;
  }

  Bucket.prototype.get = function(key) {
    key = this.scopeKey(key);
    return persistentStorage.retrieveObject(key);
  }

  Bucket.prototype.set = function(key, value) {
    key = this.scopeKey(key);
    return persistentStorage.storeObject(key, value);
  }

  Bucket.prototype.scopeKey = function(key) {
    return this.name + '_' + key + '_' + appId();
  }

  function appId() {
    if ($ionicCoreSettings.get('app_id')) {
      return $ionicCoreSettings.get('app_id')
    } else if ($ionicApp.getApp().app_id) {
      return $ionicApp.getApp().app_id
    } else {
      return null;
    }
  }

  return {
    bucket: function(name) {
      return new Bucket(name);
    }
  }
}])
