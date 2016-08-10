angular.module('blocktrail.localisation', [
    'pascalprecht.translate',
    'blocktrail.translations'
])
    .config(function($translateProvider, TRANSLATIONS) {
        var processTranslations = function(translations) {
            _.forEach(translations, function(v, k) {
                // merged arrays with newlines
                if (_.isArray(v)) {
                    translations[k] = v.join("\n");
                }
            });

            return translations;
        };

        //init with device lang as default
        var availableLocales = [
            'en-GB',
            'en-US',
            'fr-FR',
            'de-DE',
            'nl-NL'
        ];
        // var defaultLanguage = availableLocales.indexOf(navigator.language) > -1 ? navigator.language : 'en-GB';
        var defaultLanguage = 'en-GB';
        var english = angular.extend({}, TRANSLATIONS.english, TRANSLATIONS.mobile.english);
        var americanEnglish = angular.extend({}, english, TRANSLATIONS.americanEnglish, TRANSLATIONS.mobile.americanEnglish);
        var french = angular.extend({}, english, TRANSLATIONS.french, TRANSLATIONS.mobile.french);
        var dutch = angular.extend({}, english, TRANSLATIONS.dutch, TRANSLATIONS.mobile.dutch);

        $translateProvider.translations('en-GB', processTranslations(english));
        $translateProvider.translations('en-US', processTranslations(americanEnglish));
        $translateProvider.translations('fr-FR', processTranslations(french));
        $translateProvider.translations('nl-NL', processTranslations(dutch));

        $translateProvider.preferredLanguage(defaultLanguage);
    });
