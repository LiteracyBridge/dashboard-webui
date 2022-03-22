/**
 * Created by bill on 8/4/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, DataTable, Main, Authentication, DropdownButton, ProgramDetailsData */

var InventoryPage = (function () {
    'use strict'
    let PAGE_ID = 'inventory-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    // noinspection JSUnusedLocalSymbols
    let $PAGE = $('#' + PAGE_ID);

    var previousProject;
    var previousDeployment;

    var fillDone = false;

    function fillProjects() {
        if (fillDone) {
            return;
        }
        fillDone = true;
        let projectsList = Main.dropdownProgramsList();
        var $elem = $('#inventory-project-placeholder');
        $elem.empty();

        // Either a div or a span is a good element to host the DropdownButton.
        var $projectsDropdown = $('<div>').on('selected', (evt,proj)=>{reportProject(proj);}).appendTo($elem);
        var projectsDropdown = DropdownButton.create($projectsDropdown, {title: 'Project'});
        projectsDropdown.update(projectsList, {default: previousProject});
    }

    function deploymentDetails(data) {
        var options = {
            columns: ['communityname', 'count'],
            headings: {
                communityname: 'Community',
                count: 'Count'
            },
            tooltips: {
                count: 'The number of Deployments that were reported for this community.'
            },
            datatable: {searching: true,
                colReorder: true}
        };

        var deplStats = data.deploymentByCommunityData || [];
        // Initial sort order. Sort by community, then by deployment number
        deplStats.sort((a, b) => {
            var cmp = a.communityname.toLocaleLowerCase().localeCompare(b.communityname.toLocaleLowerCase());
            return cmp || (a.deploymentnumber - b.deploymentnumber);
        });
        // unpivot from (depl1, comm1), (depl2, comm1) => (comm1, depl1, depl2)
        var unPivoted = {};
        var depls = {};
        deplStats.forEach((ds) => {
            let community = unPivoted[ds.communityname.toLocaleLowerCase()] || (unPivoted[ds.communityname.toLocaleLowerCase()] = {communityname: ds.communityname, count: 0});
            community[ds.deploymentnumber] = ds.deployed_tbs;
            community.count++;
            depls[ds.deploymentnumber] = undefined;
        });
        // Add columns to options.
        depls = Object.keys(depls).sort((a,b)=>{return a-b;});
        options.columns = options.columns.concat(depls);
        // convert back to array.
        let unPivotedArray = Object.keys(unPivoted).map(key=>unPivoted[key]);

        DataTable.create($('#inventory-detail'), unPivotedArray, options);

    }


    function reportProject(program, deployment) {
        ProgramDetailsData.getDeploymentDetails(program).done((data) => {
            deploymentDetails(data);

            previousProject = program;
            previousDeployment = deployment;
            persistState();
        }).fail(() => {
        });
    }

    function persistState() {
        if (previousProject && previousDeployment) {
            localStorage.setItem('project.inventory.project', previousProject);
            localStorage.setItem('project.inventory.deployment', previousDeployment);
            Main.setParams(PAGE_ID, {p: previousProject, d: previousDeployment});
        }
    }
    function restoreState() {
        let params = Main.getParams();
        if (params) {
            previousProject = params.get('p') || '';
            previousDeployment = params.get('d') || '';
        } else {
            previousProject = localStorage.getItem('project.inventory.project') || '';
            previousDeployment = localStorage.getItem('project.inventory.deployment') || '';
        }
    }

    let initialized = false;
    function show() {
        if (!initialized) {
            initialized = true;
            restoreState();
            fillProjects();
        } else {
            persistState();
        }
    }

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show)

    return {}
})();
