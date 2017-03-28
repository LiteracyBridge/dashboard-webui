/**
 * Created by bill on 3/2/17.
 */
/* jshint undef: true */
/* globals console, CsvToHtmlTable, $, ProjectDashboardReporter */

console.log('\'Allo \'Allo!');

(function() {
  'use strict';
  var DATA_PATH = 'data/';

  function initWith(fn, elemid) {
    CsvToHtmlTable.init({
      csv_path: DATA_PATH + fn,
      element: elemid,
      allow_download: true,
      csv_options: {separator: ',', delimiter: '"'},
      datatables_options: {'paging': false},
      table_classes: 'table table-striped table-condensed table-bordered table-hover'
      //custom_formatting: [[0, format_link]]
    });
  }

  function onClick(link) {
    $('#table-container').empty();
    initWith('data/' + link.toLowerCase() + '_usage_by_message.csv')
  }

  function format_link(link) {
    if (link) {
      return '<span onClick="onClick(\'' + link + '\')">' + link + '</span>';
    }
    return '';
  }

  function getReportDate()
  {
    $.when($.get(DATA_PATH + 'reports_date.txt')).then(
      function resolved(data) {
        data = data.trim();
        console.log(data);
        $('#report_date').text(data);
        $('#report_date').addClass('bg-info ');
      });
  }

  $('#main-tabs a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
  })

  ProjectDashboardReporter.init();
  getReportDate();
  initWith('usage_dashboard.csv', 'usage-container');
  initWith('deployment_dashboard.csv', 'deployment-container');
})();
