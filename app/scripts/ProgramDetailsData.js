/* jshint esversion:6, asi:true */
/* global $, console, Main, Authentication, Utils, moment */


let ProgramDetailsData = function () {
    'use strict';

    /**
     * Given a program, get the list of deployment names, with the deployment # of each one. Also includes some
     * metadata for each deployment: startdate, enddate
     * @param program for which to get deployments.
     * @returns {*} A promise that resovles to a list of [{deployment:'name;name2', deploymentnumber:number},...]
     */
    function getDeploymentsList(program) {
        let deferred = $.Deferred();
        StatisticsData.getDeployments(program)
            .done((filedata) => {
                let csv = $.csv.toObjects(filedata, {separator: ',', delimiter: '"'});
                csv = csv.map((d) => {
                    d.startdatestr = d.startdate;
                    d.enddatestr = d.enddate;
                    d.startdate = moment(d.startdate);
                    d.enddate = moment(d.enddate);
                    d.deploymentnumber = 1 * d.deploymentnumber;
                    return d;
                }).sort((a, b) => {
                    return a.deploymentnumber - b.deploymentnumber
                });
                // Collapse into one per deployment number; accumulate all the names. Xref from names to #.
                let xref = {};
                let depls = [];
                csv.forEach((d) => {
                    xref[d.deployment] = d.deploymentnumber;
                    let existing = depls.find(existing => existing.deploymentnumber === d.deploymentnumber);
                    if (existing) {
                        existing.deploymentnames.push(d.deployment);
                    } else {
                        d.deploymentnames = [d.deployment];
                        depls.push(d);
                    }
                });
                // join the names together into a single string.
                depls.forEach((d) => {
                    d.deployment = d.deploymentnames.join(';');
                });
                depls.xref = xref;
                return deferred.resolve(depls);
            })
            .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Given a program, get the list of deployment names, with the deployment # of each one.
     * @param program for which to get deployments.
     * @returns {*} A promise that resovles to a list of [{deploymentname:'name', deploymentnumber:number},...]
     */
    function getProgramDeploymentNames(program) {
        let deferred = $.Deferred();
        getDeploymentsList(program).then((list) => {
            let deploymentNames = list.map(d => {
                return {deploymentname: d.deployment, deploymentnumber: Number(d.deploymentnumber)}
            });
            deferred.resolve(deploymentNames);

        }, deferred.reject);
        return deferred.promise();
    }

    /**
     * Given a program, get a list of all deployments made to all villages.
     * @param program for which to get deployment data.
     * @returns {*} a promise that resolves to a list of [{program,deployment,deploymentnumber,startdate,enddate,package,community,deployed_tbs},...]
     */
    function getDeploymentData(program) {
        let deferred = $.Deferred();
        StatisticsData.getDeploymentsByCommunity(program).done((filedata) => {
            let csv = $.csv.toObjects(filedata, {separator: ',', delimiter: '"'});
            deferred.resolve ({deploymentByCommunityData: csv});
        })
            .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Given a program and a deployment, get deployment data for the specific deployment.
     * @param program for which to get deployment data.
     * @param deployment OR deploymentnumber in particular for which to get data.
     * @returns {*} a promise that resolves to a list of [{program,deployment,deploymentnumber,startdate,enddate,package,community,deployed_tbs},...]
     *   NOTE: records are for the same program, and same deployment OR deploymentnumber as requested.
     */
    function getDeploymentDetails(program, deployment) {
        var promise = $.Deferred();

        // Get arrays of stats (per deployment) for this program
        Main.incrementWait();
        getDeploymentData(program).then((data) => {
            Main.decrementWait();
            // data is a hash of one arrays. If filtering by deployment, need to look in each member for desired deployment.
            var result = {}
            // Look for the desired deployment or deploymentnumber
            if (deployment) {
                result.deploymentByCommunityData = data.deploymentByCommunityData.find((el) => {
                    // noinspection EqualityComparisonWithCoercionJS
                    return (el.deployment == deployment || el.deploymentnumber == deployment) // jshint ignore:line
                });
            } else {
                result.deploymentByCommunityData = data.deploymentByCommunityData;
            }
            promise.resolve(result);
        }, Main.decrementWait);

        return promise;
    }

    return {
        getDeploymentsList: getDeploymentsList,
        getProgramDeploymentNames: getProgramDeploymentNames,
        getDeploymentDetails: getDeploymentDetails
    };
}();
