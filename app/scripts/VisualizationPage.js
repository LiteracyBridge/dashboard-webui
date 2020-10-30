/* jshint esversion:6, asi:true */
/* global
$,
BootstrapDialog,
Chart,
CognitoWrapper,
DataTable,
DataTable,
DropdownButton,
Main,
ProgramDetailsData,
ProgramPicker,
Sortable,
StatisticsData,
User,
Utils,
console,
*/

var VisualizationPage = function () {
    'use strict';
    let PAGE_ID = 'visualization-page';
    let PAGE_HREF = 'a[href="#' + PAGE_ID + '"]';
    let $PAGE = $('#' + PAGE_ID);

    var $preview
    var $download_button
    var $refresh_button
    var $upload_button
    var $clear_previews_button
    var $previewText;
    var $noPreviewText;
    var havePreview = false;
    var haveWorkbook = false;


    var currentProgram;
    var fillDone = false;

    function fillPrograms() {
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
        var $elem = $('#usage-tableau-project-placeholder');
        $elem.empty();
        var $programsDropdown = $('<div>').on('selected', onProgramSelected).appendTo($elem);
        var programsDropdown = DropdownButton.create($programsDropdown, {title: 'Program'});
        programsDropdown.update(options.programs, {default: options.defaultProgram});
    }

    function persistState() {
        if (currentProgram) {
            localStorage.setItem('tableau.program', currentProgram);
            Main.setParams(PAGE_ID, {p: currentProgram});
        }
    }
    function restoreState() {
        let params = Main.getParams();
        if (params) {
            currentProgram = params.get('p') || '';
        } else {
            currentProgram = localStorage.getItem('tableau.program') || '';
        }
    }

    function doDownload() {
        clearResults();
        TableauWorkbookDownloader.download(currentProgram);
    }

    function doRefresh() {
        Main.incrementWait();
        StatisticsData.refreshWorkbook(currentProgram)
            .done(()=>{
                programSelected(currentProgram);
                Main.decrementWait();
            })
            .fail(()=>Main.decrementWait());
    }

    function doUpload() {
        let fileoptions = {shortPrompt: '.twbx, .jpg, .png',
            longPrompt: 'Tableau template (.twbx), or preview image (.jpg, .png, etc).',
            title: 'Choose Template or Preview',
            commentPrompt: 'Optional comment for submitted Tableau template or preview image',
            commentOptional: true
        };
        LocalFileLoader.loadFile(fileoptions).then(fileResult => {
            Main.incrementWait();
            StatisticsData.uploadWorkbook(currentProgram, fileResult.comment, fileResult.filename, fileResult.data)
                .done(()=>{
                    Main.decrementWait();
                    programSelected(currentProgram)
                })
                .fail(()=>Main.decrementWait());
        }).then(result => {
            programSelected(currentProgram);
        });
    }

    function doClearPreviews() {
        BootstrapDialog.show({
            message: 'You are about to permanently delete preview images. Are you sure?',
            buttons: [{
                label: 'Delete',
                title: 'Delete previews',
                cssClass: 'btn-danger',
                action: (d)=>{
                    Main.incrementWait();
                    StatisticsData.removeWorkbookPreviews(currentProgram)
                        .done(()=>{
                            Main.decrementWait();
                            d.close();
                            programSelected(currentProgram);
                        })
                        .fail(()=>{Main.decrementWait();d.close()});
                }
            }, {
                label: 'Cancel',
                // no title as it is optional
                cssClass: 'btn-primary',
                action: (d)=>d.close()
            }]
        });
    }

    var slideTimeout;
    function slideShow(list) {
        function nextSlide() {
            $preview.attr('src', list[slideIx])
            if (list.length > 1) {
                if (++slideIx >= list.length) {
                    slideIx = 0;
                }
                slideTimeout = setTimeout(nextSlide, 8000);
            }
        }
        if (slideTimeout) {
            clearTimeout(slideTimeout);
            slideTimeout = null;
        }
        let slideIx = 0;
        if (list && list.length) {
            nextSlide();
        }
    }


    function setWorkbookEnableStates(info) {
        havePreview = !!(info && info.preview && info.preview.length && info.workbook);
        haveWorkbook = !!(info && info.workbook);
        if (havePreview) {
            // $preview.attr('src', info.preview);
            slideShow(info.preview);
        } else {
            slideShow();
            $preview.attr('src', 'images/empty.png');
        }
        if (haveWorkbook) {
            $download_button.toggleClass('disabled', false).toggleClass('btn-success', true).toggleClass('btn-secondary', false);
            $download_button.removeClass('disabled');
            $download_button.attr('href', info.workbook).prop('disabled', false);
            // $download_button.s
        } else {
            $download_button.toggleClass('disabled', true).toggleClass('btn-success', false).toggleClass('btn-secondary', true);
            $download_button.addClass('disabled');
            $download_button.attr('href', '#').prop('disabled', true);
        }

        let mAndE =  (Main.userHasRoleInProgram('AD', currentProgram) && Main.userHasRoleInProgram('PM', currentProgram) &&
            User.getUserAttributes()['email'].endsWith('@amplio.org'));
        $refresh_button.toggleClass('hidden', !mAndE);
        $upload_button.toggleClass('hidden', !mAndE);
        $clear_previews_button.toggleClass('hidden', !mAndE);
    }

    function programSelected(program) {
        currentProgram = program;

        StatisticsData.getWorkbookLinks(currentProgram).then(result=>{
            if (result.preview || result.workbook) {
                setWorkbookEnableStates(result);
                persistState();
            } else {
                setWorkbookEnableStates();
            }
        }, failure=>{
            console.log(failure);
            setWorkbookEnableStates();
        });

    }


    let initialized = false;

    function show() {
        if (!initialized) {
            restoreState();
            $download_button = $('#tableau-workbook-download-button');
            $refresh_button = $('#tableau-workbook-refresh-button');
            $upload_button = $('#tableau-workbook-upload-button');
            $clear_previews_button = $('#tableau-workbook-clear-previews-button');
            $refresh_button.on('click', doRefresh);
            $upload_button.on('click', doUpload);
            $clear_previews_button.on('click', doClearPreviews);

            $preview = $('#tableau-preview-image');
            $previewText = $('#tableau-preview-text');
            $noPreviewText = $('#tableau-no-preview-text');
            $preview.on('load', ()=>{
                console.log('Toggling classes, havePreview: ' + havePreview);
                $previewText.toggleClass('hidden', !havePreview);
                $noPreviewText.toggleClass('hidden', havePreview);
            });
            setWorkbookEnableStates();
            initialized = true;
            fillPrograms()
        }
    }

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show);

    return {}
}();
