/**
 * Created by bill on 5/24/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* global $, console, DropdownButton */

var ProjectPicker = ProjectPicker || {};

ProjectPicker = (function ProjectPicker() {
    'use strict';
    
    /**
     * Adds a Project and Update picker to the given element.
     * - If defaults are specified, and exist, they will be auto-selected.
     * - If a single entry exists for either list, it will be auto-selected.
     * - When both project and update have been selected, an event, 'selected', will be fired on the elem
     *
     * @param elem Element to get the project picker. Any previous content is emptied.
     * @param options for the pickers:
     *   projects : an array of projects
     *   getUpdatesForProject: a function that takes a project name and returns a promise on a list of updates.
     *   defaults: an optional object with optional project and update members.
     */
    function add(elem, options) {
        function onProjectSelected(evt, proj) {
            updatesDropdown.clear();
            options.getUpdatesForProject(proj)
                .done((list) => {
                    var def = list.selected || options.defaults.update;
                    updatesDropdown.update(list, {default: def});
                });
        }
        
        function onUpdateSelected(evt, update) {
            $elem.trigger('selected', [{project: projectsDropdown.selection(), update: update}]);
        }
        
        var $elem = $(elem);
        $elem.empty();
        
        var $projectsDropdown = $('<div class="btn-group"></div>').on('selected', onProjectSelected).appendTo($elem);
        var $updatesDropdown = $('<div class="btn-group"></div>').on('selected', onUpdateSelected).appendTo($elem);
        
        var updatesDropdown = DropdownButton.create($updatesDropdown, {title: 'Update'});
        var projectsDropdown = DropdownButton.create($projectsDropdown, {title: 'Project'});
        projectsDropdown.update(options.projects, {default: options.defaultProject});
        
    }
    
    return {
        add: add
    };
}());
