/* jshint esversion:6, asi:true */
/* global $, console */

var LocalFileLoader = function () {

    function getDialog(options) {
        let dialog = `<div class="modal fade" id="load-file-modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-header bg-primary">
                    <h4 class="modal-title" id="myModalLabel">${options.title}</h4>
                  </div>
                  <div class="modal-body">
                  </div>
                  <div class="modal-footer">
                    <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-default ok-button">OK</button>
                  </div>
                </div>
              </div>
            </div>`;

        let html = `<div>
               <div class="row comment ${options.commentPrompt ? '':'hidden'}" style="margin-bottom: 2rem;"> 
                    <div class="col-xs-12">
                        <input class="form-control" placeholder="${options.commentPrompt}" type="text">
                    </div>                
                </div>
                 <div>
                    <p>Drag and drop the ${options.longPrompt} file on the box below. Or click the "Browse" button
                        and choose the file on your computer.</p>
                </div>
                <div class="row">
                    <div class="col-lg-12 col-sm-12 col-12">
                        <form class="input-group input-group-lg">
                            <label class="input-group-btn">
                            <span class="btn btn-primary btn">
                                Browse for file&hellip; <input id="progspec-file" single style="display: none;"
                                                               type="file">
                            </span> </label> <input class="form-control load-local-filename"
                                                    placeholder="Drop ${options.shortPrompt} file here..." readonly
                                                    type="text">
                        </form>
                    </div>
                </div>
            </div>`;
        let $dialog = $(dialog)
        let $html = $(html)
        $('.modal-body', $dialog).append(html);
        return $dialog;
    }

    function setupDragAndDrop($dialog) {
        let deferred = $.Deferred();
        var recentFile;

        // We can attach the `fileselect` event to all file inputs on the page
        $dialog.on('change', ':file', function () {
            var input = $(this),
                numFiles = input.get(0).files ? input.get(0).files.length : 1,
                label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
            input.trigger('fileselect', [numFiles, label]);
            recentFile = $('input[type=file]', $dialog)[0].files[0];
            readFileData(recentFile);
        });

        // We can watch for our custom `fileselect` event like this
        $(':file', $dialog).on('fileselect', function (event, numFiles, label) {

            var input = $(this).parents('.input-group').find(':text'),
                log = numFiles > 1 ? numFiles + ' files selected' : label;

            if (input.length) {
                input.val(log);
            } else {
                console.log(log);
            }

        });

        var readFileData = function(file) {
            if (file) {
                $('.modal-footer button', $dialog.addClass('disabled'));
                var reader = new FileReader();
                reader.onload = function(readerEvt) {
                    var binaryString = readerEvt.target.result;
                    deferred.resolve(btoa(binaryString))
                };

                reader.readAsBinaryString(file);
            } else {
                deferred.reject('no file')
            }
        };


        function handleDragStart(e) {
            this.style.opacity = '0.4';  // jshint ignore:line
        }

        function handleDragOver(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
        }

        function handleDragEnter(e) {
            // this / e.target is the current hover target.
            this.classList.add('over'); // jshint ignore:line
        }

        function handleDragLeave(e) {
            this.classList.remove('over');  // jshint ignore:line
        }

        function handleDrop(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            this.classList.remove('over');  // jshint ignore:line

            let files = evt.dataTransfer.files; // FileList object.
            let types = evt.dataTransfer.types;
            if (files.length === 1 && types.indexOf('Files') >= 0) {
                $(dropZone).val(files[0].name);
                recentFile = files[0];
                readFileData(recentFile);
            }
        }

        var dropZone = $('.load-local-filename', $dialog)[0];
        dropZone.addEventListener('dragstart', handleDragStart, false);
        dropZone.addEventListener('dragenter', handleDragEnter, false);
        dropZone.addEventListener('dragover', handleDragOver, false);
        dropZone.addEventListener('dragleave', handleDragLeave, false);
        dropZone.addEventListener('drop', handleDrop, false);

        return deferred.promise();
    }

    function loadFile(options) {
        function enableButton() {
            let missingData = !data
            let missingComment = needComment && !$('.comment input', $dialog).val();
            $ok.prop('disabled', missingData || missingComment);
        }

        let needComment = !!options.commentPrompt;
        var data;
        let deferred = $.Deferred();
        let $dialog = getDialog(options);
        let $ok = $('.ok-button', $dialog);
        $ok.prop('disabled', true);

        // Show the dialog.
        $dialog.modal({keyboard:false, backdrop:'static'});
        // After the dialog closes, remove it from the DOM.
        $dialog.on('hidden.bs.modal', () => {
            deferred.reject(); // no-op if already resolved.
            $dialog.remove()
        });
        // User clicks OK.
        $('.ok-button', $dialog).on('click', ()=>{
            let comment =$('.comment input', $dialog).val();
            deferred.resolve({data:data, comment:comment});
            $dialog.modal('hide');
        });
        // Check whether to enable OK when comment changes.
        $('.comment input', $dialog).on('input', enableButton);
        // Drag & Drop and file open dialog.
        setupDragAndDrop($dialog)
             .done(result=>{
                 data = result;
                 enableButton();
             })
            .fail((err)=>{
                $dialog.modal('hide');
                deferred.reject(err);
            });

        return deferred.promise();
    }

    return {
        loadFile: loadFile
    }
}();
