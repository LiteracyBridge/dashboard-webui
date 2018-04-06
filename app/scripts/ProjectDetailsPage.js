/* jshint esversion:6, asi:true */
/* global $, console, ProjectDetailsData, DataTable, Chart, ProjectPicker */

var ProjectDetailsPage = ProjectDetailsPage || {};

ProjectDetailsPage = function () {
    'use strict';

    var previousProject, previousDeployment;

    var fillDone = false;

    function fillProjects() {
        if (fillDone) {
            return;
        }
        fillDone = true;
        var preSelectDeployment = previousDeployment;
        ProjectDetailsData.getProjectList().done((list) => {

            function getDeploymentsForProject(proj) {
                var promise = $.Deferred();
                ProjectDetailsData.getProjectDeploymentList(proj)
                    .done((deploymentsList) => {
                        // deploymentsList is a list of {deploymentname:'name', deploymentnumber: number}
                        deploymentsList = deploymentsList.map((elem)=>{
                            return {value: elem.deploymentnumber,
                                label: `#${elem.deploymentnumber}: ${elem.deploymentname}`
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
                defaultProject: previousProject,
                getDeploymentsForProject: getDeploymentsForProject
            };

            $('#details-project-placeholder').on('selected', (evt, extra) => {
                var project = extra.project;
                var deployment = extra.deployment;
                if (project && deployment) {
                    reportProject(project, deployment);
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

    function MINUTES(number) {
        let fractions = ['', ' &frac14;', ' &frac12;', ' &frac34;'];
        if (number === null || number === undefined || isNaN(number)) {
            return 'n/a';
        }
        if (number < 60) {
            return Math.round(number) + ' minutes';
        }
        if (number < 600) {
            let hours = Math.floor(number / 60);
            // find the quarter hour.
            let frac = Math.round((number % 60) / 15);
            if (frac === 4) {
                frac = 0;
                hours++;
            }
            let units = (hours === 1 && frac === 0) ? ' hour' : ' hours';
            return '' + hours + fractions[frac] + units;
        }
        return Math.round(number / 60).toLocaleString() + ' hours';
    }


    /**
     * Builds a table with details about the messages in the deployment.
     * @param stats An object with a {messageData} member.
     */
    function messagePerformance(stats) {
        var options = {
            columns: ['category_list', /*'num_categories',*/ 'language', 'title', 'format', 'duration', 'position_list', 'eff_completions'],
            headings: {
                language: 'Language', title: 'Message Title', format: 'Format', category_list: 'Categories', num_categories: '# Categories',
                duration: 'Duration of Message', position_list: 'Position',
                completions: 'Times Message was Played to Completion'
            },
            tooltips: {
                language: 'The language in which the message was recorded.',
                format: 'The format of the message (song, interview, etc.), if known.',
                duration: 'Length of the recording, in minutes.',
                position_list: 'Position of the message in category playlist. If message was in multiple categories, a list of positions (we don\'t know which category is which position).',
                category_list: 'All of the categories in which this message appeared.',
                num_categories: 'Number of categories (topics) in which the message appeared in this package.',
                completions: 'How many times, on average, did the Talking Books listen to this message to completion? Taken over all Talking Books that reported usage statistics for any message in this package.'
            },
            formatters: {
                title: (row) => {
                    if (row.num_categories <= 1) {
                        return row.title
                    }
                    // We know that the multiple categories are joined by semicolon. Split apart, enclose in quotes.
                    var categories = row.category_list.split(';');
                    categories = categories.map(x=>`'${x}'`);
                    // Join the last one with 'and '.
                    categories[categories.length-1] = 'and ' + categories[categories.length-1];
                    // If only 2, just join them with space. Otherwise, join the list with commas.
                    categories = categories.join(categories.length>2?', ':' ');
                    var tip = `This message appears in ${row.num_categories} categories: ${categories}. Please note that statistics for the message are combined across all of these categories.`;
                    var $div = $('<div>');
                    $div.append('<span>' + row.title + '</span>');
                    $div.append('<img class="question" src="images/informationRed16.png" title="' + tip + '"/>');
                    var $q = $('img', $div);
                    $q.tooltip();
                    // So clicking doesn't do anything...
                    $q.on('click', () => {
                        return false;
                    });

                    return $div;
                },
                duration: (row) => {
                    return MINUTES(row.duration_minutes)
                },
                completions: (row) => {
                    return NUMBER(row.completions / Math.max(1, row.num_package_tbs))
                }
            },
            datatable: {colReorder: true}
        };

        var msgStats = stats.messageData || [];
        // Initial sort order. Sort by language, then by title.
        msgStats.sort((a, b) => {
            var cmp = a.language.toLocaleLowerCase().localeCompare(b.language.toLocaleLowerCase());
            return cmp || a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase());
        });
        // If no multi-category messages, don't need the # Categories column.
        if (!msgStats.some(row => row.num_categories > 1)) {
            options.columns = options.columns.filter((col) => col !== 'num_categories');
        }

        var messageTable = DataTable.create($('#message-performance'), msgStats, options);
        // This says sort by eff_completions, then by category_list (not the other way around, as one is likely to read it).
        messageTable.order([[options.columns.indexOf('category_list'),'asc'],[options.columns.indexOf('eff_completions'),'desc']]).draw();
    }


    // var completionsRadarChart;
    // var completionsRadarChartConfig = {
    //     type: 'radar',
    //     data: {datasets: []},
    //     options: {
    //         scale: {
    //             ticks: {
    //                 beginAtZero: true,
    //                 maxTicksLimit: 6,
    //                 callback: (v) => `${v}%`
    //                 // min: 0,
    //                 // max: 100,
    //                 // stepSize: 25
    //             }
    //         },
    //         title: {
    //             display: true,
    //             text: 'Completions',
    //             position: 'bottom'
    //         }
    //     }
    // }
    var durationsRadarChart;
    var durationsRadarChartConfig = {
        type: 'radar',
        data: {datasets: []},
        options: {
            scale: {
                ticks: {
                    beginAtZero: true,
                    maxTicksLimit: 6,
                }
            },
            title: {
                display: true,
                text: 'Durations',
                position: 'bottom'
            }
        }
    }

    /**
     *
     * @param categoryData -- an array of objects like {project,deploymentnumber,cat_packages,cat_languages,category,
     *                                num_messages,duration_minutes,played_minutes,effective_completions,completions,
     *                                num_tbs}
     */
    function makeDeploymentRadars(categoryData) {
        // Combine categories with different languages.
        function ensureCd(category) {
            if (!catDataHash[category]) {
                catDataHash[category] = {
                    category: category,
                    duration_minutes: 0,
                    played_minutes: 0,
                    completions: 0
                }
            }
            ;
        }

        // A given category may appear multiple times (in different languages).  So, take an array of categoryData objects,
        // and make a hash of them, indexed by category name, adding the counts into the objects in the hash.
        var catDataHash = {};
        categoryData.forEach((catData) => {
            ensureCd(catData.category);
            catDataHash[catData.category].duration_minutes += 1 * catData.duration_minutes;
            catDataHash[catData.category].played_minutes += 1 * catData.played_minutes;
            catDataHash[catData.category].completions += 1 * catData.completions;
        });
        // Turn it back into a list, but now there's one entry per category name.
        var catDataList = Object.keys(catDataHash).map(cat => catDataHash[cat]);
        // Find maximums & totals, for scaling.
        var maxDuration = Math.max.apply(null, catDataList.map(pd => pd.duration_minutes));
        var maxListened = Math.max.apply(null, catDataList.map(pd => pd.played_minutes));
        var maxCompletions = Math.max.apply(null, catDataList.map(pd => pd.completions));
        var totDuration = catDataList.reduce((s, v) => s + v.duration_minutes, 0);
        var totListened = catDataList.reduce((s, v) => s + v.played_minutes, 0);
        var totCompletions = catDataList.reduce((s, v) => s + v.completions, 0);
        // Arrays of scaled data, labels.
        var durations = catDataList.map(pd => pd.duration_minutes / totDuration * 100);
        var listened = catDataList.map(pd => pd.played_minutes / totListened * 100);
        var completed = catDataList.map(pd => pd.completions / totCompletions * 100);
        var labels = catDataList.map(pd => pd.category);
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
        // var completionsDataset = {
        //     label: 'Completions',
        //     data: completed,
        //     tension: 0.3,
        //     backgroundColor: 'rgba(51,153,255,0.4)'
        // };
        // completionsRadarChartConfig.data.labels = labels;
        // completionsRadarChartConfig.data.datasets = [completionsDataset];
        // if (!completionsRadarChart) {
        //     completionsRadarChart = new Chart($('#completions-radar canvas'), completionsRadarChartConfig);
        // } else {
        //     completionsRadarChart.update();
        // }
        durationsRadarChartConfig.data.labels = labels;
        durationsRadarChartConfig.data.datasets = [durationDataset, listenedDataset];
        if (!durationsRadarChart) {
            durationsRadarChart = new Chart($('#durations-radar canvas'), durationsRadarChartConfig);
        } else {
            durationsRadarChart.update();
        }

    }


    /**
     * Builds a table with details about the package(s) in the deployment
     * @param stats An object with {categoryData} member.
     */
    function deploymentPerformance(stats) {
        // To add a widget to a cell, use, eg:
        // <button type="button" data-index="${ix}" class="btn btn-sm btn-danger ng-scope"><i class="glyphicon glyphicon-remove"></i></button>
        var options = {
            columns: ['category', 'played', 'completed'],
            headings: {
                category: 'Category', played: 'Listened', completed: 'Completed'
            },
            tooltips: {
                category: 'A collection of messages on the same topic.',
                played: 'The per-TB is over all Talking Books that reported usage statistics for any message in this package.',
                completed: 'When a Talking Book played 85% or more of the message. The per-TB is over all Talking Books that reported usage statistics for any message in this package.',
            },
            formatters: {
                played: (row) => {
                    return `<p>${MINUTES(row.played_minutes / Math.max(1, row.pkg_tbs))} per TB</p>`
                },
                completed: (row, ix) => {
                    return `<p>${NUMBER(row.completions / Math.max(1, row.pkg_tbs))} times per TB</p>`
                }
            },
            datatable: {colReorder: true}
        };
        /*
         *  .categoryData -- an array of objects like {project,deploymentnumber,cat_packages,cat_languages,category,
         *                                num_messages,duration_minutes,played_minutes,effective_completions,completions,
         *                                num_tbs}
         */
        var categoryStats = stats.categoryData || [];

        // remove from here through 'extract back to array' to stop aggregating within languages
        // Combine by category (aggregate multiple languages), keeping category, sum of {num_messages, duration_minutes, ...}
        let fieldsToAggregate = ['num_messages', 'duration_minutes', 'played_minutes', 'completions', 'cat_tbs', 'pkg_tbs']
        let combinedStats = {}
        categoryStats.forEach((stat) => {
            // Retrieve or initialize the stats record for this category
            let st = combinedStats[stat.category.toLocaleLowerCase()] || (combinedStats[stat.category.toLocaleLowerCase()] = {category: stat.category});
            // Add in all the relevant fields. The "bonus +" treats the field as a number, not as a string.
            fieldsToAggregate.forEach((f) => {
                st[f] = (st[f] || 0) + (+stat[f]);
            })
        })

        // Extract back to array
        categoryStats = Object.keys(combinedStats).map((k) => {
            return combinedStats[k];
        })

        // Sort
        categoryStats.sort((a, b) => {
            var cmp = 0; //a.language.toLocaleLowerCase().localeCompare(b.language.toLocaleLowerCase());
            return cmp || a.category.toLocaleLowerCase().localeCompare(b.category.toLocaleLowerCase());
        });

        DataTable.create($('#deployment-performance-chart'), categoryStats, options);

        // Make a radar chart of published vs listened.
        makeDeploymentRadars(categoryStats);

    }

    /**
     * Builds a table with details about the Deployment.
     * @param stats An object with {deploymentData, productionData, and usageData} members.
     */
    function deploymentSummary(stats) {
        var options = {
            columns: ['deployment', 'production', /*'usage',*/ 'usage2'],
            headings: {
                deployment: 'Period',
                production: 'Deployment',
                usage: 'Performance Summary',
                usage2: 'Highlights'
            },
            formatters: {
                deployment: () => {
                    var cell;
                    if (depl) {
                        cell = `<p>Start date <span class="stat">${depl.startdate}</span></p>`
                    } else {
                        cell = '<p class="stat">Deployment information unavailable.</p>';
                    }
                    if (prod) {
                        var l = (prod.num_languages > 1) ? 'languages' : 'language';
                        cell += `<p><span class="stat">${NUMBER(prod.num_messages)}</span> Messages in
                            <span class="stat">${NUMBER(prod.num_languages)}</span> ${l}</p>
                            <p><span class="stat">${MINUTES(prod.duration_minutes)}</span> of Messaging</p>`
                        // `<p><span class="stat">${NUMBER(prod.num_categories)}</span> Categories</p>`
                    } else {
                        cell += '<p class="stat">Production information unavailable.</p>'
                    }
                    return cell;
                },
                production: () => {
                    var cell;

                    if (tbsDeployed) {
                        cell = `<p>Deployed to <span class="stat">${NUMBER(tbsDeployed.num_tbs)}</span> Talking Books.</p>`;
                    } else if (depl) {
                        cell = `<p>Deployed to <span class="stat">${NUMBER(depl.deployed_tbs)}</span> Talking Books.</p>`
                    } else {
                        cell = '<p class="stat">Deployment information unavailable.</p>';
                    }
                    if (usage) {
                        cell += `<p>Statistics from <span class="stat">${NUMBER(usage.num_tbs)}</span> Talking Books.</p>`;
                    } else {
                        cell += '<p> class="stat">Usage information unavailable.</p>';
                    }

                    return cell;
                },
                usage: () => {
                    var cell;
                    if (usage) {
                        cell = `<p><span class="stat">${MINUTES(usage.played_minutes)}</span> listened</p>`
                        if (usage.num_tbs > 0) {
                            cell += `<p><span class="stat">${NUMBER(usage.num_tbs)}</span> Talking Books reporting statistics</p>`
                            cell += `<p>Each TB listened an average of <span class="stat">${MINUTES(usage.played_minutes / usage.num_tbs)}</span></p>`;
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
                        var cell = `<p><span class="stat">${NUMBER(usage.num_completions)}</span> # times messages were listened to completion</p>
                            <p>Messages in the <span class="stat">${MINUTES(mostPlayed.duration_minutes)}</span> deployed for category
                                <span class="stat">"${mostPlayed.category}"</span> were played for a total of
                                <span class="stat">${MINUTES(mostPlayed.played_minutes)}</span>.</p>
                            <p>Message <span class="stat">"${mostCompletions.title}"</span>${language} was played to completion
                                <span class="stat">${NUMBER(mostCompletions.completions)}</span> times.</p>

              `;
                        return cell;
                    }
                }
            },
            datatable: false
        };


        var depl = stats.deploymentData;
        var tbsDeployed = stats.tbsDeployedData;
        var prod = stats.productionData;
        var usage = stats.usageData;

        var mostCompletions, mostPlayed;
        stats.categoryData.forEach((catData) => {
            if (!mostPlayed || catData.played_minutes / catData.duration_minutes > mostPlayed.played_minutes / mostPlayed.duration_minutes) {
                mostPlayed = catData;
            }
        });
        stats.messageData.forEach((msgData) => {
            if (!mostCompletions || +msgData.completions > +mostCompletions.completions) {
                mostCompletions = msgData;
            }
        });
        var heading = depl.deployment;
        if (depl && depl.deploymentnumber>0) {
            heading = `#${depl.deploymentnumber}: (` + heading + ')';
        }
        $('#deployment_header_name').text(heading);
        DataTable.create($('#deployment-summary'), [null], options);
    }


    function reportProject(project, deployment) {
        previousProject = project;
        previousDeployment = deployment;
        localStorage.setItem('project.details.project', previousProject);
        localStorage.setItem('project.details.deployment', previousDeployment);
        ProjectDetailsData.getProjectStats(project, deployment).then((stats) => {
            deploymentSummary(stats);
            deploymentPerformance(stats);
            messagePerformance(stats);
        });
    }

    function init() {
        fillProjects();
    }

    previousProject = localStorage.getItem('project.details.project') || '';
    // Todo: remove after 2017-09
    localStorage.removeItem('project.details.update');
    previousDeployment = localStorage.getItem('project.details.deployment') || '';

    // Hook the tab-activated event for this tab.
    // $('a[href="#project-details-page"]').on('hidden.bs.tab', function (e) {
    // });
    $('a[href="#project-details-page"]').on('shown.bs.tab', init);

    return {}
}();
