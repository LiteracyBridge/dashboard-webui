/* jshint esversion:6, asi:true */
/* global
$,
BootstrapDialog,
Chart,
CognitoWrapper,
console,
RolesData,
RolesEditor,
Main,
User,
Utils,
*/

// noinspection ES6ConvertVarToLetConst
var RolesPage;

RolesPage = function () {
    'use strict';
    let PAGE_ID = 'roles-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    let roles_admin_html = `
        <div class="roles-builder form-inline" id="builder-basic2">
            <div class="roles-group-container roles-group-header">
                <div class="roles-label-holder"></div>

                <div class="roles-list-x">
                </div>
            </div>
        </div>
`;


    let program_roles = `
        <div class="roles-container roles-program-container">
            <div class="roles-label-holder"></div>
        </div>
    `;

    let org_roles = `
        <div class="roles-container roles-org-container">
            <div class="roles-org collapsed">
                <div class="roles-label-holder"></div>
                <div class="roles-list">
                </div>
            </div>
        </div>
    `;

    function userRolesEdit(email, roles) {
        let $dialog = $(`<p>${email} : ${roles[email]}</p>`);

        var dlgOptions = {
            title: 'Roles defined for '+email,
            message: $dialog,
            closable: true,
            closeByBackdrop: false,
            draggable: true,
            size: BootstrapDialog.SIZE_NORMAL,
            buttons: [{
                label: 'Close',
                action: function(dialogRef){
                    dialogRef.close();
                }
            }]
        };
        var dialog = BootstrapDialog.show(dlgOptions);

    }




    /**
     * Builds a label for roles. When the label is clicked, opens a role editor.
     * @param options with {type:program_or_org, name:obj_name, roles:{emal:roles,...}}
     * @returns {*|jQuery|HTMLElement}
     */
    function rolesLabel(options) {
        let type = options.type || 'org';
        let label = options.label || options.name;

        let btn = 'btn-success';
        let labelClass = type + '-label';
        if (type === 'program') {
            btn = 'btn-default';
            labelClass = type + '-label'
        }

        let roles_label = `
            <div class="role-label-container ${labelClass}">
                <span class="roles-label-text-span">
                    <span class="role-list-toggle expand-role-list">+</span>
                    <span class="role-list-toggle collapse-role-list">-</span>
                    <img class="roles-image roles-org-image" src="images/org.png"/>
                    <img class="roles-image roles-program-image" src="images/tb.png"/>
                    <span id="roles-label-text" class="btn-xs ${btn} active"></span>
                </span>
                <span id="roles-edit-button" class="btn-xs btn-light roles-edit-button">Edit:</span>
                <span class="roles-label-roles-span active"></span>
            </div>
        `;

        let $html = $(roles_label);
        $('#roles-label-text', $html).text(label);

        if (options.expandToggle) {
            $('.roles-label-text-span', $html).on('click', () => {
                options.expandToggle.toggleClass(options.expandToggleClass||'collapsed');
                let isCollapsed = options.expandToggle.hasClass('collapsed');
                // If we collapsed, and the option to collapse children of a specific class is set, do that now.
                if (isCollapsed && options.expandToggleChildClass) {
                    $('.'+options.expandToggleChildClass, options.expandToggle).toggleClass('collapsed', isCollapsed);
                }
            });
        }

        let $roles = $('.roles-label-roles-span', $html);
        let $button = $('.roles-edit-button', $html);
        function fillRoles() {
            $roles.empty();
            if (options.roles && Object.keys(options.roles).length>0) {
                $roles.toggleClass('no-roles', false);
                let roleList = Object.keys(options.roles).map(key=>`${key}:${options.roles[key]}`);
                $roles.text(roleList.join('; '));
                $html.prop('title', roleList.join('\n'));
            } else {
                $roles.toggleClass('no-roles', true);
                $roles.append($('<span>No direct roles.</span>'));
                $html.prop('title', '');
            }
        }
        $button.on('click', ()=>{
            RolesEditor.edit(options).done(result=>{
                // options.roles = result.new;
                // Out with the old, in with the new, but keep the same object.
                Object.keys(options.roles).forEach(k => { delete options.roles[k]; });
                Object.keys(result.new).forEach(k => {options.roles[k] = result.new[k];});
                fillRoles();
                // Update the roles for a single Program or Organization.
                RolesData.updateRoles({old:result.old, new:result.new, type:options.type, name:options.name})
                    .done(result=>{
                        console.log('result: '+result);
                    })
                    .fail(err=>{
                        console.log('failed')
                    })
            });
        });
        fillRoles();

        return $html;
    }


    function getHtmlForProgram(program) {
        let $html = $(program_roles);
        let labelOptions = {
            name: program.name,
            type: 'program',
            roles: program.roles || (program.roles={})
        };
        let $label = rolesLabel(labelOptions); // $('#program-label', $html);
        $('.roles-label-holder', $html).append($label); // '$label.text(program.name);
        return $html;
    }

    function getHtmlForOrg(org) {
        let orgName = org.name || 'Organization?';
        let $html = $(org_roles);
        let $org = $('.roles-org', $html);
        let $list = $('.roles-list', $html);
        let $labelHolder = $('.roles-label-holder', $html);
        let labelOptions = {
            name: orgName,
            type: 'org',
            expandToggle: $org,
            expandToggleChildClass: 'roles-org',
            expandToggleClass: 'collapsed',
            roles: org.roles || (org.roles={})
        };
        let $label = rolesLabel(labelOptions);
        $labelHolder.append($label); // $label.text(orgName);
        if (org.programs && org.programs.length > 0) {
            org.programs.forEach(program => {
                $list.append(getHtmlForProgram(program));
            });
        }
        if (org.orgs && org.orgs.length > 0) {
            org.orgs.forEach(child => {
                $list.append(getHtmlForOrg(child))
            });
        }
        return $html;
    }

    function getHtmlForUser(roles) {
        let user_label = `
            <div class="role-label-container user-label">
                <span class="roles-label-text-span">
                    <img class="roles-image" src="images/person.png"/>
                    <span><span class="roles-label-text roles-user-label-text btn-xs btn btn-default active">${roles.name}</span>
                     is an admin for these Organizations and Programs.</span>
                </span>
            </div>
        `;

        let name = roles.name;
        let $html = $(roles_admin_html);
        let $list = $('.roles-list-x', $html);
        let $label = $(user_label);
        let $labelHolder = $('.roles-label-holder', $html);
        $labelHolder.append($label);

        if (roles.programs && roles.programs.length > 0) {
            roles.programs.forEach(program => {
                $list.append(getHtmlForProgram(program))
            });
        }
        if (roles.orgs && roles.orgs.length > 0) {
            roles.orgs.forEach(child => {
                $list.append(getHtmlForOrg(child))
            });
        }
        // If there is only one org, expand it.
        if ((!roles.programs || roles.programs.length === 0) && (roles.orgs && roles.orgs.length === 1)) {
            $list.children(0).children(0).toggleClass('collapsed', false);
        }

        $('#roles-admin-container').empty().append($html);
    }

    let initialized = false;

    function show() {
        if (!initialized) {
            // initialized = true;
            let user = User.getUserAttributes();
            // if (user && user.email && user.email.startsWith('bill@amplio')) {
            //     $('#usage-test-query').on('click', () => {
            //         // get3()
            //     })
            // } else {
            //     $('#usage-test-query').hide()
            // }

            RolesData.getAdmin().done(result=>{
                getHtmlForUser(result.output);
                Main.setParams(PAGE_ID, {});
            });

        }
    }

    function hidden() {
        // Prevent a flash of previous user's data when returning to the page.
        $('#roles-admin-container').empty();
    }

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show);
    $(PAGE_HREF).on('hidden.bs.tab', hidden)

    return {}
}();
