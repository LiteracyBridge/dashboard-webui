/* jshint esversion:6, asi:true */
/* global $, console, ProjectData, DataTable */

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

  function NUMBER(number) {
    if (number === null || number === undefined || isNaN(number)) {
      return 'n/a';
    }
    return Number(Math.round(number)).toLocaleString();
  }


  /**
   * Builds a table with details about the messages in the deployment.
   * @param stats An object with a {messageData} member.
   */
  function messageSummary(stats) {
    var options = {
      columns: ['language', 'title', 'duration', 'eff_completions'],
      headings: {
        language: 'Language', title: 'Message Title',
        duration: 'Duration of Message',
        eff_completions: 'Times Message was Played to Completion'
      },
      tooltips: {
        language: 'The language in which the message was recorded',
        duration: 'Length of the recording, in minutes',
        eff_completions: 'How many times, alltogether, did the Talking Books listen to this message to completion?'
      },
      formatters: {
        duration: (row) => {
          return NUMBER(row.duration_minutes) + ' minutes'
        },
        eff_completions: (row) => {
          return NUMBER(row.effective_completions)
        }
      },
      datatable: {colReorder: true}
    };

    var msgStats = stats.messageData || [];
    // Initial sort order
    msgStats.sort((a, b) => {
      var cmp = a.language.toLocaleLowerCase().localeCompare(b.language.toLocaleLowerCase());
      return cmp || a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase());
    });

    DataTable.create($('#message_statistics'), msgStats, options);
  }

  /**
   * Builds a table with details about the package(s) in the update
   * @param stats An object with {packageData} member.
   */
  function packageSummary(stats) {
    var options = {
      columns: ['category', 'language', 'provided', 'played', 'completed', 'pkg_tbs'],
      headings: {
        language: 'Language', category: 'Category', provided: 'Messages Provided',
        played: 'Listened', completed: 'Completed', pkg_tbs: 'Number of TBs'
      },
      tooltips: {
        category: 'A collection of messages on the same topic.',
        completed: 'When a Talking Book played 85% or more of the message. ',
        pkg_tbs: 'The number of Talking Books that reported usage statistics for any message in this package'
      },
      formatters: {
        provided: (row) => {
          return `<p>${NUMBER(row.duration_minutes)}  minutes of Messaging</p>
            <p>${NUMBER(row.num_messages)} Messages</p>`
        },
        played: (row) => {
          return `<p>${NUMBER(row.played_minutes)} minutes</p>
            <p>${NUMBER(row.played_minutes / 60)} hours</p>`
        },
        completed: (row) => {
          return `${NUMBER(row.effective_completions)} times`
        }
      },
      datatable: {colReorder: true}
    };

    var pkgStats = stats.packageData || [];
    // Sort
    pkgStats.sort((a, b) => {
      var cmp = a.language.toLocaleLowerCase().localeCompare(b.language.toLocaleLowerCase());
      return cmp || a.category.toLocaleLowerCase().localeCompare(b.category.toLocaleLowerCase());
    });

    DataTable.create($('#category_statistics'), pkgStats, options);
  }

  /**
   * Builds a table with details about the Content Update.
   * @param stats An object with {deploymentData, productionData, and usageData} members.
   */
  function deploymentSummary(stats) {
    var options = {
      columns : ['update', 'production', 'usage', 'usage2'],
      formatters: {
        update : () => {
          var cell;
          if (depl) {
            cell = `<p>Deployment <span class="stat">${depl.deployment}</span></p>
              <p>Update #<span class="stat">${NUMBER(depl.deploymentnumber)}</span></p>
              <p>Start date <span class="stat">${depl.startdate}</span></p>`
          } else {
            cell = '<p class="stat">Deployment information unavailable.</p>';
          }
          return cell;
        },
        production : () => {
          var cell;
          if (prod) {
            cell = `<p><span class="stat">${NUMBER(prod.duration_minutes)}</span> Minutes of Messaging</p>
              <p><span class="stat">${NUMBER(prod.num_categories)}</span> Categories</p>
              <p><span class="stat">${NUMBER(prod.num_messages)}</span> Messages</p>
              <p><span class="stat">${NUMBER(prod.num_languages)}</span> Language(s)</p>`
          } else {
            cell = '<p class="stat">Production information unavailable.</p>'
          }
          if (depl) {
            cell += `<p></p><p>Deployed to <span class="stat">${NUMBER(depl.deployed_tbs)}</span> Talking Books.</p>`
          }
          return cell;
        },
        usage : () => {
          var cell;
          if (usage) {
            cell = `<p><span class="stat">${NUMBER(usage.played_minutes)}</span> Minutes listened</p>
              <p><span class="stat">${NUMBER(usage.played_minutes / 60)}</span> Hours listened</p>`;
            if (usage.num_tbs > 0) {
              cell += `<p><span class="stat">${NUMBER(usage.num_tbs)}</span> Talking Books reporting statistics</p>
              <p>Each TB listened an average of <span class="stat">${NUMBER(usage.played_minutes / usage.num_tbs)}</span> minutes</p>`;
            }
          } else {
            cell = '<p class="stat">Usage information unavailable.</p>';
          }
          return cell;
        },
        usage2 : () => {
          if (usage) {
            var language='';
            if (prod.num_languages > 1) {
              language = ` (${mostCompletions.language}) `;
            }
            var cell= `<p><span class="stat">${NUMBER(usage.num_effective_completions)}</span> # times messages were listened to completion</p>
              <p class="spacer">&nbsp;</p>
              <p>Messages in the <span class="stat">${NUMBER(mostPlayed.duration_minutes)}</span> minutes deployed for category 
                <span class="stat">"${mostPlayed.category}"</span> were played for a total of 
                <span class="stat">${NUMBER(mostPlayed.played_minutes)}</span> minutes.</p>
              <p>Message <span class="stat">"${mostCompletions.title}"</span>${language} was played to completion 
                <span class="stat">${NUMBER(mostCompletions.effective_completions)}</span> times.</p>

              `;
            return cell;
          }
        }
      },
      datatable : false
    };


    var depl = stats.deploymentData;
    var prod = stats.productionData;
    var usage = stats.usageData;

    var mostCompletions, mostPlayed;
    stats.packageData.forEach((pd)=>{
      if (!mostPlayed || pd.played_minutes/pd.duration_minutes > mostPlayed.played_minutes/mostPlayed.duration_minutes) {
        mostPlayed = pd;
      }
    });
    stats.messageData.forEach((md)=>{
      if (!mostCompletions || +md.effective_completions > +mostCompletions.effective_completions) {
        mostCompletions = md;
      }
    });

    DataTable.create($('#update_statistics'), [null], options);
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
