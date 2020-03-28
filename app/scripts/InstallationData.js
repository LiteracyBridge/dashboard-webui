/* jshint esversion:6, asi:true*/
/* global $, console, Main, User, Utils, moment, ProgramDetailsData */

let InstallationData = function () {
    'use strict';

    let csvTrue = /^(t|true|y|yes|1)$/i;

    function Set(values) {
        let set = {}
        values.forEach( v => set[v]=true );
        set.contains = function(value) {
            return this.hasOwnProperty(value)
        }
        return set;
    }

    function getTbDailiesListForProgram(program) {
        return Utils.getFileCached(program, 'tbsdaily.json');
    }

    function getTbDailiesDataForProgram(program, year, month, day) {
        let name = (year === undefined) ? 'tbsdeployed.csv' : year+'/'+ month+'/'+day+'/tbsdeployed.csv';
        return Utils.getFileCached(program, name, (list) => {
            let tbsdeployed = $.csv.toObjects(list, {separator: ',', delimiter: '"'});
            tbsdeployed = tbsdeployed.map((d) => {
                d.deployedtimestamp = moment(d.deployedtimestamp);
                d.newsn = csvTrue.test(d.newsn);
                d.testing = csvTrue.test(d.testing)
                return d;
            });
            return tbsdeployed;
        });
    }

    function getComponentDeploymentsForProgram(program) {
        return Utils.getFileCached(program, 'component_deployments.csv', (list) => {
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
            console.log(`Got ${componentDeployments.length} component deployments for ${program}.`)
            return componentDeployments;
        });
    }

    function getComponentsForProgramAndDeployment(program, deploymentnumber) {
        let promise = $.Deferred();
        getComponentDeploymentsForProgram(program).then((components)=>{
            components = components.filter(d=>d.deploymentnumber == deploymentnumber); // jshint ignore:line
            console.log(`Got ${components.length} component deployments for ${program}/${deploymentnumber}.`)
            promise.resolve(components);
        }, promise.reject);
        return promise;
    }

    /**
     * Gets information about a deployment for a program
     * @param program The desired program
     * @param deploymentnumber The desired deploymentnumber
     * @returns {*}
     */
    function getDeploymentInfo(program, deploymentnumber) {
        let deployment = ('' + deploymentnumber).toUpperCase();
        let promise = $.Deferred();
        ProgramDetailsData.getDeploymentsList(program).then((deployments)=>{
            promise.resolve(deployments.find(d=>d.deployment.toUpperCase()===deployment || d.deploymentnumber==deploymentnumber)); // jshint ignore:line
        }, promise.reject);
        return promise;
    }

    /**
     * Given a program and a deploymentnumber, get the names for that deployment. Ususally there is only one name
     * per deployment, but occasionally there are multiples.
     * @param program The program desired.
     * @param deploymentnumber The deployment number.
     * @returns {*} A promise that resovles with a list of deployment names.
     */
    function getDeploymentNames(program, deploymentnumber) {
        let promise = $.Deferred();
        ProgramDetailsData.getDeploymentsList(program).then((deployments)=>{
            let result = []
            deployments.forEach((elem, ix) => { if (elem.deploymentnumber === deploymentnumber) { result=result.concat(elem.deploymentnames) }})
            promise.resolve(result);
        }, promise.reject);
        return promise;
    }

    function getRecipientsForProgram(program) {
        return Utils.getFileCached(program, 'recipients.csv', (list) => {
            // recipients: [ {recipientid, program, partner, communityname, groupname, affiliate, component, country,
            //                  region, district, num_HHs, num_TBs, supportentity, model, languagecode, coordinates} ]
            // LBG,UNICEF,Jirapa HH Rotation,Ghana,Upper West,Jirapa,Goziel,,Goziel,105,27,,Robert Yaw,HHR,dga
            // LBG,UNICEF,Jirapa Groups,Ghana,Upper West,Jirapa,Ul-Tuopare,Songbaala ,Songbaala Ul-Tuopare,,2,B-00060266,Bosore Gilbert,Group Rotation,dga
            // ...
            let recipients = $.csv.toObjects(list, {separator: ',', delimiter: '"'});
            // Convert number fields to actual numbers.
            recipients = recipients.map((r) => {
                r.num_HHs = Number(r.numhouseholds);
                r.num_TBs = Number(r.numtbs);
                r.languagecode = r.languagecode || r.language;
                delete r.language;
                return r;
            });
            console.log(`Got ${recipients.length} recipients for ${program}.`)
            return recipients;
        });
    }

    /**
     * Get all of the recipients that should have received a deploymentnumber. Map deploymentnumber to the
     * components that should have received it, then get the recipients from those components.
     * @param program
     * @param deploymentnumber
     * @returns {*}
     */
    function getRecipientsForProgramAndDeployment(program, deploymentnumber) {
        let promise = $.Deferred();
        let recips = getRecipientsForProgram(program);
        let comps = getComponentsForProgramAndDeployment(program, deploymentnumber);

        recips.then((recipients) => {
            // We don't have a "components for program" file for every program. If we don't have one, simply use the
            // unfiltered list.
            comps.then((components) => {
                let componentsInDeployment = Set( components.map( c => c.component ));
                let r2 = recipients.filter( r  => componentsInDeployment.contains(r.component) );
                console.log(`Got ${r2.length} recipients for ${program}/${deploymentnumber}.`)
                promise.resolve(r2)
            }, (err) => {
                console.log(`Got ${recipients.length} recipients for ${program} without deployment filter.`)
                promise.resolve(recipients)
            });
        }, promise.reject);

        return promise;
    }

    let tbsDeployedPromises = {};

    function getTBsDeployedForProgram(program) {
        if (!tbsDeployedPromises[program]) {
            tbsDeployedPromises[program] = $.Deferred();

            let path = Utils.pathForFile(program, 'tbsdeployed.csv');
            let tbsDeployed = $.get(path);
            $.when(tbsDeployed, ProgramDetailsData.getProgramDeploymentNames(program)).done((tbList, deploymentNamesList) => {
                // Deployments, sadly, often were given multiple names. Here we have a list of them, separated by ';'
                let deploymentNamesMap = {};
                deploymentNamesList.forEach((elem)=> {
                    let nameList = elem.deploymentname.split(';');
                    nameList.forEach((name)=>{deploymentNamesMap[name] = elem.deploymentnumber});
                });
                // The projects list file is a .csv with data like:
                // tbsDeployed: [ {talkingbookid,deployedtimestamp,program,deployment,contentpackage,community,firmware,location,coordinates,username,tbcdid,action,newsn,testing} ]
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
                    d.tbcdid = (d.tbcdid||'').toLowerCase();
                    d.newsn = csvTrue.test(d.newsn);
                    d.testing = csvTrue.test(d.testing);
                    return d;
                });
                console.log(`Got ${tbDeployments.length} tbs deployed for ${program}.`)
                tbsDeployedPromises[program].resolve(tbDeployments);
            }).fail((err) => {
                tbsDeployedPromises[program].reject(err);
            });
        }
        return tbsDeployedPromises[program];
    }

    /**
     * Given a program and a deploymentnumber, get the tb deployment records for that deployment.
     * @param program of interest
     * @param deploymentnumber of interest
     * @returns {*} Promise that resolves with the desired tbsDeployed records.
     */
    function getTBsDeployedForDeployment(program, deploymentnumber) {
        let promise = $.Deferred();
        // The tbsdeployed records have a deployment name in them. We need to map the deployment number to a list
        // of one or more names, then match on that list.
        $.when(getTBsDeployedForProgram(program),
            getDeploymentNames(program, deploymentnumber))
            .then((tbDeployments, deploymentnames) => {
                    let names = Set(deploymentnames)
                    let filtered = tbDeployments.filter(d => names.contains(d.deployment));
                    promise.resolve(filtered);
                },
                promise.reject);
        return promise;
    }

    /**
     * This is a large and complex function. Given a deploymentNumber in a program, it combines the tbsDeployed
     * table and the recipients table. The result is an array of deployment installation, per community. The information
     * includes:
     * - the recipient information for the community
     * - a list of tbs installed in the community, with the installation timestamp, and installing agent
     * - the average 'days to install' for all the TBs in the community
     * - a list of Groups in the community (there may be only one)
     *
     * For communities with Groups, each group owns the list of its own TBs.
     *
     * @param program
     * @param deploymentnumber
     * @param options: an object that may include the following:
     *     includeTestInstalls: If true, also include test installations.
     * @returns {*}
     */
    function getInstallationStatusForDeployment(program, deploymentnumber, options) {
        options = options || {}
        const sameInMostGroupsOfACommunity = ['program', 'country', 'region', 'district', 'supportentity', 'model', 'languagecode'];
        let promise = $.Deferred();
        $.when(getRecipientsForProgramAndDeployment(program, deploymentnumber),
            getTBsDeployedForDeployment(program, deploymentnumber),
            getDeploymentInfo(program, deploymentnumber)).then((allRecipients, tbsDeployed, deploymentInfo) => {
            // tbsDeployed: [ {talkingbookid, recipientid, deployedtimestamp, program, deployment, contentpackage, firmware,
            //                  location, coordinates, username, tbcdid, action, newsn, testing} ]
            // recipients: [ {recipientid, program, partner, communityname, groupname, affiliate, component, country,
            //                  region, district, num_HHs, num_TBs, supportentity, model, languagecode, coordinates} ]

            // Copy the data before modifying it, to avoid polluting the source.
            let recipients = $.extend(true, [], allRecipients).filter( recip => recip.partner && recip.affiliate && recip.component);
            tbsDeployed = $.extend(true, [], tbsDeployed)
            tbsDeployed = tbsDeployed.filter(elem => !elem.testing || options.includeTestInstalls );


            // From the array of tbsDeployed, create lists of talking books installed per recipient:
            //   {recipientid: {talkingbookid: tbsdeployedrecord, talkingbookid: ...}, recipientid: ...
            let installedPerRecipient = {};
            let duplicateInstallations = 0;
            tbsDeployed.forEach((singleTbDeployment) => {
                if (singleTbDeployment.deploymentnumber != deploymentnumber) { return } // jshint ignore:line

                // Get the record of TBs for this recipient, creating if first time seen.
                let installedThisRecipient = installedPerRecipient[singleTbDeployment.recipientid] || (installedPerRecipient[singleTbDeployment.recipientid] = {});
                // Record the (latest) installation to the Talking Book
                if (installedThisRecipient.hasOwnProperty(singleTbDeployment.talkingbookid)) {
                    // A duplicate. Should we keep the oldest or newest? It usually doesn't matter, because, usually, they'll be in the same session.
                    // But if it was re-installed due to a problem, then it wasn't really fully available until the correction.
                    // Keep the latest one.
                    if (singleTbDeployment.deployedtimestamp.isAfter(installedThisRecipient[singleTbDeployment.talkingbookid])) {
                        installedThisRecipient[singleTbDeployment.talkingbookid] = singleTbDeployment;
                    }
                    duplicateInstallations++;
                } else {
                    // First time this TB was seen
                    installedThisRecipient[singleTbDeployment.talkingbookid] = singleTbDeployment;
                }
            });

            // All tb deployment events have been organized by recipient. Compute some per-recipient data. NOTE: this
            // also includes extraneous recipients.
            Object.keys(installedPerRecipient).forEach(recipientid => {
                let installedThisRecipient = installedPerRecipient[recipientid];
                let talkingbookids = Object.keys(installedThisRecipient);
                installedThisRecipient.num_TBsInstalled = (installedThisRecipient && Object.keys(installedThisRecipient).length) || 0;
                installedThisRecipient.tbsInstalled = {};
                if (options.includeTestInstalls) {
                    installedThisRecipient.num_TBTestsInstalled = 0;
                }
                let days = 0;
                talkingbookids.forEach((talkingbookid) => {
                    if (options.includeTestInstalls && installedThisRecipient[talkingbookid].testing) {
                        installedThisRecipient.num_TBTestsInstalled += 1;
                    }
                    let tbInstalledTimestamp = installedThisRecipient[talkingbookid].deployedtimestamp;
                    let tbDaysToInstall = tbInstalledTimestamp.diff(deploymentInfo.startdate, 'days');
                    installedThisRecipient[talkingbookid].daystoinstall = tbDaysToInstall;
                    installedThisRecipient[talkingbookid].tbid = installedThisRecipient[talkingbookid].tbcdid;
                    // move installation event from installedThisRecipient to installedThisRecipient.tbsInstalled
                    installedThisRecipient.tbsInstalled[talkingbookid] = installedThisRecipient[talkingbookid];
                    delete installedThisRecipient[talkingbookid];
                    days += tbDaysToInstall;
                });
                installedThisRecipient.daystoinstall = Math.round(days/installedThisRecipient.num_TBsInstalled);
            });

            // Add the TBs installed-per-recipient to the recipient records as recipient.tbsInstalled = {tbid: {}, ...}
            // Note the number of days the installations took.
            // Keep a tally of who and which TB-Loader performed the installations.
            recipients.forEach((recipient) => {
                let installedThisRecipient = installedPerRecipient[recipient.recipientid];
                recipient.num_TBsInstalled = 0;
                recipient.tbsInstalled = {};
                if (options.includeTestInstalls) {
                    recipient.num_TBTestsInstalled = 0;
                }
                if (installedThisRecipient) {
                    if (options.includeTestInstalls) {
                        recipient.numTBTestsInstalled = installedThisRecipient;
                    }
                    recipient.num_TBsInstalled = installedThisRecipient.num_TBsInstalled;
                    recipient.tbsInstalled = installedThisRecipient.tbsInstalled;
                    recipient.daystoinstall = installedThisRecipient.daystoinstall;

                    // Remove this recipient's installations from installedPerRecipient. When this loop is done, any
                    // remaining are for recipients not in this program/program.
                    delete installedPerRecipient[recipient.recipientid];
                }
            });

            // Aggregate the communities' groups into one line, keeping the details.
            let communitiesByName = {};
            recipients.forEach((recip) => {

                let communityName = recip.communityname;
                let community = communitiesByName[communityName];
                if (community) {
                    community.groups.push(recip);
                    community.numGroups++;
                    community.num_HHs += recip.num_HHs;
                    community.num_TBs += recip.num_TBs;
                    community.num_TBsInstalled += recip.num_TBsInstalled;
                    if (options.includeTestInstalls) {
                        community.num_TBTestsInstalled += recip.num_TBTestsInstalled;
                    }
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
            let communitiesList = Object.keys(communitiesByName).map(name => communitiesByName[name]);

            // Now get daystoinstall for the communities with multiple groups.
            communitiesList.forEach((community)=>{
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

            let extraneousRecipients = Object.keys(installedPerRecipient).map(recipientid => {
                // the intalledPerRecipient already has a tbsInstalled (map of talkingbookids to deployment events)
                // and daystoinstall, and possibly a num_TBTestsInstalled; Just add the recipientid, and we're good.
                let extraneousRecipient = installedPerRecipient[recipientid];
                extraneousRecipient.recipientid = recipientid;
                let recipient = allRecipients.find(elem => elem.recipientid===recipientid);
                // If we can get the community name, do so, otherwise just use the recipientid.
                extraneousRecipient.communityname = recipient ? recipient.communityname : recipientid;
                extraneousRecipient.supportentity = recipient ? recipient.supportentity : '';
                return extraneousRecipient;
            });

            let summary = {
                num_TBs: communitiesList.reduce((s,v)=>{return s+v.num_TBs}, 0),
                num_TBsInstalled: communitiesList.reduce((s,v)=>{return s+v.num_TBsInstalled}, 0),
                num_communities: communitiesList.length,
                num_groups: communitiesList.reduce((s,v)=>{return s+(v.numGroups||0)}, 0)
            };

            let result = {
                communities: communitiesList,
                deploymentInfo: deploymentInfo,
                extraneousRecipients: extraneousRecipients,
                summary: summary
            };
            promise.resolve(result);
        }, (err) => {
            promise.reject(err);
        });

        return promise;
    }

    return {
        getInstallationStatusForDeployment: getInstallationStatusForDeployment,
        getTbDailiesListForProject: getTbDailiesListForProgram,
        getTbDailiesDataForProject: getTbDailiesDataForProgram,
        getRecipientsForProject: getRecipientsForProgram
    }

}();
