/* jshint esversion:6, asi:true */
/* global $, DataTable, DropdownButton, StatisticsData, Authentication,console, Main, ProgramDetailsData,
   DataTable, Chart, moment, ProgramSpecificationData, ProgramPicker, Utils, UsageQueries */

let ProgramSpecificationDownloader = function () {
    'use strict';

    function getModalHtml() {
        let modalHtml = `<div class="modal fade" id="download-progspec-modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header bg-primary">
                <h4 class="modal-title" id="myModalLabel">Download Program Specification</h4>
              </div>
              <div class="modal-body">
                <div class="input-group" id="download-artifact-chooser">
                    <div id="download-published-artifact" >
                        <label style="font-weight:normal">
                            <input type="radio" name="artifact" checked value="published">
                             Download the published Program Specification. This will <b>not</b> include un-published changes from the Amplio Suite.
                        </label>
                    </div>
                    <div id="download-unpublished-artifact">
                        <label style="font-weight:normal">
                            <input type="radio" name="artifact" value="unpublished">
                             Download the Program Specification from the Amplio Suite (it may be unpublished).
                        </label>
                    </div>
                    <div id="download-pending-artifact">
                        <label style="font-weight:normal">
                            <input type="radio" name="artifact" value="pending">
                             Download the pending Program Specification.
                        </label>
                    </div>
                </div>
                <div id="download-progspec-description">
                </div>
              </div>
              <div class="modal-footer">
                <div class="row comment" style="margin-bottom: 2rem;">
                </div>
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                <a id="download-progspec-button" download href="#" class="btn btn-primary" role="button">Download</a>
              </div>
            </div>
          </div>
        </div>`;

        return modalHtml;
    }

    function getDescription(result) {
        let obj = result.object;
        var version;
        if (obj.artifact === 'published')
            version = 'Published Program Specification';
        else if (obj.artifact === 'unpublished')
            version = 'Unpublished Program Specification';
        else if (obj.artifact === 'pending')
            version = 'Pending Program Specification';
        else
            version = 'Program Specification';

        let infoHtml = `<h4>${version}</h4>`;
        if (obj.Metadata && obj.Metadata['approval-date']) {
            infoHtml += `<p>Approved by <span class="progspec-metadata">${obj.Metadata['approver-email']}</span> on
                            <span class="progspec-metadata">${Utils.formatDateTime(obj.Metadata['approval-date'])}</span>.</p>
                        <p class="progspec-comment">Approval comment: <span class="progspec-metadata progspec-comment-text">${obj.Metadata['approver-comment']}</span></p>`;
        }
        infoHtml += `<p>Submitted by <span class="progspec-metadata">${obj.Metadata['submitter-email']}</span> on
                         <span class="progspec-metadata">${Utils.formatDateTime(obj.Metadata['submission-date'])}</span>.</p>
                        <p class="progspec-comment">Submission comment: <span class="progspec-metadata progspec-comment-text">${obj.Metadata['submitter-comment']}</span></p>`;
        if (obj.Size) {
            infoHtml += `<p>File size is <span class="progspec-metadata">${obj.Size}</span> bytes.</p>`;
        }

        return $(infoHtml);
    }

    function download(program, publishedExists, pendingExists, specialKeyPressed) {
        let deferred = $.Deferred();
        let ProgramSpecificationDataGetFunction = ProgramSpecificationData.getLink;
        let filename = '';
        // Refresh the link when user toggles between 'current' and 'pending' program specification. Note that
        // "refreshing" the link means downloading the program specification.
        function refreshLink(version) {
            $button.prop('disabled', true);
            $descr.empty();
            ProgramSpecificationDataGetFunction(program, version).done(result => {
                if (result && result.status && result.status === 'ok') {
                    $descr.append(getDescription(result));
                    // Like DEMO-ProgramSpecification.xlsx or TEST-PendingSpecification.xlsx.
                    $button.attr('href', result.url);
                    $button.prop('disabled', false);
                    if (result.object && result.object.filename) {
                        filename = ` as ${result.object.filename}`
                    }
                } else {
                    $descr.append($('<p>An error occurred getting the file.</p>'));
                    if (result && result.exception) {
                        $descr.append($(`<p>${result.exception}</p>`));
                    }
                }
            }).fail(err => {
                $descr.append($('<p>An error occurred getting the file: ' + err.toString() + '</p>'))
            });
        }

        let $dialog = $(getModalHtml());
        if (!specialKeyPressed) {
            $('#download-pending-artifact', $dialog).addClass('hidden');
            $('#download-unpublished-artifact', $dialog).addClass('hidden');
        } else {
            if (!pendingExists) {
                $('#download-pending-artifact', $dialog).addClass('hidden');
            }
        }
        $('input:radio[name=artifact]', $dialog).change(function () {
            // Arrow functions bind "this" differently. This must be a function.
            let artifact = this.value;
            refreshLink(artifact);
        });
        let $button = $('#download-progspec-button', $dialog);
        $button.prop('disabled', true);
        $button.on('click', () => {
            $dialog.modal('hide')
            deferred.resolve(`File downloaded${filename}.`);
        });
        let $descr = $('#download-progspec-description', $dialog);

        refreshLink('published');
        $dialog.modal('show');
        // After the dialog closes, remove it from the DOM.
        $dialog.on('hidden.bs.modal', () => {
            deferred.reject(); // no-op if already resolved.
            $dialog.remove()
        });

        return deferred.promise();
    }

    return {
        download: download
    }
}();
