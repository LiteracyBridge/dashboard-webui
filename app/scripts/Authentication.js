/**
 * Created by bill on 4/17/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* global $, BootstrapDialog, console, CognitoWrapper, Main, AWS */

// noinspection JSCheckFunctionSignatures
let Authentication = (function () {
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
    const loginHtml = `<div id="auth-dialog" class="auth-dialog">
    <form class="panel panel-default">
      <div class="panel-body container-fluid">
            <div>
                <input id="username" type="text" class="form-control"
                       placeholder="Email Address"
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
                <button id="do-login" type="submit" class="btn btn-default nested-tab">Login</button>
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

    const createAccountHtml = `<div class="auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h2 class="panel-title">Create New Account</h2>
        </div>
        <div class="panel-body container-fluid">
            <div>
                <!--input id="newusername" type="text" class="form-control"
                       placeholder="User Name"
                       aria-describedby="basic-addon1" autofocus
                       autocorrect="off" autocapitalize="none"-->
                <input id="newusername" type="text" class="form-control"
                       placeholder="Please enter your full name"
                       aria-describedby="basic-addon1" autofocus
                       autocorrect="off" autocapitalize="none">
                <input id="newuseremail" type="text" class="form-control"
                       placeholder="Email Address"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none">
                <!--input id="newphone" type="text" class="form-control"
                       placeholder="Phone Number"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none"-->
                <input id="newpassword" type="password" class="password newpassword form-control"
                       placeholder="Password"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none" autocomplete="new-password">
                <!--input id="newpassword2" type="password" class="password newpassword form-control"
                       placeholder="Repeat Password"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none" autocomplete="new-password"-->
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

    const createAccountHelpHtml = `<h3>Create An Account</h3>
        <p>Please enter your name, as you prefer to be addressed.</p>
         <p>Enter your 'work' email address. Your phone number is optional, but if you want to provide it,
         you must use the format +18887771234.</p>
         <p>Passwords must be at least 8 characters, with at least one capital letter, one lower case letter,
         and one digit. Special characters are OK.</p>
         <p>After filling the form and clicking 'Create Account', you'll get a code in your email,
         and you'll enter that code into the next form.</p>
         <If your email address is @literacybridge.org or @centreforbcc.com, you can get an account
         automatically. If your email address is @ something else, contact your administrator to add your email
         address to the system first.
        <p>When you login, use your email address.</p>
        `;

    const changePasswordHtml = `<div class="auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h2 class="panel-title">Change Password</h2>
        </div>
        <div class="panel-body container-fluid">
            <div>
                <input id="oldpassword" type="password" class="password form-control"
                       placeholder="Current Password"
                       aria-describedby="basic-addon1" autofocus
                       autocorrect="off" autocapitalize="none">
                <input id="newpassword" type="password" class="password newpassword form-control"
                       placeholder="New Password"
                       aria-describedby="basic-addon1"
                       autocorrect="off" autocapitalize="none">
                <input id="newpassword2" type="password" class="password newpassword form-control"
                       placeholder="Repeat Password"
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

    const confirmDeleteHtml = `<div class="auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h2 class="panel-title">Delete Account</h2>
        </div>
        <div class="panel-body container-fluid">
            <div>
                <p>Are you sure you want to delete your account? This can not be un-done, however, no data
                will be lost or removed. You can recreate your account again later.</p>
                <p>Note that this is only the account used to login to the Dashboard and TB-Loader, and is
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

    const confirmAccountHtml = `<div class="auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title">Create account: confirmation</h3>
        </div>
        <div class="panel-body container-fluid">
            <div>
                <input id="confirmation-code"  type="text" class="form-control" placeholder="Confirmation code"
                       aria-describedby="basic-addon1" autofocus autocomplete="off" autocorrect="off" autocapitalize="none">
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

    const confirmPasswordHtml = `<div class="ngdialog-message auth-dialog">
    <form class="panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title">Reset password</h3>
        </div>
        <div class="panel-body container-fluid">
            <p>Your account has been reset by the administrator. Please enter a new password, and
                the Passwrd Reset Code from the server. If you do not have a Password Reset Code,
                please contact the administrator.</p>
            <input id="newpassword"  type="password" class="password newpassword form-control"
                   placeholder="Password"
                   aria-describedby="basic-addon1" autofocus
                   autocorrect="off" autocapitalize="none" autocomplete="new-password">
            <input id="newpassword2"  type="password" class="password newpassword form-control"
                   placeholder="Repeat Password"
                   aria-describedby="basic-addon1"
                   autocorrect="off" autocapitalize="none" autocomplete="new-password">

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

    const changeGreetingHtml = `<div class="auth-dialog">
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
                const $el = (opt.handle === '') ? this : this.find(opt.handle);

                return $el.css('cursor', opt.cursor).on('mousedown', function (e) {
                    let $drag;
                    if (opt.handle === '') {
                        $drag = $(this).addClass('draggable');
                    } else {
                        $drag = $(this).addClass('active-handle').parent().addClass('draggable');
                    }
                    const z_idx = $drag.css('z-index'), ofs_y = $drag.offset().top - e.pageY,
                        ofs_x = $drag.offset().left - e.pageX;
                    $drag.css('z-index', 2000).parents().on('mousemove', function (e) {
                        const css = {
                            position: 'absolute', top: e.pageY + ofs_y, left: e.pageX + ofs_x
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

        const $elem = $(`<div id="nonm" class="auth-dialog-help container container-fluid alert alert-info alert-dismissable">
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

        const alerter = {
            $parent: $parent, notify: function $parent(msg) {
                const $msgElement = $('<div id="alert-trivial-message" class="alert alert-info"</div>');
                $msgElement.text(msg);
                this.$parent.empty().append($msgElement);
            }, warning: function warning(msg) {
                const $msgElement = $('<div id="alert-trivial-message" class="alert alert-warning"</div>');
                $msgElement.text(msg);
                this.$parent.empty().append($msgElement);
            }, error: function error(msg) {
                const $msgElement = $(`<div class="alert alert-danger" role="alert">
        <span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>
        <span class="sr-only">Error:</span><span id="alert-danger-message"></span>
        </div>`);
                $('#alert-danger-message', $msgElement).text(msg);
                this.$parent.empty().append($msgElement);
            }, clear: function () {
                this.$parent.empty();
            }
        };

        $parent.empty();
        return alerter;
    }

    /**
     * Adds utilities for standard password functions: show/hide, correlate two.
     * @param $dialog
     */
    function addPasswordUtils($dialog) {
        const newPassword = $('.newpassword', $dialog);
        // show/hide
        $('#show-password', $dialog).on('click', () => {
            const showPassword = $('#show-password', $dialog).prop('checked');
            $('.password', $dialog).attr('type', showPassword ? 'text' : 'password');
        });
        // If there are two passwords, when they're unequal, light up "mismatch"
        if (newPassword.length === 2) {
            $('.newpassword', $dialog).on('input', () => {
                console.log('password length: ' + newPassword.length);
                console.log('password[0]: ' + newPassword[0]);
                console.log('$(password[0]): ' + $(newPassword[0]));
                console.log('$(password[0]).val(): ' + $(newPassword[0]).val());
                const p1 = $(newPassword[0]).val();
                const p2 = $(newPassword[1]).val();
                const mismatch = (p1.length > 0 && p2.length > 0 && p1 !== p2);
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


    // let defaultViewString = 'LBG-DEMO|DEMO';
    // defaultViewString = 'LBG-DEMO|DEMO|CARE|CBCC.*|MEDA|TUDRIDEP|UNICEFGHDF-MAHAMA|UWR|WINROCK';
    // const defaultEditString = '';
    // // Extracts the project name from an ACM-* name. Accounts for user feedback, ACM-*-FB-*
    // const acmNameMatch = /(?:ACM-)?([-\w]+?)(?:-FB-([-\w]*))?$/;
    //
    // let viewFilter = RegExp(`^(${defaultViewString})$`);
    // let editFilter = RegExp(`^(${defaultEditString})$`);
    //
    // function setFilters(edit, view) {
    //     const e = edit.trim();
    //     const v = view.trim();
    //
    //     editFilter = RegExp(`^(${e||defaultEditString})$`, 'i');
    //
    //     // This joins both with pipe, if both exist, otherwise takes either, otherwise takes default
    //     const vStr = e && v && `${e}|${v}` || e || v || defaultViewString;
    //     viewFilter = RegExp(`^(${vStr})$`, 'i');
    // }
    // function resetUserProperties() {
    //     setFilters('', '');
    // }
    // function gotUserProperties() {
    //     setFilters(userAttributes.edit||'', userAttributes.view||'')
    // }

    /**
     * When a user forgets their password, they can 'reset' it. That causes a code to be sent to
     * their email. With that code, they can enter a new password.
     * @returns {*} A promise on resetting the password.
     */
    function doResetPassword() {
        const promise = $.Deferred();
        const $dialog = $(confirmPasswordHtml);
        const alerter = addNotificationArea($('.panel-footer', $dialog));
        addPasswordUtils($dialog);

        //$('#do-reset', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            const newPassword = $('#newpassword', $dialog).val();
            const code = $('#confirmation-code', $dialog).val();
            cognitoHelper.confirmPassword({username: username, password: newPassword, code: code}).then(() => {
                password = newPassword;
                persist();
                dialog.close();
                promise.resolve();
            }, (err) => {
                alerter.error(err.message || 'Error confirming password');
            });
        });

        fixTabOrdering($dialog);

        const options = {
            title: 'Enter Confirmation Code',
            message: $dialog,
            closable: false,
            draggable: true,
            buttons: [],
            onshown: function () {
                $dialog.find('input[autofocus]').focus();
            }
        };
        let dialog = BootstrapDialog.show(options);

        return promise;
    }

    function doChangeGreeting() {
        const promise = $.Deferred();
        const $dialog = $(changeGreetingHtml);
        const alerter = addNotificationArea($('.panel-footer', $dialog));
        addPasswordUtils($dialog);

        const oldGreeting = userAttributes['name'];
        if (oldGreeting) {
            $('#old-greeting-reminder', $dialog).removeClass('hidden');
            $('#old-greeting', $dialog).text(oldGreeting);
        }

        //$('#do-change', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            const newGreeting = $('#new-greeting', $dialog).val();
            const attrs = {'name': newGreeting};
            cognitoHelper.updateAttributes({attributes:attrs}).then(() => {
                userAttributes['name'] = newGreeting;
                $('body').trigger('name');
                dialog.close();
                promise.resolve();
            }, (err) => {
                alerter.error(err.message || 'Error changing greeting');
            });
        });

        fixTabOrdering($dialog);

        const options = {
            title: 'Change Custom Greeting',
            message: $dialog,
            closable: true,
            draggable: true,
            buttons: [],
            onshown: function () {
                $dialog.find('input[autofocus]').focus();
            }
        };
        let dialog = BootstrapDialog.show(options);

        return promise;
    }

    /**
     * Sends another confirmation to the user's email address, then prompts for the confirmation code.
     * When it is entered, verifies the email address with the server.
     */
    function doVerifyEmail() {
        const gotCodePromise = $.Deferred();
        cognitoHelper.getEmailVerificationCode(gotCodePromise);

        const promise = $.Deferred();
        const $dialog = $(confirmAccountHtml);
        const alerter = addNotificationArea($('.panel-footer', $dialog));

        // $('#do-confirm', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            const code = $('#confirmation-code', $dialog).val();
            gotCodePromise.resolve(code);
                dialog.close();
                promise.resolve();
        });
        $('#resend-code', $dialog).on('click', () => {
            cognitoHelper.resendConfirmationCode({username: username});
            alerter.notify('New confirmation code requested');
        });

        fixTabOrdering($dialog);

        const options = {
            title: 'Enter Confirmation Code',
            message: $dialog,
            closable: false,
            draggable: true,
            buttons: [],
            onshown: function () {
                $dialog.find('input[autofocus]').focus();
            }
        };

        let dialog = BootstrapDialog.show(options);
        return promise;

    }

    function doConfirmAccount() {
        const promise = $.Deferred();
        const $dialog = $(confirmAccountHtml);
        const alerter = addNotificationArea($('.panel-footer', $dialog));

        // $('#do-confirm', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            const code = $('#confirmation-code', $dialog).val();
            cognitoHelper.confirmRegistration({username: username, code: code}).then(() => {
                dialog.close();
                promise.resolve();
            }, (err) => {
                alerter.error(err.message || 'Error in confirmation code');
            });
        });
        $('#resend-code', $dialog).on('click', () => {
            cognitoHelper.resendConfirmationCode({username: username});
            alerter.notify('New confirmation code requested');
        });

        fixTabOrdering($dialog);

        const options = {
            title: 'Enter Confirmation Code',
            message: $dialog,
            closable: false,
            draggable: true,
            buttons: [],
            onshown: function () {
                $dialog.find('input[autofocus]').focus();
            }
        };

        let dialog = BootstrapDialog.show(options);
        return promise;
    }

    /**
     * Called to delete the account from Cognito. Prompts the user to be sure, then makes the call.
     * @returns {*} A promise on account deletion.
     */
    function doDeleteAccount() {
        const promise = $.Deferred();
        const $dialog = $(confirmDeleteHtml);
        const alerter = addNotificationArea($('.panel-footer', $dialog));

        //$('#do-change', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            dialog.close();
            promise.reject();
        });

        $('#do-delete', $dialog).on('click', (evt) => {
            evt.preventDefault();
            cognitoHelper.deleteCurrentUser().then(()=>{
                dialog.close();
                promise.resolve();
            }, (err)=>{
                alerter.error(err.message || 'Error deleting account')
            });
        });

        fixTabOrdering($dialog);

        const options = {
            title: 'Delete Account',
            message: $dialog,
            closable: true,
            draggable: true,
            buttons: [],
            onshown: function () {
                $dialog.find('input[autofocus]').focus();
            }
        };
        let dialog = BootstrapDialog.show(options);

        return promise;
    }

    /**
     * Handles changing the user's password. Prompts for old and new passwords, and calls CognitoWrapper function.
     * @returns {*} A promise on the password change.
     */
    function doChangePassword() {
        const promise = $.Deferred();

        const $dialog = $(changePasswordHtml);
        const alerter = addNotificationArea($('.panel-footer', $dialog));
        addPasswordUtils($dialog);

        if (rememberMe && password) {
            $('#oldpassword', $dialog).val(password);
        }

        //$('#do-change', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            const oldPassword = $('#oldpassword', $dialog).val();
            const newPassword = $('#newpassword', $dialog).val();
            cognitoHelper.changePassword({
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


        });

        fixTabOrdering($dialog);

        const options = {
            title: 'Dashboard Change Password',
            message: $dialog,
            closable: true,
            draggable: true,
            buttons: [],
            onshown: function () {
                $dialog.find('input[autofocus]').focus();
            }
        };
        let dialog = BootstrapDialog.show(options);

        return promise;
    }

    /**
     * Prompts user for various information, then creates the account. Then prompts for the confirmation code that
     * should be received in email.
     * @returns {*} A promise on creating the account.
     */
    function doCreateAccount() {
        const promise = $.Deferred();

        const $dialog = $(createAccountHtml);
        const alerter = addNotificationArea($('.panel-footer', $dialog));
        addPasswordUtils($dialog);

        // $('#do-create', $dialog).on('click', () => {
        $('form', $dialog).on('submit', (evt) => {
            evt.preventDefault();
            const name = $('#newusername', $dialog).val();
            password = $('#newpassword', $dialog).val();
            username = $('#newuseremail', $dialog).val();
            const phone = $('#newphone', $dialog).val();
            cognitoHelper.createAccount({
                name: name,
                username: username,
                email: username,
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

        const options = {
            title: 'Dashboard Create New Account',
            message: $dialog,
            closable: true,
            draggable: true,
            buttons: [],
            onhide: () => {
                clearTimeout(timeout)
            },
            onshown: function () {
                $dialog.find('input[autofocus]').focus();
            }
        };
        let dialog = BootstrapDialog.show(options);

        // Pop up help in 15 seconds.
        var timeout = null;

        function setupTimeout() {
            timeout = setTimeout(() => {
                const h = makeWindowDraggable($(createAccountHelpHtml));
                dialog.$modal.append(h);
                timeout = null;
            }, 15000);
        }

        function resetTimeout() {
            // If there's a timeout active, reschedule it.
            if (timeout) {
                clearTimeout(timeout);
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
     * Handler for the login dialog.
     * @returns {*} A promise that is resolved when (if) the login is successful.
     */
    function loginDialog() {
        let retryCount = 0;
        let fallbackEnabled = false;

        /**
         * Helper to login after credentials entered, password reset, or account created.
         */
        function cognitoLogin(trialHelper) {
            let cgHelper = trialHelper || cognitoHelper;
            alerter.notify('Logging in...');
            Main.incrementWait();
            cgHelper.login({username: username, password: password})
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
                        alerter.notify('Retrying...');
                        retryCount++;
                        cognitoLogin(cgHelper);
                        return;
                    }
                    const msg = (err && err.message || err) || 'Error logging in.';
                    if (err.code === 'PasswordResetRequiredException') {
                        alerter.error(msg);
                        doResetPassword().done(() => {
                            cognitoLogin(cgHelper);
                        });
                    } else {
                        // If we're not already, try with the fallback cognito info. If that works, keep the fallback.
                        if (cgHelper === cognitoHelper && fallbackEnabled) {
                            let fallbackHelper = CognitoWrapper.cognitoHelper(CognitoWrapper.FALLBACK_CONFIG);
                            fallbackHelper.login({username: username, password: password})
                                .done((result) => {
                                    cognitoHelper = fallbackHelper;
                                    persist();
                                    dialog.close();
                                    promise.resolve();
                                })
                                .fail((err) => {
                                    const msg = (err && err.message || err) || 'Error logging in.';
                                    alerter.error(msg);
                                });
                        } else {
                            alerter.error(msg);
                        }
                    }
                });
        }


        var promise = $.Deferred();

        const $dialog = $(loginHtml);
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
            doCreateAccount().done(cognitoLogin);
        });
        $('form', $dialog).on('submit', (evt) => {
            console.log('submit');
            username = $('#username', $dialog).val();
            password = $('#password', $dialog).val();
            cognitoLogin();
            evt.preventDefault();
        });
        $('#forgot-password', $dialog).on('click', () => {
            username = $('#username', $dialog).val();
            if (!username) {
                alerter.error('Please provide email address (Who forgot their password?)');
                $('#username', $dialog).focus();
                return;
            }
            cognitoHelper.forgotPassword({username: username}).then(() => {
                doResetPassword().then(cognitoLogin);
            }, (err) => {
                alerter.error(err.message || 'Error resetting password')
            })
        });

        fixTabOrdering($dialog);

        const options = {
            title: 'Dashboard Login',
            message: $dialog,
            closable: false,
            draggable: true,
            buttons: [],
            onshown: function () {
                $dialog.find('input[autofocus]').focus();
            }
        };
        let dialog = BootstrapDialog.show(options);

        if (username && password) {
            cognitoLogin()
        }

        return promise;
    }

    function resolveWithMod() {
        let mod = userAttributes['mod'];
        let modButton = userAttributes['modButton'] || 'OK';
        if (mod) {
            BootstrapDialog.show({
                title: 'Message From Amplio',
                message: mod,
                buttons: [{
                    label: modButton,
                    action: dialogItself=>dialogItself.close()
                }],
                onhide: ()=>authenticationPromise.resolve(userAttributes),
            });
        } else {
            authenticationPromise.resolve(userAttributes);
        }
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
                return authenticationPromise;
            }

            authenticationPromise = $.Deferred();
            const login = $.Deferred();

            // userAttributes.email='bill@literacybridge.org';
            // userAttributes['name'] = 'TEST:bill';
            // authenticationPromise.resolve(userAttributes);
            // gotUserProperties({edit:'.*', admin:true});
            // return authenticationPromise;


            Main.incrementWait();

            // When signed in, get the user attributes from our DynamoDB user database, and CognitoWrapper attributes.
            login.done(() => {
                let booleanProperties = ['admin', 'email_verified', 'phone_number_verified'];
                console.log('Login done');
                let _userProperties = cognitoHelper.getJwtParams();
                booleanProperties.forEach(prop=>{
                    if (_userProperties.hasOwnProperty(prop)) {
                        if (typeof _userProperties[prop]  === 'string') {
                            _userProperties[prop] = _userProperties[prop].toLowerCase() === 'true';
                        }
                    }
                });
                userAttributes = _userProperties;
                // gotUserProperties(_userProperties);
                console.log(userAttributes);

                function doResolve() {
                    resolveWithMod();
                    // authenticationPromise.resolve(_userProperties);
                }
                setTimeout(doResolve, 0);
            });

            // Get us to a "signed-in" state.
            cognitoHelper.getCurrentUser().done(() => {
                Main.decrementWait();
                login.resolve();
            }).fail(() => {
                Main.decrementWait();
                loginDialog().done(() => {
                    login.resolve()
                });
            });

        }
        return authenticationPromise;
    }

    /**
     * Logout from CognitoWrapper, and reset user information, promises.
     */
    function doSignout() {
        userAttributes = {};
        authenticationPromise = null;
        username = password = '';
        persist(false);
        cognitoHelper.signOut();
        // resetUserProperties();
        cognitoHelper = CognitoWrapper.cognitoHelper(CognitoWrapper.AMPLIO_CONFIG);
    }

    var cognitoHelper = CognitoWrapper.cognitoHelper(CognitoWrapper.AMPLIO_CONFIG);

    var authenticationPromise;
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

        getIdToken: ()=> cognitoHelper.getIdToken(),
        ACCESS_CONTROL_API: ()=>cognitoHelper.ACCESS_CONTROL_API,
        LIST_CHECKOUTS: ()=>cognitoHelper.LIST_CHECKOUTS,
        PROGRAM_SPEC: ()=>cognitoHelper.PROGRAM_SPEC,
        ROLES: ()=>cognitoHelper.ROLES,
        STATS_QUERY: ()=>cognitoHelper.STATS_QUERY,
        TWBX: ()=>cognitoHelper.TWBX,


    };
})();
