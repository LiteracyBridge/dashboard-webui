/* jshint esversion:6, asi:true */
/* global $, Authentication ,console, Main, ProgramDetailsData, DataTable, Chart, ProgramPicker, Utils */

var RolesData = RolesData || {};

RolesData = (function () {

    'use strict';


    function query(url, queryParameters) {
        const request = {
            url: url,
            type: 'get',
            contentType: 'text/plain',
            headers: {
                Authorization: Authentication.getIdToken(), 'Accept': 'application/json'
            }
        };
        if (queryParameters) {
            request.data = queryParameters
        }

        return $.ajax(request)
    }

    function buildRequest(path, data, json) {
        // Authentication.ROLES
        let baseUrl = Authentication.ROLES();

        if (path.length>0 && path[0] !== '/') {
            path = '/' + path;
        }
        let request = {
            url: baseUrl + path,
            type: 'GET',
            headers: {
                Authorization: Authentication.getIdToken(),
                'Accept': 'application/json'
            },
            contentType: 'application/text',
            processData: false
        };
        if (json) {
            request.contentType = 'application/json';
        }
        if (data !== undefined) {
            request.type = 'POST';
            request.data = data;
        }
        return request;
    }

    function submitRequest(request) {
        var deferred = $.Deferred();

        Main.incrementWait();
        $.ajax(request)
            .done((a,b,c)=>{
                Main.decrementWait();
                if (a && a.result) {
                    deferred.resolve(a.result);
                } else {
                    deferred.resolve({status:'Unexpected', result:a});
                }
            })
            .fail((a,b)=>{
                Main.decrementWait();
                deferred.reject(a);
            });

        return deferred.promise();
    }

    function updateRoles(updates) {
        let request = buildRequest('updateRoles', JSON.stringify(updates), true);
        return submitRequest(request);
    }

    function getAdmin() {
        return submitRequest(buildRequest('getAdminObjects'));
    }


    function getPrograms() {
        // Authentication.ROLES
        let baseUrl = Authentication.ROLES();

        let deferred = $.Deferred();
        let url = baseUrl + '/getPrograms';
        query(url)
            .done(result => {
                if (result.errorMessage) {
                    deferred.reject(result.errorMessage);
                } else {
                    let projects = result.result;
                    deferred.resolve(projects);
                }
            })
            .fail(deferred.reject);
        return deferred.promise()
    }

    return {
        getPrograms: getPrograms,
        getAdmin: getAdmin,
        updateRoles: updateRoles
    }

})();
