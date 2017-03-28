/* jshint esversion:6, asi:true */
/* global $, console, ProjectData */

var ProjectDashboardReporter = ProjectDashboardReporter || {};

ProjectDashboardReporter = function () {
  'use strict';

  function fillProjects() {
    ProjectData.getProjectList().done((list) => {
      list.forEach((el) => {
        var option = '<option value="' + el + '">' + el + '</option>';
        $('#project_selecter').append(option);
      });
    });
  }

  function fillContentUpdates(project) {
    ProjectData.getProjectUpdateList(project).done((list) => {
      $('#update_selecter').empty();
      list.forEach((el) => {
        var option = '<option value="' + el + '">' + el + '</option>';
        $('#update_selecter').append(option);
      });
      var numChildren = $('#update_selecter').children().length;
      if (numChildren > 0) {
        numChildren = Math.max(0, numChildren - 2); // penultimate item
        $('#update_selecter option:eq(' + numChildren + ')').prop('selected', true)
        reportProject(project, $('#update_selecter').val());
      }
    })

  }

  function format(str) {
    if (str === null || str === undefined) {
      return 'n/a';
    }
    return str;
  }

  function formatNumber(number) {
    if (number === null || number === undefined || isNaN(number)) {
      return 'n/a';
    }
    return Number(Math.round(number)).toLocaleString();
  }

  function createTable(container, options) {
    var classes = options.class || 'table';
    $(container).html('<table class="' + classes + '">');
    if (options.headings) {
      var thead = '<thead><tr>';
      options.headings.forEach((h) => {
        thead += '<th>' + h + '</th>'
      });
      thead += '</tr></thead>';
      $('table', container).append(thead);
    }
    $('table', container).append('<tbody></tbody>');
  }

  /**
   * Builds a table with details about the messages in the deployment.
   * @param stats An object with a {messageData} member.
   */
  function messageSummary(stats) {
    var row;

    function td(text) {
      row += '<td>' + text + '</td>';
    }

    var msgStats = stats.messageData || [];
    // Sort
    msgStats.sort((a, b) => {
      var cmp = a.language.toLocaleLowerCase().localeCompare(b.language.toLocaleLowerCase());
      return cmp || a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase());
    });

    var container = $('#message_statistics');
    container.empty();
    var opts = {
      headings: ['Language', 'Message Title', 'Duration of Message', 'Times Message was Played to Completion'],
      class: 'table table-condensed table-bordered' + (msgStats.length>0?' table-striped':'')
    };
    createTable(container, opts);

    var tbody = $('#message_statistics tbody');
    //tbody.empty();

    msgStats.forEach((el) => {
      row = '<tr class="report_section">';
      td(el.language);
      td(el.title);
      td(formatNumber(el.duration_minutes) + ' minutes');
      td(formatNumber(el.effective_completions));
      row += '</tr>';
      tbody.append(row);
    });

    $('#message_statistics table').dataTable({paging: false, searching: false});
  }

  /**
   * Builds a table with details about the package(s) in the update.
   * @param stats An object with {packageData} member.
   */
  function packageSummary(stats) {
    var row;

    function td(text) {
      row += '<td>' + text + '</td>';
    }

    // Prepare the data to be presented.
    var pkgStats = stats.packageData || [];
    // Sort
    pkgStats.sort((a, b) => {
      var cmp = a.language.toLocaleLowerCase().localeCompare(b.language.toLocaleLowerCase());
      return cmp || a.category.toLocaleLowerCase().localeCompare(b.category.toLocaleLowerCase());
    });

    var container = $('#category_statistics');
    container.empty();
    var opts = {
      headings: ['Language', 'Category', 'Content Provided', 'Listened', 'Completed'],
      class: 'table table-condensed table-bordered' + (pkgStats.length>0?' table-striped':'')
    };
    createTable(container, opts);

    var tbody = $('#category_statistics tbody');

    pkgStats.forEach((el) => {
      row = '<tr class="report_section">';
      td(el.language);
      td(el.category);
      var cell = '<p>' + formatNumber(el.duration_minutes) + ' minutes of Content</p>';
      cell += '<p>' + formatNumber(el.num_messages) + ' Messages</p>';
      td(cell);
      cell = '<p>' + formatNumber(el.played_minutes) + ' minutes</p>';
      cell += '<p>' + formatNumber(el.played_minutes / 60) + ' hours</p>';
      td(cell);
      td(formatNumber(el.effective_completions) + ' times')
      row += '</tr>';
      tbody.append(row);
    });

    $('#category_statistics table').dataTable({paging: false, searching: false});
  }

  /**
   * Builds a table with details about the Content Update.
   * @param stats An object with {deploymentData, productionData, and usageData} members.
   */
  function deploymentSummary(stats) {
    var row = '';

    function td(text) {
      row += '<td>' + text + '</td>';
    }

    var container = $('#update_statistics');
    container.empty();
    var opts = {
      class: 'table table-condensed table-bordered'
    };
    createTable(container, opts);
    var tbody = $('#update_statistics tbody');


    var depl = stats.deploymentData;
    var prod = stats.productionData;
    var usage = stats.usageData;

    row = '<tr class="row report_section">';

    // First column, content update info.
    var cell = '';
    if (depl) {
      cell = `<p>Deployment <span class="stat">${depl.deployment}</span></p>
              <p>Update #<span class="stat">${formatNumber(depl.deploymentnumber)}</span></p>`
    } else {
      cell = '<p class="stat">Deployment information unavailable.</p>';
    }
    td(cell);

    // Second column, production info.
    if (prod) {
      cell = `<p><span class="stat">${formatNumber(prod.duration_minutes)}</span> Minutes of content</p>
              <p><span class="stat">${formatNumber(prod.num_categories)}</span> Categories</p>
              <p><span class="stat">${formatNumber(prod.num_messages)}</span> Messages</p>
              <p><span class="stat">${formatNumber(prod.num_languages)}</span> Languages</p>`
    } else {
      cell = '<p class="stat">Production information unavailable.</p>'
    }
    if (depl) {
      cell += `<p></p><p>Deployed to <span class="stat">${formatNumber(depl.deployed_tbs)}</span> Talking Books.</p>`
    }
    td(cell);

    // Third column, usage info
    if (usage) {
      cell = `<p><span class="stat">${formatNumber(usage.played_minutes)}</span> Minutes listened</p>
              <p><span class="stat">${formatNumber(usage.played_minutes / 60)}</span> Hours listened</p>`;
      if (usage.num_tbs > 0) {
        cell += `<p><span class="stat">${formatNumber(usage.num_tbs)}</span> Talking Books reporting statistics</p>
              <p>Each TB listened an average of <span class="stat">${formatNumber(usage.played_minutes / usage.num_tbs)}</span> minutes</p>`;
      }
    } else {
      cell = '<p class="stat">Usage information unavailable.</p>';
    }
    td(cell);

    // Forth column, more usage info
    if (usage) {
      cell = `<p><span class="stat">${formatNumber(usage.num_effective_completions)}</span> # times messages were listened to completion</p>`;
      td(cell);
    }
    tbody.append(row);
  }

  function reportProject(project, update) {
    ProjectData.getProjectStats(project, update).then((stats) => {
      deploymentSummary(stats);
      packageSummary(stats);
      messageSummary(stats);
    });
  }

  return {
    init: function init() {
      fillProjects();
      $('#project_selecter').on('change', (ev, elem) => {
        fillContentUpdates(ev.target.value);
      });
      $('#update_selecter').on('change', (ev) => {
        var project = $('#project_selecter').val();
        var update = $('#update_selecter').val();
        if (!project || !update || project === 'Please Choose!' || update === 'Please Choose!') {
          return;
        }
        reportProject(project, update);
      });

    }
  };
}();
