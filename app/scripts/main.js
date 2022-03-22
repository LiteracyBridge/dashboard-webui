/**
 * Created by bill on 3/2/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, ProgramDetailsData, RolesData, BootstrapDialog, AWS, Authentication, URLSearchParams */

var Main = (function () {
    'use strict';

    // Does the user have an admin role in *any* program? If so, we'll show the admin menu items.
    let _isAdmin;

    // Roles, friendly name, and repository of the user's programs.
    let programsInfo = {};
    // Map from (possibly decorated) friendly name back to program id.
    let programNames2Id = {};
    let programIds2Name = {};
    // List of program ids and names, suitable for dropbdown program selection.
    let dropdownProgramsList = []

    let PAGE_PARAM = 'pp';

    // Map page names to a short code, and back. Add to the list. Do not reuse letters.
    let shortToLong = {
        'a': 'installation-detail-page',
        'b': 'installation-progress-page',
        'c': 'inventory-page',
        'd': 'overview-page',
        'e': 'project-details-page',
        'f': 'usage-details-page',
        'g': 'userfeedback-page',
        'h': 'checkout-page',
        'i': 'program-specification-page',
        'j': 'roles-page',
        'k': 'visualization-page',
    };
    let longToShort = {};
    let adminPages = ['checkout-page', 'roles-page'];
    Object.keys(shortToLong).forEach(k => longToShort[shortToLong[k]] = k);


    // slice off the leading ? or #
    let initialParams = new URLSearchParams(location.search.slice(1));
    let initialHash = location.hash.slice(1);

    function setParams(page, values) {
        let params = new URLSearchParams();
        Object.keys(values).forEach(k => {
            if (k === PAGE_PARAM) {
                throw('parameter collision');
            }
            params.set(k, values[k]);
        });
        let shortPage = longToShort[page] || page;
        params.set(PAGE_PARAM, shortPage);
        let newUrl = new URL(location);
        newUrl.search = params;
        window.history.replaceState({}, '', newUrl);
    }


    var waitCount = 0;
    let delayTime = 500;
    var delayTimeout;

    function delayedSpinner() {
        $('#wait-spinner').show();
        delayTimeout = null;
        //console.log('setting wait spinner');
    }

    function incrementWait(immediate) {
        if (waitCount++ === 0 && !immediate) {
            //console.log('setting wait spinner timeout');
            delayTimeout = setTimeout(delayedSpinner, delayTime);
        }
        if (immediate) {
            delayedSpinner();
        }
    }

    function decrementWait() {
        if (--waitCount === 0) {
            //console.log('clearing wait spinner timeout');
            clearTimeout(delayTimeout);
            delayTimeout = null;
            $('#wait-spinner').hide();
        }
    }

    function clearWait() {
        //console.log('*clearing wait spinner timeout');
        waitCount = 0;
        clearTimeout(delayTimeout);
        delayTimeout = null;
        $('#wait-spinner').hide();
    }

    /**
     * Given a program name, either a program id or a (possibly decorated) friendly name, return the program name.
     * @param program name or id
     * @returns the program name
     */
    function getProgramNameForProgram(program) {
        return programIds2Name[program] ? programIds2Name[program] : program;
    }

    /**
     * Given a program name, either a program id or a (possibly decorated) friendly name, return the program id.
     * @param program name or id
     * @returns the programid
     */
    function getProgramIdForProgram(program) {
        return programsInfo[program] ? program : programNames2Id[program];
    }

    function userHasRoleInProgram(role, program) {
        let programid = getProgramIdForProgram(program);
        let roles = programid && programsInfo[programid] && programsInfo[programid].roles;
        return roles && roles.length && (roles.indexOf(role) >= 0 || roles.indexOf('*') >= 0);
    }

    /**
     * Finishes setting up the UI after login is complete.
     */
    function finishUiSetup() {
        // Enable Bootstrap tabbing.
        $('#main-nav a.main-nav').on('click', function (e) {
            e.preventDefault();
            $(this).tab('show')
        });
        $('#splash h3').removeClass('invisible');

        let gotoPage = ';';
        if (initialParams && (initialParams.get(PAGE_PARAM) || initialParams.get('q'))) {
            let tab = initialParams.get(PAGE_PARAM) || initialParams.get('q');
            let longPage = shortToLong[tab] || tab;
            if (tab) {
                gotoPage = longPage;
            }
        } else if (initialHash) {
            gotoPage = initialHash;
        }
        if (gotoPage && adminPages.indexOf(gotoPage) < 0 || _isAdmin) {
            $('#main-nav a[href="#' + gotoPage + '"]').tab('show');
        }
        if (_isAdmin) {
            $('#admin-menu').removeClass('hidden');
        }
    }

    function onSignedIn() {
        function setGreeting() {
            var attributes = Authentication.getUserAttributes();
            var greeting = attributes['name'] || attributes.email;
            if (greeting) {
                $('#greeting').text(greeting);
            }
        }
        $('body').on('name', setGreeting);
        setGreeting();

        let programsPromise = RolesData.getPrograms();

        programsPromise.done((result)=>{
            console.log(result);
            let programNames = {};
            let dupIds = {}; // ids with duplicate names
            programsInfo = result.programs;
            // Build a list of programs with duplicate names. In the list of programs, we'll decorate those
            // with the program.
            Object.keys(programsInfo).forEach(id => {
                let name = programsInfo[id].name.toLowerCase();
                if (programNames[name]) {
                    // We've seen this name before; this id and the previous id are both duplicates.
                    dupIds[id] = id;
                    dupIds[programNames[name]] = programNames[name];
                }
                programNames[name] = id;
            });
            // Given a list of ids with duplicate names, build a map of (possibly decorated) program name to programid.
            Object.keys(programsInfo).forEach(id => {
                let name = programsInfo[id].name + (dupIds[id] ? ' (' + id + ')' : '');
                programNames2Id[name] = id;
                programIds2Name[id] = name;
            });
            // Friendly names in a nice sorted order.
            let userPrograms = Object.keys(programNames2Id).sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase()));
            // Structure to populate the dropbodown list of programs, with programid as value, and friendly name as label.
            dropdownProgramsList = userPrograms.map(name => ({'label':name, 'value':programNames2Id[name]}) );
            // In which programs, if any, is the user an admin?
            let userAdmin = userPrograms.filter(p=>userHasRoleInProgram('AD', p));
            _isAdmin = userAdmin.length>0;

            finishUiSetup();
        });

        var attributes = Authentication.getUserAttributes();
        if (!attributes.email_verified) {
            $('li.verify-email').removeClass('hidden');
        }

    }

    /**
     * Logout the user, and reset the UI.
     * @param evt
     */
    function doLogout(evt) {
        Authentication.signout();
        // Disable tabbing.
        $('#main-nav a.main-nav').off('click');
        // Re-show splash screen.
        $('#main-nav a.main-nav:first').tab('show');
        // Invisible still takes up space, you just can't see it. Use it so things don't move on screen,
        // just appear and disappear.
        $('#splash h3').addClass('invisible');
        // Whereas hidden takes things out of the flow.
        $('#admin-menu').addClass('hidden');
        $('li.verify-email').addClass('hidden');
        Authentication.authenticate().done(onSignedIn);
    }

    function doDeleteAccount() {
        Authentication.deleteAccount().then(doLogout);
    }

    function init() {
        Authentication.authenticate().done(onSignedIn);
        $('a#menu-logout').on('click', doLogout);
        $('a#menu-change-password').on('click', Authentication.changePassword);
        $('a#menu-change-greeting').on('click', Authentication.changeGreeting);
        $('a#menu-delete-account').on('click', doDeleteAccount);
        $('a#menu-verify-email').on('click', Authentication.verifyEmail);

        $('[data-toggle="tooltip"]').tooltip();
    }

    setTimeout(init, 0);

    // Services that are global can be exposed here.
    return {
        hasParam: ()=>false,
        getParams: ()=>{let r=initialParams; initialParams=undefined; return r},
        setParams: setParams,

        incrementWait: incrementWait,
        decrementWait: decrementWait,
        clearWait: clearWait,

        dropdownProgramsList: ()=>dropdownProgramsList,
        getProgramIdForProgram: (program)=>getProgramIdForProgram(program),
        getProgramNameForProgram: (program)=>getProgramNameForProgram(program),
        getProgramIdsForUser: ()=>Object.keys(programsInfo),
        userHasRoleInProgram: userHasRoleInProgram,

    }
})();
