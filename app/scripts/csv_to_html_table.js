/* jshint asi:true, esversion:6 */
/* globals $ */

var CsvToHtmlTable = CsvToHtmlTable || {};

CsvToHtmlTable = {
  init: function (options) {
    'use strict';
    'esversion:6';

    options = options || {};
    var csv_path = options.csv_path || '';
    var el = options.element || 'table-container';
    var allow_download = options.allow_download || false;
    var csv_options = options.csv_options || {};
    var datatables_options = options.datatables_options || {};
    var custom_formatting = options.custom_formatting || [];
    var table_classes = options.table_classes || 'table table-striped table-condensed';

    $('#' + el).html('<table class=\''+table_classes+'\' id=\'' + el + '-table\'></table>');

    $.when($.get(csv_path)).then(
      function(data){
        var csv_data = $.csv.toArrays(data, csv_options);

        var table_head = '<thead><tr>';

        for (var head_id = 0; head_id < csv_data[0].length; head_id++) {
          table_head += '<th>' + csv_data[0][head_id] + '</th>';
        }

        table_head += '</tr></thead>';
        $('#' + el + '-table').append(table_head);
        $('#' + el + '-table').append('<tbody></tbody>');

        for (let row_id = 1; row_id < csv_data.length; row_id++) {
          var row_html = '<tr>';

          //takes in an array of column index and function pairs
          if (custom_formatting !== []) {
            $.each(custom_formatting, function(i, v){
              var col_idx = v[0]
              var func = v[1];
              csv_data[row_id][col_idx]= func(csv_data[row_id][col_idx]);
            })
          }

          for (let col_id = 0; col_id < csv_data[row_id].length; col_id++) {
            row_html += '<td>' + csv_data[row_id][col_id] + '</td>';
          }

          row_html += '</tr>';
          $('#' + el + '-table tbody').append(row_html);
        }

        $('#' + el + '-table').DataTable(datatables_options);

        if (allow_download) {
          $('#' + el).append('<p><a class=\'btn btn-info\' href=\'' + csv_path + '\'><i class=\'glyphicon glyphicon-download\'></i> Download as CSV</a></p>');
        }
      });
  }
}
