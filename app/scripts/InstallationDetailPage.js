/**
 * Created by bill on 10/23/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, DropdownButton, DataTable, Main, User, Chart, ProjectPicker, ProjectDetailsData, InstallationData, moment */

var InstallationDetailPage = InstallationDetailPage || {};

InstallationDetailPage = (function () {
    'use strict'
    let PAGE_ID = 'installation-detail-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    var previousProject;

    var fillDone = false;

    var recipientMap;

    function formatDate(date, def) {
        if (!(date instanceof moment)) { date=moment(date) }
        if (!date.isValid() && def) {
            return def;
        }
        return date.format('YYYY-MM-DD');
    }


    function fillProjects() {
        if (fillDone) {
            return;
        }
        fillDone = true;
        ProjectDetailsData.getProjectList().done((projectsList) => {
            function onProjectSelected(evt, proj) {
                var project = projectsDropdown.selection();
                if (project) {
                    projectSelected(project);
                }
            }

            var options = {
                projects: projectsList,
                defaultProject: previousProject
            };
            var $elem = $('#installation-detail-project-placeholder');
            $elem.empty();
            var $projectsDropdown = $('<div>').on('selected', onProjectSelected).appendTo($elem);
            var projectsDropdown = DropdownButton.create($projectsDropdown, {title: 'Project'});
            projectsDropdown.update(options.projects, {default: options.defaultProject});
        });
    }

    function NUMBER_NOTZERO(number) {
        if (number === 0) {
            return '';
        }
        if (number === null || number === undefined || isNaN(number)) {
            return 'n/a';
        }
        return Number(Math.round(number)).toLocaleString();
    }

    /**
     * Shows tbsdeployed for some timeframe.
     * @param tbsDeployed Array of data to display.
     */
    function showTbsDeployed(tbsDeployed) {
        // tbsDeployed: [ {talkingbookid,recipientid,deployedtimestamp,project,deployment,contentpackage,community,firmware,location,coordinates,username,tbcdid,action,newsn,testing} ]

        let options = {
            columns: ['talkingbookid', 'component', 'communityname', 'groupname', 'deployedtimestamp', 'deployment', 'contentpackage',
                'location', 'username', 'tbcdid'],
            headings: {
                talkingbookid: 'Talking Book',
                component: 'Component',
                communityname: 'Community',
                groupname: 'Group',
                deployedtimestamp: 'Date and Time',
                deployment: 'Deployment',
                contentpackage: 'Package',
                location: 'Where Updated',
                username: 'Updater',
                tbcdid: 'ID',
                testing: 'Test?'
            },
            tooltips: {
                location: 'Where did the updater indicate they were, during the installation?',
                tbcdid: 'The TB-Loader id of the laptop or phone that performed the installation.',
                deployedtimestamp: 'When was this Talking Book installed? Time is in UTC.',
                testing: 'Was the \'Testing the Deployment\' box checked on the TB-Loader?'
            },
            formatters: {
                component: (row)=>{let recip=row.recipientid&&recipientMap[row.recipientid]; return recip&&recip.component;},
                communityname: (row)=>{let recip=row.recipientid&&recipientMap[row.recipientid]; return recip&&recip.communityname;},
                groupname: (row)=>{let recip=row.recipientid&&recipientMap[row.recipientid]; return recip&&recip.groupname;},
                deployedtimestamp: (row, row_ix, cell)=>{return cell.format('Y-MM-DD HH:mma')}
            },
            datatable: {colReorder: true,
                searching: true,
                //scroller: true,
                deferRender: true,
                paging:true, lengthMenu: [[25, 50, 100, -1], [25, 50, 100, 'All']]
            }
        };

        $('#installation-details-detail').empty();
        let table = DataTable.create($('#installation-details-detail'), tbsDeployed, options);
        // This says sort by deployedtimestamp, then by communityname (not the other way around, as one is likely to read it).
        table.order([[options.columns.indexOf('deployedtimestamp'),'asc'],[options.columns.indexOf('communityname'),'asc']]).draw();
    }

    /**
     * Shows a given subset of the tbsdeployed for the project.
     * @param project The project.
     * @param year If present, show tbsdeployed for year-month-day.
     * @param month If present, show tbsdeployed for year-month-day.
     * @param day If present, show tbsdeployed for year-month-day.
     * If no year, show all tbsdeployed for project. Note that it is very slow.
     */
    function showProjectTbsDeployed(project, year, month, day) {
        let filtered = !!year;
        let prompt = filtered ? `Installations statistics uploaded on ${year}-${month}-${day}` : 'All known TB installations';

        // If there's no filter, turn on the spinner immediately, because we'll almost certainly want it, and may not get
        // another chance until the data's all rendered.
        Main.incrementWait(!filtered);
        // Remove the description of the data.
        $('#installation-details-timeframe').empty();
        // If there's no filter, remove the data as well, so we don't sit for a long time with the wrong data onscreen.
        if (!filtered) {$('#installation-details-detail').empty()}
        // Yes, this is ugly. Loading large data into the table can hang for several seconds. The timeout at least lets
        // us get the spinner on the screen. So...
        // ...take a breath...
        setTimeout(()=>{
            /// ...let it out..., and get the data.
            InstallationData.getTbDailiesDataForProject(project, year, month, day).then((tbsDeployed)=>{
                prompt += `, ${tbsDeployed.length} Deployments to TBs.`;
                showTbsDeployed(tbsDeployed);
                $('#installation-details-timeframe').text(prompt);
                Main.decrementWait();
            });
        }, 0);
    }

    /**
     * Fills the date selection widgets from the dailies list. Handles navigation between dates.
     * @param project Name of project
     * @param dailiesList Object with list of days for which there's tbsdeployed data in this project.
     */
    function fillDailiesList(project, dailiesList) {
        /**
         * Project Details was chosen. Clear the 'Months' and 'Days' widgets, and populate Years with the years
         * having data. Attach a click handler to each year to drill into that year.
         * @param year that was chosen.
         */
        function onProjectDetailsChosen() {
            $years.empty().append('  Year:  ');
            $months.empty();
            $days.empty();
            let years = Object.keys(dailiesList).sort();
            years.forEach(val => {
                var htmlstring = `<span>  <a class="years-list" data-year="${val}">${val}</a>  </span>`
                $years.append(htmlstring);
                $('#installation-details-years .years-list').on('click', (ev) => {
                    year = $(ev.currentTarget).data('year');
                    month = day = undefined;
                    $('a', $years).removeClass('time-selected');
                    $(ev.currentTarget).addClass('time-selected');
                    onYearChosen();
                });
            });
            // If year already picked, use it. If only one year, use that.
            if (years.length === 1) {
                year = years[0];
            }
            if (year) {
                $(`[data-year="${year}"]`).addClass('time-selected');
                onYearChosen();
            }
        }
        /**
         * A year was chosen. Clear the 'Days' widget, and populate Months with the months having data.
         * Attach a click handler to each month to drill into that month.
         * @param year that was chosen.
         */
        function onYearChosen() {
            $allData.prop('checked', false);
            $months.empty().append('  Month:  ');
            $days.empty();
            let months = Object.keys(dailiesList[year]).sort();
            months.forEach(val => {
                var htmlstring = `<span>  <a class="months-list" data-month="${val}">${val}</a>  </span>`
                $months.append(htmlstring);
                $('#installation-details-months .months-list').on('click', (ev) => {
                    month = $(ev.currentTarget).data('month');
                    day = undefined;
                    $('a', $months).removeClass('time-selected');
                    $(ev.currentTarget).addClass('time-selected');
                    onMonthChosen();
                });
            });
            // If year already picked, use it. If only one year, use that.
            if (months.length === 1) {
                month = months[0];
            }
            if (month) {
                $(`[data-month="${month}"]`).addClass('time-selected');
                onMonthChosen();
            }
        }
        /**
         * A month was chosen. Populate Days with the days having data.
         * Attach a click handler to each day to display data for that day.
         * @param year that was chosen.
         */
        function onMonthChosen() {
            $allData.prop('checked', false);
            $days.empty().append('  Day:  ');
            let days = dailiesList[year][month].sort();
            days.forEach(val => {
                var htmlstring = `<span>  <a class="days-list" data-day="${val}">${val}</a>  </span>`
                $days.append(htmlstring);
                $('#installation-details-days .days-list').on('click', (ev) => {
                    day = $(ev.currentTarget).data('day');
                    $('a', $days).removeClass('time-selected');
                    $(ev.currentTarget).addClass('time-selected');
                    onDayChosen(year, month, day);
                });
            });
            if (days.length === 1) {
                day = days[0];
            }
            if (day) {
                $(`[data-day="${day}"]`).addClass('time-selected');
                onDayChosen();
            }
        }

        /**
         * A day was chosen. Show tbsloaded for that day.
         * @param year The chosen year.
         * @param month The chosen month.
         * @param day The chosen day.
         */
        function onDayChosen() {
            $allData.prop('checked', false);
            showProjectTbsDeployed(project, year, month, day);
       }

        let $allData = $('#installation-details-all');
        $allData.prop('checked', false);
        let $chooser = $('#installation-details-date-chooser');
        let $years = $('#installation-details-years').empty();
        let $months = $('#installation-details-months').empty();
        let $days = $('#installation-details-days').empty();
        var year, month, day;

        $allData.on('click', () => {
            let allData = $allData.prop('checked');
            if (allData) {
                $('a', $chooser).removeClass('time-selected');
                showProjectTbsDeployed(project);
            } else {
                onProjectDetailsChosen();
            }
        });

        year = Object.keys(dailiesList).sort().pop();
        if (year) {
            month = Object.keys(dailiesList[year]).sort().pop();
        }
        if (month) {
            day = dailiesList[year][month].slice(-1).pop(); // sort to get an array it is safe to mutate.
        }
        onProjectDetailsChosen();
    }

    /**
     * Called when a project has been selected.
     * @param project
     */
    function projectSelected(project) {
        Main.incrementWait();
        previousProject = project;
        localStorage.setItem('installation.detail.project', previousProject);

        let recipientsPromise = InstallationData.getRecipientsForProject(project);
        let dailiesPromise = InstallationData.getTbDailiesListForProject(project);

        $.when(dailiesPromise, recipientsPromise).done((dailiesList, recipientsList)=>{
            recipientMap = {};
            recipientsList.forEach((recip)=>recipientMap[recip.recipientid]=recip);

            Main.decrementWait();
            fillDailiesList(project, dailiesList);

        }).fail((err)=>{
            Main.decrementWait();
        });
    }

    var initialized = false;

    function show() {
        if (!initialized) {
            initialized = true;
            previousProject = localStorage.getItem('installation.detail.project') || '';
            fillProjects();
        }
    }

    function hidden() {
        recipientMap = undefined;
    }

    $('#installation-details-all-holder').tooltip();
    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show)
    $(PAGE_HREF).on('hidden.bs.tab', hidden)

    return {}
})();