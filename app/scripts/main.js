/**
 * Created by bill on 3/2/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, ProjectDetailsData, BootstrapDialog, User, AWS, CognitoWrapper, URLSearchParams */

var Main = Main || {};

Main = (function () {
    'use strict';

    var ROOT_PATH;

    var applicationPathPromise;

    var allProjectsList;
    var filteredProjects;

    // Map page names to a short code, and back. Add to the list. Do not reuse letters.
    let shortToLong = {
        'a': 'installation-detail-page',
        'b': 'installation-progress-page',
        'c': 'inventory-page',
        'd': 'overview-page',
        'e': 'project-details-page',
        'f': 'usage-details-page',
        'g': 'userfeedback-page',
        'h': 'checkout-page'
    }
    let longToShort = {}
    Object.keys(shortToLong).forEach(k=>longToShort[shortToLong[k]]=k)


    /**
     * Determines the path to statistics data. Uses trial-and-error.
     */
    function getApplicationPath() {
        function parsePaths(list) {
            // The projects list file is a .csv with data like:
            // project,path
            // UWR,UWR/
            // MEDA,MEDA/
            // ...
            allProjectsList = $.csv.toObjects(list, {separator: ',', delimiter: '"'});
        }

        if (!applicationPathPromise) {
            applicationPathPromise = $.Deferred();
            // We know the file 'project_list.csv' should exist in a 'data' directory. If we can find it
            // at the absolute path '/dashboard-lb-stats/data/project_list.csv', then our code can be in
            // any other path, but we can still find the data. That's great! We can run multiple versions
            // of the code, for production and testing, and can all read the same data.
            $.get('/dashboard-lb-stats/data/project_list.csv')
                .then((data) => {
                    ROOT_PATH = '/dashboard-lb-stats/';
                    applicationPathPromise.resolve(ROOT_PATH);
                    parsePaths(data);
                }, (err) => {
                    // But, if we can't find the data at '/dashboard-lb-stats/...', maybe this is a test running
                    // locally on the dev's machine. In that case, try to find the data relative to where this
                    // code is running. If we find it, cool, we can test with some local data.
                    $.get('data/project_list.csv')
                        .then((data) => {
                            ROOT_PATH = '';
                            applicationPathPromise.resolve(ROOT_PATH);
                            parsePaths(data);
                        }, (err) => {
                            applicationPathPromise.reject(err);
                        })
                })
        }
        return applicationPathPromise;
    }

    // slice off the leading ? or #
    let initialParams = new URLSearchParams(location.search.slice(1));
    let initialHash = location.hash.slice(1)

    function setParams(page, values) {
        let params = new URLSearchParams();
        Object.keys(values).forEach(k=>params.set(k, values[k]));
        let shortPage = longToShort[page] || page
        params.set('q', shortPage);
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
            delayTimeout =setTimeout(delayedSpinner, delayTime);
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


    function onSignedIn() {
        function filterProjects() {
            var paths = {};
            allProjectsList.filter(row=>User.isViewableProject(row.project)).forEach((el) => {
                paths[el.project] = el.path
            });
            filteredProjects = paths;
        }
        function setGreeting() {
            var attributes = User.getUserAttributes();
            var greeting = attributes['custom:greeting'] || attributes.email;
            if (greeting) {
                $('#greeting').text(greeting);
            }
        }
        $('body').on('custom:greeting', setGreeting);
        setGreeting();

        getApplicationPath().then(() => {
            User.getUserProperties()
                .then(() => {
                    filterProjects();
                    if (User.isAdminUser()) {
                        $('#admin-menu').removeClass('hidden');
                    }
                    // Enable Bootstrap tabbing.
                    $('#main-nav a.main-nav').on('click', function (e) {
                        e.preventDefault()
                        $(this).tab('show')
                    })
                    $('#splash h3').removeClass('invisible');

                    if (initialParams && initialParams.get('q')) {
                        let tab = initialParams.get('q');
                        let longPage = shortToLong[tab] || tab;
                        if (tab) {
                            $('#main-nav a[href="#' + longPage + '"]').tab('show');
                        }
                    } else if (initialHash) {
                        $('#main-nav a[href="#' + initialHash + '"]').tab('show');
                    }
                });
        });

        var attributes = User.getUserAttributes();
        if (attributes.email_verified === 'false') {
            $('li.verify-email').removeClass('hidden');
        }

    }

    /**
     * Sign out the user, and reset the UI.
     * @param evt
     */
    function doSignout(evt) {
        User.signout();
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
        User.authenticate().done(onSignedIn);
    }

    function doDeleteAccount() {
        User.deleteAccount().then(doSignout);
    }

    function init() {
        getApplicationPath();
        User.authenticate().done(onSignedIn);
        $('a#menu-signout').on('click', doSignout);
        $('a#menu-change-password').on('click', User.changePassword);
        $('a#menu-change-greeting').on('click', User.changeGreeting);
        $('a#menu-delete-account').on('click', doDeleteAccount);
        $('a#menu-verify-email').on('click', User.verifyEmail);
    }

    setTimeout(init, 0);

    // Services that are global can be exposed here.
    return {
        getApplicationPath: ()=>applicationPathPromise,
        getRootPath: ()=>{return ROOT_PATH},

        hasParam: ()=>false,
        getParams: ()=>{let r=initialParams; initialParams=undefined; return r},
        setParams: setParams,

        incrementWait: incrementWait,
        decrementWait: decrementWait,
        clearWait: clearWait,

        getProjectPaths: ()=>{return filteredProjects;},
        getProjectList: ()=>{return Object.keys(filteredProjects);}
    }
})();
