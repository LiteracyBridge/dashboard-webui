/**
 * Created by bill on 5/26/17.
 *
 * Implementation of a dropdown list, using Bootstrap 'button' components. If the list has only a single item, the
 * choosing mechanisms are hidden. If the list has more than one item, a 'caret' affords dropping down the list to
 * make a choice.
 *
 * Any item can be 'pre-selected', in which case that item will be shown.
 */
/* jshint undef:true, esversion:6, asi:true */
/* global $, console */

/**
 * Implements a "dropdown button", which behaves much like a combo box. The button displays the current
 * selection, and a dropdown caret that shows a list from which to make a new selection. If there is a
 * only single choice, it is automatically selected, and the caret is hidden.
 *
 * To use:
 * -- Provide an element for the button. A div or span is good. Note that any contents will be deleted.
 * -- Call DropdownButton.create($element, options)
 * --    $element is the element that will contain the dropdown button.
 * --    options is an optional object, with optional properties
 * --         'title' to be shown if there is no selection
 * --         'style' to apply to the buttons; btn-primary is the default
 * -- The object returned has a 'selection' property to retrieve the current selection, and
 * --    functions 'clear()' to empty the list of choices, and 'update(list, options)' to set a new
 * --    list of choices. Each choice can be a string (used for label and value) or an object with members 'value' and 'label'.
 * -- Listen to 'selected' events on the passed element. The first argument to the handler is the source
 * --    event, and the second argument is the selection.
 */

var DropdownButton = DropdownButton || {};

DropdownButton = (function () {
    'use strict';

    function makeHtml(options) {
        var style = options.style || 'btn-primary';
        var html = `
            <button type="button" class="btn ${style} dropdown-toggle" style="border:none" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <span class='title'>${options.title}</span>
                <span class="caret"></span>
                <!--  span class="sr-only">Toggle Dropdown</span -->
            </button>
            <ul class="dropdown-menu">
            </ul>`;
        return html;
    }

    /**
     * Creates the HTML for a dropdown list, and fills the items from the given list. Any previous HTML is removed.
     *
     * When an item is selected from the list, a 'selected' event is triggered on the element.
     *
     * @param elem Container element for the dropdown.
     * @param list of items for the dropdown.
     * @param options for styling and pre-selecting:
     *   title: the name to show when no item has been selected
     *   style: style(s) for the buttons. Default is 'btn-primary'
     *   default: an item that will be pre-selected (if it is present in the list)
     *
     * @return an object that can be used to manipulate the dropdown, with functions:
     *   selection() : returns the current selection, if any.
     *   clear() : clears the list and selection.
     *   update() : updates the list, and, optionally, the default selection.
     */
    function create(elem, options) {
        function clearList() {
            $('ul', $elem).children().off();
            $('ul', $elem).empty();
            $('button .title', $elem).text(options.title);
            selection = null;
        }
        function updateList(list, opts) {
            function getLabel(item) {
                if (typeof item === 'string') {
                    return item;
                } else {
                    return item.label;
                }
            }
            function getValue(item) {
                if (typeof item === 'string') {
                    return item;
                } else {
                    return item.value;
                }
            }
            list = list || [];
            opts = opts || {};
            $('ul', $elem).children().off();
            $('ul', $elem).empty();
            // If there was a previous selection, and no new default selection, try to preserve the previous selection.
            // But if there is a new default selection, ignore any previous selection. We want to allow a pre-selected
            // "no selection", so undefined, null, and empty string are all valid defaults.
            var preSelected = opts.hasOwnProperty('default') ? opts.default : selection;
            selection = (list.length===1) ? getValue(list[0]) : null;
            selectionLabel = (list.length===1) ? getLabel(list[0]) : null;
            list.forEach((item) => {
                // No gaps in the list
                if (!item) {
                    return;
                }
                var value, label;
                if (typeof item === 'string') {
                    value = label = item;
                } else {
                    if (!item.hasOwnProperty('value') || !item.hasOwnProperty('label')) {
                        return;
                    }
                    value = item.value;
                    label = item.label;
                }
                var li = $(`<li><a class="main-nav" href="#select-item" data-value="${value}">${label}</a></li>`)
                $('ul', $elem).append(li);
                if (value == preSelected) { // jshint ignore:line
                    selection = value;
                    selectionLabel = label;
                }
            });
            // When an item is clicked: update the title, fire the event
            $('a[href="#select-item"]', $elem).on('click', (it) => {
                var value = $(it.target).data('value');
                var label = $(it.target).text();
                $('button .title', $elem).text(label);
                selection = value;
                selectionLabel = label;
                $elem.trigger('selected', [value]);
            });
            // Don't show the caret and the dropdown list if there is nothing useful to drop down
            if (list.length<2) {
                $('ul', $elem).addClass('hidden');
                $('button .caret', $elem).addClass('hidden');
            } else {
                $('ul', $elem).removeClass('hidden');
                $('button .caret', $elem).removeClass('hidden');
            }
            // Anything already selected?
            if (selection) {
                $('button .title', $elem).text(selectionLabel);
                $elem.trigger('selected', [selection]);
            } else {
                $('button .title', $elem).text(opts.title || options.title);
            }
        }

        options = options || {};
        var $elem = $(elem);
        $elem.children().off();
        $elem.empty();
        if (!$elem.hasClass('btn-group')) {
            $elem.addClass('btn-group');
        }
        var selection;
        var selectionLabel;

        $elem.html(makeHtml(options));

        return {
            selection: ()=>selection,
            clear: clearList,
            update: updateList
        }
    }

    return {
        create: create
    }
}());
