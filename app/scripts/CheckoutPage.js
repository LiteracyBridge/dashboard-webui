/**
 * Created by bill on 4/18/17.
 */
/* jshint undef:true, esversion:6, asi:true */
/* global $, BootstrapDialog, console, CognitoWrapper, AWS, DataTable, User, Main */

var CheckoutPage = CheckoutPage || {};

CheckoutPage = (function () {
    'use strict';
    let PAGE_ID = 'checkout-page';
    let PAGE_HREF = 'a[href="#'+PAGE_ID+'"]';
    let $PAGE = $('#'+PAGE_ID);


    var confirmUncheckoutHtml = `<div id="uncheckout-dialog" class="uncheckout-dialog">
    <div class="panel panel-default">
      <div class="panel-body container-fluid">
            <div>
                <div id="message"></div>
                <p>Enter the name of this project before confirming this action (upper- vs lower-case ignored)
                <input id="project-confirmation" type="text" class="form-control"
                       aria-describedby="basic-addon1" autofocus>
                </p>
            </div>
        </div>
    </div>
</div>`;

    function confirmUncheckout2(row) {
        function undoCheckout() {
            // API Gateway URL for revokeCheckOut
            var url = 'https://7z4pu4vzqk.execute-api.us-west-2.amazonaws.com/prod/';

            var payload = {
                action: 'revokeCheckOut',
                db: row.acm_name,
                key: row.now_out_key
            }
            var request = {
                url: url,
                data: JSON.stringify(payload),
                contentType: 'application/json; charset=utf-8',
                type: 'post',
                dataType: 'json',
                headers: {Authorization: CognitoWrapper.getIdToken()}
            }
            $.ajax(request)
                .done((result)=>{
                    dialog.close();
                    refreshData();
                })
                .fail((err)=>{
                    // Not really much to do about it.
                    dialog.close();
                    refreshData();
                })
        }

        var $dialog = $(confirmUncheckoutHtml);

        var message = `<p>You are about to force undo checkout in database '${row.acm_name}'.</p>
            <p>Checked out by user '${row.now_out_name}' on ${row.now_out_date.split('.')[0]}
                ${row.now_out_computername ? ', on computer ' + row.now_out_computername + '.' : '.'}</p>
            <p>Contact ${row.now_out_name} at ${row.now_out_contact}.</p>`;

        $('#message', $dialog).html(message);
        // Don't enable the 'confirm' button until they type the ACM name correctly.
        var target = row.acm_name.toLowerCase();
        var $p = $('#project-confirmation', $dialog);
        $p.on('input', () => {
            var mismatched = $p.val().toLowerCase() !== target;
            dialog.getButton('confirm')[mismatched ? 'disable' : 'enable']();
        });

        var options = {
            title: 'Force Undo Checkout',
            type: BootstrapDialog.TYPE_DANGER,
            message: $dialog,
            closable: true,
            draggable: true,
            buttons: [
                {
                    id: 'confirm',
                    label: 'Undo Checkout',
                    action: undoCheckout
                },
                {
                    label: 'Cancel',
                    action: () => {
                        dialog.close();
                    }
                }],
            onshown: function()  {
                $dialog.find('input[autofocus]').focus();
            }
        }
        var dialog = BootstrapDialog.show(options);
        dialog.getButton('confirm').disable();
    }


    var latestData = [];
    var latestTimestamp = 0;
    var includeUserFeedback = false;
    var latestTable;

    /**
     * Refreshes the table with data, possibly filtered to exclude user feedback ACMs.
     * @param data
     */
    function refreshTable(data) {
        var options = {
            columns: [
                //'acm_comment',
                'acm_name',
                'acm_state',
                //'now_out_comment',
                //'now_out_contact',
                'now_out_date',
                //'now_out_key',
                'now_out_name',
                //'now_out_version',
                'now_out_computername',
                //'last_in_contact',
                'last_in_date',
                'last_in_file_name',
                'last_in_name',
            ],

            headings: {
                acm_comment: 'acm_comment',
                acm_name: 'ACM Name',
                acm_state: 'Status',
                now_out_comment: 'now_out_comment',
                now_out_contact: 'now_out_contact',
                now_out_date: 'Checked Out Date',
                now_out_key: 'now_out_key',
                now_out_name: 'Checked Out By',
                now_out_version: 'now_out_version',
                now_out_computername: 'Computer Name',
                last_in_contact: 'last_in_contact',
                last_in_date: 'Last Checkin Date',
                last_in_file_name: 'Last Filename',
                last_in_name: 'Last Checkin Name',
            },


            tooltips: {
                last_in_file_name: 'The name of the current database .zip file. If the ACM is checked out, it will be ' +
                'checked in with a number that\'s 1 greater.',
                now_out_computername: 'The name of the computer where the ACM is checked out',
            },

            formatters: {
                acm_state: (row, ix) => {
                    // For checked out ACMs, add an "uncheckout" button.
                    var cell = `<p data-row-index="${ix}">`;
                    if (row.acm_state === 'CHECKED_OUT') {
                        cell += `<button type="button" class="undo-checkout btn btn-tiny btn-danger" title="Force un-checkout">
              <i class="glyphicon glyphicon-remove"></i>
              </button>`;
                    }
                    cell += row.acm_state + '</p>';
                    return cell;
                },
                now_out_date: (row, ix) => (row.now_out_date || '').split('.')[0], // split off the ms; don't need that!
                now_out_name: (row, ix) => row.now_out_name || '',
                last_in_date: (row, ix) => (row.last_in_date || '').split('.')[0],
                now_out_computername: (row, ix) => (row.now_out_computername || '')


            },
            datatable: {paging: false, searching: true, colReorder: true}
        };

        data = data || [];

        var search;
        if (latestTable) {
            search = latestTable.search();
        }

        latestTable = DataTable.create($('#checkout-page-container'), data, options);
        if (search) {
            latestTable.search(search).draw();
        }
        $('#checkout-page-container button.undo-checkout').tooltip().on('click', (ev) => {
            var row = data[$(ev.currentTarget).parent().data('row-index')];
            confirmUncheckout2(row);
        });

        Main.setParams(PAGE_ID, {uf: includeUserFeedback?'t':'f'});
    }

    /**
     * Filters the data based on 'includeUserFeedback', and updates the table.
     */
    function refreshFiltered() {
        var fbName = /[-\w]+-FB-[-\w]+/;
        var data = latestData.filter(row => includeUserFeedback || !fbName.test(row.acm_name));
        refreshTable(data);
    }

    /**
     * Refresh the data from the server.
     */
    function refreshData() {
        // API Gateway call to listAcmCheckouts.
        var url = 'https://7z4pu4vzqk.execute-api.us-west-2.amazonaws.com/prod';

        var user = User.getUserAttributes();
        var input = {username: user.username, email: user.email};

        Main.incrementWait();

        // Don't refresh more often than 5 seconds. But do show a wait spinner for a half second, just to
        // show that the UI is alive.
        if (Date.now() - latestTimestamp < 5 * 1000) {
            setTimeout(() => {
                Main.decrementWait();
            }, 500);
        } else {

            var request = {
                url: url,
                type: 'get',
                dataType: 'json',
                headers: {Authorization: CognitoWrapper.getIdToken()}
            }

            $.ajax(request)
                .done((result) => {
                    Main.decrementWait();
                    if (result.errorMessage) {
                        console.log(result.errorMessage);
                    } else {
                        latestData = result.body;
                        latestTimestamp = Date.now();
                        refreshFiltered();
                    }
                })
                .fail((err) => {
                    Main.decrementWait();
                    console.log(err)
                });

        }

    }

    function show() {
        let params = Main.getParams();
        if (params) {
            let uf = params.get('uf') || 'f'
            includeUserFeedback = uf.toLowerCase().startsWith('t')
            $('#include-user-feedback', $PAGE).prop('checked', includeUserFeedback)
        }
        refreshData();
    }

    $('#refresh-checkout-list', $PAGE).on('click', refreshData);
    $('#include-user-feedback', $PAGE).on('click', () => {
        includeUserFeedback = $('#include-user-feedback', $PAGE).prop('checked');
        refreshFiltered();
    });

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show)

    return {};
})();
