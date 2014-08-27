'use strict';

sofa.define('sofa.SearchRequestResolver', function ($http, configService) {

    var storeCode = configService.get('storeCode');
    var endpoint = configService.get('searchUrl') + '?callback=JSON_CALLBACK&len=100';

    var createSearchCommand = function (searchStr) {
        var reverseString = searchStr.split('').reverse().join('');
        return '(text:' + searchStr + '* OR reverse_text:' + reverseString + '*) AND storeCode:' + storeCode;
    };

    var normalizeUmlauts = function (searchStr) {
        return searchStr
                    .replace(/[áàâä]/g, 'a')
                    .replace(/[úùûü]/g, 'u')
                    .replace(/[óòôö]/g, 'o')
                    .replace(/[éèêë]/g, 'e')
                    .replace(/[ß]/g, 'ss');
    };

    return function (searchStr) {
        return $http({
            method: 'JSONP',
            url: endpoint,
            params: {
                q: createSearchCommand(normalizeUmlauts(searchStr)),
                fetch: 'text, categoryUrlKey, categoryOriginFullUrl, categoryName, productUrlKey, productOriginFullUrl, productImageUrl'
            }
        });
    };
});
