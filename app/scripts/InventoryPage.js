/**
 * Created by bill on 8/4/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, DataTable, Main, User, ProjectPicker, ProjectDetailsData */

var InventoryPage = InventoryPage || {};

InventoryPage = (function () {
    'use strict'
    
    var previousProject;
    var previousDeployment;
    
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
                        deploymentsList.selected = preSelectDeployment || deploymentsList[Math.max(0, deploymentsList.length - 2)];
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
    
    function reportProject(project, deployment) {
    
    }
    
    var initialized = false;
    function show() {
        if (!initialized) {
            initialized = true;
            previousProject = localStorage.getItem('project.inventory.project') || '';
            // Todo: remove after 2017-09
            localStorage.removeItem('project.inventory.update');
            previousDeployment = localStorage.getItem('project.inventory.deployment') || '';
            fillProjects();
        }
    }
    
    // Hook the tab-activated event for this tab.
    $('a[href="#inventory-page"]').on('shown.bs.tab', show)
    
    return {}
})();
