/* jshint esversion:6, asi:true */
/* global $, DataTable, DropdownButton, StatisticsData, User, CognitoWrapper,console, Main, ProjectDetailsData,
   DataTable, Chart, moment, ProgramSpecificationData, ProjectPicker, Utils, UsageQueries */

let ProgramSpecificationDownloader = function () {
    let useAnchor = false;

    function getModalHtml() {
        let modalHtml = `<div class="modal fade" id="download-progspec-modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header bg-primary">
                <h4 class="modal-title" id="myModalLabel">Download Program Specification</h4>
              </div>
              <div class="modal-body">
                <div class="input-group" id="download-pending-progspec-group">
                    <label style="font-weight:normal"> <input id="download-pending-progspec" type="checkbox"
                                                              value="option1"> Download Pending Program Specification </label>
                </div>
                <div id="download-progspec-description">                    
                </div>
              </div>
              <div class="modal-footer">
                <div class="row comment" style="margin-bottom: 2rem;"> 
                </div>
                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                ${useAnchor
            ? '<a id="download-progspec-button" download href="#" class="btn btn-primary" role="button">Download</a>'
            : '<button id="download-progspec-button" type="button"  class="btn btn-primary" role="button">Save File</button>'}

              </div>
            </div>
          </div>
        </div>`;

        return modalHtml;
    }

    function getDescription(result) {
        let obj = result.object;
        var version;
        if (result.version === 'current')
            version = 'Current Program Specification';
        else if (result.version === 'pending')
            version = 'Pending Program Specification';
        else
            version = 'Program Specification Version ' + result.version;

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


    function  b64toBlob(b64Data, contentType='', sliceSize=512) {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];

        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);

            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        const blob = new Blob(byteArrays, {type: contentType});
        return blob;
    }

    function download(project, currentExists, pendingExists) {
        var filename, data;
        function saveFile() {
            $.fn.dataTable.fileSave(b64toBlob(data), filename, true);
            $dialog.modal('hide');
        }
        let ProgramSpecificationDataGetFunction = useAnchor ? ProgramSpecificationData.getLink : ProgramSpecificationData.getFile;
        function refreshLink(version) {
            $button.prop('disabled', true);
            $descr.empty();
            ProgramSpecificationDataGetFunction(project, version).done(result => {
                if (result && result.status && result.status === 'ok') {
                    $descr.append(getDescription(result));
                    filename = project + (version === 'current' ? '-Program' : '-Pending') + 'Specification.xlsx';
                    // $button.attr('download', filename); // doesn't work due to same-domain security restrictions.
                    if (useAnchor) {
                        $button.attr('href', result.url);
                    } else {
                        let $fn = $(`<p>Save file as <span class="progspec-metadata">${filename}</span>.</p>`);
                        $descr.append($fn);
                        data = result.data;
                    }
                    $button.prop('disabled', false);
                } else {
                    $descr.append($('<p>An error occurred getting the file.</p>'));
                    if (result && result.exception) {
                        $descr.append($(`<p>${result.exception}</p>`));
                    }
                }
            }).fail(err => {
                $descr.append($('<p>An error occurred getting the file: '+err.toString()+'</p>'))
            });
        }

        let $dialog = $(getModalHtml());
        if (!(currentExists && pendingExists)) {
            $('#download-pending-progspec-group', $dialog).addClass('hidden')
        }
        $('#download-pending-progspec', $dialog).on('click', ()=>{
            let pending = $('#download-pending-progspec', $dialog).prop('checked');
            refreshLink(pending?'pending':'current');
        });
        let $button = $('#download-progspec-button', $dialog);
        $button.prop('disabled', true);
        if (!useAnchor) {
            $button.on('click', saveFile);
        }
        let $descr = $('#download-progspec-description', $dialog);

        refreshLink(currentExists?'current':'pending');
        $dialog.modal('show');
        // After the dialog closes, remove it from the DOM.
        $dialog.on('hidden.bs.modal', () => {
            // deferred.reject(); // no-op if already resolved.
            $dialog.remove()
        });

    }


    return {
        download: download
    }
}();
