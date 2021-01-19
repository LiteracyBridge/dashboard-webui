/* jshint esversion:6, asi:true */
/* global $, DataTable, DropdownButton, StatisticsData, Authentication,console, Main, ProgramDetailsData, DataTable, Chart, ProgramPicker, Utils, UsageQueries */

var ProgramSpecificationData = function () {
    'use strict';

    function makeRequest(path, data) {
        let URL = Authentication.PROGRAM_SPEC();
        if (path.length>0 && path[path.length-1] !== '/') {
            path = '/' + path;
        }
        let request = {
            url: URL + path,
            type: 'GET',
            headers: {
                Authorization: Authentication.getIdToken(),
                'Accept': 'application/json'
            },
            contentType: 'application/text',
            processData: false
        };
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

    function validateProgramSpec(data, projectName) {
        let request = makeRequest('validate?project='+projectName+'&fix_recips=f', data);
        return submitRequest(request);
    }

    function submitProgramSpec(data, comment, projectName) {
        let request = makeRequest('submit?project='+projectName+'&fix_recips=t&comment='+comment, data);
        return submitRequest(request);
    }

    function listObjects(projectName, getHistory) {
        let path = 'list?project='+projectName;
        if (getHistory) {
            path += '&history=t';
        }
        let request = makeRequest(path);
        return submitRequest(request);
    }

    function reviewPending(projectName) {
        let path = 'diff?project='+projectName+'&v1=current&v2=pending&fix_recips=t';
        let request = makeRequest(path);
        return submitRequest(request);
    }

    function approve(projectName, currentVersion, pendingVersion, comment) {
        let path='approve?project='+projectName+'&current='+currentVersion+'&pending='+pendingVersion+'&comment='+comment;
        let request = makeRequest(path);
        return submitRequest(request);
    }

    function getLink(projectName, version) {
        let path='getlink?project='+projectName+'&version='+version;
        let request = makeRequest(path);
        return submitRequest(request);
    }

    function getFile(projectName, version) {
        let path='getfile?project='+projectName+'&version='+version;
        let request = makeRequest(path);
        return submitRequest(request);
    }

    return {
        validateProgramSpec: validateProgramSpec,
        listProgramSpecObjects: listObjects,
        submitProgramSpec: submitProgramSpec,
        review: reviewPending,
        approve: approve,
        getLink: getLink,
        getFile: getFile,
    };
}();
