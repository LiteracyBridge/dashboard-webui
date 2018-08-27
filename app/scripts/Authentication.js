/**
 * Created by bill on 4/17/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* global $, BootstrapDialog, console, CognitoWrapper, Main, AWS */


var User = User || {};

User = (function () {
    'use strict';

    /**
     * NOTE: Tabbing doesn't natively work properly with Bootstrap Dialogs. Buttons
     * wrapped in divs, and inputs inside divs or spans need their enclosing elements
     * to be tabable (by having a tabindex= property). Unfortunately, that causes
     * tabbing to stop at those enclosing elements; completely unexpected and un-
     * wanted behaviour.
     *
     * To work around the problem, decorate the nested elements a class="nested-tab",
     * and then call fixTabOrdering() on the created HTML.
     *
     * See that function for the grisly details.
     */

    /**
     * In all of these HTML fragments, add autocorrect="off" autocapitalize="none" to
     * input fields, including passwords. Passwords won't autocorrect or autocapitalize,
     * but user may turn on "show passwords", which turns them to text fields.
     */

    var signInHtml = `<div id="auth-dialog" class="auth-dialog">
    <form class="panel panel-default">
      <div class="panel-body container-fluid">
            <div>
                <input id="username" type="text" class="form-control"
                       placeholder="User Name or Email Address"
                       aria-describedby="basic-addon1" autofocus 
                       autocorrect="off" autocapitalize="none">
                <input id="password" type="password" class="password form-control"
                       placeholder="Password"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none">
                <span>
                    <input type="checkbox" id="show-password" class="nested-tab">
                    <label for="show-password" class="light-checkbox"> Show password</label>
                </span>
                <div class="btn-group pull-right" role="group">
                    <button id="forgot-password" type="button" class="btn btn-link preserve-case nested-tab" tabindex="1">Forgot password?
                    </button>
                </div>
                <br/>
                <span>
                    <input type="checkbox" id="remember-me" class="nested-tab">
                    <label for="remember-me" class="light-checkbox"> Remember me</label>
                </span>
            </div>
        </div>
        <div class="panel-body container-fluid no-pad-top">
            <div class="btn-group" role="group">
                <button id="do-signin" type="submit" class="btn btn-default nested-tab">Sign In</button>
            </div>
            <div class="btn-group pull-right" role="group">
                <button id="create-account" type="button"
                        class="btn btn-link preserve-case nested-tab" tabindex="1">No user id? Click here!
                </button>
            </div>
        </div>
        <div class="panel-footer alert-area">
        </div>
    </form>
</div>`;

    var createAccountHtml = `<div class="auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h2 class="panel-title">Create New Account</h2>
        </div>
        <div class="panel-body container-fluid">
            <div>
                <input id="newusername" type="text" class="form-control"
                       placeholder="User Name"
                       aria-describedby="basic-addon1" autofocus
                       autocorrect="off" autocapitalize="none">
                <input id="newuseremail" type="text" class="form-control"
                       placeholder="Email Address"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none">
                <input id="newphone" type="text" class="form-control"
                       placeholder="Phone Number"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none">
                <input id="newpassword" type="password" class="password newpassword form-control"
                       placeholder="Passw0rd!"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none">
                <input id="newpassword2" type="password" class="password newpassword form-control"
                       placeholder="Repeat Passw0rd!"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none">
                <span>
                    <input type="checkbox" id="show-password" class="nested-tab">
                    <label for="show-password" class="light-checkbox"> Show password</label>
                </span>
                <span id="password-mismatch" class="password-mismatch">Passwords don't match.</span>
            </div>
        </div>
        <div class="panel-body container-fluid no-pad-top">
            <div class="btn-group" role="group">
                <button id="do-create" type="submit" class="btn btn-default nested-tab">Create Account</button>
            </div>
        </div>
        <div class="panel-footer">
        </div>
    </form>
</div>`;

    var createAccountHelpHtml = `<h3>Create An Account</h3>
        <p>Pick a user name, whatever you like, but all user names must be unique, so you may not get
         your first choice. That's OK, because your email address is what really identifies you uniquely
         to the system.</p>
         <p>Enter your 'work' email address. Your phone number is optional, but if you want to provide it,
         you must use the format +18887771234.</p>
         <p>Passwords must be at least 8 characters, with at least one capital letter, one lower case letter,
         and one digit. Special characters are OK.</p>
         <p>After filling the form and clicking 'Create Account', you'll get a code in your email,
         and you'll enter that code into the next form.</p>
         <If your email address is @literacybridge.org or @centreforbcc.com, you can get an account
         automatically. If your email address is @ something else, contact your administrator to add your email
         address to the system first.
        <p>When you sign in, you can use your email address, or your user name.</p>
        `

    var changePasswordHtml = `<div class="auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h2 class="panel-title">Change Password</h2>
        </div>
        <div class="panel-body container-fluid">
            <div>
                <input id="oldpassword" type="password" class="password form-control"
                       placeholder="Current Passw0rd!"
                       aria-describedby="basic-addon1" autofocus
                       autocorrect="off" autocapitalize="none">
                <input id="newpassword" type="password" class="password newpassword form-control"
                       placeholder="New Passw0rd!"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none">
                <input id="newpassword2" type="password" class="password newpassword form-control"
                       placeholder="Repeat Passw0rd!"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none">
                <span>
                    <input type="checkbox" id="show-password" class="nested-tab">
                    <label for="show-password" class="light-checkbox"> Show password</label>
                </span>
                <span id="password-mismatch" class="password-mismatch">Passwords don't match.</span>
            </div>
        </div>
        <div class="panel-body container-fluid no-pad-top">
            <div class="btn-group" role="group">
                <button id="do-change" type="submit" class="btn btn-default nested-tab">Change Password</button>
            </div>
        </div>
        <div class="panel-footer">
        </div>
    </form>
</div>`;

    var confirmDeleteHtml = `<div class="auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h2 class="panel-title">Delete Account</h2>
        </div>
        <div class="panel-body container-fluid">
            <div>
                <p>Are you sure you want to delete your account? This can not be un-done, however, no data
                will be lost or removed. You can recreate your account again later.</p>
                <p>Note that this is only the account used to sign in to the Dashboard and TB-Loader, and is 
                 completely independent of any email or computer account.</p>
            </div>
        </div>
        <div class="panel-body container-fluid no-pad-top">
            <!-- div class="btn-group" role="group" -->
                <button id="do-delete" type="submit" class="btn btn-danger nested-tab">Delete Account</button>
                <button id="cancel-delete" type="submit" class="btn btn-default nested-tab">Cancel</button>
            <!-- /div -->
        <div class="panel-footer">
        </div>
    </form>
</div>`;

    var confirmAccountHtml = `<div class="auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title">Create account: confirmation</h3>
        </div>
        <div class="panel-body container-fluid">
            <div>
                <input id="confirmation-code"  type="text" class="form-control" placeholder="Confirmation code"
                       aria-describedby="basic-addon1" autofocus autocorrect="off" autocapitalize="none">
            </div>
        </div>
        <div class="panel-body container-fluid no-pad-top">
            <div class="btn-group" role="group">
                <button id="do-confirm" type="submit" class="btn btn-default nested-tab">Confirm</button>
            </div>
            <div class="btn-group pull-right" role="group">
                <button id="resend-code" type="button" class="btn btn-default nested-tab">Click to resend confirmation</button>
            </div>
        </div>
        <div class="panel-footer">
        </div>
    </form>
</div>`;

    var confirmPasswordHtml = `<div class="ngdialog-message auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title">Reset password</h3>
        </div>
        <div class="panel-body container-fluid">
            <p>Your account has been reset by the administrator. Please enter a new password, and
                the Passwrd Reset Code from the server. If you do not have a Password Reset Code,
                please contact the administrator.</p>
            <input id="newpassword"  type="password" class="password newpassword form-control"
                   placeholder="Passw0rd!"
                   aria-describedby="basic-addon1" autofocus
                   autocorrect="off" autocapitalize="none">
            <input id="newpassword2"  type="password" class="password newpassword form-control"
                   placeholder="Repeat Passw0rd!"
                   aria-describedby="basic-addon1"
                   autocorrect="off" autocapitalize="none">

            <span>
                <input type="checkbox" id="show-password" class="nested-tab">
                <label for="show-password" class="light-checkbox"> Show password</label>
            </span>
            <span id="password-mismatch" class="password-mismatch" >Passwords don't match.</span>
            <div>
                <input id="confirmation-code" type="text"  class="form-control"
                       placeholder="Password reset code"
                       aria-describedby="basic-addon1" autocorrect="off" autocapitalize="none">
            </div>
        </div>
        <div class="panel-body container-fluid no-pad-top">
            <div class="btn-group" role="group">
                <button id="do-reset" type="submit" class="btn btn-default nested-tab">Reset</button>
            </div>
        </div>
        <div class="panel-footer">
        </div>
    </form>
</div>`;

    var changeGreetingHtml = `<div class="auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title">Change Preferred Greeting</h3>
        </div>
        <div class="panel-body container-fluid">
            <div>
                <p id="old-greeting-reminder" class="hidden">Your current greeting is <em><span id="old-greeting"></span></em></p>
                <input id="new-greeting"  type="text" class="form-control" placeholder="Call me the breeze."
                       aria-describedby="basic-addon1" autofocus autocorrect="off" autocapitalize="none">
            </div>
        </div>
        <div class="panel-body container-fluid no-pad-top">
            <div class="btn-group" role="group">
                <button id="do-change" type="submit" class="btn btn-default nested-tab">Change</button>
            </div>
        </div>
        <div class="panel-footer">
        </div>
    </form>
</div>`;


    /**
     * Helper function to make the given window draggable. This is done by wrapping the window inside
     * a draggable wrapper.
     * @param target The window to be made draggable.
     * @returns {*|jQuery|HTMLElement} The draggable wrapper.
     */
    function makeWindowDraggable(target) {
        // Lazily add the draggable addin to jQuery.
        if (!$.fn.draggable) {
            $.fn.draggable = function (opt) {
                opt = $.extend({handle: '', cursor: 'move'}, opt);
                var $el = (opt.handle === '') ? this : this.find(opt.handle);

                return $el.css('cursor', opt.cursor).on('mousedown', function (e) {
                    var $drag;
                    if (opt.handle === '') {
                        $drag = $(this).addClass('draggable');
                    } else {
                        $drag = $(this).addClass('active-handle').parent().addClass('draggable');
                    }
                    var z_idx = $drag.css('z-index'),
                        ofs_y = $drag.offset().top - e.pageY,
                        ofs_x = $drag.offset().left - e.pageX;
                    $drag.css('z-index', 2000).parents().on('mousemove', function (e) {
                        var css = {
                            position: 'absolute',
                            top: e.pageY + ofs_y,
                            left: e.pageX + ofs_x
                        };

                        $('.draggable').css(css)
                            .on('mouseup', function () {
                                $(this).removeClass('draggable').css('z-index', z_idx);
                            });
                    });
                    e.preventDefault(); // disable selection
                }).on('mouseup', function () {
                    if (opt.handle === '') {
                        $(this).removeClass('draggable');
                    } else {
                        $(this).removeClass('active-handle').parent().removeClass('draggable');
                    }
                });
            }
        }

        var $elem = $(`<div id="nonm" class="auth-dialog-help container container-fluid alert alert-info alert-dismissable">
                <button type="button" class="close" data-dismiss="alert" aria-hidden="true">x</button>
                <div id="wrapper"></div>
                <button id="do-create" type="button" class="btn btn-info pull-right" data-dismiss="alert">Dismiss Help</button>
            </div>`);

        $('#wrapper', $elem).append(target);
        $elem.draggable();

        return $elem;
    }

    /**
     * Creates an object to add warning and error messages to a dialog.
     * @param $parent Element that will hold any active messages.
     * @returns {{$parent: *, warning: warning, error: error, clear: clear}}
     */
    function addNotificationArea($parent) {

        var alerter = {
            $parent: $parent,
            notify: function (msg) {
                var $msgElement = $('<div id="alert-trivial-message" class="alert alert-info"</div>');
                $msgElement.text(msg);
                this.$parent.empty().append($msgElement);
            },
            warning: function (msg) {
                var $msgElement = $('<div id="alert-trivial-message" class="alert alert-warning"</div>');
                $msgElement.text(msg);
                this.$parent.empty().append($msgElement);
            },
            error: function (msg) {
                var $msgElement = $(`<div class="alert alert-danger" role="alert">
        <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
        <span class="sr-only">Error:</span><span id="alert-danger-message"></span>
        </div>`);
                $('#alert-danger-message', $msgElement).text(msg);
                this.$parent.empty().append($msgElement);
            },
            clear: function () {
                this.$parent.empty();
            }
        }

        $parent.empty();
        return alerter;
    }

    /**
     * Adds utilities for standard password functions: show/hide, correlate two.
     * @param $dialog
     */
    function addPasswordUtils($dialog) {
        var newPassword = $('.newpassword', $dialog);
        // show/hide
        $('#show-password', $dialog).on('click', () => {
            var showPassword = $('#show-password', $dialog).prop('checked');
            $('.password', $dialog).attr('type', showPassword ? 'text' : 'password');
        });
        // If there are two passwords, when they're unequal, light up "mismatch"
        if (newPassword.length === 2) {
            $('.newpassword', $dialog).on('input', () => {
                console.log('password length: ' + newPassword.length);
                console.log('password[0]: ' + newPassword[0]);
                console.log('$(password[0]): ' + $(newPassword[0]));
                console.log('$(password[0]).val(): ' + $(newPassword[0]).val());
                var p1 = $(newPassword[0]).val();
                var p2 = $(newPassword[1]).val();
                var mismatch = (p1.length > 0 && p2.length > 0 && p1 !== p2);
                $('#password-mismatch', $dialog)[mismatch ? 'show' : 'hide']();
            });
        }
        $('#password-mismatch', $dialog).hide();
    }

    /**
     * This is an unfortunately complicated function to make tabbing work correctly in a Bootstrap Dialog.
     *
     * It assumes that the dialog, passed in $dialog, uses 'tabindex=' decorations to control anything that should
     * be outside of the "natural" tab order (document order). It assumes that anything that should be in the natural
     * order has no 'tabindex=' decoration.
     *
     * 'input' and 'button' elements with no 'tabindex=' will be explicitly set to tabindex=1. Anything that was previously
     * 'tabindex=1' will be set to 'tabindex=2' and so forth.
     *
     * If an element is nested inside a <div> or <span>, it may need special handling to be tabbed. By marking those
     * elements 'class="nested-tab"', the parent will be given the same tabindex (probably 1), and will receive
     * special handling.
     *
     * The special handling: When the parent of a '.nested-tab' element receives focus:
     * - if the element tabbing from is NOT the child, focus is set to the child.
     * - if the element tabbing from IS the child:
     * --  we get the elements with the same tabindex=, and find the element receiving focus (the parent of a '.nested-tab' element.)
     * --  If that element is not first in the list, back up one, and set focus to that element.
     * --  Else if that element is first in the list, get the list of elements at tabindex=N-1, and set focus to the last
     *       in the list.
     * @param $dialog The dialog to fix up.
     */
    function fixTabOrdering($dialog) {
        function bumpTabIndex(ix) {
            const list = $(`[tabindex=${ix}]`, $dialog);
            if (list && list.length) {
                // We're about to push these tabindex=${ix} elements to ix+1. Move any existing ones out of the way.
                bumpTabIndex(ix+1);
                list.attr('tabindex', ix+1);
            }
        }

        // If anything has tabindex=1, bump them to 2, because we're going to use 1.
        bumpTabIndex(1);

        // Controls with no tab-index get a tabindex of 1.
        $('input:not([tabindex])', $dialog).attr('tabindex', 1);
        $('button:not([tabindex])', $dialog).attr('tabindex', 1);

        // Parents of elements with .nested-tab get those elements' tabindex.
        let nesteds = $('.nested-tab', $dialog);
        nesteds.each((ix, nested)=>{
            let tabix = $(nested).attr('tabindex');
            $(nested).parent().attr('tabindex', tabix);
        });

        // $(':not([tabindex]):has(>.nested-tab)', $dialog).attr('tabindex', 1)

        // These are non-focusing elements that have nested focusing elements.
        let needsFixup = $(':has(>.nested-tab)', $dialog);
        // Move focus forward or backward from the non-focusing elements.
        needsFixup.focus(
            function (focusEvent) {
                // What control is being wrapped?
                let $this=$(this);
                let $nestedTarget = $('input', $this);
                if (!$nestedTarget || !$nestedTarget.length) {
                    $nestedTarget = $('button', $this);
                }
                // Where is focus coming *from*?
                const $relatedTarget = $(focusEvent.relatedTarget);
                // If focus is not FROM the wrapped control, it must be TO it.
                if (!$nestedTarget.is($relatedTarget)) {
                    $nestedTarget.focus();
                } else {
                    // This element is a container for a .nested-tab element; call it 'the container element'.
                    // We need to try to find the element that would advance forward to the container element. Call
                    // that element 'prev'.
                    let prev;
                    // Find the tabindex of the container element, and the list of all elements with the same tabindex
                    let thisTabix = $this.attr('tabindex');
                    let sameTabixElements = $(`[tabindex=${thisTabix}]`, $dialog);
                    // console.log('reverse tab, peers:', sameIxElements);
                    // Examine the elements at this tabindex, and find the container element.
                    sameTabixElements.each((ix, peer)=>{
                        if ($(peer).is($this)) {
                            // Found the container element. If there are preceeding elements in the list with same tabindex
                            // the prev element is the immediately preceeding element
                            // console.log('found match, ix:', ix, ', element: ', $(sameIxElements[ix]));
                            if (--ix >= 0) {
                                prev = $(sameTabixElements[ix]);
                                // console.log('Prev is at same tabindex level: ', prev);
                            } else {
                                // Otherwise, there are no preceeding elements at this tabindex, so find the list of
                                // elements at a lower tabindex, and take the last item from the list.
                                let lowerTabixElements = $(`[tabindex=${thisTabix-1}]`, $dialog);
                                // console.log('Prev is at lower tabindex, in: ', previousLevel);
                                if (lowerTabixElements && lowerTabixElements.length) {
                                    prev = $(lowerTabixElements[lowerTabixElements.length-1]);
                                    // console.log('Prev is at lower tabindex level: ', prev);
                                }
                            }
                        }
                    });
                    if (prev) {
                        // console.log('setting focus to ix: ', prev);
                        prev.focus();
                    }
                }
            })
    }


    let defaultViewString = 'LBG-DEMO|DEMO';
    defaultViewString = 'LBG-DEMO|DEMO|CARE|CBCC.*|MEDA|TUDRIDEP|UNICEFGHDF-MAHAMA|UWR|WINROCK';
    var defaultEditString = '';
    // Extracts the project name from an ACM-* name. Accounts for user feedback, ACM-*-FB-*
    var acmNameMatch = /(?:ACM-)?([-\w]+?)(?:-FB-([-\w]*))?$/

    var viewFilter = RegExp(`^(${defaultViewString})$`);
    var editFilter = RegExp(`^(${defaultEditString})$`);

    function isUsersProject(acmName, re) {
        var parts = acmNameMatch.exec(acmName);
        if (parts && parts.length>=2) {
            return (re.test(parts[1]))
        }
    }
    function isViewableProject(acmName) {
        return isUsersProject(acmName, viewFilter);
    }
    function isEditableProject(acmName) {
        return isUsersProject(acmName, editFilter);
    }
    function setFilters(edit, view) {
        var e = edit.trim();
        var v = view.trim();

        editFilter = RegExp(`^(${e||defaultEditString})$`, 'i');

        // This joins both with pipe, if both exist, otherwise takes either, otherwise takes default
        var vStr = e&&v&&`${e}|${v}` || e || v || defaultViewString;
        viewFilter = RegExp(`^(${vStr})$`, 'i');
    }
    function resetUserProperties() {
        setFilters('', '');
    }
    function gotUserProperties() {
        setFilters(userProperties.edit||'', userProperties.view||'')
    }
    function isAdminUser() {
        return userProperties && userProperties.admin;
    }

    /**
     * When a user forgets their password, they can 'reset' it. That causes a code to be sent to
     * their email. With that code, they can enter a new password.
     * @returns {*} A promise on resetting the password.
     */
    function doResetPassword() {
        var promise = $.Deferred();
        var $dialog = $(confirmPasswordHtml);
        var alerter = addNotificationArea($('.panel-footer', $dialog));
        addPasswordUtils($dialog);

        //$('#do-reset', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            var newPassword = $('#newpassword', $dialog).val();
            var code = $('#confirmation-code', $dialog).val();
            CognitoWrapper.confirmPassword({username: username, password: newPassword, code: code}).then(() => {
                password = newPassword;
                persist();
                dialog.close();
                promise.resolve();
            }, (err) => {
                alerter.error(err.message || 'Error confirming password');
            });
        });

        fixTabOrdering($dialog);

        var options = {
            title: 'Enter Confirmation Code',
            message: $dialog,
            closable: false,
            draggable: true,
            buttons: [],
            onshown: function()  {
                $dialog.find('input[autofocus]').focus();
            }
        }
        var dialog = BootstrapDialog.show(options);

        return promise;
    }

    function doChangeGreeting() {
        var promise = $.Deferred();
        var $dialog = $(changeGreetingHtml);
        var alerter = addNotificationArea($('.panel-footer', $dialog));
        addPasswordUtils($dialog);

        var oldGreeting = userAttributes['custom:greeting'];
        if (oldGreeting) {
            $('#old-greeting-reminder', $dialog).removeClass('hidden');
            $('#old-greeting', $dialog).text(oldGreeting);
        }

        //$('#do-change', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            var newGreeting = $('#new-greeting', $dialog).val();
            var attrs = {'custom:greeting': newGreeting};
            CognitoWrapper.updateAttributes({attributes:attrs}).then(() => {
                userAttributes['custom:greeting'] = newGreeting;
                $('body').trigger('custom:greeting')
                dialog.close();
                promise.resolve();
            }, (err) => {
                alerter.error(err.message || 'Error changing greeting');
            });
        });

        fixTabOrdering($dialog);

        var options = {
            title: 'Change Custom Greeting',
            message: $dialog,
            closable: true,
            draggable: true,
            buttons: [],
            onshown: function()  {
                $dialog.find('input[autofocus]').focus();
            }
        }
        var dialog = BootstrapDialog.show(options);

        return promise;
    }

    /**
     * Sends another confirmation to the user's email address, then prompts for the confirmation code.
     * When it is entered, verifies the email address with the server.
     */
    function doVerifyEmail() {
        var gotCodePromise = $.Deferred();
        CognitoWrapper.getEmailVerificationCode(gotCodePromise);

        var promise = $.Deferred();
        var $dialog = $(confirmAccountHtml);
        var alerter = addNotificationArea($('.panel-footer', $dialog));

        // $('#do-confirm', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            var code = $('#confirmation-code', $dialog).val();
            gotCodePromise.resolve(code);
                dialog.close();
                promise.resolve();
        });
        $('#resend-code', $dialog).on('click', () => {
            CognitoWrapper.resendConfirmationCode({username: username});
            alerter.notify('New confirmation code requested');
        });

        fixTabOrdering($dialog);

        var options = {
            title: 'Enter Confirmation Code',
            message: $dialog,
            closable: false,
            draggable: true,
            buttons: [],
            onshown: function()  {
                $dialog.find('input[autofocus]').focus();
            }
        }

        var dialog = BootstrapDialog.show(options);
        return promise;

    }

    function doConfirmAccount() {
        var promise = $.Deferred();
        var $dialog = $(confirmAccountHtml);
        var alerter = addNotificationArea($('.panel-footer', $dialog));

        // $('#do-confirm', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            var code = $('#confirmation-code', $dialog).val();
            CognitoWrapper.confirmRegistration({username: username, code: code}).then(() => {
                dialog.close();
                promise.resolve();
            }, (err) => {
                alerter.error(err.message || 'Error in confirmation code');
            });
        });
        $('#resend-code', $dialog).on('click', () => {
            CognitoWrapper.resendConfirmationCode({username: username});
            alerter.notify('New confirmation code requested');
        });

        fixTabOrdering($dialog);

        var options = {
            title: 'Enter Confirmation Code',
            message: $dialog,
            closable: false,
            draggable: true,
            buttons: [],
            onshown: function()  {
                $dialog.find('input[autofocus]').focus();
            }
        }

        var dialog = BootstrapDialog.show(options);
        return promise;
    }

    /**
     * Called to delete the account from Cognito. Prompts the user to be sure, then makes the call.
     * @returns {*} A promise on account deletion.
     */
    function doDeleteAccount() {
        var promise = $.Deferred();
        var $dialog = $(confirmDeleteHtml);
        var alerter = addNotificationArea($('.panel-footer', $dialog));

        //$('#do-change', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            dialog.close();
            promise.reject();
        });

        $('#do-delete', $dialog).on('click', (evt) => {
            evt.preventDefault();
            CognitoWrapper.deleteCurrentUser().then(()=>{
                dialog.close();
                promise.resolve();
            }, (err)=>{
                alerter.error(err.message || 'Error deleting account')
            });
        });

        fixTabOrdering($dialog);

        var options = {
            title: 'Delete Account',
            message: $dialog,
            closable: true,
            draggable: true,
            buttons: [],
            onshown: function()  {
                $dialog.find('input[autofocus]').focus();
            }
        }
        var dialog = BootstrapDialog.show(options);

        return promise;
    }

    /**
     * Handles changing the user's password. Prompts for old and new passwords, and calls CognitoWrapper function.
     * @returns {*} A promise on the password change.
     */
    function doChangePassword() {
        var promise = $.Deferred()

        var $dialog = $(changePasswordHtml);
        var alerter = addNotificationArea($('.panel-footer', $dialog));
        addPasswordUtils($dialog);

        if (rememberMe && password) {
            $('#oldpassword', $dialog).val(password);
        }

        //$('#do-change', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            var oldPassword = $('#oldpassword', $dialog).val();
            var newPassword = $('#newpassword', $dialog).val();
            CognitoWrapper.changePassword({
                username: username,
                oldPassword: oldPassword,
                newPassword: newPassword
            }).then(function resolved(data) {
                // Success
                password = newPassword;
                persist();
                dialog.close();
                promise.resolve();

            }, function rejected(err) {
                // There was an error. Show it, but don't close the dialog.
                alerter.error(err.message || 'Error changing password.');
            });


        })

        fixTabOrdering($dialog);

        var options = {
            title: 'Dashboard Change Password',
            message: $dialog,
            closable: true,
            draggable: true,
            buttons: [],
            onshown: function()  {
                $dialog.find('input[autofocus]').focus();
            }
        }
        var dialog = BootstrapDialog.show(options);

        return promise;
    }

    /**
     * Prompts user for various information, then creates the account. Then prompts for the confirmation code that
     * should be received in email.
     * @returns {*} A promise on creating the account.
     */
    function doCreateAccount() {
        var promise = $.Deferred()

        var $dialog = $(createAccountHtml);
        var alerter = addNotificationArea($('.panel-footer', $dialog));
        addPasswordUtils($dialog);

        // $('#do-create', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            username = $('#newusername', $dialog).val();
            password = $('#newpassword', $dialog).val();
            var email = $('#newuseremail', $dialog).val();
            var phone = $('#newphone', $dialog).val();
            CognitoWrapper.createAccount({
                username: username,
                email: email,
                password: password,
                phone: phone
            }).then(function resolved(data) {
                // Success; open the confirmation dialog and close this one.
                doConfirmAccount().done(() => {
                    dialog.close();
                    promise.resolve();
                }).fail((err) => {
                    alerter.error(err.message || 'Error in confirmation');
                });

            }, function rejected(err) {
                // There was an error. Show it, but don't close the dialog.
                alerter.error(err.message || 'Error creating account.');
            });
        });
        fixTabOrdering($dialog);

        var options = {
            title: 'Dashboard Create New Account',
            message: $dialog,
            closable: true,
            draggable: true,
            buttons: [],
            onhide: () => {
                clearTimeout(timeout)
            },
            onshown: function()  {
                $dialog.find('input[autofocus]').focus();
            }
        }
        var dialog = BootstrapDialog.show(options);

        // Pop up help in 15 seconds.
        var timeout = null;

        function setupTimeout() {
            timeout = setTimeout(() => {
                var h = makeWindowDraggable($(createAccountHelpHtml));
                dialog.$modal.append(h);
                timeout = null;
            }, 15000);
        }

        function resetTimeout() {
            // If there's a timeout active, reschedule it.
            if (timeout) {
                clearTimeout(timeout)
                setupTimeout();
            }
        }

        setupTimeout();
        $('input', $dialog)
            .on('input', resetTimeout)
            .on('focus', resetTimeout)
            .on('blur', resetTimeout);
        $('button', $dialog)
            .on('focus', resetTimeout)
            .on('blur', resetTimeout);

        return promise;
    }

    /**
     * Saves the current user and password to local storage, or clears them from local storage,
     * based on the state of rememberMe.
     * @param newValue Optional new value for rememberMe.
     */
    function persist(newValue) {
        if (newValue === true || newValue === false) {
            rememberMe = newValue;
        }
        if (rememberMe) {
            localStorage.setItem('username', username);
            localStorage.setItem('password', password)
        } else {
            localStorage.removeItem('username');
            localStorage.removeItem('password');
        }
    }

    /**
     * Handler for the sign-in dialog.
     * @returns {*} A promise that is resolved when (if) the sign in is successful.
     */
    function signinDialog() {
        var retryCount = 0;
        /**
         * Helper to sign in after credentials entered, password reset, or account created.
         */
        function cognitoSignin() {
            alerter.notify('Signing in...')
            Main.incrementWait();
            CognitoWrapper.signIn({username: username, password: password})
                .done((result => {
                    Main.decrementWait();
                    persist();
                    dialog.close();
                    promise.resolve();

                }))
                .fail((err) => {
                    Main.decrementWait();
                    /*
                     * For some reason, we sometimes the this error back, but simply retrying then works. So if we get
                     * this error, retry one time.
                     */
                    if (err.code === 'NotAuthorizedException' && err.message.startsWith('Logins don\'t match') && retryCount === 0) {
                        alerter.notify('Retrying...')
                        retryCount++;
                        cognitoSignin();
                        return;
                    }
                    var msg = (err && err.message || err) || 'Error signing in.';
                    alerter.error(msg)
                    if (err.code === 'PasswordResetRequiredException') {
                        doResetPassword().done(() => {
                            cognitoSignin();
                        });
                    }
                });
        }


        var promise = $.Deferred()

        var $dialog = $(signInHtml);
        var alerter = addNotificationArea($('.panel-footer', $dialog));
        addPasswordUtils($dialog);

        if (username) {
            $('#username', $dialog).val(username);
        }
        if (password) {
            $('#password', $dialog).val(password);
        }
        $('#remember-me', $dialog).prop('checked', rememberMe);

        $('#remember-me', $dialog).on('click', () => {
            rememberMe = $('#remember-me', $dialog).prop('checked');
        });
        $('#create-account', $dialog).on('click', () => {
            doCreateAccount().done(cognitoSignin);
        });
        // $('#do-signin', $dialog).on('submit', () => {
        $('form', $dialog).on('submit', (evt) => {
            console.log('submit');
            username = $('#username', $dialog).val();
            password = $('#password', $dialog).val();
            cognitoSignin();
            evt.preventDefault();
        })
        $('#forgot-password', $dialog).on('click', () => {
            username = $('#username', $dialog).val();
            if (!username) {
                alerter.error('Please provide username (Who forgot their password?)')
                $('#username', $dialog).focus();
                return;
            }
            CognitoWrapper.forgotPassword({username: username}).then(() => {
                doResetPassword().then(cognitoSignin);
            }, (err) => {
                alerter.error(err.message || 'Error resetting password')
            })
        });

        fixTabOrdering($dialog);

        var options = {
            title: 'Dashboard Sign In',
            message: $dialog,
            closable: false,
            draggable: true,
            buttons: [],
            onshown: function()  {
                $dialog.find('input[autofocus]').focus();
            }
        }
        var dialog = BootstrapDialog.show(options);

        if (username && password) {
            cognitoSignin()
        }

        return promise;
    }

    /**
     * Get the user's ACM read/write permissions, and admin status.
     */
    function getUserProperties() {
        // This is the UserManagement API Gateway URL.
        var url = 'https://at6imj9mgk.execute-api.us-west-2.amazonaws.com/prod  ';

        var payload = {
            action: 'getUserInfo'
        }

        var request = {
            url: url,
            type: 'post',
            data: JSON.stringify(payload),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            headers: {Authorization: CognitoWrapper.getIdToken()}
        }

        userPropertiesPromise = $.Deferred();
        userProperties = null;
        $.ajax(request)
            .done((result) => {
                if (result.errorMessage) {
                    userPropertiesPromise.reject(result.errorMessage);
                } else {
                    userProperties = result;
                    gotUserProperties(result);
                    userPropertiesPromise.resolve()
                }
            }).fail((err) => {
            userPropertiesPromise.reject(err)
        });
    }

    function doAuthenticate() {
        if (!authenticationPromise) {
            if (Main.hasParam('demo')) {
                doSignout();
                username='Demo';
                password='Demonstration1';
                rememberMe=false;
            } else if (Main.hasParam('offline')) {
                username='Offline';
                password='';
                rememberMe=false;
                authenticationPromise = $.Deferred();
                authenticationPromise.resolve({});
                userProperties = {admin:true, edit:'*', view:'*'};
                userPropertiesPromise = $.Deferred();
                userPropertiesPromise.resolve(userProperties);
                return authenticationPromise;
            }

            authenticationPromise = $.Deferred();
            var signin = $.Deferred();

            // userAttributes.email='bill@literacybridge.org';
            // userAttributes['custom:greeting'] = 'TEST:bill';
            // authenticationPromise.resolve(userAttributes);
            // userPropertiesPromise = $.Deferred();
            // userPropertiesPromise.resolve({edit:'.*', admin:true})
            // gotUserProperties({edit:'.*', admin:true});
            // return authenticationPromise;


            Main.incrementWait();

            // Get us to a "signed-in" state.
            CognitoWrapper.getCurrentUser().done(() => {
                Main.decrementWait();
                signin.resolve();
            }).fail(() => {
                Main.decrementWait();
                signinDialog().done(() => {
                    signin.resolve()
                });
            });

            // When signed in, get the user attributes from our DynamoDB user database, and CognitoWrapper attributes.
            signin.done(() => {
                getUserProperties();
                CognitoWrapper.getUserAttributes().done((attributes) => {
                    // Convert from {'Name': 'attr_name', 'Value': 'attr_value'} to {attr_name: 'attr_value'}
                    attributes.forEach((attr) => {
                        userAttributes[attr.Name] = attr.Value
                    })
                    console.log('Attributes: ' + JSON.stringify(userAttributes));
                    authenticationPromise.resolve(userAttributes);
                }).fail((err) => {
                        // Signed in, but for some reason didn't get attributes.
                        console.log('Attributes error: ' + err)
                        authenticationPromise.resolve({});
                    }
                );
            });
        }
        return authenticationPromise;
    }

    /**
     * Sign out from CognitoWrapper, and reset user information, promises.
     */
    function doSignout() {
        userAttributes = {};
        userPropertiesPromise = null;
        authenticationPromise = null;
        username = password = '';
        persist(false);
        CognitoWrapper.signOut();
        userProperties = null;
        resetUserProperties();
    }

    var authenticationPromise;
    var userPropertiesPromise;
    var userProperties = null;
    var userAttributes = {};
    var username = '';
    var password = '';
    var rememberMe = false;

    function init() {
        username = localStorage.getItem('username') || '';
        password = localStorage.getItem('password') || '';
        rememberMe = !!password; // If we saved it once, tend to save it again.
    }

    init();
    return {
        authenticate: doAuthenticate,
        signout: doSignout,
        deleteAccount: doDeleteAccount,
        changePassword: doChangePassword,
        changeGreeting: doChangeGreeting,
        verifyEmail: doVerifyEmail,
        getUserAttributes: () => userAttributes,
        getUserProperties: () => userPropertiesPromise,

        isAdminUser: isAdminUser,
        isViewableProject: isViewableProject,
        isEditableProject: isEditableProject
    };
})
();
