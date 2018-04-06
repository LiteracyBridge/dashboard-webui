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

    function NUMBER_NOTZERO(number) {
        if (number === 0) {
            return '';
        }
        if (number === null || number === undefined || isNaN(number)) {
            return 'n/a';
        }
        return Number(Math.round(number)).toLocaleString();
    }

    function ratingForRecipient(recipient) {
        function score(numTbs, installed) {
            let pct = installed / numTbs;
            if (pct >= 0.98) {return 4}
            if (pct >= 0.85) {return 3}
            if (pct > 0.50) {return 2}
            return 1
        }
        let ownScore = score(recipient.num_TBs, recipient.num_TBsInstalled);
        let groupScores = (recipient.groups && recipient.groups.map(g=>score(g.num_TBs, g.num_TBsInstalled))) || [ownScore];
        let minScore = Math.min.apply(groupScores);
        // If any group had a score two points lower, lower community score.
        if (minScore && minScore <= ownScore-2) {ownScore--}

        switch (ownScore) {
            case 4: return 'perfect';
            case 3: return 'acceptable';
            case 2: return 'needs-improvement';
            default: return 'unacceptable';
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


    function installationDetails(recipients, tbsDeployed) {
        // tbsDeployed: [ {talkingbookid,deployedtimestamp,project,deployment,contentpackage,community,firmware,location,coordinates,username,tbcdid,action,newsn,testing} ]
        // aggregatedRecipients: [ {affiliate,partner,program,country,region,district,community,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,language,
        //      [ groups: [ {affiliate,partner,program,country,region,district,community,group_name,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,language} ],
        //      numGroups
        //  ]

        let options = {
            columns: ['detailsControl', /*'program','region',*/'district', 'communityname', /*'group_name',*/
                'num_HHs', 'num_TBs', 'num_TBsInstalled', 'percentinstalled', 'daystoinstall',
                'supportentity', 'model', 'language'],
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
                model: 'Model'
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
                daystoinstall: 'The average number of days before the Talking Books were installed with the Deployment'
            },
            formatters: {
                detailsControl: row=>' ',
                num_HHs: row=>NUMBER_NOTZERO(row.num_HHs),
                num_TBs: row=>NUMBER_NOTZERO(row.num_TBs),
                percentinstalled: row=>row.num_TBs?Math.round(row.num_TBsInstalled/row.num_TBs*100, 0):'n/a',
                model: row=>row.model==='Group Rotation'?'Group':row.model
            },
            datatable: {/*colReorder:{fixedColumnsLeft:1},*/ columnDefs:[{orderable: false, targets: 0}]}
        };

        let table = DataTable.create($('#installation-progress-detail'), recipients, options);
        // This says sort by community, then by model (not the other way around, as one is likely to read it).
        table.order([[options.columns.indexOf('model'),'desc'],[options.columns.indexOf('communityname'),'asc']]).draw();

        /* Formatting function for row details - modify as you need */
        function format ( rowData ) {
            let child = [];
            // 'rowData' is the original data object for the row
            // child.push('<table cellpadding="5" cellspacing="0" border="0" style="padding-left:50px;" class="deployment-progress-detail">'+
            //     '<tr>'+'<td>Support Entity:</td>'+'<td>'+rowData.supportentity+'</td>'+'</tr>'+
            //     '<tr>'+'<td>Model:</td>'+'<td>'+rowData.model+'</td>'+ '</tr>'+
            //     '<tr>'+'<td># Groups:</td>'+'<td>'+(rowData.numGroups||'n/a')+'</td>'+'</tr>'+
            //     '</table>');

            // If there are groups in the community, add a row for each.
            if (rowData.groups) {
                // Columns for a group, with spacers, so it lines up with the main table.
                let rowColumns = ['none', 'none', 'groupname', 'num_HHs', 'num_TBs', 'num_TBsInstalled', 'percentinstalled', 'daystoinstall', 'supportentity', 'none', 'none'];
                let formatters = {
                    none: row=>' ',
                    num_HHs: row=>NUMBER_NOTZERO(row.num_HHs),
                    num_TBs: row=>NUMBER_NOTZERO(row.num_TBs),
                    percentinstalled: row=>Math.round(row.num_TBsInstalled/row.num_TBs*100, 0),
                    supportentity: row=>(row.supportentity!==rowData.supportentity)?row.supportentity:''
                };
                let classes = options.columnClasses;
                // Iterate over the groups.
                rowData.groups.forEach((g)=>{
                    var $tr = $('<tr class="deployment-progress-detail">');
                    // Add the <td> for every column.
                    rowColumns.forEach((c)=>{
                        let v= formatters[c] ? formatters[c](g) : g[c];
                        let cl = classes[c] ? classes[c](g) : '';
                        var $td = $('<td>'+v+'</td>');
                        if (cl) { $td.addClass(cl) }
                        $tr.append($td)
                    });
                    child.push($tr);
                });
            }

            return child;
        }

        // Add event listener for opening and closing details
        $('#installation-progress-detail tbody').on('click', 'td.details-control', function () {
            var tr = $(this).closest('tr');
            var rowData = recipients[$(tr).data('row-index')];
            var row = table.row( tr );

            if ( row.child.isShown() ) {
                // This row is already open - close it
                row.child.hide();
                tr.removeClass('shown');
            }
            else {
                // Open this row
                row.child( format(rowData) ).show();
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
            // recipients: [ {affiliate,partner,program,country,region,district,community,group_name,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,language} ]
            // community: [ {affiliate,partner,program,country,region,district,community,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,language,
            //      num_TBsInstalled, numGroups,
            //      groups: [ {num_TBsInstalled, affiliate,partner,program,country,region,district,community,group_name,directory_name,num_HHs,num_TBs,TB_ID,supportentity,model,language} ] }
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
