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
 * --    list of choices.
 * -- Listen to 'selected' events on the passed element. The first argument to the handler is the source
 * --    event, and the second argument is the selection.
 */

var DropdownButton = DropdownButton || {};

DropdownButton = (function () {
    'use strict';
    
    function makeHtml(options) {
        var style = options.style || 'btn-primary';
        var html = `
            <button type="button" class="btn ${style}" style="border:none">${options.title}</button>
            <button type="button" class="btn ${style} dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                <span class="caret"></span>
                <span class="sr-only">Toggle Dropdown</span>
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
            $('button:first', $elem).text(options.title);
            $('button:last', $elem).addClass('hidden');
            selection = null;
        }
        function updateList(list, opts) {
            list = list || [];
            opts = opts || {};
            $('ul', $elem).children().off();
            $('ul', $elem).empty();
            // If there was a previous selection, and no new default selection, try to preserve the previous selection.
            // But if there is a new default selection, ignore any previous selection. We want to allow a pre-selected
            // "no selection", so undefined, null, and empty string are all valid defaults.
            var preSelected = opts.hasOwnProperty('default') ? opts.default : selection;
            selection = (list.length===1) ? list[0] : null;
            list.forEach((item) => {
                // No gaps in the list
                if (!item) {
                    return;
                }
                var li = $(`<li><a class="main-nav" href="#select-item" data-item="${item}">${item}</a></li>`)
                $('ul', $elem).append(li);
                if (item === preSelected) {
                    selection = item;
                }
            });
            // When an item is clicked: update the title, fire the event
            $('a[href="#select-item"]', $elem).on('click', (it) => {
                var item = $(it.target).data('item');
                $('button:first', $elem).text(item);
                selection = item;
                $elem.trigger('selected', [item]);
            });
            // Don't show the caret if there is nothing useful to drop down
            if (list.length<2) {
                $('button:last', $elem).addClass('hidden');
            } else {
                $('button:last', $elem).removeClass('hidden');
            }
            // Anything already selected?
            if (selection) {
                $('button:first', $elem).text(selection);
                $elem.trigger('selected', [selection]);
            } else {
                $('button:first', $elem).text(opts.title || options.title);
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
