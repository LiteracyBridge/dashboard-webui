/* jshint esversion:6, asi:true*/
/* global $, console, Main, User, User, moment, ProjectDetailsData */

let InstallationData = function () {
    'use strict';

    let STATS_PATH = 'data/';
    let ROOT;

    function statsPath() {
        if (!ROOT) {
            ROOT = Main.getRootPath();
        }
        return ROOT + STATS_PATH;
    }

    function pathForProject(project) {
        return statsPath() + project + '/';
    }

    function Set(values) {
        let set = {}
        values.forEach( v => set[v]=true );
        set.contains = function(value) {
            return this.hasOwnProperty(value)
        }
        return set;
    }

    let dailiesPromises = {};
    function getTbDailiesListForProject(project) {
        project = project.toUpperCase();
        if (!dailiesPromises[project]) {
            let promise = $.Deferred();
            dailiesPromises[project] = promise;

            let path = pathForProject(project) + 'dailytbs.json';
            $.getJSON(path).done((json) => {
                promise.resolve(json);
            }).fail((err => {
                promise.reject(err);
            }));
        }
        return dailiesPromises[project];
    }

    let dailiesDataPromises = {};
    function getTbDailiesDataForProject(project, year, month, day) {
        project = project.toUpperCase();
        let path = pathForProject(project);
        if (year === undefined) {
            path += project + '-tbsdeployed.csv';
        } else {
            path += year + '/' + month + '/' + day + '/tbsdeployed.csv';
        }
        if (!dailiesDataPromises[path]) {
            let promise = $.Deferred();
            dailiesDataPromises[path] = promise;

            $.get(path).done((list) => {
                let tbsdeployed = $.csv.toObjects(list, {separator: ',', delimiter: '"'});
                tbsdeployed = tbsdeployed.map((d) => {
                    d.deployedtimestamp = moment(d.deployedtimestamp);
                    d.newsn = d.newsn==='t';
                    d.testing = d.testing==='t'
                    return d;
                });
                promise.resolve(tbsdeployed);
            }).fail((err => {
                promise.reject(err);
            }));
        }
        return dailiesDataPromises[path];
    }

    let componentDeploymentsPromises = {};
    function getComponentDeploymentsForProject(project) {
        project = project.toUpperCase();
        if (!componentDeploymentsPromises[project]) {
            let promise = $.Deferred();
            componentDeploymentsPromises[project] = promise;

            let path = pathForProject(project) + project + '-component_deployments.csv';
            $.get(path).done((list) => {
                // deploymentnumber,component
                // 1,"Jirapa Groups"
                // 1,"Jirapa HH Rotation"
                // 2,"Jirapa Groups"
                // 2,"NOYED-GHANA"
                // ...
                let componentDeployments = $.csv.toObjects(list, {separator: ',', delimiter: '"'});
                componentDeployments = componentDeployments.map((d) => {
                    d.deploymentnumber = 1 * d.deploymentnumber;
                    return d;
                }).sort((a,b)=>{return a.deploymentnumber - b.deploymentnumber});
                console.log(`Got ${componentDeployments.length} component deployments for ${project}.`)
                promise.resolve(componentDeployments);
            }).fail((err => {
                promise.reject(err);
            }));
        }
        return componentDeploymentsPromises[project];
    }

    function getComponentsForProjectAndDeployment(project, deploymentnumber) {
        let promise = $.Deferred();
        getComponentDeploymentsForProject(project).then((components)=>{
            components = components.filter(d=>d.deploymentnumber == deploymentnumber); // jshint ignore:line
            console.log(`Got ${components.length} component deployments for ${project}/${deploymentnumber}.`)
            promise.resolve(components);
        }, promise.reject);
        return promise;
    }

    let deploymentsPromises = {};
    function getDeploymentsForProject(project) {
        if (!deploymentsPromises[project]) {
            deploymentsPromises[project] = $.Deferred();

            let path = pathForProject(project) + project + '-deployments.csv';
            $.get(path).done((list) => {
                // project,deployment,deploymentnumber,startdate,enddate
                // UNICEF-2,2017-1,1,10/1/17,12/31/17
                // UNICEF-3,2018-2,2,1/1/18,3/31/18
                // ...
                let deployments = $.csv.toObjects(list, {separator: ',', delimiter: '"'});
                // Convert date fields to actual dates, keeping the string form as well.
                deployments = deployments.map((d) => {
                    d.startdatestr = d.startdate;
                    d.enddatestr = d.enddate;
                    d.startdate = moment(d.startdate);
                    d.enddate = moment(d.enddate);
                    d.deploymentnumber = 1 * d.deploymentnumber;
                    return d;
                }).sort((a,b)=>{return a.deploymentnumber - b.deploymentnumber});
                console.log(`Got ${deployments.length} deployments for ${project}.`)
                deploymentsPromises[project].resolve(deployments);
            }).fail((err) => {
                deploymentsPromises[project].reject(err);
            });
        }
        return deploymentsPromises[project];
    }

    /**
     * Gets information about a deployment for a project
     * @param project
     * @param deployment
     * @returns {*}
     */
    function getDeploymentInfo(project, deploymentnumber) {
        let deployment = ('' + deploymentnumber).toUpperCase();
        let promise = $.Deferred();
        getDeploymentsForProject(project).then((deployments)=>{
            promise.resolve(deployments.find(d=>d.deployment.toUpperCase()===deployment || d.deploymentnumber==deploymentnumber)); // jshint ignore:line
        }, promise.reject);
        return promise;
    }

    /**
     * Given a project and a deploymentnumber, get the names for that deployment. Ususally there is only one name
     * per deployment, but occasionally there are multiples.
     * @param project The project desired.
     * @param deploymentnumber The deployment number.
     * @returns {*} A promise that resovles with a list of deployment names.
     */
    function getDeploymentNames(project, deploymentnumber) {
        let promise = $.Deferred();
        getDeploymentsForProject(project).then((deployments)=>{
            let result = []
            deployments.forEach((elem, ix) => { if (elem.deploymentnumber === deploymentnumber) { result.push(elem.deployment) }})
            promise.resolve(result);
        }, promise.reject);
        return promise;
    }

    let recipientPromises = {};

    function getRecipientsForProject(project) {
        if (!recipientPromises[project]) {
            recipientPromises[project] = $.Deferred();

            let path = pathForProject(project) + project + '-recipients.csv';
            $.get(path).done((list) => {
                // recipients: [ {recipientid, project, partner, communityname, groupname, affiliate, component, country,
                //                  region, district, num_HHs, num_TBs, supportentity, model, language, coordinates} ]
                // LBG,UNICEF,Jirapa HH Rotation,Ghana,Upper West,Jirapa,Goziel,,Goziel,105,27,,Robert Yaw,HHR,dga
                // LBG,UNICEF,Jirapa Groups,Ghana,Upper West,Jirapa,Ul-Tuopare,Songbaala ,Songbaala Ul-Tuopare,,2,B-00060266,Bosore Gilbert,Group Rotation,dga
                // ...
                let recipients = $.csv.toObjects(list, {separator: ',', delimiter: '"'});
                // Convert number fields to actual numbers.
                recipients = recipients.map((r) => {
                    r.num_HHs = 1 * r.numhouseholds;
                    r.num_TBs = 1 * r.numtbs;
                    return r;
                });
                console.log(`Got ${recipients.length} recipients for ${project}.`)
                recipientPromises[project].resolve(recipients);
            }).fail((err) => {
                recipientPromises[project].reject(err);
            });
        }
        return recipientPromises[project];
    }

    /**
     * Get all of the recipients that should have received a deploymentnumber. Map deploymentnumber to the
     * components that should have received it, then get the recipients from those components.
     * @param project
     * @param deploymentnumber
     * @returns {*}
     */
    function getRecipientsForProjectAndDeployment(project, deploymentnumber) {
        let promise = $.Deferred();
        let recips = getRecipientsForProject(project);
        let comps = getComponentsForProjectAndDeployment(project, deploymentnumber);

        recips.then((recipients) => {
            // We don't have a "components for project" file for every project. If we don't have one, simply use the
            // unfiltered list.
            comps.then((components) => {
                let componentsInDeployment = Set( components.map( c => c.component ));
                let r2 = recipients.filter( r  => componentsInDeployment.contains(r.component) );
                console.log(`Got ${r2.length} recipients for ${project}/${deploymentnumber}.`)
                promise.resolve(r2)
            }, (err) => {
                console.log(`Got ${recipients.length} recipients for ${project} without deployment filter.`)
                promise.resolve(recipients)
            });
        }, promise.reject);

        return promise;
    }

    let tbsDeployedPromises = {};

    function getTBsDeployedForProject(project) {
        if (!tbsDeployedPromises[project]) {
            tbsDeployedPromises[project] = $.Deferred();

            let path = pathForProject(project) + project + '-tbsdeployed.csv';
            let tbsDeployed = $.get(path);
            $.when(tbsDeployed, ProjectDetailsData.getProjectDeploymentNames(project)).done((tbList, deploymentNamesList) => {
                let deploymentNamesMap = {};
                deploymentNamesList.forEach((elem)=> {
                    deploymentNamesMap[elem.deploymentname] = elem.deploymentnumber;
                });
                // The projects list file is a .csv with data like:
                // tbsDeployed: [ {talkingbookid,deployedtimestamp,project,deployment,contentpackage,community,firmware,location,coordinates,username,tbcdid,action,newsn,testing} ]
                // B-00050232,20171004T171836.977Z,UNICEF-2,UNICEF-2-2017-1,UNICEF-2-2017-1-DGA,TIZZA NIMBARE,r1212,JIRAPA OFFICE,,literacybridge\Tb,6,update-fw,f,f
                // B-0006031E,20171005T102130.934Z,UNICEF-2,UNICEF-2-2017-1,UNICEF-2-2017-1-DGA,NON-SPECIFIC,r1212,JIRAPA OFFICE,,literacybridge\Tb,6,update-fw,f,f
                // ...
                let tbDeployments = $.csv.toObjects(tbList[0], {separator: ',', delimiter: '"'});
                // Convert date fields to actual dates, keeping the string form as well. Add deploymentnumber if missing.
                tbDeployments = tbDeployments.map((d) => {
                    d.deployedtimestampstr = d.deployedtimestamp;
                    d.deployedtimestamp = moment(d.deployedtimestamp);
                    if (!(d.hasOwnProperty('deploymentnumber')) || d.deploymentnumber === '') {
                        d.deploymentnumber = deploymentNamesMap[d.deployment];
                    }
                    return d;
                });
                console.log(`Got ${tbDeployments.length} tbs deployed for ${project}.`)
                tbsDeployedPromises[project].resolve(tbDeployments);
            }).fail((err) => {
                tbsDeployedPromises[project].reject(err);
            });
        }
        return tbsDeployedPromises[project];
    }

    /**
     * Given a project and a deploymentnumber, get the tb deployment records for that deployment.
     * @param project of interest
     * @param deploymentnumber of interest
     * @returns {*} Promise that resolves with the desired tbsDeployed records.
     */
    function getTBsDeployedForDeployment(project, deploymentnumber) {
        let promise = $.Deferred();
        // The tbsdeployed records have a deployment name in them. We need to map the deployment number to a list
        // of one or more names, then match on that list.
        $.when(getTBsDeployedForProject(project),
            getDeploymentNames(project, deploymentnumber))
            .then((tbDeployments, deploymentnames) => {
                    let names = Set(deploymentnames)
                    promise.resolve(tbDeployments.filter(d => names.contains(d.deployment)));
                },
                promise.reject);
        return promise;
    }

    /**
     * This is a large and complex function. Given a deploymentNumber in a project, it combines the tbsDeployed
     * table and the recipients table. The result is an array of deployment installation, per community. The information
     * includes:
     * - the recipient information for the community
     * - a list of tbs installed in the community, with the installation timestamp, and installing agent
     * - the average 'days to install' for all the TBs in the community
     * - a list of Groups in the community (there may be only one)
     *
     * For communities with Groups, each group owns the list of its own TBs.
     *
     * @param project
     * @param deploymentnumber
     * @returns {*}
     */
    function getInstallationStatusForDeployment(project, deploymentnumber) {
        const sameInMostGroupsOfACommunity = ['program', 'country', 'region', 'district', 'supportentity', 'model', 'language'];
        let promise = $.Deferred();
        $.when(getRecipientsForProjectAndDeployment(project, deploymentnumber),
            getTBsDeployedForDeployment(project, deploymentnumber),
            getDeploymentInfo(project, deploymentnumber)).then((recipients, tbsDeployed, deploymentInfo) => {
            // tbsDeployed: [ {talkingbookid, recipientid, deployedtimestamp, project, deployment, contentpackage, firmware,
            //                  location, coordinates, username, tbcdid, action, newsn, testing} ]
            // recipients: [ {recipientid, project, partner, communityname, groupname, affiliate, component, country,
            //                  region, district, num_HHs, num_TBs, supportentity, model, language, coordinates} ]

            // Copy the data before modifying it, to avoid polluting the source.
            recipients = $.extend(true, [], recipients)
            tbsDeployed = $.extend(true, [], tbsDeployed)


            // From the array of tbsDeployed, create talking books per recipient:
            //   {recipientid: {talkingbookid: tbsdeployedrecord, talkingbookid: ...}, recipientid: ...
            let installedPerRecipient = {};
            let duplicateInstallations = 0;
            tbsDeployed.forEach((singleTbDeployed) => {
                if (singleTbDeployed.deploymentnumber != deploymentnumber) { return } // jshint ignore:line

                // Get the record of TBs for this recipient, creating if first time seen.
                let installedThisRecipient = installedPerRecipient[singleTbDeployed.recipientid] || (installedPerRecipient[singleTbDeployed.recipientid] = {});
                // Record the (latest) installation to the Talking Book
                if (installedThisRecipient.hasOwnProperty(singleTbDeployed.talkingbookid)) {
                    // A duplicate. Should we keep the oldest or newest? It usually doesn't matter, because, usually, they'll be in the same session.
                    // But if it was re-installed due to a problem, then it wasn't really fully available until the correction.
                    // Keep the latest one.
                    if (singleTbDeployed.deployedtimestamp.isAfter(installedThisRecipient[singleTbDeployed.talkingbookid])) {
                        installedThisRecipient[singleTbDeployed.talkingbookid] = singleTbDeployed;
                    }
                    duplicateInstallations++;
                } else {
                    // First time this TB was seen
                    installedThisRecipient[singleTbDeployed.talkingbookid] = singleTbDeployed;
                }
            });

            // tbsInstalled is like tbsDeployed, but without any duplicate installations to the same TB.
            let tbsInstalled = [];
            Object.keys(installedPerRecipient).forEach((recipientid) => {
                let installedThisRecipient = installedPerRecipient[recipientid];
                Object.keys(installedThisRecipient).forEach((talkingbookid) => {
                    tbsInstalled.push(installedThisRecipient[talkingbookid]);
                });
            });

            // Now add the # deployed into the recipients data. Add up the number of days the installations took.
            // Keep a tally of who and which TB-Loader performed the installations.
            recipients.forEach((recipient) => {
                let installedThisRecipient = installedPerRecipient[recipient.recipientid];
                recipient.num_TBsInstalled = (installedThisRecipient && Object.keys(installedThisRecipient).length) || 0;
                recipient.tbsInstalled = {};
                if (installedThisRecipient) {
                    let days = 0;
                    Object.keys(installedThisRecipient).forEach((talkingbookid) => {
                        let tbInstalledTimestamp = installedThisRecipient[talkingbookid].deployedtimestamp;
                        let tbDaysToInstall = tbInstalledTimestamp.diff(deploymentInfo.startdate, 'days');
                        let username = installedThisRecipient[talkingbookid].username;
                        let tbid = installedThisRecipient[talkingbookid].tbcdid;
                        days += tbDaysToInstall;
                        installedThisRecipient[talkingbookid].daystoinstall = tbDaysToInstall;
                        recipient.tbsInstalled[talkingbookid] = {deployedtimestamp: tbInstalledTimestamp,
                            daystoinstall: tbDaysToInstall, username: username, tbcdid: tbid, tbid: tbid};
                    });
                    recipient.daystoinstall = Math.round(days/recipient.num_TBsInstalled);
                }
            });

            // Aggregate the communities' groups into one line, keeping the details.
            let communitiesByName = {};
            recipients.forEach((recip) => {
                // Only examine those that should have TBs. TODO: really?
                //if (recip.num_TBs === 0 && recip.num_TBsInstalled === 0) { return }

                let communityName = recip.communityname;
                let community = communitiesByName[communityName];
                if (community) {
                    community.groups.push(recip);
                    community.numGroups++;
                    community.num_HHs += recip.num_HHs;
                    community.num_TBs += recip.num_TBs;
                    community.num_TBsInstalled += recip.num_TBsInstalled;
                    // Common properties are almost always the same for all groups in a community. But that's not a hard requirement,
                    // so if they are different, include them only in the group details.
                    sameInMostGroupsOfACommunity.forEach((p) => {if (community[p] !== recip[p]) {community[p] = ''} });
                } else {
                    // New community.
                    community = $.extend(true, {}, recip);
                    community.groups = [];
                    community.numGroups = 0;
                    if (community.groupname) {
                        community.groups.push(recip);
                        community.numGroups = 1;
                        delete community.groupname;
                        delete community.recipientid;
                        delete community.tbsInstalled;
                    }
                    communitiesByName[communityName] = community;
                }
            });
            // Turn it back to an array.
            let aggregated = Object.keys(communitiesByName).map(name => communitiesByName[name]);

            // Now get daystoinstall for the communities with multiple groups.
            aggregated.forEach((community)=>{
                if (community.numGroups) {
                    let days = 0;
                    community.groups.forEach((group)=>{
                        Object.keys(group.tbsInstalled).forEach((talkingbookid)=>{
                            days += group.tbsInstalled[talkingbookid].daystoinstall;
                        });
                    });
                    community.daystoinstall = Math.round(days/community.num_TBsInstalled);
                }
            });

            let summary = {
                num_TBs: aggregated.reduce((s,v)=>{return s+v.num_TBs}, 0),
                num_TBsInstalled: aggregated.reduce((s,v)=>{return s+v.num_TBsInstalled}, 0),
                num_communities: aggregated.length,
                num_groups: aggregated.reduce((s,v)=>{return s+(v.numGroups||0)}, 0)
            };

            promise.resolve({communities: aggregated, tbsInstalled: tbsInstalled, deploymentInfo: deploymentInfo, summary: summary});
        }, (err) => {
            promise.reject(err);
        });

        return promise;
    }

    return {
        getDeploymentsForProject: getDeploymentsForProject,
        getInstallationStatusForDeployment: getInstallationStatusForDeployment,
        getTbDailiesListForProject: getTbDailiesListForProject,
        getTbDailiesDataForProject: getTbDailiesDataForProject,
        getRecipientsForProject: getRecipientsForProject
    }

}();
