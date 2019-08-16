/* jshint esversion:6, asi:true */
/* global $, DataTable, StatisticsData, User, CognitoWrapper,console, Main, ProjectDetailsData, DataTable, Chart, DropdownButton, ProjectPicker, Utils */

var UsageDetailsPage = UsageDetailsPage || {};

UsageDetailsPage = function () {
    'use strict';
    let PAGE_ID = 'usage-details-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    let queries = [{
        title: 'Usage by Playlist Category',
        querySpecs: ['deploymentnumber', 'category', 'completions,sum', 'played_seconds,sum']
    }, {
        title: 'Usage by District', querySpecs: ['deploymentnumber', 'district', 'completions,sum', 'played_seconds,sum']
    }, {
        title: 'Usage by Message', querySpecs: ['deploymentnumber', 'title', 'completions,sum', 'played_seconds,sum']
    }, {
        title: 'Usage by Message in District',
        querySpecs: ['deploymentnumber', 'district', 'title', 'completions,sum', 'played_seconds,sum']
    }, {
        title: 'Usage by Language in District',
        querySpecs: ['deploymentnumber', 'district', 'language', 'completions,sum', 'played_seconds,sum']
    }, {
        title: 'Usage by Playlist Category in District',
        querySpecs: ['deploymentnumber', 'district', 'category', 'completions,sum', 'played_seconds,sum']
    }];


    let $limitByDeployment = $('#limit-by-deployment');

    var currentProject, currentDeployment, currentQuerySpecs;

    var fillDone = false;

    // The pull-down selector for queries.
    let querySelect;

    function fillProjects() {
        if (fillDone) {
            return;
        }
        fillDone = true;
        var preSelectDeployment = currentDeployment;
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
            defaultProject: currentProject,
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
        localStorage.removeItem('usage.details.project');
        localStorage.removeItem('usage.details.deployment');
        localStorage.removeItem('usage.details.columns');
        localStorage.removeItem('usage.details.query');
        localStorage.removeItem('usage.details.limitDeployments');
    }

    function persistState() {
        if (currentProject && currentDeployment) {
            let previousColumns = '';
            let limitDeployments = $limitByDeployment.prop('checked');
            let queryString = currentQuerySpecs.map(qs=>qs.toString()).join(';');
            localStorage.setItem('usage.details.project', currentProject);
            localStorage.setItem('usage.details.deployment', currentDeployment);
            localStorage.setItem('usage.details.query', queryString);
            localStorage.setItem('usage.details.limitDeployments', limitDeployments);
            Main.setParams(PAGE_ID, {p: currentProject, d: currentDeployment, q: queryString, l: limitDeployments?'t':'f'});
        }
    }

    function restoreState() {
        var previousColumns, limitDeployments;
        let params = Main.getParams();
        let queryString = '';
        if (params) {
            currentProject = params.get('p') || '';
            currentDeployment = params.get('d') || '';
            queryString = params.get('q');
            limitDeployments = params.get('l')
        } else {
            currentProject = localStorage.getItem('usage.details.project') || '';
            currentDeployment = localStorage.getItem('usage.details.deployment') || '';
            queryString = localStorage.getItem('usage.details.deployment');
            limitDeployments = localStorage.getItem('usage.details.limitDeployments')
        }
        let queryItems = (queryString || '').split(';');
        currentQuerySpecs = $('#usage-query-selection').usageQueryBuilder('parse', queryItems);

        restoreQuerySelection();
        // Do something with the restored state...
    }

    function restoreQuerySelection() {
        function equalQueries(q1, q2) {
            if (q1.length !== q2.length) {return false;}
            return q1.every((q,ix)=>{
                return q.toString()===q2[ix].toString();
            });
        }
        let $selection = $('#usage-query-selection');
        queries.some((q,ix)=>{
            // Convert string-form query specs to object form.
            let testQuerySpecs = $selection.usageQueryBuilder('parse', q.querySpecs);
            if (equalQueries(currentQuerySpecs, testQuerySpecs)) {
                querySelect.setSelection({value:ix});
                return true; // stops looking
            }
        });
    }

    function initializeQueries() {
        let $select = $('#usage-query-selection');
        querySelect = DropdownButton.create($select, {title:'Choose query', style:'btn-success'});

        let queryChoices = [];
        queries.forEach((q,ix)=>queryChoices.push({value:ix, label: queries[ix].title}));
        queryChoices.push({separator:true});
        queryChoices.push({value:-1, label:'Custom Query'});
        querySelect.update(queryChoices);

        // Attach listeners.

        // Selected query was changed.
        $select.on('selected', () => {
            let qIx = querySelect.selection();
            let q = qIx >= 0 ? queries[qIx] : 'no query';
            console.log(q)
        });

        // Refresh button clicked.
        $('#usage-execute-query').on('click', ()=>{
            let qIx = querySelect.selection();
            if (qIx >= 0) {
                let q = queries[qIx];
                let querySpecs = $select.usageQueryBuilder('parse', q.querySpecs);
                refreshProject(currentProject, currentDeployment, querySpecs);
            }
        });

        // Customize button clicked.
        $('#usage-customize-query').on('click', ()=>{
            CognitoWrapper.handleSessionExpiry();
        });

    }

    /**
     * Build an array of column descriptors for the DataTable
     * @param usageData An array of usage options. The first object is examined, and its members used to
     * configure the column descriptors
     * @returns [{data: string, title: string}, ...]
     */
    function columnOptions(querySpecs, usageData) {
        // Examine the first object. For every member, look at columnSpecs to see what we know about it.
        // let columns = Object.keys(usageData[0]).map(key => {
        //     let name = columnSpecs[key].heading || key
        //     var tip = columnSpecs[key].tooltip
        //     tip = tip ? '<img class="question no-click" src="images/question16.png" title="' + tip + '"/>' : ''
        //     var titleText = `<div><span>${name}</span>${tip}</div>`
        //     let col = { data: key, title: titleText }
        //     if (columnSpecs[key].render) { col.render = columnSpecs[key].render}
        //     return col
        // })
        let dataNames = Object.keys(usageData[0]);
        let columns = querySpecs.map((qs,ix)=>{
            let name = qs.columnDef.heading;
            var tip = qs.tooltip;
            tip = tip ? '<img class="question no-click" src="images/question16.png" title="' + tip + '"/>' : ''
            var titleText = `<div><span>${name}</span>${tip}</div>`
            let col = { data: dataNames[ix], title: titleText }
            if (qs.columnDef.render) { col.render = qs.columnDef.render}
            return col
        });
        return columns
    }


    /**
     * Builds a table with details about the messages in the deployment.
     * @param stats An object with a {messageData} member.
     */
    function makeUsageTable(querySpecs, stats) {
        let usageData = stats.data || [];
        let columns = columnOptions(querySpecs, usageData);

        var buttonMap = []; // will be computed just before export
        let filename = 'DashboardCustom';
        let exportOptions = {
            format: {
                body: function (data, row, column, node) {
                    let originalData = usageData[row][buttonMap[column]];
                    return originalData
                }
            }
        };

        let excelButton = {   extend: 'excelHtml5',
            'action': function (e, dt, button, config) {
                // Cache the button order map before  starting the export.
                buttonMap = table2.colReorder.order().map(ix=>columns[ix].data);
                // Call the original action function
                $.fn.dataTable.ext.buttons.excelHtml5.action.call(this, e, dt, button, config);
            },
            exportOptions: exportOptions,
            text: 'Export to spreadsheet',
            filename: () => {
                return $('input', $input).val() || 'Usage-Statistics'
            }
        };
        let copyButton = {   extend: 'copyHtml5',
            'action': function (e, dt, button, config) {
                // Cache the button order map before  starting the export.
                buttonMap = table2.colReorder.order().map(ix=>columns[ix].data);
                // Call the original action function
                $.fn.dataTable.ext.buttons.copyHtml5.action.call(this, e, dt, button, config);
            },
            exportOptions: exportOptions
        };
        let csvButton = {   extend: 'csvHtml5',
            'action': function (e, dt, button, config) {
                // Cache the button order map before  starting the export.
                buttonMap = table2.colReorder.order().map(ix=>columns[ix].data);
                // Call the original action function
                $.fn.dataTable.ext.buttons.csvHtml5.action.call(this, e, dt, button, config);
            },
            exportOptions: exportOptions,
            filename: () => {
                return $('input', $input).val() || 'Usage-Statistics'
            }
        };
        let buttons = [excelButton];

        let tableOptions = {
            colReorder: true,
            searching: true,
            deferRender: true,
            paging: true,
            lengthMenu: [[100, 500, -1], [100, 500, 'All']],
            buttons: buttons,
            data: usageData,
            columns: columns
        };

        // Make a fresh container to contain the table.
        let $container = $('#usage-table');
        $container.empty();
        let classes = 'table table-condensed table-bordered'+(usageData.length?' table-striped':'');
        $container.html('<table class="' + classes + '">');

        // And make the table.
        let table2 = $('table', $container).DataTable(tableOptions);
        // Attach the buttons to the UI.
        let $input = $('<label><input style="height:100%;" class="form-control input-sm" placeholder="Filename" aria-controls="DataTables_Table_1"></label>');
        let $buttons = table2.buttons().container();
        $buttons.append($input);
        $buttons.appendTo($('.col-sm-6:eq(0)', table2.table().container()));
        // Make the tooltips active, and suppress clicks on the images.
        $('.no-click', $container).tooltip();
        $('.no-click', $container).on('click', () => {
            return false
        })

    }



    function getUsage(project, deployment, columns) {
        // Limit to the specified deployment?
        if (deployment && deployment>0 && $limitByDeployment.prop('checked')) {
            $('#limit-by-deployment-prompt').text(` (Deployment ${deployment})`)
        } else {
            deployment = undefined;
            $('#limit-by-deployment-prompt').text('')
        }

        var deferred = $.Deferred();
        StatisticsData.getUsage(project, deployment, columns)
            .done(result => {
                if (result.errorMessage) {
                    deferred.reject(result.errorMessage);
                } else {
                    let data = result.data;
                    let resolution = {data: data, columns: columns};
                    deferred.resolve(resolution);
                }
            })
            .fail(deferred.reject);

        return deferred.promise()
    }

    function get2() {
        let url = 'https://y06knefb5j.execute-api.us-west-2.amazonaws.com/Devo';
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
        };

        $.ajax(request)
            .done((result) => {
                console.log(result);
                if (result.errorMessage) {
                    deferred.reject(result.errorMessage);
                } else {
                    let projects = result.result.values;
                    console.log(projects);
                    // latestData = result.result;
                    // usageStats = $.csv.toObjects(latestData, {separator: ',', delimiter: '"'});
                    // latestTimestamp = Date.now();
                    deferred.resolve(result);
                }
            })
            .fail((err) => {
                console.log(err);
                deferred.reject(err)
            });

        return deferred.promise()
    }

    function get3() {
        console.log('test fn')
    }

    function refreshProject(project, deployment, querySpecs) {
        if (!querySpecs || !querySpecs.length) {return;}
        let columns = querySpecs.map(qs=>qs.query);

        Main.incrementWait();
        getUsage(project, deployment, columns).then((stats) => {
            let haveData = stats.data !== undefined;
            if (haveData) {
                $('#usage-details-page .have_data').removeClass('hidden');
                $('#usage-details-page .have_no_data').addClass('hidden');

                makeUsageTable(querySpecs, stats);

                currentProject = project;
                currentDeployment = deployment;
                currentQuerySpecs = querySpecs;
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
        if (project!==currentProject) {
            $limitByDeployment.prop('checked', true)
        }
        if (!currentQuerySpecs || !currentQuerySpecs.length) {
            currentProject = project;
            currentDeployment = deployment;
            return;
        }
        refreshProject(project, deployment, currentQuerySpecs)
    }

    let initialized = false;

    function show() {
        if (!initialized) {
            initialized = true;
            let user = User.getUserAttributes();
            if (user && user.email && user.email.startsWith('bill@amplio')) {
                $('#usage-test-query').on('click', () => {
                    get3()
                })
            } else {
                $('#usage-test-query').hide()
            }

            initializeQueries();

            restoreState();
            clearState();
            fillProjects()
        } else {
            persistState();
        }
    }

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show);

    return {}
}();
