/* jshint esversion:6, asi:true */
/* global $, Authentication,console, Main, ProgramDetailsData, DataTable, Chart, ProgramPicker, Utils */

var StatisticsData = (function () {

    'use strict';

    function query(url, path, queryParameters, data) {
        let queryKeys = Object.keys(queryParameters || {});
        let queryString = queryKeys.length > 0
            ? ('?' + queryKeys.map(x => `${x}=${encodeURIComponent(queryParameters[x])}`)
                .join('&'))
            : '';
        if (url[url.length - 1] !== '/' && path.length > 0 && path[0] !== '/') {
            path = '/' + path;
        }
        if (path.length > 0 && path[path.length - 1] !== '/') {
            path = path + '/';
        }
        let uri = url + path + queryString;
        let request = {
            url: uri,
            type: 'get',
            contentType: 'text/plain',
            headers: {
                Authorization: Authentication.getIdToken(),
                'Accept': 'application/json'
            }
        }
        if (data) {
            request.data = data;
            request.type = 'POST';
        }

        return $.ajax(request)
    }


    function getUsage(program, deployment, columns) {
        let deferred = $.Deferred()
        let path = '/usage2'

        let queryParams = {programid: program, columns: columns.join(',')};
        if (deployment) {
            queryParams.deployment = deployment;
        }

        let statsUrl = Authentication.STATS_QUERY();

        query(statsUrl, path, queryParams)
            .done(result => {
                let data = $.csv.toObjects(result, {separator: ',', delimiter: '"'});
                deferred.resolve(data);
            })
            .fail(deferred.reject)

        return deferred.promise()
    }

    function getDeployments(program) {
        let deferred = $.Deferred()
        let path = '/deployments';
        let queryParams = {programid: program};

        let statsUrl = Authentication.STATS_QUERY();

        query(statsUrl, path, queryParams)
            .done(deferred.resolve)
            .fail(deferred.reject)

        return deferred.promise()
    }

    function getDeploymentsByCommunity(program) {
        let deferred = $.Deferred();
        let path = '/depl_by_community';
        let queryParams = {programid: program};

        let statsUrl = Authentication.STATS_QUERY();

        query(statsUrl, path, queryParams)
            .done(deferred.resolve)
            .fail(deferred.reject)

        return deferred.promise()
    }

    function getRecipients(program) {
        let deferred = $.Deferred();
        let path = '/recipients';
        let queryParams = {programid: program};

        let statsUrl = Authentication.STATS_QUERY();

        query(statsUrl, path, queryParams)
            .done(deferred.resolve)
            .fail(deferred.reject)

        return deferred.promise()
    }


    function getTbsDeployed(program) {
        let deferred = $.Deferred();
        let path = '/tbsdeployed';
        let queryParams = {programid: program};

        let statsUrl = Authentication.STATS_QUERY();

        query(statsUrl, path, queryParams)
            .done(deferred.resolve)
            .fail(deferred.reject)

        return deferred.promise()
    }


    return {
        getUsage: getUsage,
        getDeployments: getDeployments,
        getDeploymentsByCommunity: getDeploymentsByCommunity,
        getRecipients: getRecipients,
        getTbsDeployed: getTbsDeployed,
    }

})();
