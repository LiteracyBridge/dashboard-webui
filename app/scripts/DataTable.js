/* jshint esversion:6, asi:true */
/* global $, console */

var DataTable = DataTable || {};

DataTable = function () {
    'use strict';

    /**
     * Creates a standard stats table.
     * @param container The jQuery container to receive the table. Existing contents will be removed.
     * @param rows An array of objects from which to populate the table.
     * @param options An object with any of the following fields:
     *   columns: An array of names by which the columns are referenced. If not provided, the keys
     *       of  rows[0] will be used.
     *   tableClasses: A string of classes to be applied to the table. NOTE: 'table-striped' will be *removed*
     *       if the rows object is empty.
     *   headings: An object whose keys are column names, and their values are column titles. If no title
     *       is provided, the column name is used.
     *   tooltips: An object whose keys are column names, and their values are column tooltips. If a tooltip
     *       is provided, it will be attached to a question mark within a circle.
     *   formatters: An object whose keys are column names. Any values are functions that provide the HTML content
     *       for the column. The function is passed the entire row and row index, and can return whatever it wishes.
     */
    function createTable(container, rows, options) {
        // Remove old content; create a new table.
        function initializeTable() {
            $(container).empty();
            var classes = options.tableClasses || 'table table-condensed table-bordered table-striped';
            if (rows.length === 0) {
                classes = classes.replace('table-striped', ' ');
            }
            $(container).html('<table class="' + classes + '">');
        }

        // Builds headings according to the options.
        function buildHeadings() {
            // One row for the headings.
            $('table', container).append('<thead><tr></tr></thead>');
            var $tr = $('thead tr', container);
            columns.forEach((column, ix) => {
                // Heading text and optional tooltip
                var text = headings[column] || column;
                var tip = options.tooltips && options.tooltips[column];
                $tr.append('<th><div></div></th>');
                if (headingClasses[column]) {
                    $('th', $tr).last().addClass(headingClasses[column]);
                }
                var $div = $('th div', $tr).last();
                $div.append('<span>' + text + '</span>');
                // If there's a tooltip, attach it to a image of a question mark.
                if (tip) {
                    $div.append('<img class="question" src="images/question16.png" title="' + tip + '"/>');
                    var $q = $('img', $div);
                    $q.tooltip();
                    // So clicking doesn't do anything...
                    $q.on('click', () => {
                        return false;
                    });
                }
            });
        }

        // Populates the data rows of the table, calls 'datatable' at the end.
        function populateRows() {
            $('table', container).append('<tbody></tbody>');
            var $tbody = $('table tbody', container);
            // One row for each array element
            rows.forEach((row, ix) => {
                $($tbody).append(`<tr data-row-index="${ix}"></tr>`);
                var $tr = $(':last', $tbody);
                columns.forEach((column) => {
                    var $td = $('<td>');
                    if (columnClasses[column]) {
                        let cl = (typeof columnClasses[column] === 'function') ? columnClasses[column](row) : columnClasses[column];
                        $td.addClass(cl);
                    }

                    var cell = '';
                    // If there's a format function, call it. Otherwise just use the data.
                    if (formatters[column]) {
                        cell = formatters[column](row, ix, (row&&row[column]));
                    } else {
                        cell = row[column];
                    }
                    $td.append(cell);
                    $tr.append($td);
                });
            });
        }

        options = options || {};
        var columns = options.columns || Object.keys(rows[0]);
        var columnClasses = options.columnClasses || {};
        var headings = options.headings || {};
        var headingClasses = options.headingClasses || {};
        var formatters = options.formatters || {};
        var tableOptions = {paging: false, searching: false, colReorder: false};
        if (options.datatable && (typeof options.datatable) === 'object') {
            Object.keys(options.datatable).forEach((k) => {
                tableOptions[k] = options.datatable[k]
            });
        }

        initializeTable();
        if (options.headings) {
            buildHeadings();
        }
        populateRows();
        var table;
        if (options.datatable) {
            table = $('table', container).DataTable(tableOptions);
            // HACK! Safari 12603.1.30.0.34 has a bug that puts the search box in the left half. This can fix it,
            // but it is very ugly. I hope Apple fixes it soon.
            //$($('.col-sm-6', container)[0]).append($('<p>&nbsp;</p>'))
        }
        return table;
    }

    function createFromCsv(container, path, options) {
        $.get(path).done((csvData) => {
            var data = $.csv.toObjects(csvData, {separator: ',', delimiter: '"'});
            createTable(container, data, options);
        });
    }

    return {
        create: createTable,
        fromCsv: createFromCsv
    }

}();
