/* jshint esversion:6, asi:true */
/* global $, User, CognitoWrapper,console, Main, ProgramDetailsData, DataTable, Chart, ProgramPicker, Utils */

var StatisticsData = StatisticsData || {};

StatisticsData = (function () {

    'use strict';

    let baseUrl = 'https://y06knefb5j.execute-api.us-west-2.amazonaws.com/Devo'


    function query(url, queryParameters) {
        var request = {
            url: url,
            type: 'get',
            contentType: 'text/plain',
            headers: {
                Authorization: CognitoWrapper.getIdToken(),
                'Accept': 'application/json'
            }
        }
        if (queryParameters) {
            request.data = queryParameters
        }

        return $.ajax(request)
    }


    function getUsage(program, deployment, columns) {
        var deferred = $.Deferred()
        var url = baseUrl + '/usage/' + program

        if (deployment) {
            url += '/' + deployment
        }

        query(url, {cols: columns.join(',')})
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
        let url = baseUrl + '/projects'
        query(url)
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

    return {
        getUsage: getUsage,
        getProgramList: getProgramList
    }

})();
