/**
 * Created by bill on 5/24/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* global $, console, DropdownButton */


let ProgramPicker = (function ProgramPicker() {
    'use strict';

    /**
     * Adds a Program and Deployment picker to the given element.
     * - If defaults are specified, and exist, they will be auto-selected.
     * - If a single entry exists for either list, it will be auto-selected.
     * - When both program and deployment have been selected, an event, 'selected', will be fired on the elem
     *
     * @param elem Element to get the program picker. Any previous content is emptied.
     * @param options for the pickers:
     *   programs : an array of programs
     *   getDeploymentsForProgram: a function that takes a program name and returns a promise on a list of deployments.
     *   defaults: an optional object with optional program and deployment members.
     */
    function add(elem, options) {
        function onProgramSelected(evt, proj) {
            deploymentsDropdown.clear();
            options.getDeploymentsForProgram(proj)
                .done((list) => {
                    var def = list.selected;
                    deploymentsDropdown.update(list, {default: def});
                });
        }

        function onDeploymentSelected(evt, deployment) {
            $elem.trigger('selected', [{program: programsDropdown.selection(), deployment: deployment}]);
        }

        var $elem = $(elem);
        $elem.empty();

        // Either a div or a span is a good element to host the DropdownButton.
        var $programsDropdown = $('<div>').on('selected', onProgramSelected).appendTo($elem);
        var $deploymentsDropdown = $('<span>').on('selected', onDeploymentSelected).appendTo($elem);

        var deploymentsDropdown = DropdownButton.create($deploymentsDropdown, $.extend({title: 'No Deployments'}, options));
        var programsDropdown = DropdownButton.create($programsDropdown, $.extend({title: 'Program'}, options));
        programsDropdown.update(options.programs, {default: options.defaultProgram});

    }

    return {
        add: add
    };
}());
