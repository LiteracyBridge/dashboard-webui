/**
 * Created by bill on 3/2/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, UserFeedbackData, Chart, ProjectPicker */

var UserFeedbackPage = UserFeedbackPage || {};

UserFeedbackPage = (function () {
    'use strict';
    var cb_diverging = ['#543005', '#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#c7eae5', '#80cdc1', '#35978f', '#01665e', '#003c30']
    var cb_qualitative = ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a']
    var cb_sequential = ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58']
    
    var previousProject, previousUpdate;
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
        var preSelectedUpdate = previousUpdate;
        projectsListPromise
            .then((list) => {
                // list is
                // { proj1 : { update1: acmname1, update2: acmname2, ...},
                //   proj2 : { update3: acmname3, update4: acmname4, ...}, ...
                
                var projectList = Object.keys(list);
                
                function getUpdatesForProject(proj) {
                    var promise = $.Deferred();
                    var updatesList = Object.keys(list[proj])
                    updatesList.selected = preSelectedUpdate || updatesList[Math.max(0, updatesList.length - 1)];
                    preSelectedUpdate = null;
                    promise.resolve(updatesList);
                    return promise;
                }
                
                var options = {
                    projects: projectList,
                    defaultProject: previousProject,
                    getUpdatesForProject: getUpdatesForProject
                };
                
                // Listen first, because adding the picker may trigger, if there are previous values.
                $('#uf-project-placeholder').on('selected', (evt, extra) => {
                    console.log(evt, extra);
                    var project = extra.project;
                    var update = extra.update;
                    var acmName;
                    if (project && update && list[project] && list[project][update]) {
                        // Convert from label back to acmName
                        acmName = list[project][update]
                        if (acmName) {
                            reportFeedback(project, update, acmName);
                        }
                    }
                    
                });
                ProjectPicker.add($('#uf-project-placeholder'), options);
            })
    }
    
    
    function makeCustomTooltips($elem) {
        var customTooltips = function (tooltip) {
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
                $elem.html(`<span style="font-weight:bold; color:${color}">${text} (${pct}%)</span>`);
            } catch (ex) {
                // Just ignore.
            }
        }
        return customTooltips;
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
    function plotDailyDetail(progressToDisplay) {
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
        
        while (breakdownData.datasets[0].backgroundColor.length < data.length) {
            breakdownData.datasets[0].backgroundColor = breakdownData.datasets[0].backgroundColor.concat(cb_qualitative);
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
                plotDailyDetail(drillStack[drillStack.length - 1]);
            }
        });
        drillStack.push(progressToDisplay);
        plotDailyDetail(progressToDisplay);
    }
    
    
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
    function plotDurations(durationData) {
        var placeholder = $('#message-length-placeholder');
        
        var data = [];
        var labels = [];
        durationData.forEach((d) => {
            data.push(d.data);
            labels.push(d.label);
        });
        
        durationsChartData.labels = labels;
        durationsChartData.datasets[0].data = data;
        while (durationsChartData.datasets[0].backgroundColor.length < data.length) {
            durationsChartData.datasets[0].backgroundColor = durationsChartData.datasets[0].backgroundColor.concat(cb_diverging);
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
    
    function plotProgress(data) {
        
        // The three data series to display. Each consists of an array of x-y pairs, where the x value is a date
        // and the y value is the count on that date.
        var cat = {
            label: 'Categorized',
            data: [],
            tension: 0,
            backgroundColor: 'rgba(153,255,51,0.4)'
        };
        // Uncategorized, by definition, has no detail. No need to expand it.
        var uncat = {
            label: 'Uncategorized',
            data: [],
            tension: 0,
            backgroundColor: 'rgba(255,153,0,0.4)'
        };
        var useless = {
            label: 'Useless',
            data: [],
            tension: 0, backgroundColor: 'rgba(51,153,255,0.4)'
        };
        
        data.progressData.forEach(dailyProgress => {
            cat.data.push({x: dailyProgress.date, y: dailyProgress.categorized.total()});
            uncat.data.push({x: dailyProgress.date, y: dailyProgress.uncategorized.total()});
            useless.data.push({x: dailyProgress.date, y: dailyProgress.useless.total()});
        });
        
        progressConfig.data = {datasets: [uncat, cat, useless]};
        
        if (!progressChart) {
            progressChart = new Chart($('#progress-placeholder'), progressConfig);
        } else {
            progressChart.update();
        }
        
        var latest = data.progressData[data.progressData.length - 1];
        $('#breakdown-date').text(latest.date);
        // We expect (ie, we know) that the top category has only one child, so drill into that. (But if it has more,
        // don't drill!)
        var detail = latest.categorized;
        if (detail.getChildList().length === 1) {
            detail = detail.getChildList()[0];
        }
        drillInto(detail, true);
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
    
    function reportFeedback(project, update, acmName) {
        if (initialized === acmName) {
            return;
        }
        initialized = acmName;
        previousProject = project;
        previousUpdate = update;
        localStorage.setItem('userfeedback.project', previousProject);
        localStorage.setItem('userfeedback.update', previousUpdate);
        
        UserFeedbackData.getProjectName(acmName).done(data => {
            $('#project-name').text(data);
        });
        
        UserFeedbackData.getDurations(acmName).done(plotDurations);
        
        UserFeedbackData.getData(acmName)
            .done(plotProgress)
            .fail(noData);
    }
    
    function init() {
        fillProjects();
    }
    
    previousProject = localStorage.getItem('userfeedback.project') || '';
    previousUpdate = localStorage.getItem('userfeedback.update') || '';
    
    // Hook the tab-activated/deactivated events for this tab.
    $('a[href="#userfeedback-page"]').on('hidden.bs.tab', function (e) {
        $('#project-picker').off('change');
        $('#update-picker').off('change');
    })
    $('a[href="#userfeedback-page"]').on('shown.bs.tab', init)
    
    return {};
})();
