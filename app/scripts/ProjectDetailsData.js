/* jshint esversion:6, asi:true */
/* global $, console, Main, User, User */

var ProjectDetailsData = ProjectDetailsData || {};

ProjectDetailsData = function () {
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
    
    // Contans a promise resoved with {project:path,...} pairs.
    var projectPaths;
    
    // Contains per-project promise; resolved with {deploymentData:[], productionData:[], usageData:[]}
    // deploymentData is an array of DeploymentData (in random order):
    //   {project:,deployment:,deploymentnumber:,num_packages:,num_languages:,num_communities:,deployed_tbs:}
    var projectCache = {};
    
    var deploymentDataCache = {};
    
    /**
     * Fetch the projectList.csv file from the server. Cached for subsequent calls.
     * @returns {*} A promise that resolves to a hash of {project:path} like
     *  { UWR: 'UWR/', MEDA: 'MEDA/', ... }
     */
    function getProjectsAndPaths() {
        if (projectPaths === undefined) {
            projectPaths = $.Deferred();
            
            $.get(projectsListPath()).done((list) => {
                // The projects list file is a .csv with data like:
                // project,path
                // UWR,UWR/
                // MEDA,MEDA/
                // ...
                var pairs = $.csv.toObjects(list, {separator: ',', delimiter: '"'});
                var paths = {};
                pairs.filter(row=>User.isViewableProject(row.project)).forEach((el) => {
                    paths[el.project] = el.path
                });
                projectPaths.resolve(paths);
            }).fail((err) => {
                projectPaths.reject(err);
            });
        }
        return projectPaths;
    }
    
    function getDeploymentData(project) {
        if (deploymentDataCache[project] === undefined) {
            var promise = new $.Deferred();
            deploymentDataCache[project] = promise;
    
            getProjectsAndPaths().done((paths) => {
                // If the request was for a project we don't know about, we must fail the request.
                if (!paths[project]) {
                    promise.reject(null);
                    return;
                }
                var prefix = statsPath() + paths[project] + project + '-';
                var deplByComm = $.get(prefix + 'deployments_by_community.csv');
                $.when(deplByComm)
                    .done(function resolved(comm) {
                        // Parse the files.
                        var deploymentByCommunityData = $.csv.toObjects(comm, {separator: ',', delimiter: '"'});
            
                        promise.resolve({deploymentByCommunityData: deploymentByCommunityData});
                    }).fail((err) => {
                    promise.reject(err);
                });
            }).fail((err) => {
                promise.reject(err);
            });
        }
        return deploymentDataCache[project];
    }
    
    function getDeploymentDetails(project, deployment) {
        var promise = $.Deferred();
    
        // Get arrays of stats (per deployment) for this project
        Main.incrementWait();
        getDeploymentData(project).then((data) => {
            Main.decrementWait();
            // data is a hash of one arrays. If filtering by deployment, need to look in each member for desired deployment.
            var result = {}
            // Look for the desired deployment or deploymentnumber
            if (deployment) {
                result.deploymentByCommunityData = data.deploymentByCommunityData.find((el) => {
                    return (el.deployment == deployment || el.deploymentnumber == deployment)
                });
            } else {
                result.deploymentByCommunityData = data.deploymentByCommunityData;
            }
            promise.resolve(result);
        }, Main.decrementWait);
    
        return promise;
    }
    
    /**
     * Fetch statistics for a project. Cached for subsequent calls.
     * @param project The project for which stats are desired.
     * @returns {*} A promise that resolves to an object with 3 members:
     *  .deploymentData -- an array of objects like {project,deployment,deploymentnumber,num_packages,num_languages,
   *                                               num_communities,deployed_tbs}
     *  .productionData -- an array of objects like {project,deployment,deploymentnumber,num_packages,num_languages,
   *                                               num_categories,num_messages,duration_minutes}
     *  .usageData -- an array of objects like {project,deployment,deploymentnumber,num_packages,num_communities,
   *                                          num_categories,num_messages,num_tbs,played_minutes,
   *                                          num_effective_completions,num_completions}
     */
    function getProjectData(project) {
        // Already have it?
        if (projectCache[project] !== undefined) {
            return projectCache[project];
        }
        
        var promise = new $.Deferred();
        projectCache[project] = promise;
        
        getProjectsAndPaths().done((paths) => {
            // If the request was for a project we don't know about, we must fail the request.
            if (!paths[project]) {
                promise.reject(null);
                return;
            }
            
            var prefix = statsPath() + paths[project] + project + '-';
            var deplByDepl = $.get(prefix + 'deployments_by_deployment.csv');
            var prodByDepl = $.get(prefix + 'production_by_deployment.csv');
            var usageByDepl = $.get(prefix + 'usage_by_deployment.csv');
            var usageByCategory = $.get(prefix + 'usage_by_package_category.csv');
            var usageByMessage = $.get(prefix + 'usage_by_message.csv');
            
            // Wait for all to load. TODO: handle timeouts.
            $.when(deplByDepl, prodByDepl, usageByDepl, usageByCategory, usageByMessage)
                .done(function resolved(depl, prod, usage, cat, msg) {
                    // Parse the files.
                    // Can't refactor the options because $.csv craps on the options object.
                    var deploymentData = $.csv.toObjects(depl[0], {separator: ',', delimiter: '"'});
                    var productionData = $.csv.toObjects(prod[0], {separator: ',', delimiter: '"'});
                    var usageData = $.csv.toObjects(usage[0], {separator: ',', delimiter: '"'});
                    var categoryData = $.csv.toObjects(cat[0], {separator: ',', delimiter: '"'});
                    var messageData = $.csv.toObjects(msg[0], {separator: ',', delimiter: '"'});
                    
                    promise.resolve({deploymentData: deploymentData,
                        productionData: productionData,
                        usageData: usageData,
                        categoryData: categoryData,
                        messageData: messageData
                    });
                }).fail((err) => {
                promise.reject(err);
            });
        }).fail((err) => {
            promise.reject(err);
        });
        
        return promise;
    }
    
    /**
     * Fetch just a list of available projects. Built from getProjectsAndPaths.
     * @returns {*} A promise that resolves to an array of project names, like ['UWR', 'MEDA', ...] .
     */
    function getProjectList() {
        var promise = $.Deferred();
        Main.incrementWait()
        getProjectsAndPaths().then((paths) => {
            Main.decrementWait();
            promise.resolve(Object.keys(paths));
        }, Main.decrementWait);
        return promise;
    }
    
    /**
     * Fetch a list of the Deployments (aka Content Updates) for a project. Built from getProjectData.
     * @param project The project for which the list of Deployments is desired.
     * @returns {*} A promise that resolves to a list of deployment names.
     */
    function getProjectDeploymentList(project) {
        var promise = $.Deferred();
        Main.incrementWait();
        
        getProjectData(project).then((data) => {
            var deployments = [];
            Main.decrementWait();
            data.deploymentData.forEach(function (element) {
                deployments.push({
                    deployment:element.deployment,
                    deploymentnumber:element.deploymentnumber
                });
            });
            deployments.sort((a,b)=>a.deploymentnumber-b.deploymentnumber);
            promise.resolve(deployments);
        }, Main.decrementWait);
        
        return promise;
    }
    
    /**
     * Fetch the statistics for a given project and deployment.
     * @param project The project for which statistics are desired.
     * @param deployment The deployment for which statistics are desired.
     * @returns {*} A promise that resolves with an object with 3 members:
     *  .deploymentData -- an object like {project,deployment,deploymentnumber,num_packages,num_languages,
     *                                     num_communities,deployed_tbs}
     *  .productionData -- an object like {project,deployment,deploymentnumber,num_packages,num_languages,
     *                                     num_categories,num_messages,duration_minutes}
     *  .usageData -- an object like {project,deployment,deploymentnumber,num_packages,num_communities,
     *                                num_categories,num_messages,num_tbs,played_minutes,
     *                                num_effective_completions,num_completions}
     *  .categoryData -- an array of objects like {project,deploymentnumber,cat_packages,cat_languages,category,
     *                                num_messages,duration_minutes,played_minutes,effective_completions,completions,
     *                                num_tbs}
     *  .messageData -- an array of objects like {project,deployment,deploymentnumber,package,languagecode,language,
     *                                category,contentid,title,duration_minutes,played_minutes,played_minutes_per_tb,
     *                                effective_completions,effective_completions_per_tb,completions,num_tbs,
     *                                num_package_tbs,percent_tbs_playing}
     */
    function getProjectStats(project, deployment) {
        var promise = $.Deferred();
        
        // Get arrays of stats (per deployment) for this project
        Main.incrementWait();
        getProjectData(project).then((data) => {
            Main.decrementWait();
            // data is a hash of arrays. Need to look in each member for desired deployment.
            var result = {}
            // Look for the desired deployment or deploymentnumber
            result.deploymentData = data.deploymentData.find((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment)
            });
            result.productionData = data.productionData.find((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment)
            });
            result.usageData = data.usageData.find((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment)
            });
            result.categoryData = data.categoryData.filter((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment)
            });
            result.messageData = data.messageData.filter((el) => {
                return (el.deployment == deployment || el.deploymentnumber == deployment)
            });
            promise.resolve(result);
        }, Main.decrementWait);
        
        return promise;
    }
    
    
    return {
        getProjectList: getProjectList,
        getProjectDeploymentList: getProjectDeploymentList,
        getProjectStats: getProjectStats,
        getDeploymentDetails: getDeploymentDetails
    };
}();
