/**
 * Created by bill on 3/2/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, UserFeedbackData, Chart, ProjectPicker, ProjectDetailsData, chroma */

var UserFeedbackPage = UserFeedbackPage || {};

UserFeedbackPage = (function () {
    'use strict';
    var cb_diverging = ['#543005', '#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#c7eae5', '#80cdc1', '#35978f', '#01665e', '#003c30']
    var cb_qualitative_x = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a']
    var cb_sequential = ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58']

    // qualative colors from colorbrewer. Use 12, unless (# items) % 12 == 0, in which case use 11.
    var cb_qualitative_11y = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99'];
    var cb_qualitative = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#b15928','#e6f598'];
    var cb_qualitative_p = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#b15928','#e6f598','#7fa03f'];

    // 8 colorblind safe, sequential colors, from colorbrewer. Use for durations.
    var cb_sequential_8 = ['#fff7fb','#ece2f0','#d0d1e6','#a6bddb','#67a9cf','#3690c0','#02818a','#016450'];
    var cb_diverging_8 = ['#b2182b','#d6604d','#f4a582','#fddbc7','#d1e5f0','#92c5de','#4393c3','#2166ac'];

    var previousProject, previousDeployment;
    var projectsListPromise;

    var projectsFilled = false;

    function fillProjects() {
        if (!projectsListPromise) {
            projectsListPromise = UserFeedbackData.getProjectsList();
        }
        if (projectsFilled) {
            return;
        }
        projectsFilled = true;
        var preSelectedDeployment = previousDeployment;
        projectsListPromise
            .then((feedbackByProject) => {
                // list is
                // { proj1 : { deployment1: uf-acmname1, deployment2: uf-acmname2, ...},
                //   proj2 : { deployment3: uf-acmname3, deployment4: uf-acmname4, ...}, ...

                var projectNames = Object.keys(feedbackByProject);

                function getDeploymentsForProject(proj) {
                    var promise = $.Deferred();

                    ProjectDetailsData.getProjectDeploymentList(proj)
                        .done((deploymentsList) => {
                            // deploymentsList is a list of {deployment:'name', deploymentnumber: number}
                            // Build a map of deployment name to number.
                            var deploymentsMap = {};
                            deploymentsList.forEach((elem)=>{
                                deploymentsMap[elem.deployment] = elem.deploymentnumber;
                                // This hack is because we strip off leading alpha characters from the deployment name when
                                // building the user feedback ACM name.  Search for  alpha - (digits -). ALSO store the
                                // deployment number with a key of only the digits & hyphen(s)
                                var alphaPrefixed = /[a-z]+-((?:\d*-?)*)/i;
                                var numOnly = alphaPrefixed.exec(elem.deployment);
                                if (numOnly) {
                                    deploymentsMap[numOnly[1]] = elem.deploymentnumber;
                                }
                            });

                            // Build values and label. Include deploymentnumber so we can sort it.
                            var feedbackList = Object.keys(feedbackByProject[proj]).map((elem)=>{
                                return {
                                    value: elem,
                                    deploymentnumber: deploymentsMap[elem],
                                    label: `#${deploymentsMap[elem]} ${elem}`
                                }
                            });
                            feedbackList.sort((a,b)=>a.deploymentnumber-b.deploymentnumber);

                            var penultimate = feedbackList[Math.max(0, feedbackList.length - 2)];
                            feedbackList.selected = preSelectedDeployment || penultimate && penultimate.value;
                            preSelectedDeployment = null;
                            promise.resolve(feedbackList);
                        });


                    return promise;
                }

                var options = {
                    projects: projectNames,
                    defaultProject: previousProject,
                    getDeploymentsForProject: getDeploymentsForProject
                };

                // Listen first, because adding the picker may trigger, if there are previous values.
                $('#uf-project-placeholder').on('selected', (evt, extra) => {
                    console.log(evt, extra);
                    var project = extra.project;
                    var deployment = extra.deployment;
                    var ufAcmName;
                    if (project && deployment && feedbackByProject[project] && feedbackByProject[project][deployment]) {
                        // Convert from label back to acmName
                        ufAcmName = feedbackByProject[project][deployment]
                        if (ufAcmName) {
                            reportFeedback(project, deployment, ufAcmName);
                        }
                    }

                });
                ProjectPicker.add($('#uf-project-placeholder'), options);
            })
    }


    function makeCustomTooltips($elem) {
        return function (tooltip) {
            if (!tooltip) {
                return
            }
            // So many things that could be, but probably aren't, empty. Just wrap the whole thing in try/catch, and
            // assume everything is accessible.
            try {
                var text = tooltip.body[0].lines[0];
                var ix = this._active[0]._index;
                var data = this._data.datasets[0].data;
                var total = data.reduce((a, b) => {
                    return 0 + a + b
                }, 0);
                var pct = Math.round(data[ix] / total * 100);
                var color = '' + tooltip.labelColors[0].backgroundColor; // append an empty string to force to string.
                var contrast = chroma.contrast(chroma(color), chroma('white'));
                while (contrast < 3.2) {
                    color = chroma(color).darken(0.4).toString();
                    contrast = chroma.contrast(chroma(color), chroma('white'));
                }
                // language=HTML
                $elem.html(`<span style="font-weight:bold; color:${color}">${text} (${pct}%)</span>`);
            } catch (ex) {
                // Just ignore.
            }
        };
    }

    var breakdownChart;
    var breakdownData = {
        labels: null,
        datasets: [
            {
                data: null,
                backgroundColor: []
            }
        ]
    };
    var breakdownOptions = {
        tooltips: {
            enabled: true,
            custom: makeCustomTooltips($('#hover-pie2'))
        }
    };


    /**
     * Pie chart of details. May be "useless" or "categorized", depending on which line the user clicked.
     * @param progressToDisplay The Progress object to display.
     */
    function plotCategorizations(progressToDisplay) {
        var data = [];
        var labels = [];
        var childList = progressToDisplay.getChildList();
        childList.forEach((pp, ix) => {
            var t = pp.total();
            data.push(t)
            labels.push(pp.name)
        });
        // If there's no actual data, show one value like 'Categorized (No data)'.
        if (data.length === 0) {
            data.push(1);
            labels.push('(No data)');
        }

        var placeholder = $('#category-breakdown-placeholder');
        $('#hover-pie2').html('');
        placeholder.unbind();

        breakdownData.labels = labels;
        breakdownData.datasets[0].data = data;

        // Make sure there are enough color values. Don't let the first also be the last.
        var palette = (data.length % cb_qualitative.length) !== 1 ? cb_qualitative : cb_qualitative_p;
        breakdownData.datasets[0].backgroundColor = [];
        while (breakdownData.datasets[0].backgroundColor.length < data.length) {
            breakdownData.datasets[0].backgroundColor = breakdownData.datasets[0].backgroundColor.concat(palette);
        }
        if (!breakdownChart) {
            breakdownChart = new Chart(placeholder, {
                type: 'pie',
                data: breakdownData,
                options: breakdownOptions
            });
        } else {
            breakdownChart.update();
        }

        // Handle when the user clicks on a slice of the pie chart.
        placeholder.unbind();
        placeholder.bind('click', (evt) => {
            // If there's anything there, where the click was, drill into it.
            var activePoints = breakdownChart.getElementsAtEvent(evt);
            if (!activePoints || !activePoints.length) {
                return
            }
            var idx = activePoints[0]['_index'];
            if (idx === undefined || idx < 0 || idx >= childList.length) {
                return
            }
            var obj = childList[idx];
            if (!obj || !obj.getChildList().length) {
                // The clicked item has no children, so we can't drill into it.
                // Just show the duration breakdowns of the clicked item.
                plotDurations(obj);
                return
            }

            drillInto(obj);
        });

    }

    var drillStack = [];

    /**
     * Drill into a category. Keeps a stack of categories, and builds each category and sub-category name into
     * clickable links in the heading for the plot.
     *
     * plotDailyDetail handles actually plotting the data.
     *
     * @param progressToDisplay The category into which to drill.
     * @param reset If true, make this category the new "root" category.
     */
    function drillInto(progressToDisplay, reset) {
        if (reset) {
            drillStack = [];
            $('#category-breakdown .detail-stack').off('click');
            $('#category-breakdown').empty();
        }
        // If the category has only a single sub-category, and that has sub-sub-categories, display
        // the sub-category instead.
        var children = progressToDisplay.getChildList();
        if (children.length === 1 && children[0].getChildList().length > 0) {
             drillInto(children[0]);
             return;
        }

        // Build the addition to the category name display. Note the '/' for second and subsequent levels.
        // data-index is where we'll come back to; index of the new chart in the drillStack
        var htmlstring = `<span>${(drillStack.length > 0) ? ' / ' : ''}
            <a class="detail-stack" data-index="${drillStack.length}">${progressToDisplay.name}</a></span>`
        $('#category-breakdown').append(htmlstring);
        // When the category name is clicked, go back out to its level.
        $('#category-breakdown .detail-stack').on('click', (ev) => {
            var ix = $(ev.currentTarget).data('index');
            if (ix < drillStack.length - 1) {
                // Drop the extra levels from the drillStack, and from the navigation.
                var children = $('#category-breakdown').children();
                while (ix < drillStack.length - 1) {
                    children[drillStack.length - 1].remove();
                    drillStack.pop();
                }
                plotCategorizations(drillStack[drillStack.length - 1]);
                plotDurations(drillStack[drillStack.length - 1]);
            }
        });
        drillStack.push(progressToDisplay);
        plotCategorizations(progressToDisplay);
        plotDurations(progressToDisplay);
    }

    var durationLabels;
    var durationsChart;
    var durationsChartData = {
        labels: null,
        datasets: [
            {
                data: null,
                backgroundColor: []
            }
        ]
    };
    var durationsChartOptions = {
        tooltips: {
            custom: makeCustomTooltips($('#hover-pie3'))
        }
    };

    /**
     * Pie chart of message lengths.
     * @param durationData: [{label:'2 seconds', data:99}, {label:'5 seconds', data:100}, ...]
     */
    function plotDurations(progressToDisplay) {
        var placeholder = $('#message-length-placeholder');

        var data = progressToDisplay.durations();
        if (data) {
            var catName = progressToDisplay.fullname || progressToDisplay.name;
            catName = '\'' + catName + '\'';
            $('#category-durations').text(catName);
            // Filter the non-zero values. Build a palette of the non-zer values; keeps the colors for durations consistent.
            var palette = [];
            durationsChartData.datasets[0].data = data.filter((val, ix) => {
                if (data[ix] > 0) {
                    palette.push(cb_diverging_8[ix]);
                    return true;
                }
            });
            // If there aren't any, add a single entry, 'No data'.
            if (durationsChartData.datasets[0].data.length === 0) {
                durationsChartData.datasets[0].data.push(1);
                durationsChartData.labels = ['No data'];
            } else {
                durationsChartData.labels = data.map((num, ix) => {
                    return durationLabels[ix] + ': ' + num
                }).filter((val, ix) => data[ix] > 0 );
            }
            durationsChartData.datasets[0].backgroundColor = [];
            while (durationsChartData.datasets[0].backgroundColor.length < data.length) {
                durationsChartData.datasets[0].backgroundColor = durationsChartData.datasets[0].backgroundColor.concat(palette);
            }

            if (!durationsChart) {
                durationsChart = new Chart(placeholder, {
                    type: 'pie',
                    data: durationsChartData,
                    options: durationsChartOptions
                });
            } else {
                durationsChart.update();
            }
        }

    }

    var progressChart;
    var progressConfig = {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    scaleLabel: {
                        display: true,
                        labelString: 'Date'
                    }
                }]
            }
        }
    };

    /**
     *
     * @param data
     */
    function plotProgress(data) {

        // The three data series to display. Each consists of an array of x-y pairs, where the x value is a date
        // and the y value is the count on that date.
        var cat = {
            label: 'Processed',
            data: [],
            tension: 0.1,
            backgroundColor: 'rgba(153,255,51,0.4)'
        };
        // Uncategorized, by definition, has no detail. No need to expand it.
        var uncat = {
            label: 'Unprocessed',
            data: [],
            tension: 0.1,
            backgroundColor: 'rgba(255,153,0,0.4)'
        };
        var useless = {
            label: 'Useless',
            data: [],
            tension: 0.1, backgroundColor: 'rgba(51,153,255,0.4)'
        };
        var skipped = {
            label: 'Skipped',
            data: [],
            tension: 0.1, backgroundColor: 'rgba(51,51,255,0.4)'
        };


        data.progressData.forEach(dailyProgress => {
            cat.data.push({x: dailyProgress.date, y: dailyProgress.categorized.total()});
            uncat.data.push({x: dailyProgress.date, y: dailyProgress.uncategorized.total()});
            useless.data.push({x: dailyProgress.date, y: dailyProgress.useless.total()});
            skipped.data.push({x: dailyProgress.date, y: dailyProgress.skipped.total()});
        });

        progressConfig.data = {datasets: [uncat, cat, useless, skipped]};

        if (!progressChart) {
            progressChart = new Chart($('#progress-placeholder'), progressConfig);
        } else {
            progressChart.update();
        }

    }

    function noData() {
        function draw(id) {
            var ctx = document.getElementById(id).getContext('2d');
            var w = ctx.canvas.clientWidth;
            var h = ctx.canvas.clientHeight;
            ctx.fillStyle = 'rgb(255, 255, 255)';
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = 'lightblue';
            ctx.font = '48px sans-serif';
            ctx.fillText('No Data', 10, 50);
        }

        breakdownChart && breakdownChart.destroy();
        breakdownChart = null;
        $('#category-breakdown .detail-stack').off('click');
        $('#category-breakdown').empty();
        draw('category-breakdown-placeholder');
        draw('progress-placeholder');
        $('#breakdown-date').text('No Data');
    }

    var initialized = '';

    function plotAll(withUncategorized, acmName) {
        let durationsPromise = UserFeedbackData.getDurations(acmName);

        UserFeedbackData.getData(acmName)
            .done(data => {
                if (withUncategorized) {
                    $('#categorization-progress-view').removeClass('hidden');
                    plotProgress(data);
                } else {
                    $('#categorization-progress-view').addClass('hidden');
                }
                var latest = data.progressData[data.progressData.length - 1];
                $('#breakdown-date').text(latest.date);
                // We expect (ie, we know) that the top category has only one child, so drill into that. (But if it has more,
                // don't drill!)
                var detail = latest.categorized;
                if (detail.getChildList().length > 0) {
                    detail = detail.getChildList().find((child)=>{if (child.id==='90') {return true;}}) || latest.categorized;
                } else {
                    // If nothing in latest.categorized, show entirity of latest.
                    detail = latest;
                }
                drillInto(withUncategorized ? latest : detail, true);

                durationsPromise.done(durationData => {
                    durationLabels = durationData.durationLabels;
                    var latest = data.progressData[data.progressData.length - 1];
                    latest.attachDurations(durationData.durationsByCategory);

                    plotDurations(drillStack[drillStack.length - 1]);
                });
            })
            .fail(noData);
    }


    function reportFeedback(project, deployment, acmName) {
        if (initialized === acmName) {
            return;
        }
        initialized = acmName;
        previousProject = project;
        previousDeployment = deployment;
        localStorage.setItem('userfeedback.project', previousProject);
        localStorage.setItem('userfeedback.deployment', previousDeployment);

        UserFeedbackData.getProjectName(acmName).done(data => {
            $('#project-name').text(data);
        });

        let $withUncategorized = $('#feedback-with-uncategorized');
        $withUncategorized.on('click', () => {
            plotAll($withUncategorized.prop('checked'), acmName);
        });
        plotAll($withUncategorized.prop('checked'), acmName);
    }

    function init() {
        fillProjects();
    }

    previousProject = localStorage.getItem('userfeedback.project') || '';
    previousDeployment = localStorage.getItem('userfeedback.deployment') || '';

    // Hook the tab-activated/deactivated events for this tab.
    // $('a[href="#userfeedback-page"]').on('hidden.bs.tab', function (e) {
    // })
    $('a[href="#userfeedback-page"]').on('shown.bs.tab', init)

    return {};
})();
