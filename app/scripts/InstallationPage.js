/**
 * Created by bill on 10/23/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, DataTable, Main, User, Chart, ProgramPicker, ProgramDetailsData, InstallationData, Utils, moment */

var InstallationPage = InstallationPage || {};

InstallationPage = (function () {
    'use strict'
    let PAGE_ID = 'installation-progress-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    var previousProgram;
    var previousDeployment;

    var fillDone = false;

    var RATINGS = {
        label: [
            '0 - 20% Dead',
            '21 - 59% Failed',
            '60 - 84% Unacceptable',
            '85 - 99% Acceptable',
            '100% Great',
            '>100% Excess'
        ],
        tooltip: [
            'Is the community / group still participating in the Program?',
            'This is a failure to meet our contractual obligations.',
            'Unacceptable performance against contractual obligations.',
            'Acceptable, provided there is a good rationale for missing installations.',
            'Perfect!',
            'An excess of Talking Books seem to have been installed. This may be fine, but needs explanation.'
        ],
        class: [
            'missing',
            'unacceptable',
            'needs-improvement',
            'acceptable',
            'perfect',
            'excess'
        ],
        boundaries: [20, 59, 84, 99, 100]
    }

    function buildLegend() {
        let $legend = $('#installation-progress-legend');
        RATINGS.label.forEach((text, ix) => {
            let $label = $('.'+RATINGS.class[ix], $legend);
            $label.text(text);
            $label.addClass(RATINGS.class[ix]);
            $label.prop('title', RATINGS.tooltip[ix]);
            $label.tooltip();
        })
    }

    function ratingForRecipient(recipient) {
        function score(numTbs, installed) {
            if (installed===0) { return 0}
            let pct = installed / numTbs * 100;
            // Handles everything through 100%
            for (let ix=0; ix<RATINGS.boundaries.length; ix++) {
                if (pct <= RATINGS.boundaries[ix]) {
                    return ix;
                }
            }
            // Special case for > 100%. Allow 1 excess, or up to 10% excess, without highlighting.
            return ((installed-numTbs) === 1 || pct < 110) ? 4 : 5;
        }
        let ownScore = score(recipient.num_TBs, recipient.num_TBsInstalled);
        let groupScores = (recipient.groups && recipient.groups.map(g=>score(g.num_TBs, g.num_TBsInstalled))) || [ownScore];
        let minScore = Math.min.apply(groupScores);
        // If any group had a score two points lower, lower community score.
        if (minScore && minScore <= ownScore-2) {ownScore--}

        return RATINGS.class[ownScore];

    }

    function fillProjects() {
        if (fillDone) {
            return;
        }
        fillDone = true;
        var preSelectDeployment = previousDeployment;
        let programsList = Main.getProgramsForUser();

         function getDeploymentsForProgram(proj) {
            var promise = $.Deferred();
            ProgramDetailsData.getDeploymentsList(proj)
                .done((deploymentsList) => {
                    // deploymentsList is a list of {project:'name', deployment:'name', deploymentnumber: number, startdate:'date', enddate:'date'}
                    deploymentsList = deploymentsList.map((elem) => {
                        return {
                            value: elem.deploymentnumber,
                            label: `#${elem.deploymentnumber}: ${Utils.formatDate(elem.startdate)} - ${Utils.formatDate(elem.enddate, 'TBD')}`,
                            //tooltip: elem.deployment
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
            programs: programsList,
            defaultProgram: previousProgram,
            getDeploymentsForProgram: getDeploymentsForProgram
        };

        $('#installation-progress-program-placeholder').on('selected', (evt, extra) => {
            var program = extra.program;
            var deployment = extra.deployment;
            if (program && deployment) {
                reportProgram(program, deployment);
            }
        });
        ProgramPicker.add('#installation-progress-program-placeholder', options);

    }


    var progressChart;
    var progressConfig = {
        type: 'line',
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
                        // stepSize: 2,
                        minUnit: 'day',
                        displayFormats: {
                            week: 'MMM D'
                        }
                    },
                    ticks: {
                        callback: function (value, index, values) {
                            return value;
                        },
                        beginAtZero: true,
                        autoSkip: false,
                        maxRotation: 90
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
            basis = status.tbsInstalled && status.tbsInstalled.length || 1;
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
        $('#installation-progress-deployment-start').text(Utils.formatDate(status.deploymentInfo.startdate));
        $('#installation-progress-deployment-end').text(Utils.formatDate(status.deploymentInfo.enddate, 'TBD'));

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
                backgroundColor: 'rgba(139,0,0,1)',
            },{
                name: 'bad',
                label: '50% - 85% complete',
                pointRadius: 2.5,
                pointStyle: 'circle',
                pointBorderColor: 'rgba(239,149,0,1)',
                pointBackgroundColor: 'rgba(255,255,255,0.6)',
                tension: 0,
                backgroundColor: 'rgba(239,149,0,1)',
            },{
                name: 'good',
                label: '> 85% complete',
                pointRadius: 2.5,
                pointStyle: 'circle',
                pointBorderColor: 'rgba(75,200,25,1)',
                pointBackgroundColor: 'rgba(255,255,255,0.6)',
                tension: 0,
                backgroundColor: 'rgba(153,255,51,1)',
            },{
                name: 'future',
                label: 'Future - TBD',
                pointRadius: 2.5,
                pointStyle: 'circle',
                pointBorderColor: 'rgba(128,128,64,0.7)',
                pointBackgroundColor: 'rgba(255,255,255,1)',
                tension: 0,
                backgroundColor: 'rgba(255,255,128,0.2)',
            }];

        // See how many installs took place on each day of the deployment. Find earliest and latest deployment.
        let start = status.deploymentInfo.startdate.clone();
        let dailyInstalls = [];
        let span = status.deploymentInfo.enddate.diff(start, 'days');
        if (span > 90) {
            progressConfig.options.scales.xAxes[0].time.stepSize = 2;
        } else {
            if (progressConfig.options.scales.xAxes[0].time.stepSize !== undefined)
                delete progressConfig.options.scales.xAxes[0].time.stepSize;
        }
        let tbsInstalled = [];
        status.communities.forEach(community => {
            if (community.tbsInstalled) {
                let tbs = Object.keys(community.tbsInstalled).map(talkingbookid=>community.tbsInstalled[talkingbookid]);
                tbsInstalled = tbsInstalled.concat(tbs);
            }
            if (community.groups) {
                community.groups.forEach(group => {
                    let tbs = Object.keys(group.tbsInstalled).map(talkingbookid=>group.tbsInstalled[talkingbookid]);
                    tbsInstalled = tbsInstalled.concat(tbs)
                });
            }
        });
        tbsInstalled.forEach((oneTbInstallation, ix) => {
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

        // recompute basis
        basis = dailyInstalls.reduce((prev, cur)=>prev+cur, 0);

        // Turn the daily installs into daily % completion.
        let sum = 0;
        let hasgap = false;
        let prevpoint = {x:start.toDate().valueOf(), y:0};
        // let prevpoint = {x:earliest.toDate().valueOf(), y:0};
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
                    // datasets[dsix].data = ix ? [prevpoint] : [];
                    datasets[dsix].data = [prevpoint];
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
                // Make a circle at start, end, and days on their own.
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


    /**
     * Builds the per-community details of the installation.
     * @param communities
     *
     * Array of objects [ {affiliate: "LBG", communityname: "Didogi", component: "NOYED-GHANA", coordinates: "",
     *                      country: "Ghana", daystoinstall: 34, district: "Karaga", groupname: "", groups: [] (0),
     *                      languagecode: "dag", model: "HHR", numGroups: 0, num_HHs: 54, num_TBs: 14,
     *                      num_TBsInstalled: 14, numhouseholds: "54", numtbs: "14", partner: "UNICEF",
     *                      project: "UNICEF-2", recipientid: "b66ea8356142", region: "Northern", supportentity: "",
     *                      tbsInstalled: {
     *                           B-0011041A: {daystoinstall: 34, deployedtimestamp: Moment, tbcdid: "0006", tbid: "0006",
     *                                        username: "literacybridge\\Tb"},
     *                              . . . }
     *                     }, . . .
     *                   ]
     */
    function installationDetails(communities) {
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
                tbid: 'TB-Loader ID',
                num_TBTestsInstalled: '# Test Installs'
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
                tbid: 'TB-Loader ID of the laptop/phone that performed the update of the Talking Books.',
                num_TBTestsInstalled: 'Number of installations to this community / group for which the installer checked ' +
                    '"Only testing the deployment"'
            },
            formatters: {
                detailsControl: row=>' ',
                groupname: row=>{return row&&(row.groupname||('SE:'+row.supportentity))},
                num_HHs: row=>Utils.formatNumber(row.num_HHs),
                num_TBs: row=>Utils.formatNumber(row.num_TBs),
                num_TBsInstalled: row=>Utils.formatNumber(row.num_TBsInstalled, 0),
                percentinstalled: row=>row.num_TBs?Math.round(row.num_TBsInstalled/row.num_TBs*100, 0):'no basis',
                model: row=>row.model==='Group Rotation'?'Group':row.model,
                num_TBTestsInstalled: (row, row_ix, cell)=>Utils.formatNumber(cell)
            },
            datatable: {/*colReorder:{fixedColumnsLeft:1},*/ columnDefs:[{orderable: false, targets: 0}]}
        };

        if (includeTestInstalls) {
            options.columns.push('num_TBTestsInstalled');
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
                if (includeTestInstalls) {
                    member_columns.push('num_TBTestsInstalled');
                }
                // Support entity, model, languagecode: don't repeat what's at the community level, unless it's different.
                let member_formatters = {
                    spacer: row=>' ',
                    groupname: row=>{return row&&(row.groupname||('SE:'+row.supportentity))},
                    num_HHs: options.formatters.num_HHs,
                    num_TBs: options.formatters.num_TBs,
                    num_TBsInstalled: options.formatters.num_TBsInstalled,
                    percentinstalled: options.formatters.percentinstalled,
                    daystoinstall: row=>Utils.formatNumber(row.daystoinstall, ''),
                    supportentity: row=>(row.supportentity!==rowData.supportentity)?row.supportentity:'',
                    model: row=>(row.model!==rowData.model)?options.formatters.model(row):'',
                    languagecode: row=>(row.languagecode!==rowData.languagecode)?row.languagecode:'',
                    num_TBTestsInstalled: row=>Utils.formatNumber(row.num_TBTestsInstalled)
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

    function extraneousRecipientDetails(status) {
        if (status.extraneousRecipients.length === 0) {
            $('#installation-progress-extraneous').hide();
            $('#installation-progress-extraneous-detail').hide();
            return;
        }

        let numExtraneousDeployments = status.extraneousRecipients
            .reduce( (accum, recip) => {
                return accum + Object.keys(recip.tbsInstalled).length
            }, 0);
        $('#installation-progress-extraneous-deployments').text(numExtraneousDeployments);
        $('#installation-progress-extraneous-recipients').text(status.extraneousRecipients.length);
        $('#installation-progress-extraneous').show();
        $('#installation-progress-extraneous-detail').show();

        let options = {
            columns: ['communityname', 'num_TBsInstalled', 'daystoinstall', 'supportentity', 'installer', 'tbid'],
            headings: {
                communityname: 'Community / Group<',
                num_TBsInstalled: '# Installed',
                daystoinstall: 'Days To Install',
                supportentity: 'Support Entity',
                installer: 'Updated By',
                tbid: 'TB-Loader ID',
                num_TBTestsInstalled: '# Test Installs'
            },
            headingClasses: {
                detailsControl: 'sorting-disabled'
            },
            tooltips: {
                num_TBsInstalled: 'The number of Talking Books reported to have been installed.',
                daystoinstall: 'The average number of days before the Talking Books were installed with the Deployment.',
                installer: 'Who installed the content onto the Talking Books.',
                tbid: 'TB-Loader ID of the laptop/phone that performed the update of the Talking Books.',
                num_TBTestsInstalled: 'Number of installations to this community / group for which the installer checked ' +
                    '"Only testing the deployment"'
            },
            formatters: {
                num_TBsInstalled: row=>Utils.formatNumber(row.num_TBsInstalled, 0),
                num_TBTestsInstalled: (row, row_ix, cell)=>Utils.formatNumber(cell)
            },
            datatable: {/*colReorder:{fixedColumnsLeft:1},*/ columnDefs:[{orderable: false, targets: 0}]}
        };

        if (includeTestInstalls) {
            options.columns.push('num_TBTestsInstalled');
        }

        // Add an installer field, from the individual talking book 'username' fields.
        status.extraneousRecipients.forEach(addInstallerInfo);

        let table = DataTable.create($('#installation-progress-extraneous-table'), status.extraneousRecipients, options);
    }

    let includeTestInstalls = false;

    function reportProgram(program, deployment) {
        Main.incrementWait();

        $('#include-test-installs', $PAGE).prop('disabled', true);
        let options = {
            includeTestInstalls: includeTestInstalls
        }
        InstallationData.getInstallationStatusForDeployment(program, deployment, options).done((status)=>{
            // tbsDeployed: [ {talkingbookid,deployedtimestamp,program,deployment,contentpackage,community,firmware,location,coordinates,username,tbcdid,action,newsn,testing} ]
            // recipients: [ {affiliate,partner,program,country,region,district,community,group_name,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,languagecode} ]
            // community: [ {affiliate,partner,program,country,region,district,community,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,languagecode,
            //      num_TBsInstalled, numGroups,
            //      groups: [ {num_TBsInstalled, affiliate,partner,program,country,region,district,community,group_name,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,languagecode} ] }
            // status: { communities: [ community ], tbsInstalled: [ tbsDeployed ] }

            if (status.summary.num_TBsInstalled) {
                $('#installation-progress-page .have_data').removeClass('hidden');
                $('#installation-progress-page .have_no_data').addClass('hidden');

                installationDetails(status.communities);
                installationSummary(status);
                extraneousRecipientDetails(status);
                $('#include-test-installs', $PAGE).prop('disabled', false);

                previousProgram = program;
                previousDeployment = deployment;
                persistState();

            } else {
                $('#installation-progress-page .have_no_data').removeClass('hidden');
                $('#installation-progress-page .have_data').addClass('hidden');
            }
            Main.decrementWait();
        }).fail((err)=>{
            $('#installation-progress-page .have_no_data').removeClass('hidden');
            $('#installation-progress-page .have_data').addClass('hidden');
            Main.decrementWait();
        });

    }

    function refreshProject() {
        reportProgram(previousProgram, previousDeployment);
    }

    function persistState() {
        if (previousProgram && previousDeployment) {
            localStorage.setItem('installation.project', previousProgram);
            localStorage.setItem('installation.deployment', previousDeployment);
            Main.setParams(PAGE_ID, {p: previousProgram, d: previousDeployment, t: includeTestInstalls});
        }
    }
    function restoreState() {
        let params = Main.getParams();
        if (params) {
            previousProgram = params.get('p') || '';
            previousDeployment = params.get('d') || '';
            let valStr = params.get('t');
            let val = false;
            try { val = JSON.parse(valStr); } catch(x) {}
            includeTestInstalls = val;
            $('#include-test-installs', $PAGE).prop('checked', includeTestInstalls);
        } else {
            previousProgram = localStorage.getItem('installation.project') || '';
            previousDeployment = localStorage.getItem('installation.deployment') || '';
        }
    }

    var initialized = false;
    function show() {
        if (!initialized) {
            buildLegend();
            initialized = true;
            restoreState();
            fillProjects();
        } else {
            persistState();
        }
    }

    $('#include-test-installs-row', $PAGE).tooltip();
    $('#include-test-installs', $PAGE).prop('disabled', true).on('click', () => {
        includeTestInstalls = $('#include-test-installs', $PAGE).prop('checked');
        refreshProject();
    });

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show)

    return {}
})();
