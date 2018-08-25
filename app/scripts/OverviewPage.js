/**
 * Created by bill on 5/16/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, DataTable, Main, User */

var OverviewPage = OverviewPage || {};

OverviewPage = (function () {
    'use strict'
    let PAGE_ID = 'overview-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    let DATA_PATH = 'data/'
    var ROOT;

    function getPath() {
        if (!ROOT) {
            ROOT=Main.getRootPath();
        }
        return ROOT + DATA_PATH;
    }

    // Many of the columns are in common between the summary tables. One shared set of tooltips and heading names is
    // a simple way to improve consistency.
    var tooltips = {
        'deployment': 'Sometimes called the Content Update. These are the name(s) given to a Deployment.',
        'deploymentnumber': 'Which Deployment, 1, 2, 3, etc.',
        'num_packages': 'Number of Content Packages in the Deployment. Generally one per language, but there can be ' +
        'more, if some communities receive customized content.',
        'startdate': 'The date that the Deployment was published, and was available to be installed in the field',
        'num_communities': 'The number of communities from which usage statistics have been collected, for ' +
        'this Deployment.',
        'num_tbs': 'The number of Talking Books from which usage statistics have been collected, for ' +
        'this Deployment.'

    };
    var headings = {
        project: 'Project',
        deploymentnumber: 'Deployment #',
        deployment: 'Deployment',
        startdate: 'Start Date',
        'num_packages': '# Packages',
        'num_languages': '# Languages',
        'num_communities': '# Communities Reporting',
        'num_tbs': '# Talking Books Reporting',
        'deployed_tbs': '# Talking Books Deployed'
    }


    /**
     * initSummaryTable - reads a .csv file, populates a summary table from it.
     * @param fn The file name of the .csv.
     * @param $elem The (jQuery) element that is to be the table's container.
     */
    function initSummaryTable(fn, $elem) {
        function createFromCsv(container, path, options) {
            $.get(path).done((csvData) => {
                var data = $.csv.toObjects(csvData, {separator: ',', delimiter: '"'});
                var filtered = data.filter(row=>User.isViewableProject(row.project));
                DataTable.create(container, filtered, options);
            });
        }

        var path = getPath() + fn;
        var options = {
            headings: headings,
            tooltips: tooltips,
            datatable: {searching: true}
        }
        createFromCsv($elem, path, options);
    }

    /**
     * Reads a 'reports_date.txt' file, displays the date on the summary page.
     */
    function getReportDate() {
        $.when($.get(getPath() + 'reports_date.txt')).then(
            function resolved(data) {
                data = data.trim();
                console.log(data);
                $('#report_date').text(data);
                $('#report_date').addClass('bg-info ');
            });
    }


    var initialized = false;
    function show() {
        if (!initialized) {
            initialized = true;
            getReportDate();
            initSummaryTable('usage_dashboard.csv', '#usage-container');
            initSummaryTable('deployment_dashboard.csv', '#deployment-container');
        }

        Main.setParams(PAGE_ID, {});
    }

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show)

    return {}
})();
