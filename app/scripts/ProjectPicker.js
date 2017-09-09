/**
 * Created by bill on 5/24/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* global $, console, DropdownButton */

var ProjectPicker = ProjectPicker || {};

ProjectPicker = (function ProjectPicker() {
    'use strict';
    
    /**
     * Adds a Project and Deployment picker to the given element.
     * - If defaults are specified, and exist, they will be auto-selected.
     * - If a single entry exists for either list, it will be auto-selected.
     * - When both project and deployment have been selected, an event, 'selected', will be fired on the elem
     *
     * @param elem Element to get the project picker. Any previous content is emptied.
     * @param options for the pickers:
     *   projects : an array of projects
     *   getDeploymentsForProject: a function that takes a project name and returns a promise on a list of deployments.
     *   defaults: an optional object with optional project and deployment members.
     */
    function add(elem, options) {
        function onProjectSelected(evt, proj) {
            deploymentsDropdown.clear();
            options.getDeploymentsForProject(proj)
                .done((list) => {
                    var def = list.selected;
                    deploymentsDropdown.update(list, {default: def});
                });
        }
        
        function onDeploymentSelected(evt, deployment) {
            $elem.trigger('selected', [{project: projectsDropdown.selection(), deployment: deployment}]);
        }
        
        var $elem = $(elem);
        $elem.empty();
        
        // Either a div or a span is a good element to host the DropdownButton.
        var $projectsDropdown = $('<div>').on('selected', onProjectSelected).appendTo($elem);
        var $deploymentsDropdown = $('<span>').on('selected', onDeploymentSelected).appendTo($elem);
        
        var deploymentsDropdown = DropdownButton.create($deploymentsDropdown, {title: 'No Deployments'});
        var projectsDropdown = DropdownButton.create($projectsDropdown, {title: 'Project'});
        projectsDropdown.update(options.projects, {default: options.defaultProject});
        
    }
    
    return {
        add: add
    };
}());
