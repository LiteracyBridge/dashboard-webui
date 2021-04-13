/* jshint esversion:6, asi:true */
/* global $, Utils, console */

let UsageQueryBuilder = function () {
    'use strict';

    let columns = function columns() {

        function ColumnDef(defs) {
            let result = {name: defs.name};
            result.columnname = defs.columnname || result.name;
            result.type = defs.type || 'string';
            result.heading = defs.heading || result.name;
            // result.tooltip = defs.tooltip || result.heading;
            if (defs.hasOwnProperty('aggregation')) {
                if (defs.aggregation) {
                    result.aggregation = defs.aggregation;
                }
            } else {
                result.aggregation = 'count';
            }
            ['render', 'tooltip', 'aggregationDefault'].forEach(prop => {
                if (defs.hasOwnProperty(prop)) {
                    result[prop] = defs[prop]
                }
            });
            if (result.aggregation) {
                // Very English-centric: forming a plural by addng 's'.
                let lastCh = result.heading[result.heading.length-1];
                let base = defs.aggregateBase || (result.heading + (lastCh!=='s'?'s':''));
                result.aggregateBase = base;
                let tipAggr = {count:'Count',sum:'Sum'}[result.aggregation];
                let headAggr = {count:'#',sum:'Total'}[result.aggregation];
                result.aggregateTooltip = defs.aggregateTooltip || (tipAggr + ' of ' + base);
                result.aggregateHeading = defs.aggregateHeading || (headAggr + ' ' + base);
            }
            return result;
        }

        let columnDefsArray = [ColumnDef({
            name: 'deploymentnumber',
            heading: 'Deployment #',
            aggregateBase: 'Deployments',
        }), ColumnDef({
            name: 'deployment',
            heading: 'Deployment',
        }), ColumnDef({
            name: 'startdate',
            heading: 'Deployment Start',
            tooltip: 'The date on which the Deployment was scheduled to start.',
            type: 'date',
            aggregateBase: 'Start Dates',
        }), ColumnDef({
            name: 'contentpackage',
            heading: 'Content Package',
        }), ColumnDef({
            name: 'languagecode',
            heading: 'Language Code',
            tooltip: 'ISO 639-3 code for the language.',
            aggregateBase: 'ISO 639-3 Codes',
        }), ColumnDef({
            name: 'language',
            heading: 'Language',
            tooltip: 'Name of the language. Note that a language can have many names.',
        }), ColumnDef({
            name: 'country',
            heading: 'Country',
            aggregateBase: 'Countries',
        }), ColumnDef({
            name: 'region',
            heading: 'Region',
            tooltip: 'Geo-Political organization unit smaller than a Country, but larger than a District.',
        }), ColumnDef({
            name: 'district',
            heading: 'District',
            tooltip: 'Geo-Political organization unit larger than a community, but smaller than a Region.',
        }), ColumnDef({
            name: 'communityname',
            heading: 'Community',
            aggregateBase: 'Communities',
            aggregateTooltip: 'Count of communities (by name)',
        }), ColumnDef({
            name: 'groupname',
            heading: 'Group',
            tooltip: 'The name of a group or club within a Community. A group typically receives 1, 2, or 3 Talking Books.',
            aggregateTooltip: 'Count of groups (by name)',
        }), ColumnDef({
            name: 'agent',
            heading: 'Agent',
            tooltip: 'The name of the Community Agent, Health Worker or Volunteer, or other individual who receives the Talking Book.',
            aggregateTooltip: 'Count of agents (by name)',
        }), ColumnDef({
            name: 'talkingbookid',
            heading: 'TB',
            tooltip: 'The unique identifier of an individual Talking Book',
            aggregateBase: 'Talking Books',
        }), ColumnDef({
            name: 'deployment_uuid',
            heading: 'Deployment ID',
            tooltip: 'A unique ID associated with a single deployment to an individual Talking Book',
            aggregateBase: 'Deployment IDs',
        }), ColumnDef({
            name: 'category',
            heading: 'Category',
            tooltip: 'In what playlist category was the message published?',
            type: 'string',
            aggregateBase: 'Playlist Categories',
            aggregateTooltip: 'Count of playlist categories',
        }), ColumnDef({
            name: 'playlist',
            heading: 'Playlist',
            tooltip: 'In what playlist category was the message published?',
            type: 'string',
            aggregateBase: 'Playlist Categories',
            aggregateTooltip: 'Count of playlist categories',
        }), ColumnDef({
            name: 'sdg_goals',
            heading: 'SDG Goals',
            tooltip: 'What were the SDG Goals?',
            type: 'string',
        }), ColumnDef({
            name: 'sdg_targets',
            heading: 'SDG Targets',
            tooltip: 'What were the SDG Targets?',
            type: 'string',
        }), ColumnDef({
            name: 'contentid',
            heading: 'Content Id',
            tooltip: 'The unique id of the message, in a particular language.',
            aggregateTooltip: 'Count of message ids (message title in a particular language)',
        }), ColumnDef({
            name: 'title',
            heading: 'Message',
            tooltip: 'The title of the message.',
            aggregateBase: 'Message Titles',
            aggregateTooltip: 'Count of message titles (in all languages)',
        }), ColumnDef({
            name: 'format',
            heading: 'Format',
            tooltip: 'When known, the format of the message, such as drama, song, or interview.',
            type: 'string',
            aggregateTooltip: 'Count of message formats where known',
        }), ColumnDef({
            name: 'duration_seconds',
            heading: 'Duration',
            tooltip: 'Length of the message in seconds.',
            type: 'time',
        }), ColumnDef({
            name: 'position',
            heading: 'Position',
            tooltip: 'The position of the message within its playlist. Position \'1\' is the first message in the playlist.',
            type: 'number',
            aggregateTooltip: 'Count of distinct positions (how many @ #1, @ #2, ...)',
        }), ColumnDef({
            name: 'timestamp',
            heading: 'Collection Time',
            tooltip: 'When were the statistics in this line collected?',
            type: 'date',
        }), ColumnDef({
            name: 'deployment_timestamp',
            heading: 'Deployment Time',
            tooltip: 'When was the content deployed to the Talking Book?',
            type: 'date',
        }), ColumnDef({
            name: 'played_seconds',
            heading: 'Time Played',
            tooltip: 'How long in total was the message played? ',
            type: 'time',
            summable: true,
            aggregation: 'sum',
            aggregateBase: 'Time Played',
            aggregateTooltip: 'Total time the message was played',
        }), ColumnDef({
            name: 'completions',
            heading: 'Completions',
            tooltip: 'How many times was the message played to completion?',
            type: 'number',
            summable: true,
            aggregation: 'sum',
            aggregateTooltip: 'Number of times message was played to completion',
        }), ColumnDef({
            name: 'threequarters',
            heading: '3/4 Plays',
            tooltip: 'How many times was the message played through 3/4?',
            type: 'number',
            summable: true,
            aggregation: 'sum',
            aggregationDefault: true,
            aggregateTooltip: 'Number of times message was played to 3/4',
        }), ColumnDef({
            name: 'half',
            heading: '1/2 Plays',
            tooltip: 'How many times was the message played through 1/2?',
            type: 'number',
            summable: true,
            aggregation: 'sum',
            aggregationDefault: true,
            aggregateTooltip: 'Number of times message was played to 1/2',
        }), ColumnDef({
            name: 'quarter',
            heading: '1/4 Plays',
            tooltip: 'How many times was the message played through 1/4?',
            type: 'number',
            summable: true,
            aggregation: 'sum',
            aggregationDefault: true,
            aggregateTooltip: 'Number of times message was played to 1/4',
        }), ColumnDef({
            name: 'started',
            heading: 'Starts',
            tooltip: 'How many times was the message started (10 seconds)?',
            type: 'number',
            summable: true,
            aggregation: 'sum',
            aggregationDefault: true,
            aggregateTooltip: 'Number of times message was started (10 seconds)',
        }), ColumnDef({
            name: 'tbcdid',
            heading: 'Collected By',
            tooltip: 'Which TB-Loader id collected the statistics?',
        })];

        // Formatting extensions go here.
        let extensions = {
            duration_seconds: {
                render: function (data, type, row) {
                    if (type === 'display' || type === 'filter') {
                        return Utils.formatSeconds(data)
                    }
                    return data
                },
            },

            played_seconds: {
                render: function (data, type, row) {
                    // If display or filter data is requested, format as a nice time string
                    if (type === 'display' || type === 'filter') {
                        return Utils.formatSeconds(data)
                    }

                    // Otherwise the data type requested (`type`) is type detection or
                    // sorting data, for which we want to use the integer, so just return
                    // that, unaltered
                    return data;
                },
            },
        };

        let columnDefs = {};
        columnDefsArray.forEach(cs => columnDefs[cs.name] = cs);

        Object.keys(extensions).forEach(extName => {
            let cd = columnDefs[extName];
            let ext = extensions[extName];
            Object.keys(ext).forEach(k => cd[k] = ext[k])
        });

        // Generate minimal abbreviations. Uncomment to generate.
        // function getAbbrs() {
        //     let abbrs = {};
        //     let seen = {};
        //     columnDefsArray.forEach(cd => {
        //         let len = 0;
        //         let abbr = '';
        //         do {
        //             len++;
        //             abbr = cd.name.substr(0,len);
        //         } while (seen.hasOwnProperty(abbr));
        //         seen[abbr] = 1;
        //         abbrs[cd.name] = abbr;
        //     });
        //     Object.keys(abbrs).forEach(k => console.log(k + ' = ' + abbrs[k].name));
        // }
        // let abbrs = getAbbrs();

        // List of abbreviations for each column name. DO NOT reuse abbreviations is you can help it.
        let abbreviations = {
            deploymentnumber: 'd',
            deployment: 'de',
            startdate: 's',
            contentpackage: 'c',
            languagecode: 'l',
            language: 'la',
            country: 'co',
            region: 'r',
            district: 'di',
            communityname: 'com',
            groupname: 'g',
            agent: 'a',
            talkingbookid: 't',
            deployment_uuid: 'dd',
            category: 'ca',
            contentid: 'con',
            title: 'ti',
            format: 'f',
            duration_seconds: 'du',
            position: 'p',
            timestamp: 'tim',
            deployment_timestamp: 'tid',
            played_seconds: 'pl',
            completions: 'comp',
            threequarters: '3',
            half: '2',
            quarter: '4',
            started: 'st',
            tbcdid: 'tid'
        };
        // Put abbreviations into the full names
        Object.keys(abbreviations).forEach(fn=>{
            columnDefs[fn].abbr = abbreviations[fn];
        });

        // Check that every column has a unique abbreviation. Uncomment to check.
        // function checkAbbrs() {
        //     let abbrs = {};
        //     columnDefsArray.forEach(cd => {
        //         let abbr = cd.abbr;
        //         if (!abbr) {
        //             console.log('missing abbreviation for '+cd.name);
        //         } else if (abbrs.hasOwnProperty(abbr)) {
        //            console.log("duplicate abbreviation: " + abbrs[abbr].name + " and " + cd.name)
        //         }
        //         abbrs[abbr] = cd;
        //     });
        //     // Object.keys(abbrs).forEach(k => console.log(k + ' = ' + abbrs[k].name));
        // }
        // checkAbbrs();

        let fullnames = {};
        columnDefsArray.forEach(cd => fullnames[cd.abbr] = cd.columnname);
        // aggregation fullnames
        let aggrnames = {c: 'count', s: 'sum'};
        // aggregation abbreviations
        let aggrabbrs = {count: 'c', sum: 's'};

        /**
         * Given the particulars of a column in a query, validate them, and return an object that describes
         * the query for that column. Examples are
         * ('communityname') ->
         *      {columnDef: {heading:'Community',...}, type:'string', query:'communityname'}
         * ('communityname', 'count') ->
         *      {columnDef: {}, aggregation:'count', type:'number', query:'count(distinct communityname)')}
         * ('completions', 'sum', 'talkingbookid', 'count') ->
         *      {columnDef: {}, aggregation:'sum', normalization:{columnDef:{}, aggregation:'count'},
         *              type:'number', query:'sum(completions)/count(distinct talkingbookid)'}
         * @param columnName The name of the column being queried.
         * @param aggregation (Optional) If present, the aggregation, 'count' or 'sum'.
         * @param normColumnName (Optional, requires aggregation). If present column whose aggregation
         *              is used to normalize the results.
         * @param normAggregation (Required & allowed iff normalizationColumnName is present) The
         *              aggregation used for the normalizationColumn, 'count' or 'sum'.
         * @returns {UsageQuerySpec}
         * @constructor
         */
        function UsageQuerySpec(columnName, aggregation, normColumnName, normAggregation) {
            function resultTypeOf(queryColumn) {
                if (queryColumn.aggregation === 'count') {return 'number';}
                return queryColumn.columnDef.type
            }

            function queryOf(queryColumn) {
                function aggregate(columnDef, aggregation) {
                    let result = '';
                    if (aggregation) {
                        // We don't include the keyword 'distinct', because the server does that automatically.
                        // result = aggregation + '(' + (aggregation === 'count' ? 'distinct ' : '')
                        result = aggregation + '(';
                    }
                    result += columnDef.columnname + (aggregation ? ')' : '');
                    return result
                }

                let query = aggregate(queryColumn.columnDef, queryColumn.aggregation);
                if (queryColumn.normalization) {
                    query += '/' + aggregate(queryColumn.normalization.columnDef, queryColumn.normalization.aggregation)
                }
                return query;
            }

            function validCol(columnName) {
                if (!columnDefs[columnName]) {
                    throw `Unknown db column name: '${columnName}'.`
                }
                return columnDefs[columnName]
            }

            function validAgg(columnName, agg) {
                if (columnDefs[columnName].aggregation !== agg) {
                    throw `Illegal aggregation for '${columnName}': '${agg}'.`
                }
                return agg
            }

            // We want to be an instance of this thing, so we can recognize being initialized from another instance.
            if (!(this instanceof UsageQuerySpec)) {
                return new UsageQuerySpec(columnName, aggregation, normColumnName, normAggregation);
            }

            // How are we initialized?
            if (columnName instanceof UsageQuerySpec) {
                // From another instance.
                normAggregation = columnName.normalization && columnName.normalization.aggregation;
                normColumnName = columnName.normalization && columnName.normalization.columnDef.columnname;
                aggregation = columnName.aggregation;
                columnName = columnName.columnDef.columnname;

            } else if (Array.isArray(columnName)) {
                // From an array of up to four strings.
                normAggregation = columnName[3];
                normColumnName = columnName[2];
                aggregation = columnName[1];
                columnName = columnName[0];

            } else if (typeof columnName === 'string' && aggregation === undefined && normColumnName === undefined && normAggregation === undefined) {
                // From a single string. Maybe it is a multi-part string.
                let parts = columnName.split(/[/, ]/);
                if (parts.length >= 1 && parts.length <= 4) {
                    columnName = parts[0];
                    aggregation = parts[1];
                    normColumnName = parts[2];
                    normAggregation = parts[3];
                }
            }

            // Un-abbreviate names.
            columnName = columnName && fullnames[columnName] || columnName;
            aggregation = aggregation && aggrnames[aggregation] || aggregation;
            normColumnName = normColumnName && fullnames[normColumnName] || normColumnName;
            normAggregation = normAggregation && aggrnames[normAggregation] || normAggregation;

            let columnDef = validCol(columnName);
            let result = {
                columnDef: columnDef,
                tooltip: columnDef.tooltip,
                heading: columnDef.heading
            };
            if (aggregation) {
                result.aggregation = validAgg(columnName, aggregation);
                if (normColumnName) {
                    result.normalization = {
                        columnDef: validCol(normColumnName), aggregation: validAgg(normColumnName, normAggregation)
                    };
                    result.tooltip = columnDef.aggregateTooltip + ' / ' + result.normalization.columnDef.aggregateTooltip;
                    result.heading = columnDef.aggregateBase + ' / ' + result.normalization.columnDef.heading;
                } else {
                    result.tooltip = columnDef.aggregateTooltip;
                    result.heading = columnDef.aggregateHeading;
                }
            }
            result.type = resultTypeOf(result);
            result.query = queryOf(result);
            result.toString = () => {
                // Abbreviate the names.
                let str = columnDef.abbr;
                if (result.aggregation) {
                    str += ',' + aggrabbrs[aggregation];
                    if (result.normalization) {
                        str += '/' + result.normalization.columnDef.abbr + ',' + aggrabbrs[result.normalization.aggregation]
                    }
                }
                return str;
            };

            Object.keys(result).forEach(k => this[k] = result[k]);
            return this;
        }

        return {
            UsageColumnNames: Object.keys(columnDefs),
            UsageColumnDefs: columnDefs,

            // Columns suitable for normalization.
            NormalizationColumnNames: Object.keys(columnDefs).filter(cn => !!(columnDefs[cn].aggregation)),

            UsageQuerySpec: UsageQuerySpec
        }
    }(); // End of "columns"


    $.fn.moveUp = function () {
        $.each(this, function () {
            $(this).after($(this).prev());
        });
    };
    $.fn.moveDown = function () {
        $.each(this, function () {
            $(this).before($(this).next());
        });
    };
    let suffix = 1;
    $.fn.usageQueryBuilder = function (action, options) {
        action = action || 'query';
        if (action instanceof String) { action = action.toLowerCase(); }

        if (action === 'add' || action === 'append') {
            // Append a new, possibly empty, column picker to the list of column pickers.
            let $html = makeQueryItemHtml(suffix++);
            addListeners($html, this, options);
            this.append($html);

        } else if (action === 'parse') {
            // Parse one or more column descriptions, and return a corresponding list of QuerySpecs. Parses
            // an array, as 'queryspec' does (implies that this can also clone QuerySpecs).
            let result = [];
            if (options && Array.isArray(options)) {
                options.forEach(x => {
                    let qs = columns.UsageQuerySpec(x);
                    result.push(qs);
                });
                return result;
            }
        } else if (action === 'query' || action === 'queryspec') {
            if (options && Array.isArray(options)) {
                // Sets the query. Expects an array of QuerySpecs, each of which can be a full
                // QuerySpec object, the compact string from querySpec.toString(), or a verbose
                // string like 'title', 'completions,sum', or 'played_seconds,sum/communityname,count'.
                this.empty();
                let me = this;
                options.forEach(x => {
                    let qs = columns.UsageQuerySpec(x);
                    me.usageQueryBuilder('append', qs)
                });
            } else {
                // Return the query represented by this item (and its children). Returns an array of
                // QuerySpec objects, [QuerySpec(column, aggr, norm, norm_aggr), ...]
                let result = [];
                $('.rule-container', this).each(function () {
                    result.push(getQuerySpec($(this)));
                });
                return result;
            }
        }

        return this;
    };


    function getQuerySpec($div) {
        let column, aggregation, normalizationColumn, normalizationAggregation;
        column = $('#query-column select', $div).val();

        let isAggregation = !$('#aggregate', $div).hasClass('off');
        if (isAggregation) {
            aggregation = $('#query-aggr select', $div).val();

            let isNormalize = !$('#normalize', $div).hasClass('off');
            if (isNormalize) {
                normalizationColumn = $('#norm-query-column select', $div).val();
                normalizationAggregation = $('#norm-query-aggr select', $div).val();
            }
        }
        return columns.UsageQuerySpec(column, aggregation, normalizationColumn, normalizationAggregation)
    }

    function getQuerySpecs() {
        let columns = [];
        $('#columns-list').children().each((d, e) => {
            let c = getQuerySpec($(e));
            columns.push(c)
        });
        return columns
    }


    /**
     * Creates an HTML element encapsulating one column in a query. It will include:
     *   - an aggregation selector (count/sum), initially hidden.
     *   - a dropdown selector for the column, always visible.
     *   - the text " / ", initially hidden, shown when normalization is chosen.
     *   - an aggregation selector (count/sum) for the normalization column, initially hidden, shown when
     *     normalization is chosen.
     *   - a dropdown selector for the normalization column, initially hidden, shown when normalization is chosen.
     *   - an "Options" button, which opens a dropdown with options "Aggregate" and "Normalize", and
     *     actions "Move Up, "Move Down", and "Delete".
     * @param suffix. A string that's added to the element's ID, for uniqueness.
     * @returns A jQuery wrapper around the element.
     */
    function makeQueryItemHtml(suffix) {
        /**
         * Make the <select><option value="">...</select> for columns.
         * @param columnNames array of the column names to be included in the <select>
         * @returns jQuery wrapper around the <select>
         */
        function makeColumnSelecterHtml(columnNames) {
            let htmlOptions = {class: 'form-control', name: 'builder-basic_rule_0_operator'};
            let result = '<select';
            // Turn javascript properties into html properties.
            Object.keys(htmlOptions).forEach(k => result += ` ${k}="${htmlOptions[k]}"`);
            result += '>';
            columnNames
                .map(cn => columns.UsageColumnDefs[cn])
                .forEach(c => result += `<option value="${c.columnname}">${c.heading}</option>`);
            result += '</select>';
            return $(result)
        }

        let ruleContainerHtml = `
        <div id="query-column-rule-${suffix}" class="rule-container">
            <div class="rule-header">
                <div class="btn-group pull-right rule-actions">
                    <button id="options" class="btn btn-xs btn-info dropdown-toggle"  data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                            Options<span class="caret"></span>
                    </button>
                        <ul class="dropdown-menu">
                            <li id="aggregate" class="off"><a href="#"><i class="glyphicon glyphicon-ok text-success"></i>&nbsp;Aggregate</a></li>
                            <li id="normalize" class="disabled off"><a href="#"><i class="glyphicon glyphicon-ok text-success"></i>&nbsp;Normalize</a></li>
                            <li role="separator" class="divider"></li>
                            <li id="move-up"><a href="#"><i class="glyphicon glyphicon-arrow-up"></i>&nbsp;Move Up</a></li>
                            <li id="move-down"><a href="#"><i class="glyphicon glyphicon-arrow-down"></i>&nbsp;Move Down</a></li>
                            <li id="delete"><a href="#"><i class="glyphicon glyphicon-remove text-danger"></i>&nbsp;Delete</a></li>
                        </ul>
                </div>
            </div>
            <!--div class="error-container" data-toggle="tooltip">
                <i class="glyphicon glyphicon-warning-sign"></i>
            </div -->
            <div id="query-aggr" class="rule-filter-container hidden">
                <select class="form-control" name="builder-basic_rule_0_filter">
                    <option value="sum">Sum</option>
                    <option value="count">Count</option>
                </select>
            </div>
            <div id="query-column" class="rule-operator-container">
            </div>

            <div id="norm-query-aggr" class="rule-filter-container hidden column-normalization">
                <span class="column-norm-indicator">/&nbsp;</span>
                <select class="form-control" name="builder-basic_rule_0_filter">
                    <option value="sum">Sum</option>
                    <option value="count">Count</option>
                </select>
            </div>
            <div id="norm-query-column" class="rule-operator-container hidden column-normalization">
            </div>
        </div>
        `;

        let $html = $(ruleContainerHtml);
        let $columnsHtml = makeColumnSelecterHtml(columns.UsageColumnNames);
        $('#query-column', $html).append($columnsHtml);
        $columnsHtml = makeColumnSelecterHtml(columns.NormalizationColumnNames);
        $('#norm-query-column', $html).append($columnsHtml);

        return $html
    }

    function addListeners($rc, $parent, querySpec) {
        let initializing = true;

        function queryChanged() {
            if (!initializing) {
                $parent.trigger('changed', [{query: getQuerySpec($rc).query}])
            }
        }

        function setAggregationEnabled(enable) {
            if (enable) {
                $aggButton.removeClass('disabled');
            } else {
                $aggButton.addClass('disabled');
            }
            $aggButton.addClass('off');
            $('#query-aggr', $rc).addClass('hidden');
            $normButton.addClass('disabled');
            $normButton.addClass('off');
            $('.column-normalization', $rc).addClass('hidden');
            queryChanged()
        }

        function turnAggregationOn() {
            $aggButton.removeClass('off');
            $('#query-aggr', $rc).removeClass('hidden');
            $normButton.removeClass('disabled');
            if ($normButton.hasClass('norm-set')) {
                $normButton.removeClass('off');
                $('.column-normalization', $rc).removeClass('hidden')
            }
        }

        function turnAggregationOff() {
            $aggButton.addClass('off');
            $('#query-aggr', $rc).addClass('hidden');
            $normButton.addClass('disabled');
            $normButton.addClass('off');
            $('.column-normalization', $rc).addClass('hidden')
        }

        function onAggregateClicked() {
            if ($aggButton.hasClass('disabled')) {return;}
            let off = $aggButton.hasClass('off');
            if (off) {
                turnAggregationOn();
            } else {
                turnAggregationOff();
            }
            queryChanged()
        }

        function turnNormalizationOn() {
            $normButton.removeClass('off');
            $normButton.addClass('norm-set');
            $('.column-normalization', $rc).removeClass('hidden')
        }

        function turnNormalizationOff() {
            $normButton.addClass('off');
            $normButton.removeClass('norm-set');
            $('.column-normalization', $rc).addClass('hidden')
        }

        function onNormalizeClicked() {
            if ($normButton.hasClass('disabled')) {return;}
            let off = $normButton.hasClass('off');
            if (off) {
                turnNormalizationOn();
            } else {
                turnNormalizationOff();
            }
            queryChanged()
        }

        function onMoveUpClicked() {
            if ($rc.is(':first-child')) {return;}
            $rc.moveUp();
            queryChanged()
        }

        function onMoveDownClicked() {
            if ($rc.is(':last-child')) {return;}
            $rc.moveDown();
            queryChanged()
        }

        function setAggregationChoices(columnName, $aggregationSelect) {
            console.log('in setAggregationsFor, column=' + columnName);
            let columnDef = columns.UsageColumnDefs[columnName];
            let aggregation = columnDef && columnDef.aggregation;

            $aggregationSelect.empty();
            $aggregationSelect.append($('<option></option>')
                .attr('value', aggregation)
                .text(aggregation));
            $('option[value="' + aggregation + '"]', $aggregationSelect).attr('selected', 'selected');
        }

        function onColumnChanged() {
            console.log('in onColumnChanged');
            // When the column changes, we need to adjust the allowed kinds of aggregation
            let columnName = $('#query-column select', $rc).val();
            let columnDef = columns.UsageColumnDefs[columnName];
            setAggregationEnabled(columnDef && columnDef.aggregation);
            if (columnDef && columnDef.aggregation) {
                setAggregationChoices(columnName, $('#query-aggr select', $rc))
            }
            if (columnDef && columnDef.aggregationDefault) {
                turnAggregationOn();
            }
            queryChanged()
        }

        function onNormalizationColumnChanged() {
            // When the column changes, we need to adjust the allowed kinds of aggregation
            let columnName = $('#norm-query-column select', $rc).val();
            setAggregationChoices(columnName, $('#norm-query-aggr select', $rc));
            queryChanged()
        }

        let $aggButton = $('#aggregate', $rc);
        let $normButton = $('#normalize', $rc);
        let $delButton = $('#delete', $rc);

        $aggButton.on('click', onAggregateClicked);
        $normButton.on('click', onNormalizeClicked);
        $delButton.on('click', () => {
            $rc.remove();
            queryChanged();
        });

        // These are enabled and disabled via css.
        $('#move-up', $rc).on('click', onMoveUpClicked);
        $('#move-down', $rc).on('click', onMoveDownClicked);

        $('#query-column select', $rc).on('change', onColumnChanged);
        $('#norm-query-column select', $rc).on('change', onNormalizationColumnChanged);

        if (querySpec) {
            turnNormalizationOff();
            turnAggregationOff();
            let $columnSelect = $('#query-column select', $rc);
            let columnName = querySpec.columnDef.columnname;
            $('option[value="' + columnName + '"]', $columnSelect).attr('selected', 'selected');
            let columnDef = columns.UsageColumnDefs[columnName];
            if (columnDef && columnDef.aggregation) {
                setAggregationChoices(columnName, $('#query-aggr select', $rc))
            }

            if (querySpec.aggregation) {
                let $aggregationSelect = $('#query-aggr select', $rc);
                let aggregation = querySpec.aggregation;
                $('option[value="' + aggregation + '"]', $aggregationSelect).attr('selected', 'selected');
                turnAggregationOn();
                if (querySpec.normalization) {
                    turnNormalizationOn();
                    let $normalizationColumnSelect = $('#norm-query-column select', $rc);
                    let normalizationColumnName = querySpec.normalization.columnDef.columnname;
                    $('option[value="' + normalizationColumnName + '"]', $normalizationColumnSelect).attr('selected', 'selected');
                    let $normalizationAggregationSelect = $('#norm-query-aggr select', $rc);
                    let normalizationAggregation = querySpec.normalization.aggregation;
                    $('option[value="' + normalizationAggregation + '"]', $normalizationAggregationSelect).attr('selected', 'selected');
                }
            }
            let normalizationColumnName = $('#norm-query-column select', $rc).val();
            setAggregationChoices(normalizationColumnName, $('#norm-query-aggr select', $rc));
        } else {
            onColumnChanged();
            onNormalizationColumnChanged();
        }
        $('select', $rc).on('change', queryChanged);

        initializing = false;

        return $rc
    }

    // noinspection JSUnusedGlobalSymbols
    return {
        columnItem: function columnItem(suffix, $parent) {
            let $html = makeQueryItemHtml(suffix);
            addListeners($html, $parent);
            return $html
        }, getQuerySpecs: getQuerySpecs
    }
}();
