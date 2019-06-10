/* jshint esversion:6, asi:true */
/* global $, DataTable, StatisticsData, User, CognitoWrapper,console, Main, ProjectDetailsData, DataTable, Chart, ProjectPicker, Utils */

var UsageDetailsPage = UsageDetailsPage || {};

UsageDetailsPage = function () {
    'use strict';
    let PAGE_ID = 'usage-details-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    let $limitByDeployment = $('#limit-by-deployment')

    var previousProject, previousDeployment, previousColumns;

    var fillDone = false;

    function fillProjects() {
        if (fillDone) {
            return;
        }
        fillDone = true;
        var preSelectDeployment = previousDeployment;
        let list = Main.getProjectList();

        function getDeploymentsForProject(proj) {
            var promise = $.Deferred();
            ProjectDetailsData.getDeploymentsList(proj)
                .done((deploymentsList) => {
                    // deploymentsList is array [{deployment:'name;name2', deploymentnumber:number, ...}, ...]
                    deploymentsList = deploymentsList.map((elem) => {
                        return {
                            value: elem.deploymentnumber,
                            label: `#${elem.deploymentnumber}: ${Utils.formatDate(elem.startdate)} - ${Utils.formatDate(elem.enddate, 'TBD')}`,
                            // I prefer the previous line, but some might prefer this.
                            //label: `#${elem.deploymentnumber}: ${elem.deployment}`,
                            //tooltip: elem.deployment
                        };
                    });
                    var penultimate = deploymentsList[Math.max(0, deploymentsList.length - 2)];
                    deploymentsList.selected = preSelectDeployment || penultimate && penultimate.value;
                    preSelectDeployment = null;
                    promise.resolve(deploymentsList);
                });
            return promise;
        }

        var options = {
            projects: list,
            defaultProject: previousProject,
            getDeploymentsForProject: getDeploymentsForProject
        };

        $('#usage-details-project-placeholder').on('selected', (evt, extra) => {
            var project = extra.project;
            var deployment = extra.deployment;
            if (project && deployment) {
                reportProject(project, deployment);
            }
        });
        ProjectPicker.add('#usage-details-project-placeholder', options);
    }


    function clearState() {
        localStorage.removeItem('usage.details.project')
        localStorage.removeItem('usage.details.deployment')
    }

    function persistState() {
        if (previousProject && previousDeployment) {
            let previousColumns = selectedColumnsToMask()
            let limitDeployments = $limitByDeployment.prop('checked')
            localStorage.setItem('usage.details.project', previousProject);
            localStorage.setItem('usage.details.deployment', previousDeployment);
            localStorage.setItem('usage.details.columns', previousColumns)
            localStorage.setItem('usage.details.limitDeployments', limitDeployments)
            Main.setParams(PAGE_ID, {p: previousProject, d: previousDeployment, c: previousColumns, l: limitDeployments?'t':'f'});
        }
    }

    function restoreState() {
        var previousColumns, limitDeployments
        let params = Main.getParams();
        if (params) {
            previousProject = params.get('p') || '';
            previousDeployment = params.get('d') || '';
            previousColumns = params.get('c')
            limitDeployments = params.get('l')
        } else {
            previousProject = localStorage.getItem('usage.details.project') || '';
            previousDeployment = localStorage.getItem('usage.details.deployment') || '';
            previousColumns = localStorage.getItem('usage.details.deployment')
            limitDeployments = localStorage.getItem('usage.details.limitDeployments')
        }
        if (previousColumns !== undefined) {
            maskToSelectedColumns(previousColumns)
        } else {
            selectDefaultColumns()
        }
        // if not some variant on 'f', turn on the limiter.
        limitDeployments = !(limitDeployments||'t').toLowerCase().startsWith('f')
        $limitByDeployment.prop('checked', limitDeployments)

        if (previousProject && previousDeployment || !limitDeployments) {
            refreshProject(previousProject, previousDeployment)
        }
    }


    var columnSpecs = {
        deploymentnumber: {
            heading: 'Depl #',
            selection: 'default'
        },
        deployment: {
            heading: 'Deployment'
        },
        startdate: {
            heading: 'Deployment Start',
            tooltip: 'The date on which the Deployment was scheduled to start.',
            selection: 'default'
        },

        contentpackage: {
            heading: 'Content Package'
        },
        languagecode: {
            heading: 'Language Code',
            tooltip: 'ISO 639-3 code for the language.'
        },
        language: {
            heading: 'Language',
            tooltip: 'Name of the language. Note that a language can have many names.'
        },

        country: {
            heading: 'Country'
        },
        region: {
            heading: 'Region',
            tooltip: 'Geo-Political organization unit smaller than a Country, but larger than a District.'
        },
        district: {
            heading: 'District',
            tooltip: 'Geo-Political organization unit larger than a community, but smaller than a Region.'
        },
        communityname: {
            heading: 'Community'
        },
        groupname: {
            heading: 'Group',
            tooltip: 'The name of a group or club within a Community. A group typically receives 1, 2, or 3 Talking Books.'
        },
        agent: {
            heading: 'Agent',
            tooltip: 'The name of the Community Agent, Health Worker or Volunteer, or other individual who receives the Talking Book.'
        },
        talkingbookid: {
            heading: 'TB SRN',
            tooltip: 'The unique identifier of an individual Talking Book'
        },
        category: {
            heading: 'Category',
            tooltip: 'In what category was the message published?'
        },
        contentid: {
            heading: 'Content Id',
            tooltip: 'The unique id of the message, in a particular language.'
        },
        title: {
            heading: 'Message',
            tooltip: 'The title of the message.',
            selection: 'default'
        },
        format: {
            heading: 'Format',
            tooltip: 'When known, the format of the message, such as drama, song, or interview.',
            selection: 'default'
        },
        duration_seconds: {
            heading: 'Duration',
            tooltip: 'Length of the message in seconds.',
            formatter: row => Utils.formatSeconds(row.duration_seconds),
            selection: 'default',
            render: function(data, type, row) {
                if (type==='display' || type==='filter') {
                    return Utils.formatSeconds(row.duration_seconds)
                }
                return data
            }
        },
        position: {
            heading: 'Position',
            tooltip: 'The position of the message within its playlist. Position \'1\' is the first message in the playlist.'
        },

        timestamp: {
            heading: 'Collection Time',
            tooltip: 'When were the statistics in this line collected?'
        },

        played_minutes: {
            heading: 'Minutes Played',
            tooltip: 'How many minutes, total, was the message played?',
            formatter: row => Utils.formatMinutes(row.played_minutes),
            selection: 'implicit',
            render: function ( data, type, row ) {
                // If display or filter data is requested, format as a nice time string
                if ( type === 'display' || type === 'filter' ) {
                    return Utils.formatMinutes(row.played_minutes)
                }

                // Otherwise the data type requested (`type`) is type detection or
                // sorting data, for which we want to use the integer, so just return
                // that, unaltered
                return data;
            }
        },
        completions: {
            heading: 'Completions',
            tooltip: 'How many times was the message played to completion?',
            selection: 'implicit'
        }
    }

    function buildColumnSelectors() {
        let $div = $('#usage-details-selection')
        Object.keys(columnSpecs).forEach(columnName => {
            let columnSpec = columnSpecs[columnName];
            if (columnSpec.selection === 'implicit') {
                return
            }
            let text = columnSpec.heading || columnName;
            let label = $(`<label class="column-selector"><input type="checkbox" class="${columnName}">${text} </label>`)
            $div.append(label)
            if (columnSpec.selection === 'default') {
                let $checkbox = $('.' + columnName, $div)
                $checkbox.prop('checked', true)
            }
        })
    }

    function selectDefaultColumns() {
        let $div = $('#usage-details-selection')
        Object.keys(columnSpecs).forEach(columnName => {
            let columnSpec = columnSpecs[columnName];
            let $checkbox = $('.' + columnName, $div)
            $checkbox.prop('checked', columnSpec.selection === 'default')
        })
        $limitByDeployment.prop('checked', true)
    }

    function getSelectedColumns() {
        let result = []
        let $div = $('#usage-details-selection')
        Object.keys(columnSpecs).forEach(columnName => {
            let columnSpec = columnSpecs[columnName];
            let $checkbox = $('.' + columnName, $div)
            if ($checkbox.prop('checked')) {result.push(columnName)}
        })
        return result
    }

    function selectedColumnsToMask() {
        let $div = $('#usage-details-selection')
        let columnNames = Object.keys(columnSpecs)
        let selectedIndices = []
        for (let ix = 0; ix < columnNames.length; ix++) {
            if ($('.' + columnNames[ix], $div).prop('checked')) {
                selectedIndices.push(ix)
            }
        }

        var bits = ''
        Object.keys(columnSpecs).forEach(columnName => {
            let columnSpec = columnSpecs[columnName];
            let $checkbox = $('.' + columnName, $div)
            bits += ($checkbox.prop('checked')) ? '1' : '0'
        })
        while (bits.length % 4 !== 0) {
            bits += '0'
        }
        let numeric = Number.parseInt(bits, 2)
        return numeric.toString(16)
    }

    function maskToSelectedColumns(hex) {
        let $div = $('#usage-details-selection')
        let numeric = Number.parseInt(hex, 16)
        let bits = numeric.toString(2)
        let bitarray = bits.split('')

        let restoredIndices = []
        for (let ix = 0; ix < bitarray.length; ix++) {
            if (bitarray[ix] === '1') {
                restoredIndices.push(ix)
            }
        }
        Object.keys(columnSpecs).forEach(columnName => {
            let columnSpec = columnSpecs[columnName];
            let $checkbox = $('.' + columnName, $div)
            $checkbox.prop('checked', bitarray.shift() === '1')
        })
    }

    /**
     * Build an array of column descriptors for the DataTable
     * @param usageData An array of usage options. The first object is examined, and its members used to
     * configure the column descriptors
     * @returns [{data: string, title: string}, ...]
     */
    function columnOptions(usageData) {
        // Examine the first object. For every member, look at columnSpecs to see what we know about it.
        let columns = Object.keys(usageData[0]).map(key => {
            let name = columnSpecs[key].heading || key
            var tip = columnSpecs[key].tooltip
            tip = tip ? '<img class="question no-click" src="images/question16.png" title="' + tip + '"/>' : ''
            var titleText = `<div><span>${name}</span>${tip}</div>`
            let col = { data: key, title: titleText }
            if (columnSpecs[key].render) { col.render = columnSpecs[key].render}
            return col
        })
        return columns
    }

    /**
     * Builds a table with details about the messages in the deployment.
     * @param stats An object with a {messageData} member.
     */
    function makeUsageTable(stats) {
        let usageData = stats.data || [];
        let columns = columnOptions(usageData)

        var buttonMap = [] // will be computed just before export
        let filename = 'DashboardCustom'
        let exportOptions = {
            format: {
                body: function (data, row, column, node) {
                    let originalData = usageData[row][buttonMap[column]]
                    return originalData
                }
            }
        }

        let excelButton = {   extend: 'excelHtml5',
            'action': function (e, dt, button, config) {
                // Cache the button order map before  starting the export.
                buttonMap = table2.colReorder.order().map(ix=>columns[ix].data)
                // Call the original action function
                $.fn.dataTable.ext.buttons.excelHtml5.action.call(this, e, dt, button, config);
            },
            exportOptions: exportOptions,
            text: 'Export to spreadsheet',
            filename: () => {
                return $('input', $input).val() || 'Usage-Statistics'
            }
        }
        let copyButton = {   extend: 'copyHtml5',
            'action': function (e, dt, button, config) {
                // Cache the button order map before  starting the export.
                buttonMap = table2.colReorder.order().map(ix=>columns[ix].data)
                // Call the original action function
                $.fn.dataTable.ext.buttons.copyHtml5.action.call(this, e, dt, button, config);
            },
            exportOptions: exportOptions
        }
        let csvButton = {   extend: 'csvHtml5',
            'action': function (e, dt, button, config) {
                // Cache the button order map before  starting the export.
                buttonMap = table2.colReorder.order().map(ix=>columns[ix].data)
                // Call the original action function
                $.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, button, config);
            },
            exportOptions: exportOptions,
            filename: () => {
                return $('input', $input).val() || 'Usage-Statistics'
            }
        }
        let buttons = [excelButton]

        let tableOptions = {
            colReorder: true,
            searching: true,
            deferRender: true,
            paging: true,
            lengthMenu: [[100, 500, -1], [100, 500, 'All']],
            buttons: buttons,
            data: usageData,
            columns: columns
        }

        // Make a fresh container to contain the table.
        let $container = $('#usage-table')
        $container.empty();
        let classes = 'table table-condensed table-bordered'+(usageData.length?' table-striped':'');
        $container.html('<table class="' + classes + '">');

        // And make the table.
        let table2 = $('table', $container).DataTable(tableOptions)
        // Attach the buttons to the UI.
        let $input = $('<label><input style="height:100%;" class="form-control input-sm" placeholder="Filename" aria-controls="DataTables_Table_1"></label>')
        let $buttons = table2.buttons().container()
        $buttons.append($input)
        $buttons.appendTo($('.col-sm-6:eq(0)', table2.table().container()));
        // Make the tooltips active, and suppress clicks on the images.
        $('.no-click', $container).tooltip()
        $('.no-click', $container).on('click', () => {
            return false
        })

    }



    function getUsage(project, deployment, columns) {
        // Limit to the specified deployment?
        if (deployment && deployment>0 && $limitByDeployment.prop('checked')) {
            $('#limit-by-deployment-prompt').text(` (Deployment ${deployment})`)
        } else {
            deployment = undefined
            $('#limit-by-deployment-prompt').text('')
        }

        if (!columns || columns.length === 0) {
            columns = getSelectedColumns()
        }

        var deferred = $.Deferred();
        StatisticsData.getUsage(project, deployment, columns)
            .done(result => {
                if (result.errorMessage) {
                    deferred.reject(result.errorMessage);
                } else {
                    let data = result.data
                    let resolution = {data: data, columns: columns}
                    deferred.resolve(resolution);
                }
            })
            .fail(deferred.reject)

        return deferred.promise()
    }

    function get2() {
        let url = 'https://y06knefb5j.execute-api.us-west-2.amazonaws.com/Devo'
        var deferred = $.Deferred();

        var user = User.getUserAttributes();
        var payload = {
            username: user.username,
            email: user.email
        };
        var request = {
            url: url + '/projects',
            type: 'get',
            // dataType: 'json',
            // data: payload,
            headers: {
                Authorization: CognitoWrapper.getIdToken(),
                'Accept': 'application/json'
            }
        }

        $.ajax(request)
            .done((result) => {
                console.log(result)
                if (result.errorMessage) {
                    deferred.reject(result.errorMessage);
                } else {
                    let projects = result.result.values
                    console.log(projects)
                    // latestData = result.result;
                    // usageStats = $.csv.toObjects(latestData, {separator: ',', delimiter: '"'});
                    // latestTimestamp = Date.now();
                    deferred.resolve(result);
                }
            })
            .fail((err) => {
                console.log(err)
                deferred.reject(err)
            });

        return deferred.promise()
    }

    function refreshProject(project, deployment, columns) {
        previousProject = project;
        previousDeployment = deployment;
        previousColumns = columns;
        Main.incrementWait();
        getUsage(project, deployment, columns).then((stats) => {
            let haveData = stats.data !== undefined;
            if (haveData) {
                $('#usage-details-page .have_data').removeClass('hidden');
                $('#usage-details-page .have_no_data').addClass('hidden');

                makeUsageTable(stats);

                persistState();

            } else {
                $('#usage-details-page .have_no_data').removeClass('hidden');
                $('#usage-details-page .have_data').addClass('hidden');
            }
            Main.decrementWait();
        }).fail((err) => {
            Main.decrementWait();
        });
    }

    function reportProject(project, deployment) {
        if (project!==previousProject) {
            $limitByDeployment.prop('checked', true)
        }
        refreshProject(project, deployment)
    }

    let initialized = false;

    function show() {
        if (!initialized) {
            initialized = true;
            let user = User.getUserAttributes()
            if (user && user.email && user.email.startsWith('bill@amplio')) {
                $('#usage-test-query').on('click', () => {
                    get2()
                })
            } else {
                $('#usage-test-query').hide()
            }

            buildColumnSelectors()
            restoreState()
            clearState()
            fillProjects()
        } else {
            persistState();
        }
    }

    $('#usage-refresh').on('click', () => {
        let columns = getSelectedColumns()
        refreshProject(previousProject, previousDeployment, columns)
    })

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show);

    return {}
}();
