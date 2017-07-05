/* jshint esversion:6, asi:true */
/* global $, console, ProjectDetailsData, DataTable, Chart, ProjectPicker */

var ProjectDetailsPage = ProjectDetailsPage || {};

ProjectDetailsPage = function () {
    'use strict';
    
    var previousProject, previousUpdate;
    
    var fillDone = false;
    function fillProjects() {
        if (fillDone) {
            return;
        }
        fillDone = true;
        var preSelectUpdate = previousUpdate;
        ProjectDetailsData.getProjectList().done((list) => {
            
            function getUpdatesForProject(proj) {
                var promise = $.Deferred();
                ProjectDetailsData.getProjectUpdateList(proj)
                    .done((updatesList) => {
                        updatesList.selected = preSelectUpdate || updatesList[Math.max(0, updatesList.length - 2)];
                        preSelectUpdate = null;
                        promise.resolve(updatesList);
                    });
                return promise;
            }
            
            var options = {
                projects: list,
                defaultProject: previousProject,
                getUpdatesForProject: getUpdatesForProject
            };
            
            $('#details-project-placeholder').on('selected', (evt, extra) => {
                var project = extra.project;
                var update = extra.update;
                if (project && update) {
                    reportProject(project, update);
                }
            });
            ProjectPicker.add('#details-project-placeholder', options);
        });
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
    function messagePerformance(stats) {
        var options = {
            columns: ['language', 'title', 'num_categories', 'duration', 'eff_completions'],
            headings: {
                language: 'Language', title: 'Message Title', num_categories: '# Categories',
                duration: 'Duration of Message',
                eff_completions: 'Times Message was Played to Completion'
            },
            tooltips: {
                language: 'The language in which the message was recorded',
                duration: 'Length of the recording, in minutes',
                num_categories: 'Number of categories (topics) in which the message appeared in this package.',
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
        
        DataTable.create($('#message-performance'), msgStats, options);
    }
    
    
    var radarChart;
    var radarChartConfig = {
        type: 'radar',
        data: {datasets: []},
        options: {
            scale: {
                ticks: {
                    beginAtZero: true,
                    maxTicksLimit: 6,
                    callback: (v) => `${v}%`
                    // min: 0,
                    // max: 100,
                    // stepSize: 25
                }
            }
        }
    }
    
    /**
     *
     * @param packageData -- an array of objects like {project,deploymentnumber,cat_packages,cat_languages,category,
     *                                num_messages,duration_minutes,played_minutes,effective_completions,completions,
     *                                num_tbs}
     */
    function makeCategoryRadar(packageData) {
        // Combine categories with different languages.
        function ensureCd(category) {
            if (!cd[category]) {
                cd[category] = {category: category, duration_minutes: 0, played_minutes: 0, effective_completions: 0}
            }
            ;
        }
        
        var cd = {};
        packageData.forEach((pd) => {
            ensureCd(pd.category);
            cd[pd.category].duration_minutes += 1 * pd.duration_minutes;
            cd[pd.category].played_minutes += 1 * pd.played_minutes;
            cd[pd.category].effective_completions += 1 * pd.effective_completions;
        });
        // Turn it back into a list.
        var pd = Object.keys(cd).map(cat => cd[cat]);
        // Find maximums & totals, for scaling.
        var maxDuration = Math.max.apply(null, pd.map(pd => pd.duration_minutes));
        var maxListened = Math.max.apply(null, pd.map(pd => pd.played_minutes));
        var maxCompletions = Math.max.apply(null, pd.map(pd => pd.effective_completions));
        var totDuration = pd.reduce((s, v) => s + v.duration_minutes, 0);
        var totListened = pd.reduce((s, v) => s + v.played_minutes, 0);
        var totCompletions = pd.reduce((s, v) => s + v.effective_completions, 0);
        // Arrays of scaled data, labels.
        var durations = pd.map(pd => pd.duration_minutes / totDuration * 100);
        var listened = pd.map(pd => pd.played_minutes / totListened * 100);
        var completed = pd.map(pd => pd.effective_completions / totCompletions * 100);
        var labels = pd.map(pd => pd.category);
        // Chart data
        var durationDataset = {
            label: 'Published minutes',
            data: durations,
            tension: 0.2,
            backgroundColor: 'rgba(153,255,51,0.2)'
        };
        // Uncategorized, by definition, has no detail. No need to expand it.
        var listenedDataset = {
            label: 'Listened minutes',
            data: listened,
            tension: 0.3,
            backgroundColor: 'rgba(255,153,0,0.4)'
        };
        var completionsDataset = {
            label: 'Completions',
            data: completed,
            tension: 0.3,
            backgroundColor: 'rgba(51,153,255,0.4)'
        };
        radarChartConfig.data.labels = labels;
        radarChartConfig.data.datasets = [completionsDataset, durationDataset, listenedDataset];
        if (!radarChart) {
            radarChart = new Chart($('#deployment-performance-radar'), radarChartConfig);
        } else {
            radarChart.update();
        }
        
    }
    
    
    /**
     * Builds a table with details about the package(s) in the update
     * @param stats An object with {packageData} member.
     */
    function deploymentPerformance(stats) {
        // To add a widget to a cell, use, eg:
        // <button type="button" data-index="${ix}" class="btn btn-sm btn-danger ng-scope"><i class="glyphicon glyphicon-remove"></i></button>
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
                completed: (row, ix) => {
                    return `    ${NUMBER(row.effective_completions)} times`
                }
            },
            datatable: {colReorder: true}
        };
        /*
         *  .packageData -- an array of objects like {project,deploymentnumber,cat_packages,cat_languages,category,
         *                                num_messages,duration_minutes,played_minutes,effective_completions,completions,
         *                                num_tbs}
         */
        var pkgStats = stats.packageData || [];
        // Sort
        pkgStats.sort((a, b) => {
            var cmp = a.language.toLocaleLowerCase().localeCompare(b.language.toLocaleLowerCase());
            return cmp || a.category.toLocaleLowerCase().localeCompare(b.category.toLocaleLowerCase());
        });
        
        DataTable.create($('#deployment-performance'), pkgStats, options);
        $('#deployment-performance button').on('click', (ev) => {
            var btn = $(ev.currentTarget);
            var ix = $(btn).data('index');
            console.log('clicked: ' + ix);
            console.log('this: ' + btn);
            console.log('data: ' + JSON.stringify(btn.data()));
        });
        
        // Make a radar chart of published vs listened.
        makeCategoryRadar(pkgStats);
        
    }
    
    /**
     * Builds a table with details about the Content Update.
     * @param stats An object with {deploymentData, productionData, and usageData} members.
     */
    function deploymentSummary(stats) {
        var options = {
            columns: ['update', 'production', 'usage', 'usage2'],
            headings: {
                update: 'Date',
                production: 'Production Data',
                usage: 'Performance Summary',
                usage2: 'Highlights'
            },
            formatters: {
                update: () => {
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
                production: () => {
                    var cell;
                    if (prod) {
                        var l = (prod.num_languages > 1) ? 'languages' : 'language';
                        cell = `<p><span class="stat">${NUMBER(prod.num_messages)}</span> Messages in
                  <span class="stat">${NUMBER(prod.num_languages)}</span> ${l}</p>
              <p><span class="stat">${NUMBER(prod.duration_minutes)}</span> Minutes of Messaging</p>`
                        // `<p><span class="stat">${NUMBER(prod.num_categories)}</span> Categories</p>`
                    } else {
                        cell = '<p class="stat">Production information unavailable.</p>'
                    }
                    if (depl) {
                        cell += `<p>&nbsp;</p><p>Deployed to <span class="stat">${NUMBER(depl.deployed_tbs)}</span> Talking Books.</p>`
                    }
                    return cell;
                },
                usage: () => {
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
                usage2: () => {
                    if (usage) {
                        var language = '';
                        if (prod.num_languages > 1) {
                            language = ` (${mostCompletions.language}) `;
                        }
                        var cell = `<p><span class="stat">${NUMBER(usage.num_effective_completions)}</span> # times messages were listened to completion</p>
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
            datatable: false
        };
        
        
        var depl = stats.deploymentData;
        var prod = stats.productionData;
        var usage = stats.usageData;
        
        var mostCompletions, mostPlayed;
        stats.packageData.forEach((pd) => {
            if (!mostPlayed || pd.played_minutes / pd.duration_minutes > mostPlayed.played_minutes / mostPlayed.duration_minutes) {
                mostPlayed = pd;
            }
        });
        stats.messageData.forEach((md) => {
            if (!mostCompletions || +md.effective_completions > +mostCompletions.effective_completions) {
                mostCompletions = md;
            }
        });
        
        $('#update_header_name').text(depl.deployment);
        DataTable.create($('#deployment-summary'), [null], options);
    }
    
    
    function reportProject(project, update) {
        previousProject = project;
        previousUpdate = update;
        localStorage.setItem('project.details.project', previousProject);
        localStorage.setItem('project.details.update', previousUpdate);
        ProjectDetailsData.getProjectStats(project, update).then((stats) => {
            deploymentSummary(stats);
            deploymentPerformance(stats);
            messagePerformance(stats);
        });
    }
    
    function init() {
        fillProjects();
    }
    
    previousProject = localStorage.getItem('project.details.project') || '';
    previousUpdate = localStorage.getItem('project.details.update') || '';
    
    // Hook the tab-activated event for this tab.
    $('a[href="#project-details-page"]').on('hidden.bs.tab', function (e) {
        $('#project-picker').off('change');
        $('#update-picker').off('change');
    });
    $('a[href="#project-details-page"]').on('shown.bs.tab', init);
    
    return {}
}();
