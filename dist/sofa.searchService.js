/**
 * sofa-search-service - v0.5.0 - 2014-09-10
 * http://www.sofa.io
 *
 * Copyright (c) 2014 CouchCommerce GmbH (http://www.couchcommerce.com / http://www.sofa.io) and other contributors
 * THIS SOFTWARE CONTAINS COMPONENTS OF THE SOFA.IO COUCHCOMMERCE SDK (WWW.SOFA.IO).
 * IT IS PROVIDED UNDER THE LICENSE TERMS OF THE ATTACHED LICENSE.TXT.
 */
;(function (sofa, undefined) {

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

'use strict';

sofa.define('sofa.SearchResultResolver', function () {
    return function (response) {
        var results = response.data.results;
        var grouped = results.reduce(function (prev, curr) {
            if (!prev[curr.categoryUrlKey]) {
                var group = prev[curr.categoryUrlKey] = {
                    groupKey: curr.categoryUrlKey,
                    groupOriginFullUrl: curr.categoryOriginFullUrl,
                    groupText: curr.categoryName,
                    items: []
                };
                prev.items.push(group);
            }

            prev[curr.categoryUrlKey].items.push(curr);

            return prev;
        }, { items: [] });
        //we only care about the array. The object was just for fast lookups!
        response.data.groupedResults = grouped.items;
    };
});

'use strict';
/**
 * @sofadoc class
 * @name sofa.SearchService
 * @package sofa-search-service
 * @requiresPackage sofa-http-service
 * @requiresPackage sofa-q-service
 * @requires sofa.ConfigService
 * @requires sofa.HttpService
 * @requires sofa.QService
 * @distFile dist/sofa.searchService.js
 *
 * @description
 * Search service which let's you query against the CouchCommerce API to search
 * for products.
 */
sofa.define('sofa.SearchService', function (configService, $http, $q, applier) {

    var self = {},
        lastRequestToken = null,
        debounceMs = configService.get('searchDebounceMs', 300);

    var searchRequestResolver = new sofa.SearchRequestResolver($http, configService);
    var searchResultResolver = new sofa.SearchResultResolver($http, $q);

    /**
     * @sofadoc method
     * @name sofa.SearchService#search
     * @memberof sofa.SearchService
     *
     * @description
     * Searches for `searchStr` and groups the results if `grouping` is truthy.
     * This search is promise based to let you have flow control. Therefore it
     * returns a promise that gets resolved with the search results.
     *
     * @param {string} searchStr A search string.
     * @param {boolean} grouping Whether to group the results or not.
     *
     * @return {Promise} A promise with the search results.
     */
    self.search = function (searchStr, grouping) {

        var deferredResponse = $q.defer();

        debouncedInnerSearch(deferredResponse, searchStr, grouping);

        return deferredResponse.promise;
    };

    var innerSearch = function (deferredResponse, searchStr, grouping) {

        lastRequestToken = sofa.Util.createGuid();

        var requestToken = lastRequestToken;

        if (!searchStr) {
            deferredResponse.resolve({
                data: {
                    results: [],
                    groupedResults: []
                }
            });
        } else {
            searchRequestResolver(searchStr)
            .then(function (response) {
                if (requestToken === lastRequestToken) {
                    if (grouping) {
                        searchResultResolver(response);
                    }
                    deferredResponse.resolve(response);
                }
            });
        }

        //in an angular context, we need to call the applier to
        //make $http run. For non angular builds, no applier is needed.
        if (applier) {
            applier();
        }
        return deferredResponse.promise;
    };

    var debouncedInnerSearch = sofa.Util.debounce(innerSearch, debounceMs);

    return self;
});

}(sofa));
