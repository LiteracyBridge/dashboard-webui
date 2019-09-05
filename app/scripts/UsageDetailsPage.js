/* jshint esversion:6, asi:true */
/* global
$,
BootstrapDialog,
Chart,
CognitoWrapper,
DataTable,
DataTable,
DropdownButton,
Main,
ProjectDetailsData,
ProjectPicker,
Sortable,
StatisticsData,
User,
Utils,
console,
*/

var UsageDetailsPage = UsageDetailsPage || {};

UsageDetailsPage = function () {
    'use strict';
    let PAGE_ID = 'usage-details-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    let queryEditHtml = `<div class="query-builder form-inline" id="builder-basic">
            <div class="rules-group-container rules-group-header">
                <div class="btn-group pull-right group-actions">
                    <button class="btn btn-xs btn-success" data-add="group" id="add-column" type="button"><i
                            class="glyphicon glyphicon-plus-sign"></i> Add Column
                    </button>
                </div>
                <div class="btn-group group-conditions"><label class="btn btn-xs btn-primary active disabled"> <input
                        disabled="" name="builder-basic_group_0_cond" type="radio" value="AND"> SELECT </label>
                    <!--<div class="error-container" data-toggle="tooltip"><i
                            class="glyphicon glyphicon-warning-sign"></i>
                    </div>-->
                </div>
                <div class="rules-list" id="columns-list">
                </div>
            </div>
 
            <!-- div>
                <p> SELECT DISTINCT <span id="query-display-query"></span> FROM usage-info;</p>
                <p> Strings: <span id="query-display-strings"></span></p>
                <p> Toolips: <span id="query-display-tooltips"></span></p>
            </div -->

        </div>`;

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
    let customQueryBase = ['completions,sum', 'played_seconds,sum'];


    let $limitByDeployment = $('#limit-by-deployment');

    var currentProject, currentDeployment, currentQuerySpecs;

    var fillDone = false;

    // The pull-down selector for queries.
    let querySelecter;

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
        try {
            let queryItems = (queryString || '').split(';');
            currentQuerySpecs = $('#usage-query-selection').usageQueryBuilder('parse', queryItems);

            restoreQuerySelection();
        }
        catch (e) {
            // Ignored.
        }
    }

    function restoreQuerySelection() {
        function equalQueries(q1, q2) {
            if (q1.length !== q2.length) {return false;}
            return q1.every((q,ix)=>{
                return q.toString()===q2[ix].toString();
            });
        }
        let $selection = $('#usage-query-selection');
        let preDefined = queries.some((q,ix)=>{
            // Convert string-form query specs to object form.
            let testQuerySpecs = $selection.usageQueryBuilder('parse', q.querySpecs);
            if (equalQueries(currentQuerySpecs, testQuerySpecs)) {
                querySelecter.setSelection({value:ix});
                return true; // stops looking
            }
        });
        if (!preDefined && currentQuerySpecs && currentQuerySpecs.length) {
            querySelecter.setSelection({value:-1});
        }
    }

    /**
     * Pops open a dialog to let the user customize the query. If they click 'OK', run the query.
     */
    function customizeQuery(initialQuerySpecs) {
        function runQuery() {
            let querySpecs = $columns.usageQueryBuilder('query');
            querySelecter.setSelection({value:-1});
            refreshProject(currentProject, currentDeployment, querySpecs);
        }
        function onQueryChanged() {
            // let querySpecs = $columns.usageQueryBuilder('query');
            // let query = querySpecs.map(x=>x.query).join(', ');
            // let strings = querySpecs.map(x=>x.toString()).join(';');
            // let tooltips = querySpecs.map(x=>x.tooltip).join(', ');
            // $query.text(query);
            // $strings.text(strings);
            // $tooltips.text(tooltips)
        }
        let $dialog = $(queryEditHtml);

        let $columns = $('#columns-list', $dialog);
        $columns.on('changed', onQueryChanged);

        let $add = $('#add-column', $dialog).on('click', ()=>{
            $columns.usageQueryBuilder('append');
        });
        let $query = $('#query-display-query', $dialog);
        let $strings = $('#query-display-strings', $dialog);
        let $tooltips = $('#query-display-tooltips', $dialog);

        let dndOptions = {
            group: 'dnd-query-builder',
            ghostClass: 'drag-filler-marker',
            animation: 250
        };
        let listSorter = new Sortable($columns[0], $.extend({}, dndOptions, {
            group: {name: 'dropdown-queries'}, sort: true, onChange: onQueryChanged}
        ));

        // Initialize the query to be edited from the most recent query.
        $columns.usageQueryBuilder('query', initialQuerySpecs);

        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
        });

        var options = {
            title: 'Edit Query',
            message: $dialog,
            closable: false,
            draggable: true,
            buttons: [
                {
                    label: 'Cancel', action: () => dialog.close()},
                {
                    label: 'OK',
                    cssClass: 'btn-primary',
                    action: () => {
                       runQuery();
                        dialog.close();
                    }
                }
            ],
            size: BootstrapDialog.SIZE_WIDE,
            onshown: function () {
                $dialog.find('input[autofocus]').focus();
            }
        };
        let dialog = BootstrapDialog.show(options);
    }

    function initializeQueries() {
        function runQuery(qIx) {
            if (qIx >= 0) {
                let q = queries[qIx];
                let querySpecs = $select.usageQueryBuilder('parse', q.querySpecs);
                refreshProject(currentProject, currentDeployment, querySpecs);
            }
        }
        let $select = $('#usage-query-selection');
        querySelecter = DropdownButton.create($select, {title:'Choose report', style:'btn-success'});

        let queryChoices = [];
        queries.forEach((q,ix)=>queryChoices.push({value:ix, label: queries[ix].title}));
        queryChoices.push({separator:true});
        queryChoices.push({value:-1, label:'Custom Report'});
        querySelecter.update(queryChoices);

        // Attach listeners.

        // Selected query was changed.
        $select.on('selected', () => {
            let qIx = querySelecter.selection();
            if (qIx >= 0) {
                runQuery(qIx);
            } else if (qIx === -1) {
                customizeQuery(customQueryBase);
            }
        });

        // Refresh button clicked.
        $('#usage-execute-query').on('click', ()=>{
            let qIx = querySelecter.selection();
            if (qIx >= 0) {
                runQuery(qIx);
            }
        });

        // Customize button clicked.
        $('#usage-customize-query').on('click', ()=>{
            customizeQuery(currentQuerySpecs || customQueryBase);
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
        let columns = [];
        if (usageData && usageData[0]) {
            let dataNames = Object.keys(usageData[0]);
            columns = querySpecs.map((qs, ix) => {
                let name = qs.heading;
                var tip = qs.tooltip;
                tip = tip ? '<img class="question no-click" src="images/question16.png" title="' + tip + '"/>' : '';
                var titleText = `<div><span>${name}</span>${tip}</div>`;
                let col = {data: dataNames[ix], title: titleText};
                if (qs.columnDef.render) { col.render = qs.columnDef.render}
                return col
            });
        }
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

        let $buttons = table2.buttons().container();
        let $input = $('<label><input type="text" style="height:100%;" class="form-control" placeholder="Filename" aria-controls="DataTables_Table_1"></label>');
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
        if (!project || !querySpecs || !querySpecs.length) {return;}
        let columns = querySpecs.map(qs=>qs.query);

        currentProject = project;
        currentDeployment = deployment;
        currentQuerySpecs = querySpecs;

        Main.incrementWait(true);
        getUsage(project, deployment, columns).then((stats) => {
            let haveData = stats.data !== undefined;
            if (haveData) {
                $('#usage-details-page .have_data').removeClass('hidden');
                $('#usage-details-page .have_no_data').addClass('hidden');

                makeUsageTable(querySpecs, stats);

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
        $limitByDeployment.prop('checked', true)
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

            $limitByDeployment.change( ()=>{
                if (currentProject && currentDeployment && currentQuerySpecs) {
                    refreshProject(currentProject, currentDeployment, currentQuerySpecs);
                }
            });

        } else {
            persistState();
        }
    }

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show);

    return {}
}();
