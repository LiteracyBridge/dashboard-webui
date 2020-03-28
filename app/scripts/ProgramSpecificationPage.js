/* jshint esversion:6, asi:true */
/* global $, DataTable, DropdownButton, StatisticsData, User, CognitoWrapper,console, Main, ProgramDetailsData,
   DataTable, Chart, moment, ProgramSpecificationData, ProgramSpecificationDownloader, ProgramPicker, Utils, UsageQueries,
    LocalFileLoader, BootstrapDialog */

var ProgramSpecificationPage = function () {
    'use strict';
    let PAGE_ID = 'program-specification-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    let $specApprovedBy = $('#program-spec-approved-by');
    let $specApprovedOn = $('#program-spec-approved-on');
    let $specApprovedComment = $('#program-spec-approved-comment');

    let $specSubmittedBy = $('#program-spec-submitted-by');
    let $specSubmittedOn = $('#program-spec-submitted-on');
    let $specSubmittedComment = $('#program-spec-submitted-comment');

    let $pendingSubmittedBy = $('#pending-spec-submitted-by');
    let $pendingSubmittedOn = $('#pending-spec-submitted-on');
    let $pendingSubmittedComment = $('#pending-spec-submitted-comment');

    // program-specification-project-placeholder
    var currentProgram;
    var fillDone = false;

    let currentSpecExists = false;
    let pendingSpecExists = false;

    let viewDiffHtml = `<div class="modal fade" id="progspec-diff-modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header bg-primary">
        <h4 class="modal-title" id="myModalLabel">Program Specification Comparison</h4>
      </div>
      <div class="modal-body">
      </div>
      <div class="modal-footer">
        <div class="row comment" style="margin-bottom: 2rem;">
            <div class="col-xs-12">
                <input id="progspec-approve-comment" class="form-control" placeholder="Comment for approved progam specification" type="text">
            </div>
        </div>
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-danger reject-changes">Reject Changes</button>
        <button type="button" class="btn btn-primary accept-changes">Approve Changes</button>
      </div>
    </div>
  </div>
</div>`;

    let viewContentHtml = `<div class="modal fade" id="progspec-content-modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header bg-primary">
        <h4 class="modal-title" id="myModalLabel">Content Specification</h4>
      </div>
      <div class="modal-body">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default close" data-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>`;

    function fillProjects() {
        if (fillDone) {
            return;
        }
        fillDone = true;
        let programsList = Main.getProgramsForUser();
        function onProgramSelected(evt, proj) {
            var program = programsDropdown.selection();
            if (program) {
                programSelected(program);
            }
        }

        var options = {
            programs: programsList,
            defaultProgram: currentProgram
        };
        var $elem = $('#program-specification-project-placeholder');
        $elem.empty();
        var $programsDropdown = $('<div>').on('selected', onProgramSelected).appendTo($elem);
        var programsDropdown = DropdownButton.create($programsDropdown, {title: 'Program'});
        programsDropdown.update(options.programs, {default: options.defaultProgram});
    }

    const SYNC_TIMEOUT = 10 * 60; // in seconds
    let removeSyncMessageTime = moment(moment.now()).add(-1, 'day');;
    let removeSyncMessageTimeout = 0;
    function showSyncMessage(opts) {
        function show() {
            clearTimeout(removeSyncMessageTimeout);
            removeSyncMessageTimeout = setTimeout(hide, removeSyncMessageTime.valueOf() - Date.now());
            $('#program-specification-sync-message', $PAGE).removeClass('hidden');
        }
        function hide() {
            clearTimeout(removeSyncMessageTimeout);
            $('#program-specification-sync-message', $PAGE).addClass('hidden');
        }
        if (opts === 'check') {
            if (removeSyncMessageTime.isBefore(moment(moment.now()))) {
                hide();
            } else {
                show();
            }
        } else if (opts.hasOwnProperty('timeout')) {
            let expiryStart = 0;
            if (opts.hasOwnProperty('approvedOn')) {
                expiryStart = moment(opts.approvedOn + 'Z'); // because the time is UTC time, despite missing 'z'
            } else {
                expiryStart = moment(moment.now());
            }
            let timeout = opts.timeout;
            removeSyncMessageTime = expiryStart.add(timeout, 'seconds');
            show();
        }
    }

    function showDiff(diff, options) {
        options = options || {};
        let deferred = $.Deferred();
        let $dialog = $(viewDiffHtml);

        let $comment = $('#progspec-approve-comment', $dialog);
        let $accept = $('.accept-changes', $dialog);
        let $reject = $('.reject-changes', $dialog);

        if (options.hasOwnProperty('showAccept') && !options.showAccept) {$accept.addClass('hidden');}
        if (options.hasOwnProperty('showReject') && !options.showReject) {$reject.addClass('hidden');}

        if (options.hasOwnProperty('comment')) {
            $comment.val(options.comment);
        }
        $accept.on('click', ()=>{
            let comment = $comment.val();
            $dialog.modal('hide');
            deferred.resolve({action:'accept', comment:comment, diff:diff});
        });
        $reject.on('click', ()=>{
            $dialog.modal('hide');
            deferred.resolve({action:'reject', diff:diff})
        });

        let $issues = $('.modal-body', $dialog);
        $issues.empty();
        diff.output.forEach(issue=>$issues.append($('<p>').text(issue)));

        $dialog.modal({keyboard:false, backdrop:'static'});

        // After the dialog closes, remove it from the DOM.
        $dialog.on('hidden.bs.modal', () => {
            deferred.reject(); // no-op if already resolved.
            $dialog.remove()
        });

        return deferred.promise();
    }

    /**
     * Diff options:
     * - "Review" diff. From "current" to "pending". With "Approve" & "Disapprove" buttons.
     * - "Validate" diff. From "current" to uploaded file.
     * - "Submit" diff. From "current" to uploaded file.
     * - "History" diff. From version A to version B.
     * - "Revert" diff. From "current" to version A (not current, not pending). With "Revert to version" button.
     *   TODO: Should the revert be immediate, or should it copy the old version to pending?
     *
     * Options: An object with:
     *  'action': string. One of the options from above.
     *  'data': string. The "uploaded file" data for a Validate or Submit diff.
     *  'v1': string. Version of the "first" program spec for a History diff, or the program spec for Revert.
     *  'v2': string. Version of the "second" program spec for a History diff. Can be a version, "current", or "pending".
     */
    function doDiff(options) {
        ProgramSpecificationData.review(currentProgram).then(result=>{
            if (result.output && result.output.length) {
                showDiff(result);
            }
        });
    }

    function doReview() {
        clearResults();
        ProgramSpecificationData.review(currentProgram).then(result=>{
            if (result.status === 'ok' && result.output && result.output.length) {
                return showDiff(result, {showAccept:true, showReject:false});
            } else if (result.status === 'failure' && result.v1 && result.v1.name === 'not found') {
                result.output = ['No current program specification'];
                result.v1.VersionId = 'None';
                return showDiff(result, {showReject: false, comment: 'Initial Program Specification'});
            }
        }).then(reviewResult => {
            if (reviewResult.action === 'accept') {
                let currentVersion = reviewResult.diff.v1.VersionId;
                let pendingVersion = reviewResult.diff.v2.VersionId;
                let comment = reviewResult.comment;
                return ProgramSpecificationData.approve(currentProgram, currentVersion, pendingVersion, comment)
            } else if (reviewResult.action === 'reject') {
                return new $.Deferred().reject();
            }
        }).then(approveResult => {
            if (approveResult.output) {
                showOutput(approveResult.output, 'approve');
            }
            showSyncMessage({timeout:SYNC_TIMEOUT});
            showOverview();
        })

    }

    function doSubmit() {
        let fileoptions = {shortPrompt: '.xls', longPrompt: 'Program Specification .xlsx', title: 'Choose Program Specification',
            commentPrompt: 'Comment for submitted progam specification'
        };
        clearResults();
        LocalFileLoader.loadFile(fileoptions).then(fileResult => {
            return ProgramSpecificationData.submitProgramSpec(fileResult.data, fileResult.comment, currentProgram);
        }).then(result => {
            showOverview();
            showOutput(result.output, 'submit');
        });
    }

    function showOutput(output, label) {
        if (output && output.length) {
            label = label || 'validation';
            $('#progspec-validate-results-label').text(label);
            $('#progspec-validate-results', $PAGE).removeClass('hidden');
            let $issues = $('#progspec-validate-issues', $PAGE);
            output.forEach(line => $issues.append($('<p>').text(line)))
        }
    }

    function clearResults() {
        $('#progspec-validate-results', $PAGE).addClass('hidden');
        $('#progspec-validate-results-no-issues', $PAGE).addClass('hidden');
        $('#progspec-validate-issues', $PAGE).empty();
        showSyncMessage('check');
    }

    function doValidate() {
        let projectName = $('#progspec-project-name').val();
        let fileoptions = {shortPrompt: '.xlsx', longPrompt: 'Program Specification .xlsx', title: 'Choose Program Specification'};
        clearResults();
        LocalFileLoader.loadFile(fileoptions).then(fileResult => {
            return ProgramSpecificationData.validateProgramSpec(fileResult.data, projectName);
        }).then(result => {
            if (result.output && result.output.length) {
                showOutput(result.output);
            } else {
                $('#progspec-validate-results-no-issues', $PAGE).removeClass('hidden')
            }
        }).fail(err => {
            console.log('Error: ' + JSON.stringify(err));
        });

    }

    function doDownload() {
        clearResults();
        ProgramSpecificationDownloader.download(currentProgram, currentSpecExists, pendingSpecExists);
    }

    let nl=/[\n\r]/gi;
    function showContent(data, options) {
        let opts = {
            columns: ['deployment_num',
                'playlist_title', 'message_title',
                'key_points', 'language', 'variant',
                'sdg_goals', 'sdg_targets'],
            headings: {deployment_num: 'Depl #',
                playlist_title: 'Playlist',
                message_title: 'Title',
                key_points: 'Key Points',
                language: 'Language',
                variant: 'Variant',
                sdg_goals: 'SDG Goals',
                sdg_targets: 'SDG Targets'
            },
            formatters: {

                key_points: (row, row_ix, cell) => {
                    // eslint-disable-next-line quotes
                    let noNl = cell.replace(nl, '<br/>')
                    return `<p>${noNl}</p>`;
                }
            },
            size: BootstrapDialog.SIZE_WIDE,
            datatable: {paging: false, searching: true, colReorder: true}

        };

        options = options || {};
        options.size = options.size ||  BootstrapDialog.SIZE_WIDE;
        options.datatable = options.datatable || {paging: false, searching: true, colReorder: true};

        let deferred = $.Deferred();
        let $dialog = $(viewContentHtml);

        let $close = $('.close', $dialog);
        let $body = $('.modal-body', $dialog);

        $close.on('click', () => {
            $dialog.modal('hide');
            deferred.resolve();
        });

        DataTable.create($body, data, options);
        $dialog.modal({keyboard:true, closeByBackdrop:true, backdrop:'static'});

        return deferred.promise();
    }

    let contentOptions = {
        filename: 'content.csv',
        columns: ['deployment_num',
            'playlist_title', 'message_title',
            'key_points', 'language', 'variant',
            'sdg_goals', 'sdg_targets'],
        headings: {deployment_num: 'Depl #',
            playlist_title: 'Playlist',
            message_title: 'Title',
            key_points: 'Key Points',
            language: 'Language',
            variant: 'Variant',
            sdg_goals: 'SDG Goals',
            sdg_targets: 'SDG Targets'
        },
        formatters: {

            key_points: (row, row_ix, cell) => {
                // eslint-disable-next-line quotes
                let noNl = cell.replace(nl, '<br/>')
                return `<p>${noNl}</p>`;
            }
        },

    };
    let recipientsOptions = {
        columns: ['recipientid', // 'project',
            // 'partner',
            'region', 'district',
            'communityname', 'groupname', // 'affiliate',
            'agent',
            // 'component', 'country',
            'numhouseholds', 'numtbs',
            //'supportentity',
            // 'model', 'language', 'coordinates', 'latitude',
            // 'longitude',
            'variant'],
        headings: {
            recipientid: 'Recipient ID',
            region: 'Region', district: 'District',
            communityname: 'Community', groupname: 'Group', agent: 'Agent',
            numhouseholds: '# HHs', numtbs: '# TBs',
            variant: 'Variant'
        },
        filename: 'recipients.csv'
    };
    let deploymentOptions = {
        columns: [
            'deployment_num', 'startdate', 'enddate', 'component', 'name'
        ],
        headings: {
            deployment_num: 'Depl #',
            startdate: 'Start', enddate: 'End',
            component: 'Component', name: 'Deployment Name'
        },
        filename: 'deployment_spec.csv'
    };


    function loadAndView(options) {
        ProgramSpecificationData.getFile(currentProgram, options.filename).done(result => {
            let data = $.csv.toObjects(result.data, {separator: ',', delimiter: '"'});
            console.log(data);
            showContent(data, options);

        }).fail(err => {

        });
    }

    function doViewContent() {
        loadAndView(contentOptions);
    }

    function doViewRecipients() {
        loadAndView(recipientsOptions);
    }

    function doViewDeployments() {
        loadAndView(deploymentOptions);
    }

    function showOverview() {
        if (!currentProgram) {return}

        function enableButtons(haveData, havePending) {
            let noData = !(currentSpecExists || pendingSpecExists);
            let noPending = !pendingSpecExists;
            $review.prop('disabled', noPending);
            $history.prop('disabled', noData);
            $download.prop('disabled', noData);
        }

        let $div = $PAGE;

        let fieldsToClear = [$specApprovedBy, $specApprovedOn, $specApprovedComment,
            $specSubmittedBy, $specSubmittedOn, $specSubmittedComment,
            $pendingSubmittedBy, $pendingSubmittedOn, $pendingSubmittedComment];
        fieldsToClear.map($f => $f.text(''));
        $div.removeClass('have-current have-pending');

        $div.removeClass('have-data have-pending');
        showSyncMessage('check');
        enableButtons();
        currentSpecExists = pendingSpecExists = false;
        ProgramSpecificationData.listProgramSpecObjects(currentProgram)
            .done(result => {
                let xls = result.objects['program_spec.xlsx'] || {};
                let md = xls.Metadata;
                if (md) {
                    currentSpecExists = true;
                    $div.addClass('have-current');
                    $specApprovedBy.text(md['approver-email']);
                    $specApprovedOn.text(Utils.formatDateTime(md['approval-date']));
                    $specApprovedComment.text(md['approver-comment']);
                    showSyncMessage({approvedOn:md['approval-date'], timeout:SYNC_TIMEOUT});

                    $specSubmittedBy.text(md['submitter-email']);
                    $specSubmittedOn.text(Utils.formatDateTime(md['submission-date']));
                    $specSubmittedComment.text(md['submitter-comment']);
                }

                xls = result.objects['pending_spec.xlsx'] || {};
                md = xls.Metadata;
                if (md) {
                    pendingSpecExists = true;
                    $div.addClass('have-pending');
                    $pendingSubmittedBy.text(md['submitter-email']);
                    $pendingSubmittedOn.text(Utils.formatDateTime(md['submission-date']));
                    $pendingSubmittedComment.text(md['submitter-comment']);
                }
                if (currentSpecExists || pendingSpecExists) {
                    $div.addClass('have-data');
                }
                enableButtons();
                persistState();
            })
            .fail(err => {
            })

    }

    function programSelected(program) {
        currentProgram = program;
        showOverview();
        $PAGE.addClass('have-project')
    }

    function persistState() {
        if (currentProgram) {
            localStorage.setItem('progspec.program', currentProgram);
            Main.setParams(PAGE_ID, {p: currentProgram});
        }
    }
    function restoreState() {
        let params = Main.getParams();
        if (params) {
            currentProgram = params.get('p') || '';
            let valStr = params.get('t');
            let val = false;
            try { val = JSON.parse(valStr); } catch(x) {}
        } else {
            currentProgram = localStorage.getItem('progspec.program') || '';
        }
    }

    var $validate, $submit, $review, $history, $download;
    var $showDeployments, $showContent, $showRecipients;
    let initialized = false;
    function show() {
        if (!initialized) {
            $validate = $('#progspec-validate button');
            $submit = $('#progspec-submit button');
            $review = $('#progspec-review button');
            $history = $('#progspec-history button');
            $download = $('#progspec-download button');
            $validate.on('click', doValidate);
            $submit.on('click', doSubmit);
            $review.on('click', doReview);
            $download.on('click', doDownload);

            $showDeployments = $('#view-deployments-spec');
            $showContent = $('#view-content-spec');
            $showRecipients = $('#view-recipients-spec');
            $showDeployments.on('click', doViewDeployments);
            $showContent.on('click', doViewContent);
            $showRecipients.on('click', doViewRecipients);
            restoreState();
            fillProjects();
            initialized = true;
        } else {
            persistState();
        }
        showSyncMessage('check');
    }
    function hide() {
        $('#progspec-nav a.progspec-nav').off('click')
    }

    $('#progspec-validate').on('click', () => {
        let fn = $('#progspec-filename').val();
        console.log(fn)
    });

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show);
    $(PAGE_HREF).on('hidden.bs.tab', hide);

    return {}
}();
