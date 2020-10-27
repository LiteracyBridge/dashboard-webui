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
    var $download
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


    function enableWorkbook(info) {
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
            $download.toggleClass('disabled', false).toggleClass('btn-success', true).toggleClass('btn-secondary', false);
            $download.removeClass('disabled');
            $download.attr('href', info.workbook).prop('disabled', false);
            $download.s
        } else {
            $download.toggleClass('disabled', true).toggleClass('btn-success', false).toggleClass('btn-secondary', true);
            $download.addClass('disabled');
            $download.attr('href', '#').prop('disabled', true);
        }
    }

    function programSelected(program) {
        currentProgram = program;

        StatisticsData.getWorkbookLinks(currentProgram).then(result=>{
            if (result.preview || result.workbook) {
                enableWorkbook(result);
                persistState();
            } else {
                enableWorkbook();
            }
        }, failure=>{
            console.log(failure);
            enableWorkbook();
        });

    }


    let initialized = false;

    function show() {
        if (!initialized) {
            restoreState();
            $download = $('#tableau-workbook-download-button');
            $preview = $('#tableau-preview-image');
            $previewText = $('#tableau-preview-text');
            $noPreviewText = $('#tableau-no-preview-text');
            $preview.on('load', ()=>{
                console.log('Toggling classes, havePreview: ' + havePreview);
                $previewText.toggleClass('hidden', !havePreview);
                $noPreviewText.toggleClass('hidden', havePreview);
            });
            enableWorkbook();
            initialized = true;
            fillPrograms()
        }
    }

    // Hook the tab-activated event for this tab.
    $(PAGE_HREF).on('shown.bs.tab', show);

    return {}
}();
