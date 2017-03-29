/**
 * Created by bill on 3/2/17.
 */
/* jshint undef: true, asi:true */
/* globals console, CsvToHtmlTable, $, ProjectDashboardReporter, DataTable */

console.log('\'Allo \'Allo!');

(function () {
  'use strict';
  var DATA_PATH = 'data/';

  // Many of the columns are in common between the summary tables. One shared set of tooltips and heading names is
  // a simple way to improve consistency.
  var tooltips = {
    'deploymentnumber': 'The Update Number of the Content Update (Deployment).',
    'num_packages': 'Number of Content Packages in the Content Update. Generally one per language, but there can be ' +
        'more, if some communities receive customized content.',
    'startdate': 'The date that the Content Update was published, and was available to be installed in the field',
    'num_communities': 'The number of communities from which usage statistics have been collected, for ' +
        'this Content Update.',
    'num_tbs': 'The number of Talking Books from which usage statistics have been collected, for ' +
        'this Content Update.'

  };
  var headings = {
    project: 'Project',
    deployment: 'Content Update',
    deploymentnumber: 'Update #',
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
    var path = DATA_PATH + fn;
    var options = {
      headings: headings,
      tooltips: tooltips,
      datatable: {searching: true}
    }
    DataTable.fromCsv($elem, path, options);
  }

  /**
   * Reads a 'reports_date.txt' file, displays the date on the summary page.
   */
  function getReportDate() {
    $.when($.get(DATA_PATH + 'reports_date.txt')).then(
      function resolved(data) {
        data = data.trim();
        console.log(data);
        $('#report_date').text(data);
        $('#report_date').addClass('bg-info ');
      });
  }

  // Enable bootstrap tabbing.
  $('#main-tabs a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
  })

  ProjectDashboardReporter.init();
  getReportDate();
  initSummaryTable('usage_dashboard.csv', '#usage-container');
  initSummaryTable('deployment_dashboard.csv', '#deployment-container');
})();
