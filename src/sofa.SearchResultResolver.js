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
