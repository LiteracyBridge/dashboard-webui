/* jshint esversion:6, asi:true */
/* global
$,
BootstrapDialog,
*/

let RolesEditor = function() {
    'use strict';
    let roleDefinitions = {
        'AD': 'Administrator',
        'PM': 'Program Manager',
        'CO': 'Content Officer',
        'FO': 'Field Officer'
    };
    let roleCodes = Object.keys(roleDefinitions);

    /* The roles being edited. Like:
    let roles3 = {
        "orgs": [{
            "name": "RTI",
            "roles": {"lindsay@amplio.org": "AD,PM,CO,FO"},
            "parent": "CBCC",
            "programs": [{"name": "CBCC-RTI", "org": "RTI"}]
        }],
        "programs": [{
            "name": "DEMO",
            "roles": {
                "sylvie.shichen@gmail.com": "PM,CO,FO",
                "leavens@wisc.edu": "PM,CO,FO",
                "mdakura@literacybridge.org": "PM,CO,FO,AD",
                "ryan@amplio-network.org": "PM,CO,FO,AD",
                "gumah@literacybridge.org": "PM,CO,FO",
                "cameronryall@informedinternational.org": "PM,CO,FO",
                "jlr988@gmail.com": "PM,CO,FO",
                "@amplio.org": "AD,PM,CO,FO",
                "@amplio-network.org": "PM,CO,FO"
            },
            "org": "Amplio"
        }],
        "name": "lindsay@amplio.org"
    };
    */

    let deferred = null;

    let previousRoles = null;
    let userRoles = null;

    let userRows = {};

    // The global html objects
    let $table = null;
    let $tbody = null;
    let $dialog = null;
    let dialog = null;

    let $inputRow = null;

    let addButton = null;
    let okButton = null;


    function normalizeRoleList(roleList) {
        roleList.sort((a,b)=>{
            let ixA = roleCodes.indexOf(a);
            let ixB = roleCodes.indexOf(b);
            return ixA - ixB;
        });
    }
    function normalizeRoleString(roleStr) {
        let roleList = roleStr.split(',').filter(r=>r);
        normalizeRoleList(roleList);
        return roleList.join(',');
    }

    /**
     * Creates the row for one user, showing the user's roles. The roles are visible in one of two forms,
     * a collapsed form that summarizes the roles, and an expanded form allows adding or removing roles
     * for the user. By adding or removing the class 'collapsed', the short or long form can be shown.
     *
     * The jQuery item is saved in userRows, but is not added to the DOM.
     * @param email for which to create the display elements.
     * @returns {*|jQuery|HTMLElement|void}
     */
    function makeRowForUser(email) {
        /**
         * Called when an individual permission is checked/unchecked. Will re-create
         * the 1-line permission summary.
         */
        function updateList() {
            let changed = false;
            roleCodes.forEach(role=>{
                let roleIx = roleList.indexOf(role);
                if (roleCheckboxes[role].is(':checked')) {
                    // If the corresponding row is checked, be sure it is in the list of roles.
                    if (roleIx < 0) {
                        roleList.push(role);
                        changed = true;
                    }
                } else {
                    // If the corresponding row is not checked, be sure it is not in the list of roles.
                    if (roleIx >= 0) {
                        roleList.splice(roleIx, 1);
                        changed = true;
                    }
                }
            });
            if (changed) {
                // Order by roleDefinitions
                roleList.sort((a,b)=>{
                    let ixA = roleCodes.indexOf(a);
                    let ixB = roleCodes.indexOf(b);
                    return ixA - ixB;
                });
                userRoles[email] = roleList.join(',');
                $compactList.text(userRoles[email])
            }
        }
        let roleList = userRoles[email].split(',').filter(r=>r);
        let roleCheckboxes = {};

        // Build one row, the roles for one email address.
        let $tr = $('<tr class="roles-table-row collapsed">');

        // The email itself.
        //let $tdE = $(`<td class="roles-table-email" ><input type="text" disabled="disabled" value="${email}"/></td>`);
        let $tdE = $(`<td class="roles-table-email" ><span>${email}</span></td>`);

        // The +/= toggler.
        let $tdX = $('<td class="roles-table-toggler">');
        $tdX.append($('<span class="roles-table-toggle expand-roles-edit">+</span>'));
        $tdX.append($('<span class="roles-table-toggle collapse-roles-edit">-</span>'));

        // The roles, in two forms: a single line, and a list of roles with checkboxes to select the desired roles.
        // Only one is visible at a time.
        let $tdP = $('<td class="roles-table-roles collapsed">');
        let $compactList = $(`<span class="roles-table-roles-collapsed">${userRoles[email]}</span>`);
        $tdP.append($compactList);
        let $ul = $('<ul class="roles-table-roles-expanded">');
        roleCodes.forEach(role=>{
            let hasRole = (roleList.indexOf(role)>=0);
            let $cb = $(`<input type="checkbox" id="${role}" name="${role}" ${hasRole?'checked':''}>`);
            roleCheckboxes[role] = $cb;
            $cb.on('click', updateList);
            let $label = $(`<label for="${role}">${roleDefinitions[role]}</label></li>`);
            $ul.append($('<li>').append($cb).append($label));
        });
        $tdP.append($ul);
        $tr.append($tdE).append($tdX).append($tdP);
        $('.roles-table-toggle', $tdX).on('click', ()=>{$tr.toggleClass('collapsed')});

        userRows[email] = $tr;

        return $tr;
    }

    /**
     * Expand one email's role list.
     * @param email The email to be expanded; all others are collapsed.
     */
    function expandOneRoleList(email) {
        Object.keys(userRows).forEach(e=>{
            userRows[e].toggleClass('collapsed', e!==email);
        });
    }

    function enableButtons() {
        addButton.enable();
        okButton.enable();
    }
    function disableButtons() {
        addButton.disable();
        okButton.disable();
    }

    /**
     * Creates a row in which user can type in a new email address.
     * OK (green check) adds a new row for the new user, with no roles, ready to be edited. The new user is
     *      expanded for editing, and this input row is removed.
     * Cancel (red X) removes this input row, without doing anything.
     * @returns {*|jQuery|HTMLElement|void}
     */
    function makeRowForInput() {
        expandOneRoleList('');
        $inputRow = $('<tr></tr>');
        let $td = $('<td colspan="3" class="roles-table-new-email"></td>');

        let $input = $('<input type="text" autofocus, placeholder="Email address of user">');
        let $div = $('<div>').append($input);
        let $ok= $('<button class="btn btn-success">✓</button>');
        $ok.on('click', ()=>{
            let newEmail = $input.val();
            if (userRows[newEmail]) {
                expandOneRoleList(newEmail);
            } else if (newEmail) {
                userRoles[newEmail] = '';
                let $tr = makeRowForUser(newEmail);
                $tbody.append($tr);
                expandOneRoleList(newEmail);
            }
            $inputRow.remove();
            enableButtons();
        });
        let $cancel = $('<button class="btn btn-danger">✗</button>');
        $cancel.on('click', ()=>{
            $inputRow.remove();
            enableButtons();
        });

        $td.append($cancel).append($ok).append($div);
        $inputRow.append($td);

        $tbody.append($inputRow);
        $input.focus();
        disableButtons();
        return $input;
    }

    /**
     * Builds a table containing user emails and roles.
     * @returns {void|jQuery|HTMLElement|*}
     */
    function buildRolesTable() {

        $table = $('<table class="roles-table"></table>table');
        $tbody = $table.append($('<tbody>'));

        // Empty any left-over cached row elements
        userRows = {}
        Object.keys(userRoles).forEach(email=>{
            let $tr = makeRowForUser(email);
            $tbody.append($tr);
        });
        return $table;
    }


    function applyChanges() {
        // For any empty role strings, remove the email entirely.
        let newRoles = {};
        Object.keys(userRoles).forEach(email=>{
            if (userRoles[email]) {
                newRoles[email] = userRoles[email];
            }
        });
        // Are there any changes?
        let changed = false;
        Object.keys(newRoles).forEach(email=>{
            if (!previousRoles[email] || newRoles[email] !== previousRoles[email]) {
                changed = true;
            }
        });
        Object.keys(previousRoles).forEach(email=>{
            if (!newRoles[email]) {
                changed = true;
            }
        });
        if (changed) {
            deferred.resolve({old:previousRoles, new:newRoles});
        } else {
            deferred.reject();
        }

    }

    /**
     * Edit a dictionary of roles: {email : roleStr}
     * @param options A dictionary with {name: name, roles: {email: roleStr} }
     */
    function edit(options) {
        let label = options.label || options.name;

        deferred = $.Deferred();

        previousRoles = {};
        let roles = options.roles || {};
        Object.keys(roles).forEach(e=>{previousRoles[e] = normalizeRoleString(roles[e])});
        userRoles = $.extend({}, true, previousRoles);
        $dialog = buildRolesTable(userRoles);

        var dlgOptions = {
            title: 'Roles defined for '+label,
            type: BootstrapDialog.TYPE_PRIMARY,
            message: $dialog,
            closable: true,
            closeByBackdrop: false,
            draggable: true,
            size: BootstrapDialog.SIZE_NORMAL,
            buttons: [{
                label: 'Add email',
                cssClass: 'button-float-left btn-default',
                id: 'edit-roles-add-user',
                action: function(dialogRef){
                    makeRowForInput();
                }
            }, {
                label: 'OK',
                id: 'edit-roles-ok',
                action: function(dialogRef){
                    applyChanges();
                    dialogRef.close();
                }
            }, {
                label: 'Cancel',
                action: function(dialogRef) {
                    dialogRef.close();
                }
            }]
        };
        dialog = new BootstrapDialog(dlgOptions);
        dialog.realize();
        addButton = dialog.getButton('edit-roles-add-user');
        okButton = dialog.getButton('edit-roles-ok');
        dialog.open();

        // Ack. Something jumps in and steals focus. 100ms isn't enough delay to get it back.
        if (Object.keys(userRoles).length === 0) {
            const focus = () => {
                let $input = makeRowForInput();
                $input.focus();
            };
            setTimeout(focus, 500);
        }

        return deferred.promise();
    }

    return {
        edit: edit
    }


}();
