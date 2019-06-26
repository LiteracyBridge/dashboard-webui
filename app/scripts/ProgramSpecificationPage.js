/* jshint esversion:6, asi:true */
/* global $, DataTable, StatisticsData, User, CognitoWrapper,console, Main, ProjectDetailsData, DataTable, Chart, ProjectPicker, Utils, UsageQueries */

var ProgramSpecificationPage = function () {
    'use strict';
    let PAGE_ID = 'program-specification-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);


    let URL = 'https://ftgnui9zvf.execute-api.us-west-2.amazonaws.com/PROD/data';

    function enableValidate(enabled) {
        let $validate = $('#progspec-validate', $PAGE)
        if (enabled) {
            $validate.removeClass('disabled')
        } else {
            $validate.addClass('disabled')
        }
    }

    function clearResults() {
        $('#progspec-validate-results', $PAGE).addClass('hidden')
        $('#progspec-validate-results-no-issues', $PAGE).addClass('hidden')
    }

    function setupDragAndDrop() {
        // We can attach the `fileselect` event to all file inputs on the page
        $PAGE.on('change', ':file', function () {
            var input = $(this),
                numFiles = input.get(0).files ? input.get(0).files.length : 1,
                label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
            input.trigger('fileselect', [numFiles, label]);
            recentFile = $('input[type=file]', $PAGE)[0].files[0]
            enableValidate(!!recentFile)
            clearResults()
        });

        // We can watch for our custom `fileselect` event like this
        $(':file', $PAGE).on('fileselect', function (event, numFiles, label) {

            var input = $(this).parents('.input-group').find(':text'),
                log = numFiles > 1 ? numFiles + ' files selected' : label;

            if (input.length) {
                input.val(log);
            } else {
                console.log(log);
            }

        });


        function handleDragStart(e) {
            this.style.opacity = '0.4';  // this / e.target is the source node.
        }

        function handleDragOver(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.        }
        }

        function handleDragEnter(e) {
            // this / e.target is the current hover target.
            this.classList.add('over');
        }

        function handleDragLeave(e) {
            this.classList.remove('over');  // this / e.target is previous target element.
        }

        function handleDrop(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            this.classList.remove('over');  // this / e.target is previous target element.

            let files = evt.dataTransfer.files; // FileList object.
            let types = evt.dataTransfer.types;
            if (files.length === 1 && types.indexOf('Files') >= 0) {
                $(dropZone).val(files[0].name)
                recentFile = files[0]
                enableValidate(!!recentFile)
                clearResults()
            }
        }

        var dropZone = document.getElementById('progspec-filename');
        dropZone.addEventListener('dragstart', handleDragStart, false);
        dropZone.addEventListener('dragenter', handleDragEnter, false);
        dropZone.addEventListener('dragover', handleDragOver, false);
        dropZone.addEventListener('dragleave', handleDragLeave, false);
        dropZone.addEventListener('drop', handleDrop, false);

    }

    let recentFile = null
    var readFileData = function(file) {
        let deferred = new $.Deferred()

        if (file) {
            var reader = new FileReader();

            reader.onload = function(readerEvt) {
                var binaryString = readerEvt.target.result;
                // deferred.resolve(binaryString)
                deferred.resolve(btoa(binaryString))
            };

            reader.readAsBinaryString(file);
        } else {
            deferred.reject('no file')
        }

        return deferred.promise()
    }

    function doValidation() {
        let file = $('input[type=file]', $PAGE)[0].files[0]
        let projectName = $('#progspec-project-name').val()
        Main.incrementWait();
        readFileData(recentFile)
            .done(data => {
                let request = {
                    url: URL + '/validate?project='+projectName,
                    type: 'POST',
                    data: data,
                    headers: {
                        Authorization: CognitoWrapper.getIdToken(),
                        'Accept': 'application/json'
                    },
                    contentType: 'application/text',
                    processData: false
                }
                $.ajax(request)
                    .done((a,b,c)=>{
                        Main.decrementWait();
                        if (a && a.issues && a.issues.length) {
                            $('#progspec-validate-results', $PAGE).removeClass('hidden')
                            let $issues = $('#progspec-validate-issues', $PAGE)
                            $issues.empty();

                            a.issues.forEach(issue=>$issues.append($('<p>').text(issue)))
                        } else {
                            $('#progspec-validate-results-no-issues', $PAGE).removeClass('hidden')
                        }
                        console.log('ajax success: ' + JSON.stringify(a))
                    })
                    .fail((a,b)=>{
                        Main.decrementWait();
                        console.log('Error: ' + JSON.stringify(a) + JSON.stringify(b));
                    })

            })
            .fail(err => {
                Main.decrementWait();
                console.log(err);
            })
    }


    function show() {
        setupDragAndDrop()
        $('#progspec-validate').on('click', evt => {
            doValidation()
        })
    }

    $('#progspec-validate').on('click', () => {
        let fn = $('#progspec-filename').val()
        console.log(fn)
    })


    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show);

    return {}
}();
