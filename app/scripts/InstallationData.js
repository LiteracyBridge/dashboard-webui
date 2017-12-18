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
                    return d;
                }).sort((a,b)=>{return a.deploymentnumber - b.deploymentnumber});
                deploymentsPromises[project].resolve(deployments);
            }).fail((err) => {
                deploymentsPromises[project].reject(err);
            });
        }
        return deploymentsPromises[project];
    }

    function getDeploymentInfo(project, deployment) {
        deployment = deployment.toUpperCase();
        let promise = $.Deferred();
        getDeploymentsForProject(project).then((deployments)=>{
            promise.resolve(deployments.find(d=>d.deployment.toUpperCase()===deployment));
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
                recipientPromises[project].resolve(recipients);
            }).fail((err) => {
                recipientPromises[project].reject(err);
            });
        }
        return recipientPromises[project];
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
                tbsDeployedPromises[project].resolve(tbDeployments);
            }).fail((err) => {
                tbsDeployedPromises[project].reject(err);
            });
        }
        return tbsDeployedPromises[project];
    }

    function getTBsDeployedForDeployment(project, deployment) {
        let promise = $.Deferred();
        deployment = deployment.toUpperCase();
        getTBsDeployedForProject(project).then((tbDeployments) => {
                promise.resolve(tbDeployments.filter(d => d.deployment.toUpperCase() === deployment));
            },
            promise.reject);
        return promise;
    }

    function getInstallationStatusForDeployment(project, deployment) {
        const sameInMostGroupsOfACommunity = ['program', 'country', 'region', 'district', 'supportentity', 'model', 'language'];
        let promise = $.Deferred();
        deployment = deployment.toUpperCase();
        $.when(getRecipientsForProject(project),
            getTBsDeployedForDeployment(project, deployment),
            getDeploymentInfo(project, deployment)).then((recipients, tbsDeployed, deploymentInfo) => {
            // tbsDeployed: [ {talkingbookid, recipientid, deployedtimestamp, project, deployment, contentpackage, firmware,
            //                  location, coordinates, username, tbcdid, action, newsn, testing} ]
            // recipients: [ {recipientid, project, partner, communityname, groupname, affiliate, component, country,
            //                  region, district, num_HHs, num_TBs, supportentity, model, language, coordinates} ]

            // Bucketize the relevant tbsDeployed by recipient.
            let installedPerRecipient = {}; // {recipientid: {talkingbookid: tbsdeployedrecord, talkingbookid: ...}, recipientid: ...
            let duplicateInstallations = 0;
            tbsDeployed.forEach((d) => {
                if (d.deployment.toUpperCase() !== deployment) { return }

                let deployedTbs = installedPerRecipient[d.recipientid] || (installedPerRecipient[d.recipientid] = {});
                if (deployedTbs.hasOwnProperty(d.talkingbookid)) {
                    // A duplicate. Should we keep the oldest or newest? It usually doesn't matter, because, usually, they'll be in the same session.
                    // But if it was re-installed due to a problem, then it wasn't really fully available until the correction.
                    // Keep the latest one.
                    if (d.deployedtimestamp.isAfter(deployedTbs[d.talkingbookid])) {
                        deployedTbs[d.talkingbookid] = d;
                    }
                    duplicateInstallations++;
                } else {
                    deployedTbs[d.talkingbookid] = d;
                }
            });

            // tbsInstalled is like tbsDeployed, but without any duplicate installations to the same TB.
            let tbsInstalled = [];
            Object.keys(installedPerRecipient).forEach((recipientid) => {
                let installedForRecipient = installedPerRecipient[recipientid];
                Object.keys(installedForRecipient).forEach((tb) => {
                    tbsInstalled.push(installedForRecipient[tb]);
                });
            });

            // Now add the # deployed into the recipients data.
            recipients.forEach((recip) => {
                let tbsInstalled = installedPerRecipient[recip.recipientid];
                recip.num_TBsInstalled = (tbsInstalled && Object.keys(tbsInstalled).length) || 0;
                recip.tbsInstalled = {};
                if (tbsInstalled) {
                    let days = 0;
                    Object.keys(tbsInstalled).forEach((k) => {
                        let ts = tbsInstalled[k].deployedtimestamp;
                        let dd = ts.diff(deploymentInfo.startdate, 'days');
                        days += dd;
                        tbsInstalled[k].daystoinstall = dd;
                        recip.tbsInstalled[k] = {deployedtimestamp: ts, daystoinstall: dd};
                    });
                    recip.daystoinstall = Math.round(days/recip.num_TBsInstalled);
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
                    community = $.extend({}, recip);
                    community.groups = [];
                    community.numGroups = 0;
                    if (community.groupname) {
                        community.groups.push(recip);
                        community.numGroups = 1;
                        delete community.groupname;
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
                        Object.keys(group.tbsInstalled).forEach((k)=>{
                            days += group.tbsInstalled[k].daystoinstall;
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
        getInstallationStatusForDeployment: getInstallationStatusForDeployment
    }

}();
