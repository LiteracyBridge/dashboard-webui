/* jshint esversion:6, asi:true */
/* global $, console, Main, User, Utils, moment */


let ProgramDetailsData = function () {
    'use strict';

    let STATS_PATH = 'data/';
    var ROOT;

    function statsPath() {
        if (!ROOT) {
            ROOT = Main.getRootPath();
        }
        return ROOT + STATS_PATH;
    }
    function projectsListPath() {
        return statsPath() + 'project_list.csv';
    }

    // Contains per-project promise; resolved with {deploymentData:[], productionData:[], usageData:[]}
    // deploymentData is an array of DeploymentData (in random order):
    //   {project:,deployment:,deploymentnumber:,num_packages:,num_languages:,num_communities:,deployed_tbs:}
    var programCache = {};

    /**
     * Given a program, get the list of deployment names, with the deployment # of each one. Also includes some
     * metadata for each deployment: startdate, enddate
     * @param program for which to get deployments.
     * @returns {*} A promise that resovles to a list of [{deployment:'name;name2', deploymentnumber:number},...]
     */
    function getDeploymentsList(program) {
        return Utils.getFileCached(program, 'deployments.csv', (filedata)=>{
            let csv = $.csv.toObjects(filedata, {separator: ',', delimiter: '"'});
            csv = csv.map((d)=>{
                d.startdatestr = d.startdate;
                d.enddatestr = d.enddate;
                d.startdate = moment(d.startdate);
                d.enddate = moment(d.enddate);
                d.deploymentnumber = 1 * d.deploymentnumber;
                return d;
            }).sort((a,b)=>{return a.deploymentnumber - b.deploymentnumber});
            // Collapse into one per deployment number; accumulate all the names. Xref from names to #.
            let xref = {};
            let depls = [];
            csv.forEach((d)=>{
                xref[d.deployment] = d.deploymentnumber;
                let existing = depls.find(existing=>existing.deploymentnumber===d.deploymentnumber);
                if (existing) {
                    existing.deploymentnames.push(d.deployment);
                } else {
                    d.deploymentnames = [d.deployment];
                    depls.push(d);
                }
            });
            // join the names together into a single string.
            depls.forEach((d)=>{
                d.deployment = d.deploymentnames.join(';');
            });
            depls.xref=xref;
            return depls;
        });
    }

    /**
     * Given a program, get the list of deployment names, with the deployment # of each one.
     * @param program for which to get deployments.
     * @returns {*} A promise that resovles to a list of [{deploymentname:'name', deploymentnumber:number},...]
     */
    function getProgramDeploymentNames(program) {
            let deferred = $.Deferred();
            getDeploymentsList(program).then((list)=>{
                let deploymentNames = list.map(d=>{return {deploymentname:d.deployment, deploymentnumber:Number(d.deploymentnumber)}});
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
        return Utils.getFileCached(program, 'deployments_by_community.csv', (filedata) => {
            let csv = $.csv.toObjects(filedata, {separator: ',', delimiter: '"'});
            return {deploymentByCommunityData: csv};
        });

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
                    return (el.deployment == deployment || el.deploymentnumber == deployment) // jshint ignore:line
                });
            } else {
                result.deploymentByCommunityData = data.deploymentByCommunityData;
            }
            promise.resolve(result);
        }, Main.decrementWait);

        return promise;
    }

    /**
     * Fetch statistics for a program. Cached for subsequent calls.
     * @param program The program for which stats are desired.
     * @returns {*} A promise that resolves to an object with 3 members:
     *  .deploymentData -- an array of objects like {program,deployment,deploymentnumber,num_packages,num_languages,
   *                                               num_communities,deployed_tbs}
     *  .productionData -- an array of objects like {program,deployment,deploymentnumber,num_packages,num_languages,
   *                                               num_categories,num_messages,duration_minutes}
     *  .usageData -- an array of objects like {program,deployment,deploymentnumber,num_packages,num_communities,
   *                                          num_categories,num_messages,num_tbs,played_minutes,
   *                                          num_effective_completions,num_completions}
     */
    function getProgramData(program) {
        // Already have it?
        if (programCache[program] !== undefined) {
            return programCache[program];
        }

        var promise = new $.Deferred();
        programCache[program] = promise;

        var deplByDepl = $.get(Utils.pathForFile(program, 'deployments_by_deployment.csv'));
        var tbsdDeplByDepl = $.get(Utils.pathForFile(program, 'tb_deployments_by_deployment.csv'));
        var prodByDepl = $.get(Utils.pathForFile(program, 'production_by_deployment.csv'));
        var usageByDepl = $.get(Utils.pathForFile(program, 'usage_by_deployment.csv'));
        var usageByCategory = $.get(Utils.pathForFile(program, 'usage_by_package_category.csv'));
        var usageByMessage = $.get(Utils.pathForFile(program, 'usage_by_message.csv'));

        // Wait for all to load. TODO: handle timeouts.
        $.when(deplByDepl, tbsdDeplByDepl, prodByDepl, usageByDepl, usageByCategory, usageByMessage)
            .done(function resolved(depl, tbsDepl, prod, usage, cat, msg) {
                // Parse the files.
                // Can't refactor the options because $.csv craps on the options object.
                var deploymentData = $.csv.toObjects(depl[0], {separator: ',', delimiter: '"'});
                var tbsDeployedData = $.csv.toObjects(tbsDepl[0], {separator: ',', delimiter: '"'});
                var productionData = $.csv.toObjects(prod[0], {separator: ',', delimiter: '"'});
                var usageData = $.csv.toObjects(usage[0], {separator: ',', delimiter: '"'});
                var categoryData = $.csv.toObjects(cat[0], {separator: ',', delimiter: '"'});
                var messageData = $.csv.toObjects(msg[0], {separator: ',', delimiter: '"'});

                deploymentData = deploymentData.map(d => {
                    d.startdatestr = d.startdate;
                    d.enddatestr = d.enddate;
                    d.startdate = moment(d.startdate);
                    d.enddate = moment(d.enddate);
                    d.deploymentnumber = 1 * d.deploymentnumber;
                    return d;
                }).sort((a,b)=>{return a.deploymentnumber - b.deploymentnumber});

                messageData = messageData.map(r=>{
                    r.languagecode = r.languagecode || r.language;
                    return r;
                });
                promise.resolve({deploymentData: deploymentData,
                    tbsDeployedData: tbsDeployedData,
                    productionData: productionData,
                    usageData: usageData,
                    categoryData: categoryData,
                    messageData: messageData
                });
            }).fail((err) => {
            promise.reject(err);
        });

        return promise;
    }

    /**
     * Fetch the statistics for a given program and deployment.
     * @param program The program for which statistics are desired.
     * @param deployment The deployment OR deploymentnumber for which statistics are desired.
     * @returns {*} A promise that resolves with an object with 3 members:
     *  .deploymentData -- an object like {program,deployment,deploymentnumber,num_packages,num_languages,
     *                                     num_communities,deployed_tbs}
     *  .productionData -- an object like {program,deployment,deploymentnumber,num_packages,num_languages,
     *                                     num_categories,num_messages,duration_minutes}
     *  .usageData -- an object like {program,deployment,deploymentnumber,num_packages,num_communities,
     *                                num_categories,num_messages,num_tbs,played_minutes,
     *                                num_effective_completions,num_completions}
     *  .categoryData -- an array of objects like {program,deploymentnumber,cat_packages,cat_languages,category,
     *                                num_messages,duration_minutes,played_minutes,effective_completions,completions,
     *                                num_tbs}
     *  .messageData -- an array of objects like {program,deployment,deploymentnumber,package,languagecode,languagecode,
     *                                category,contentid,title,duration_minutes,played_minutes,played_minutes_per_tb,
     *                                effective_completions,effective_completions_per_tb,completions,num_tbs,
     *                                num_package_tbs,percent_tbs_playing}
     */
    function getProgramStats(program, deployment) {
        var promise = $.Deferred();

        // Get arrays of stats (per deployment) for this program
        Main.incrementWait();
        getProgramData(program).then((data) => {
            Main.decrementWait();
            // data is a hash of arrays. Need to look in each member for desired deployment.
            var result = {}
            // Look for the desired deployment or deploymentnumber. Note that the double = is intentional.

            // These are looking for ONE item, thus 'find'.
            result.deploymentData = data.deploymentData.find((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment) // jshint ignore:line
            });
            result.tbsDeployedData = data.tbsDeployedData.find((el) => {
                return (el.deploymentnumber == deployment) // jshint ignore:line
            });
            result.productionData = data.productionData.find((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment) // jshint ignore:line
            });
            result.usageData = data.usageData.find((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment) // jshint ignore:line
            });

            // These are looking for multiple items, thus 'filter'
            result.categoryData = data.categoryData.filter((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment) // jshint ignore:line
            });
            result.messageData = data.messageData.filter((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment) // jshint ignore:line
            });
            promise.resolve(result);
        }, Main.decrementWait);

        return promise;
    }


    return {
        getDeploymentsList: getDeploymentsList,
        getProgramDeploymentNames: getProgramDeploymentNames,
        getProgramStats: getProgramStats,
        getDeploymentDetails: getDeploymentDetails
    };
}();
