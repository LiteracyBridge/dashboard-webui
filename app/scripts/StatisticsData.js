/* jshint esversion:6, asi:true */
/* global $, Authentication,console, Main, ProgramDetailsData, DataTable, Chart, ProgramPicker, Utils */

var StatisticsData = StatisticsData || {};

StatisticsData = (function () {

    'use strict';

    function query(url, path, queryParameters, data) {
        let queryKeys = Object.keys(queryParameters || {});
        let queryString = queryKeys.length > 0
            ? ('?' + queryKeys.map(x => `${x}=${encodeURIComponent(queryParameters[x])}`)
                .join('&'))
            : '';
        if (url[url.length-1] !== '/' && path.length>0 && path[0] !== '/') {
            path = '/' + path;
        }
        if (path.length > 0 && path[path.length-1] !== '/') {
            path = path + '/';
        }
        let uri = url + path + queryString;
        var request = {
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
        var deferred = $.Deferred()
        var path = '/usage/' + program

        if (deployment) {
            path += '/' + deployment
        }

        let statsUrl = Authentication.STATS_QUERY();

        query(statsUrl, path, {cols: columns.join(',')})
            .done(result => {
                if (result.errorMessage) {
                    deferred.reject(result.errorMessage);
                } else {
                    let data = $.csv.toObjects(result.result.values, {separator: ',', delimiter: '"'});
                    let resolution = {data: data, columns: result.result.columns}
                    deferred.resolve(resolution);
                }
            })
            .fail(deferred.reject)

        return deferred.promise()
    }


    function getProgramList() {
        let deferred = $.Deferred()
        let statsUrl = Authentication.STATS_QUERY();
        query('statsUrl', '/projects')
            .done(result => {
                if (result.errorMessage) {
                    deferred.reject(result.errorMessage);
                } else {
                    let programs = result.result.values
                    deferred.resolve(programs);
                }
            })
            .fail(deferred.reject)
        return deferred.promise()
    }

    function getWorkbookLinks(program) {
        let deferred = $.Deferred()
        let twbxUrl = Authentication.TWBX();
        // let url = twbxUrl + '/getlinks?all=1&program=' + program;
        query(twbxUrl, '/getlinks', {'all': 1, 'program': program})
            .done(result => {
                result = result.result
                result = {workbook: result.workbook, preview: result.preview}
                deferred.resolve(result)
            })
            .fail(deferred.reject)
        return deferred.promise();
    }

    function refreshWorkbook(program) {
        let deferred = $.Deferred()
        let twbxUrl = Authentication.TWBX();
        // let url = twbxUrl + '/refresh?program=' + program;
        query(twbxUrl, '/refresh', {'program': program})
            .done(result => {
                result = result.result
                result = {workbook: result.workbook, preview: result.preview}
                deferred.resolve(result)
            })
            .fail(deferred.reject)
        return deferred.promise();
    }

    function removeWorkbookPreviews(program) {
        let deferred = $.Deferred()
        let twbxUrl = Authentication.TWBX();
        // let url = twbxUrl + '/removePreviews?program=' + program;
        query(twbxUrl, '/removePreviews', {'program': program})
            .done(result => {
                result = result.result
                result = {workbook: result.workbook, preview: result.preview}
                deferred.resolve(result)
            })
            .fail(deferred.reject)
        return deferred.promise();
    }

    function uploadWorkbook(program, comment, filename, data) {
        let deferred = $.Deferred();
        let twbxUrl = Authentication.TWBX();
        query(twbxUrl, 'upload', {'program': program, 'comment': comment, 'filename': filename}, data)
            .done(result => {
                result = result.result;
                deferred.resolve(result);
            })
            .fail(deferred.reject);
        return deferred.promise();
    }


    return {
        getUsage: getUsage,
        getProgramList: getProgramList,
        getWorkbookLinks: getWorkbookLinks,
        refreshWorkbook: refreshWorkbook,
        removeWorkbookPreviews: removeWorkbookPreviews,
        uploadWorkbook: uploadWorkbook,
    }

})();
