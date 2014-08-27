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
