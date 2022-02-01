/* jshint esversion:6, asi:true */
/* global $, DataTable, DropdownButton, StatisticsData, Authentication,console, Main, ProgramDetailsData, DataTable, Chart, ProgramPicker, Utils, UsageQueries */

var ProgramSpecificationData = function () {
    'use strict';

    // This shouldn't be necessary; the timeout should be infinite. However, I have seen timeouts, and have reports
    // of "Submit" spinning and then doing nothing. Experimental. Doesn't hurt, might help.
    const PS_TIMEOUT = 120000;

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
                    deferred.resolve(a);
                }
            })
            .fail((a,b)=>{
                Main.decrementWait();
                deferred.reject(a);
            });

        return deferred.promise();
    }

    function validate(programid, data) {
        let path = `validate?programid=${programid}`;
        let request = makeRequest(path, data);
        // See comment above.
        request.timeout = PS_TIMEOUT;
        return submitRequest(request);
    }

    function upload(programid, data, comment, return_diff) {
        let path = `upload?programid=${programid}&return_diff=${return_diff?'t':'f'}&comment=${comment}`
        let request = makeRequest(path, data);
        // See comment above.
        request.timeout = PS_TIMEOUT;
        return submitRequest(request);
    }

    function listObjects(programid) {
        let path = `list?programid=${programid}`;
        let request = makeRequest(path);
        return submitRequest(request);
    }

    function compare(programid, delta, base) {
        if (!delta) {
            delta = 'pending';
            if (!base) base = 'unpublished';
        } else if (!base) {
            base = 'published';
        }
        let path = `review?programid=${programid}&v1=${base}&v2=${delta}`;
        let request = makeRequest(path);
        // See comment above.
        request.timeout = PS_TIMEOUT;
        return submitRequest(request);
    }

    function publish(programid, comment) {
        if (!comment) comment = 'Published from Dashboard';
        let path = `publish?programid=${programid}&comment=${comment}`;
        let request = makeRequest(path);
        // See comment above.
        request.timeout = PS_TIMEOUT;
        return submitRequest(request);
    }

    function accept(programid, comment, publish) {
        let path=`accept?programid=${programid}&publish=${publish?'t':'f'}&comment=${comment}`;
        let request = makeRequest(path);
        // See comment above.
        request.timeout = PS_TIMEOUT;
        return submitRequest(request);
    }

    function getLink(programid, artifact) {
        let path=`download?programid=${programid}&aslink=true&artifact=${artifact}`;
        let request = makeRequest(path);
        return submitRequest(request);
    }

    function getFile(programid, artifact) {
        let path=`download?programid=${programid}&artifact=${artifact}`;
        let request = makeRequest(path);
        // See comment above.
        request.timeout = PS_TIMEOUT;
        return submitRequest(request);
    }

    return {
        validateProgspec: validate,
        listProgramSpecObjects: listObjects,
        uploadProgspec: upload,
        compareProgspecs: compare,
        acceptProgspec: accept,
        getLink: getLink,
        getFile: getFile,
        publishProgspec: publish,
    };
}();
