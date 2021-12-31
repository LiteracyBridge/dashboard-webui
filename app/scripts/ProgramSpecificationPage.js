/* jshint esversion:6, asi:true */
/* global $, DataTable, DropdownButton, StatisticsData, Authentication,console, Main, ProgramDetailsData,
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

    let publishedSpecExists = false;
    let pendingSpecExists = false;

    let viewLinesHtml = `<div class="modal fade" id="progspec-diff-modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
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
        <div id="modal-buttons">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
<!--        <button type="button" class="btn btn-danger reject-changes">Reject Changes</button>-->
<!--        <button type="button" class="btn btn-primary accept-changes">Approve Changes</button>-->
        </div>
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

        function onProgramSelected(evt, proj) {
            var program = programsDropdown.selection();
            if (program) {
                programSelected(program);
            }
        }

        var options = {
            programs: Main.dropdownProgramsList(),
            defaultProgram: currentProgram
        };
        var $elem = $('#program-specification-project-placeholder');
        $elem.empty();
        var $programsDropdown = $('<div>').on('selected', onProgramSelected).appendTo($elem);
        var programsDropdown = DropdownButton.create($programsDropdown, {title: 'Program'});
        programsDropdown.update(options.programs, {default: options.defaultProgram});
    }

    /**
     * Shows a list of lines of data.
     * @param data an array of lines to be shown.
     * @param options Options for showing:
     *      buttons: [name, {'name':name, classes:'class'], name, ...] The names of buttons. Buttons with these names
     *      will be added to the modal. The name of the button clicked to close the modal will be available in
     *      the result, as 'clicked'.
     * @returns {*}
     */
    function showLines(data, options) {
        let regex = /^( *)/

        function _leading(str) {
            let found = str.match(regex)
            if (found[1] && found[1].length) {
                // eslint-disable-next-line quotes
                return `indent-${found[1].length}`
            }
            return ''
        }

        options = options || {};
        let deferred = $.Deferred();
        let $dialog = $(viewLinesHtml);
        let $buttons = $('#modal-buttons', $dialog);
        let $comment = $('#progspec-approve-comment', $dialog);
        let $title = $('#myModalLabel', $dialog);
        $title.text(options.title);

        if (options.noComment) {
            $comment.addClass('hidden');
        }
        $('button', $buttons).on('click', () => deferred.resolve({action: 'close', comment: $comment.val()}));

        if (options.buttons) {
            options.buttons.forEach((b) => {
                let $b = $(`<button type="button" class="btn ${b.classes || ''}" data-dismiss="modal">${b.name || b}</button>`);
                $buttons.append($b);
                $b.on('click', () => {
                    console.log(this);
                    deferred.resolve({action: b.action || b.name || b, comment: $comment.val()})
                });
            });
        }
        if (options.comment) {
            $comment.val(options.comment);
        }

        let $issues = $('.modal-body', $dialog);
        $issues.empty();
        data.forEach(issue => {
            let $p = $('<p>').text(issue);
            $p.addClass(_leading(issue));
            $issues.append($p);
        })

        $dialog.modal({backdrop: 'static'});

        // After the dialog closes, remove it from the DOM.
        $dialog.on('hidden.bs.modal', () => {
            deferred.reject(); // no-op if already resolved.
            $dialog.remove()
        });

        return deferred.promise();
    }

    function showDiff(diff, options) {
        let lines = diff.output || diff.diff || diff;
        options = options || {};
        if (!options.buttons) {
            options.buttons = [];
        }
        if (options.showAccept) {
            options.buttons.push({name: 'Accept', action: 'accept', classes: 'btn-primary'});
        }
        if (options.showPublish) {
            options.buttons.push({name: 'Publish', action: 'publish', classes: 'btn-primary'});
        }
        if (options.showReject) {
            options.buttons.push({name: 'Reject', action: 'reject', classes: 'btn-Danger'});
        }
        return showLines(lines, options);
    }

    function doPublish() {
        clearResults();
        ProgramSpecificationData.compareProgspecs(currentProgram, 'unpublished', 'published')
            .then(result => {
                if (result.status === 'ok' && result.diff) {
                    if (result.diff.length) {
                        return showDiff(result, {showAccept: true, showReject: false});
                    } else {
                        const options = {
                            type: BootstrapDialog.TYPE_SUCCESS,
                            title: 'Program Specification Already Published',
                            message: 'The Amplio Suite program specification has already been published. No action is needed.',
                            closable: true,
                            draggable: true,
                            onshown: function () {
                                $dialog.find('input[autofocus]').focus();
                            }
                        };
                        let dialog = BootstrapDialog.alert(options);
                    }
                } else if (result.status === 'failure' && result.v1 && result.v1.name === 'not found') {
                    result.output = ['No current program specification'];
                    result.v1.VersionId = 'None';
                    return showDiff(result, {showReject: false, comment: 'Initial Program Specification'});
                }
            })
            .then(reviewResult => {
                reviewResult = reviewResult || {action: 'close'}
                if (reviewResult.action === 'accept') {
                    return ProgramSpecificationData.publishProgspec(currentProgram)
                } else if (reviewResult.action === 'reject') {
                    return new $.Deferred().reject();
                }
            })
            .then(publishResult => {
                showOverview();
            });
    }


    function doImport() {
        clearResults();
        ProgramSpecificationData.compareProgspecs(currentProgram).then(result => {
            if (result.status === 'ok' && result.diff && result.diff.length) {
                return showDiff(result, {showAccept: true, showReject: false});
            } else if (result.status === 'failure' && result.v1 && result.v1.name === 'not found') {
                result.output = ['No current program specification'];
                result.v1.VersionId = 'None';
                return showDiff(result, {showReject: false, comment: 'Initial Program Specification'});
            }
        }).then(reviewResult => {
            reviewResult = reviewResult || {action: 'close'};
            if (reviewResult.action === 'accept') {
                let comment = reviewResult.comment;
                return ProgramSpecificationData.acceptProgspec(currentProgram, comment)
            } else if (reviewResult.action === 'reject') {
                return new $.Deferred().reject();
            }
        }).then(approveResult => {
            approveResult = approveResult || {action: 'close'};
            if (approveResult.output) {
                showOutput(approveResult.output, 'approve');
            }
            showOverview();
        })

    }

    function doUpload(event) {
        let comment = '';
        let specialKeyPressed = (event.originalEvent && (event.originalEvent.altKey || event.originalEvent.ctrlKey));
        let fileoptions = {
            shortPrompt: '.xls', longPrompt: 'Program Specification .xlsx', title: 'Choose Program Specification',
            commentPrompt: 'Comment for submitted progam specification'
        };
        let filename = '';
        clearResults();
        showStatus('');
        LocalFileLoader.loadFile(fileoptions)
            .then(fileResult => {
                filename = fileResult.filename;
                comment = fileResult.comment;
                return ProgramSpecificationData.uploadProgspec(currentProgram, fileResult.data, fileResult.comment, true);
            }).then(uploadResult => {
            if (uploadResult.status === 'ok') {
                let diffOptions = {showPublish: true, comment: comment};
                if (specialKeyPressed) {
                    diffOptions.showAccept = true;
                }
                let diff = uploadResult.diff || [];
                if (diff.length == 0) diff = ['No changes found'];
                return showDiff(diff, diffOptions)
            }
        },uploadErrors=>{
                showOutput(uploadErrors.responseJSON.errors, 'upload');
                return new $.Deferred().reject(uploadErrors);
        }).then(diffResult => {
            if (diffResult.action === 'accept' || diffResult.action === 'publish') {
                return ProgramSpecificationData.acceptProgspec(currentProgram, diffResult.comment, diffResult.action === 'publish')
            }
        }).then(result => {
            showOverview();
            if (result.status == 'ok') {
                showStatus(`Spreadsheet file ${filename} uploaded and published.`);
            }
        });
    }

    let clearStatusTimer = null;
    function showStatus(status) {
        function fadeStatus() {
            $('#program-specification-operation-status-line').addClass('faded');
        }
        $('#program-specification-operation-status-line').text(status);
        if (clearStatusTimer) {
            clearTimeout(clearStatusTimer);
            clearStatusTimer = null;
        }
        if (status) {
            $('#program-specification-operation-status-line').removeClass('faded');
            clearStatusTimer = setTimeout(fadeStatus, 10000);
        }
    }

    function showOutput(output, label) {
        if (output && output.length) {
            showLines(output, {noComment: true, title: `Results of ${label}`})
        }
    }

    function clearResults() {
        $('#progspec-validate-results', $PAGE).addClass('hidden');
        $('#progspec-validate-results-no-issues', $PAGE).addClass('hidden');
        $('#progspec-validate-issues', $PAGE).empty();
    }

    function doValidate() {
        let projectName = $('#progspec-project-name').val() || currentProgram;
        let fileoptions = {
            shortPrompt: '.xlsx',
            longPrompt: 'Program Specification .xlsx',
            title: 'Choose Program Specification'
        };
        let filename = '';
        clearResults();
        showStatus('');
        LocalFileLoader.loadFile(fileoptions).then(fileResult => {
            filename = fileResult.filename;
            return ProgramSpecificationData.validateProgspec(projectName, fileResult.data);
        }).then(result => {
            if (result.output && result.output.length) {
                showLines(result.output, {noComment: true, title: 'Validation Results'})
            } else {
                showStatus(`No issues detected in file ${filename}`)
            }
        }).fail(err => {
            console.log('Error: ' + JSON.stringify(err));
        });

    }

    function doDownload(event) {
        let specialKeyPressed = (event.originalEvent && (event.originalEvent.altKey || event.originalEvent.ctrlKey));
        clearResults();
        showStatus('');
        ProgramSpecificationDownloader.download(currentProgram, publishedSpecExists, pendingSpecExists, specialKeyPressed)
            .done(result=>{
                showStatus(result);
            })
            .fail(result=>{
                showStatus('Download failed or was cancelled by user.');
            });
    }

    let nl = /[\n\r]/gi;

    function showContent(data, options) {
        options = options || {};
        options.size = options.size || BootstrapDialog.SIZE_WIDE;
        options.datatable = options.datatable || {paging: false, searching: true, colReorder: true};

        let deferred = $.Deferred();
        let $dialog = $(viewContentHtml);

        let $close = $('.close', $dialog);
        let $body = $('.modal-body', $dialog);

        if (options.title) {
            $('#myModalLabel', $dialog).text(options.title);
        }

        $close.on('click', () => {
            $dialog.modal('hide');
            deferred.resolve();
        });

        DataTable.create($body, data, options);
        $dialog.modal({keyboard: true, closeByBackdrop: true, backdrop: 'static'});

        return deferred.promise();
    }

    let contentOptions = {
        title: 'Published Content Calendar',
        filename: 'content.csv',
        artifact: 'content',
        columns: ['deployment_num',
            'playlist_title', 'message_title',
            'key_points', 'language', 'variant',
            'sdg_goals', 'sdg_targets'],
        headings: {
            deployment_num: 'Depl #',
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
        title: 'Published Recipients',
        columns: ['recipientid', // 'project',
            // 'partner',
            'region', 'district',
            'communityname', 'groupname', // 'affiliate',
            'agent',
            'language',
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
        filename: 'recipients.csv',
        artifact: 'recipients'
    };
    let deploymentOptions = {
        title: 'Published Deployments',
        columns: [
            'deploymentnumber', 'startdate', 'enddate', 'deployment'
        ],
        headings: {
            deploymentnumber: 'Depl #',
            startdate: 'Start', enddate: 'End',
            component: 'Component', deployment: 'Deployment Name'
        },
        filename: 'deployment_spec.csv',
        artifact: 'deployments'
    };


    function loadAndView(options) {
        ProgramSpecificationData.getFile(currentProgram, options.artifact).done(result => {
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
        if (!currentProgram) {
            return
        }

        function enableButtons(haveData, havePending) {
            let noData = !(publishedSpecExists || pendingSpecExists);
            let noPending = !pendingSpecExists;
            $import.prop('disabled', noPending);
            $download.prop('disabled', noData);
        }

        let $div = $PAGE;

        let fieldsToClear = [$specApprovedBy, $specApprovedOn, $specApprovedComment,
            $specSubmittedBy, $specSubmittedOn, $specSubmittedComment,
            $pendingSubmittedBy, $pendingSubmittedOn, $pendingSubmittedComment];
        fieldsToClear.map($f => $f.text(''));
        $div.removeClass('have-published have-pending have-data');

        enableButtons();
        publishedSpecExists = pendingSpecExists = false;
        ProgramSpecificationData.listProgramSpecObjects(currentProgram)
            .done(result => {
                let xls = result.objects['pub_progspec.xlsx'] || {};
                let md = xls.Metadata;
                if (md) {
                    publishedSpecExists = true;
                    $div.addClass('have-published');
                    $specApprovedBy.text(md['approver-email']);
                    $specApprovedOn.text(Utils.formatDateTime(md['approval-date']));
                    $specApprovedComment.text(md['approver-comment']);
                    // showSyncMessage({approvedOn:md['approval-date'], timeout:SYNC_TIMEOUT});

                    $specSubmittedBy.text(md['submitter-email']);
                    $specSubmittedOn.text(Utils.formatDateTime(md['submission-date']));
                    $specSubmittedComment.text(md['submitter-comment']);
                }

                // xls = result.objects['pending_progspec.xlsx'] || {};
                // md = xls.Metadata;
                // if (md) {
                //     pendingSpecExists = true;
                //     $div.addClass('have-pending');
                //     $pendingSubmittedBy.text(md['submitter-email']);
                //     $pendingSubmittedOn.text(Utils.formatDateTime(md['submission-date']));
                //     $pendingSubmittedComment.text(md['submitter-comment']);
                // }
                if (publishedSpecExists || pendingSpecExists) {
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
            try {
                val = JSON.parse(valStr);
            } catch (x) {
            }
        } else {
            currentProgram = localStorage.getItem('progspec.program') || '';
        }
    }

    var $validate, $upload, $import, $download, $publish;
    var $showDeployments, $showContent, $showRecipients;
    let initialized = false;

    function show() {
        if (!initialized) {
            $validate = $('#progspec-validate button');
            $upload = $('#progspec-upload button');
            $import = $('#progspec-import button');
            $download = $('#progspec-download button');
            $publish = $('#progspec-publish button');
            $validate.on('click', doValidate);
            $upload.on('click', doUpload);
            $import.on('click', doImport);
            $download.on('click', doDownload);
            $publish.on('click', doPublish);

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
        // showSyncMessage('check');
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
