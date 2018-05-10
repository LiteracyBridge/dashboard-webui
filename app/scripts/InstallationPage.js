/**
 * Created by bill on 10/23/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, DataTable, Main, User, Chart, ProjectPicker, ProjectDetailsData, InstallationData, moment */

var InstallationPage = InstallationPage || {};

InstallationPage = (function () {
    'use strict'
    let PAGE_ID = 'installation-progress-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    var previousProject;
    var previousDeployment;

    var fillDone = false;

    function formatDate(date, def) {
        if (!(date instanceof moment)) { date=moment(date) }
        if (!date.isValid() && def) {
            return def;
        }
        return date.format('YYYY-MM-DD');
    }


    function fillProjects() {
        if (fillDone) {
            return;
        }
        fillDone = true;
        var preSelectDeployment = previousDeployment;
        ProjectDetailsData.getProjectList().done((projectsList) => {
            function getDeploymentsForProject(proj) {
                var promise = $.Deferred();
                InstallationData.getDeploymentsForProject(proj)
                    .done((deploymentsList) => {
                        // deploymentsList is a list of {project:'name', deployment:'name', deploymentnumber: number, startdate:'date', enddate:'date'}
                        deploymentsList = deploymentsList.map((elem) => {
                            return {
                                value: elem.deploymentnumber,
                                label: `#${elem.deploymentnumber}: ${formatDate(elem.startdate)} - ${formatDate(elem.enddate, 'TBD')}`
                            };
                        });
                        // TODO: Find the one that best matches today's date.
                        var today = deploymentsList[0];
                        deploymentsList.selected = preSelectDeployment || today && today.value;
                        preSelectDeployment = null;
                        promise.resolve(deploymentsList);
                    });
                return promise;
            }

            var options = {
                projects: projectsList,
                defaultProject: previousProject,
                getDeploymentsForProject: getDeploymentsForProject
            };

            $('#installation-progress-project-placeholder').on('selected', (evt, extra) => {
                var project = extra.project;
                var deployment = extra.deployment;
                if (project && deployment) {
                    reportProject(project, deployment);
                }
            });
            ProjectPicker.add('#installation-progress-project-placeholder', options);

        });
    }

    function NUMBER_NOTZERO(number, defaultValue) {
        if (number === 0) {
            return defaultValue!==undefined ? defaultValue : '';
        }
        if (number === null || number === undefined || isNaN(number)) {
            return defaultValue!==undefined ? defaultValue : 'n/a';
        }
        return Number(Math.round(number)).toLocaleString();
    }

    function ratingForRecipient(recipient) {
        function score(numTbs, installed) {
            let pct = installed / numTbs;
            if (pct > 1.00)  {return 5}
            if (pct > 0.99)  {return 4}
            if (pct >= 0.85) {return 3}
            if (pct >= 0.50) {return 2}
            if (pct > 0.10)  {return 1}
            return 0
        }
        let ownScore = score(recipient.num_TBs, recipient.num_TBsInstalled);
        let groupScores = (recipient.groups && recipient.groups.map(g=>score(g.num_TBs, g.num_TBsInstalled))) || [ownScore];
        let minScore = Math.min.apply(groupScores);
        // If any group had a score two points lower, lower community score.
        if (minScore && minScore <= ownScore-2) {ownScore--}

        switch (ownScore) {
            case 5: return 'excess';                // More than should have been.
            case 4: return 'perfect';               // A+
            case 3: return 'acceptable';            // B-
            case 2: return 'needs-improvement';     // F
            case 1: return 'unacceptable';          // F-
            case 0: return 'missing';               // just missing
            default: return 'unknown';
        }
    }

    var progressChart;
    var progressConfig = {
        type: 'scatter',
        data: {
            datasets: []
        },
        options: {
            // responsive lets the chart adapt to resizing. maintainAspectRatio:false lets us have a short, wide chart.
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'week',
                        stepSize: 2,
                        minUnit: 'day',
                        displayFormats: {
                            week: 'MMM D'
                        }
                    },
                    ticks: {
                        callback: function (value, index, values) {
                            return value;
                        },
                        autoSkip: false,
                        maxRotation: 0
                    },
                    scaleLabel: {
                        //display: true,
                        labelString: 'Day'
                    }
                }],
                yAxes: [{
                    display: true,
                    ticks: {
                        beginAtZero: true,
                        steps: 10,
                        stepValue: 10,
                        max: 100
                    }
                }]
            },
            tooltips: {
                filter: (tooltip, data) => {
                    let ds = data.datasets[tooltip.datasetIndex];
                    return (tooltip.index===0)||(tooltip.index===ds.data.length-1)||(ds.data[tooltip.index].daily);
                },
                callbacks: {
                    label: (tooltip, data) => {
                        let label = moment(new Date(tooltip.xLabel)).format('ddd, MMM DD');
                        let ds = data.datasets[tooltip.datasetIndex];
                        if (ds.name !== 'future') {
                            label += ': ';
                            if (ds.data[tooltip.index].daily) {
                                label += '+' + ds.data[tooltip.index].daily + ', ';
                            }
                            label += tooltip.yLabel + '%';
                        }
                        return label;
                    }
                }
            }
        }
    };
    function installationSummary(status) {
        let $summary = $('#installation-progress-summary');
        let basis = status.summary.num_TBs;
        if (!basis) {
            basis = status.tbsInstalled.length;
            $summary.removeClass('has-tb-count');
        } else {
            $summary.addClass('has-tb-count');
        }
        if (!status.summary.num_groups) {
            $summary.removeClass('has-group-count');
        } else {
            $summary.addClass('has-group-count');
        }
        $('#installation-num-tbs').text(basis);
        $('#installation-num-communities').text(status.summary.num_communities);
        $('#installation-num-groups').text(status.summary.num_groups);
        $('#installation-num-tbs-installed').text(status.summary.num_TBsInstalled);
        $('#installation-pct-tbs-installed').text(Math.round(status.summary.num_TBsInstalled/basis*100,1));

        $('#installation-progress-deployment-number').text(status.deploymentInfo.deploymentnumber);
        $('#installation-progress-deployment-name').text(status.deploymentInfo.deployment);
        $('#installation-progress-deployment-start').text(formatDate(status.deploymentInfo.startdate));
        $('#installation-progress-deployment-end').text(formatDate(status.deploymentInfo.enddate, 'TBD'));

        let inception = moment('2007-01-01')
        let earliest = moment('2207-12-31');  // anything will be before this far future date
        let latest = inception.clone();    // anything will be after our inception date

        // The data series to display. Consists of an array of x-y pairs, where the x value is a date
        // and the y value is the count on that date.
        var datasets = [{
                name: 'ugly',
                label: '< 50% complete',
                pointRadius: 2.5,
                pointStyle: 'circle',
                pointBorderColor: 'rgba(139,0,0,1)',
                pointBackgroundColor: 'rgba(255,255,255,0.6)',
                tension: 0,
                backgroundColor: 'rgba(139,0,0,1)'
            },{
                name: 'bad',
                label: '50% - 85% complete',
                pointRadius: 2.5,
                pointStyle: 'circle',
                pointBorderColor: 'rgba(239,149,0,1)',
                pointBackgroundColor: 'rgba(255,255,255,0.6)',
                tension: 0,
                backgroundColor: 'rgba(239,149,0,1)'
            },{
                name: 'good',
                label: '> 85% complete',
                pointRadius: 2.5,
                pointStyle: 'circle',
                pointBorderColor: 'rgba(75,200,25,1)',
                pointBackgroundColor: 'rgba(255,255,255,0.6)',
                tension: 0,
                backgroundColor: 'rgba(153,255,51,1)'
            },{
                name: 'future',
                label: 'Future - TBD',
                pointRadius: 2.5,
                pointStyle: 'circle',
                pointBorderColor: 'rgba(128,128,64,0.7)',
                pointBackgroundColor: 'rgba(255,255,255,1)',
                tension: 0,
                backgroundColor: 'rgba(255,255,128,0.2)'
            }];

        // See how many installs took place on each day of the deployment. Find earliest and latest deployment.
        let start = status.deploymentInfo.startdate.clone();
        let dailyInstalls = [];
        let span = status.deploymentInfo.enddate.diff(start, 'days');
        status.tbsInstalled.forEach((oneTbInstallation, ix) => {
            if (oneTbInstallation.deployedtimestamp.isBefore(earliest)) { earliest = oneTbInstallation.deployedtimestamp}
            if (oneTbInstallation.deployedtimestamp.isAfter(latest)) { latest = oneTbInstallation.deployedtimestamp}

            if (oneTbInstallation.daystoinstall < 0) {
                dailyInstalls[0] = 1 + (dailyInstalls[0]||0);
            } else if (oneTbInstallation.daystoinstall < span) {
                dailyInstalls[oneTbInstallation.daystoinstall] = 1 + (dailyInstalls[oneTbInstallation.daystoinstall]||0);
            } else {
                dailyInstalls[span - 1] = 1 + (dailyInstalls[span - 1]||0);
            }
        });

        // Display the found deployments range.
        if (latest.isAfter(inception)) {
            let installationSpan = latest.diff(earliest, 'days');
            let range = (installationSpan < 2) ? `on ${earliest.format('YYYY-MM-DD')}` : `from ${earliest.format('YYYY-MM-DD')} to ${latest.format('YYYY-MM-DD')}`;
            $('#installation-progress-deployment-range').text(range);
        }

        // Turn the daily installs into daily % completion.
        let sum = 0;
        let hasgap = false;
        let prevpoint = {x:start.toDate().valueOf(), y:0};
        for (let ix = 0; ix < span; ix++) {
            sum += dailyInstalls[ix] || 0;
            let date = start.clone().add(ix, 'days');
            if (date.isBefore()) {
                let pct = Math.round(sum / basis * 100, 1);
                let point = {x: date.toDate().valueOf(), y: pct, daily: dailyInstalls[ix]};
                let dsix = 2;
                if (pct <= 50) {
                    dsix = 0;
                } else if (pct < 85) {
                    dsix = 1;
                }
                if (!datasets[dsix].data) {
                    datasets[dsix].data = ix ? [prevpoint] : [];
                }
                datasets[dsix].data.push(point);
                prevpoint = point;
                //installed.data.push({x:ix, y:Math.round(sum/status.summary.num_TBs*100,1)});
            } else {
                hasgap = true;
            }
        }
        // Filter out repeated days with the same value.
        datasets.forEach((ds)=>{
            if (ds.data) {
                ds.data = ds.data.filter((d,ix,ary)=>{
                    // keep first, last.
                    if (ix===0 || ix===ary.length-1) { return true }
                    // keep if different from previous or next values
                    return d.y !== ary[ix-1].y || d.y !== ary[ix+1].y;
                });
                ds.pointRadius = ds.data.map((d,ix,ary)=>(d.daily||ix===0||ix===(ary.length-1)?2.5:0));
            }
        });
        // If, in real life, we're not to the end of the deployment period, fill in the gap.
        if (hasgap) {
            datasets[3].data = [prevpoint, {x:status.deploymentInfo.enddate.toDate().valueOf(), y:prevpoint.y}]
        }
        // Chart the ones with data in them.
        progressConfig.data.datasets = datasets.filter(ds=>ds.data);

        if (!progressChart) {
            progressChart = new Chart($('#installation-progress-timing'), progressConfig);
        } else {
            progressChart.update();
        }

        // Update summary with deployment ranges.

    }


    function installationDetails(communities, tbsDeployed) {
        // tbsDeployed: [ {talkingbookid,deployedtimestamp,project,deployment,contentpackage,community,firmware,location,coordinates,username,tbcdid,action,newsn,testing} ]
        // aggregatedRecipients: [ {affiliate,partner,program,country,region,district,community,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,languagecode,
        //      [ groups: [ {affiliate,partner,program,country,region,district,community,group_name,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,languagecode} ],
        //      numGroups
        //  ]

        let options = {
            columns: ['detailsControl', /*'program','region',*/'district', 'communityname', /*'group_name',*/
                'num_HHs', 'num_TBs', 'num_TBsInstalled', 'percentinstalled', 'daystoinstall',
                'supportentity', 'model', 'languagecode', 'installer', 'tbid'],
            headings: {
                detailsControl: ' ',
                program: 'Program',
                region: 'Region',
                district: 'District',
                communityname: 'Community / <em>Group</em>',
                groupname: 'Group',
                num_HHs: '# HHs',
                num_TBs: '# TBs',
                num_TBsInstalled: '# Installed',
                percentinstalled: '% Installed',
                daystoinstall: 'Days To Install',
                supportentity: 'Support Entity',
                model: 'Model',
                installer: 'Updated By',
                tbid: 'TB-Loader ID'
            },
            headingClasses: {
                detailsControl: 'sorting-disabled'
            },
            columnClasses: {
                detailsControl: row=>(row.numGroups ? 'details-control' : '')+' details-column',
                num_TBsInstalled: row=>ratingForRecipient(row),
                percentinstalled: row=>ratingForRecipient(row),
                groupname: row=>'group-name'
            },
            tooltips: {
                num_TBsInstalled: 'The number of Talking Books reported to have been installed.',
                daystoinstall: 'The average number of days before the Talking Books were installed with the Deployment.',
                installer: 'Who installed the content onto the Talking Books.',
                tbid: 'TB-Loader ID of the laptop/phone that performed the update of the Talking Books.'
            },
            formatters: {
                detailsControl: row=>' ',
                num_HHs: row=>NUMBER_NOTZERO(row.num_HHs),
                num_TBs: row=>NUMBER_NOTZERO(row.num_TBs),
                num_TBsInstalled: row=>NUMBER_NOTZERO(row.num_TBsInstalled, 0),
                percentinstalled: row=>row.num_TBs?Math.round(row.num_TBsInstalled/row.num_TBs*100, 0):'n/a',
                model: row=>row.model==='Group Rotation'?'Group':row.model,
            },
            datatable: {/*colReorder:{fixedColumnsLeft:1},*/ columnDefs:[{orderable: false, targets: 0}]}
        };

        /**
         * Given a recipient, look at the 'tbsInstalled', and gather all the 'username' fields. If the recipient
         * has groups, gather their username's as well.
         * @param Either a 'community' row, with an array of recipients, or a 'recipent' row,
         *        with a dictionary of installations.
         * @return Object with a field per username.
         */
        function addInstallerInfo(recipient) {
            let distinctUsernames = {};
            let distinctTbids = {};
            if (recipient.numGroups) {
                recipient.groups.forEach((groupMember)=>{
                    let groupInfo = addInstallerInfo(groupMember);
                    $.extend(distinctUsernames, groupInfo.usernames);
                    $.extend(distinctTbids, groupInfo.tbids);
                });
            } else {
                Object.keys(recipient.tbsInstalled).forEach( (tb) =>  {
                    let username = recipient.tbsInstalled[tb].username;
                    if (username && !distinctUsernames.hasOwnProperty(username) && username.toUpperCase() !== 'UNKNOWN') {
                        distinctUsernames[username] = 1
                    }
                    let tbid = recipient.tbsInstalled[tb].tbid;
                    if (tbid && !distinctUsernames.hasOwnProperty(tbid)) {
                        distinctTbids[tbid] = 1
                    }
                });
            }
            recipient.installer = Object.keys(distinctUsernames).join(', ');
            recipient.tbid = Object.keys(distinctTbids).join(', ');
            return {usernames: distinctUsernames, tbids: distinctTbids};
        }

        // Add an installer field, from the individual talking book 'username' fields.
        communities.forEach(addInstallerInfo);

        let table = DataTable.create($('#installation-progress-detail'), communities, options);
        // This says sort by community, then by model (not the other way around, as one is likely to read it).
        table.order([[options.columns.indexOf('model'),'desc'],[options.columns.indexOf('communityname'),'asc']]).draw();

        /* Formatting function for row details */
        function formatRowsForGroups ( rowData ) {
            let childRows = [];
            // 'rowData' is the original data object for the row

            // If there are groups in the community, add a row for each.
            if (rowData.numGroups) {
                // Columns for a group, with spacers, so it lines up with the main table.
                let member_columns = ['spacer', 'spacer', 'groupname', 'num_HHs', 'num_TBs', 'num_TBsInstalled',
                    'percentinstalled', 'daystoinstall', 'supportentity', 'model', 'languagecode', 'installer', 'tbid'];
                // Support entity, model, languagecode: don't repeat what's at the community level, unless it's different.
                let member_formatters = {
                    spacer: row=>' ',
                    num_HHs: options.formatters.num_HHs,
                    num_TBs: options.formatters.num_TBs,
                    num_TBsInstalled: options.formatters.num_TBsInstalled,
                    percentinstalled: options.formatters.percentinstalled,
                    daystoinstall: row=>NUMBER_NOTZERO(row.daystoinstall, ''),
                    supportentity: row=>(row.supportentity!==rowData.supportentity)?row.supportentity:'',
                    model: row=>(row.model!==rowData.model)?options.formatters.model(row):'',
                    languagecode: row=>(row.languagecode!==rowData.languagecode)?row.languagecode:''
                };
                // Iterate over the groups.
                rowData.groups.forEach((member)=>{
                    // Create the <tr> for the row.
                    var $tr = $('<tr class="deployment-progress-detail">');
                    // Add the <td> for every column.
                    member_columns.forEach((columnName)=>{
                        let v= (member_formatters[columnName] ? member_formatters[columnName](member) : member[columnName]);
                        let cl = options.columnClasses[columnName] ? options.columnClasses[columnName](member) : '';
                        var $td = $('<td>'+v+'</td>');
                        if (cl) { $td.addClass(cl) }
                        $tr.append($td)
                    });
                    childRows.push($tr);
                });
            }

            return childRows;
        }

        // Add event listener for opening and closing details
        $('#installation-progress-detail tbody').on('click', 'td.details-control', function () {
            var tr = $(this).closest('tr');
            var rowData = communities[$(tr).data('row-index')];
            var row = table.row( tr );

            if ( row.child.isShown() ) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown');
            }
            else {
                // Open this row, providing the formatted rows that make up the sub-rows.
                row.child( formatRowsForGroups(rowData) ).show();
                tr.addClass('shown');
            }
        } );
    }

    function reportProject(project, deployment) {
        Main.incrementWait();
        previousProject = project;
        previousDeployment = deployment;
        localStorage.setItem('installation.project', previousProject);
        localStorage.setItem('installation.deployment', previousDeployment);

        InstallationData.getInstallationStatusForDeployment(project, deployment).done((status)=>{
            // tbsDeployed: [ {talkingbookid,deployedtimestamp,project,deployment,contentpackage,community,firmware,location,coordinates,username,tbcdid,action,newsn,testing} ]
            // recipients: [ {affiliate,partner,program,country,region,district,community,group_name,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,languagecode} ]
            // community: [ {affiliate,partner,program,country,region,district,community,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,languagecode,
            //      num_TBsInstalled, numGroups,
            //      groups: [ {num_TBsInstalled, affiliate,partner,program,country,region,district,community,group_name,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,languagecode} ] }
            // status: { communities: [ community ], tbsInstalled: [ tbsDeployed ] }

            installationDetails(status.communities, status.tbsInstalled);
            installationSummary(status);
            Main.decrementWait();
        }).fail((err)=>{
            Main.decrementWait();
        });
    }

    var initialized = false;

    function show() {
        if (!initialized) {
            initialized = true;
            previousProject = localStorage.getItem('installation.project') || '';
            previousDeployment = localStorage.getItem('installation.deployment') || '';
            fillProjects();
        }
    }

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show)

    return {}
})();
