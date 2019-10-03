/**
 * Created by bill on 2018-05-25.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals Main, console, $, moment */


var Utils = Utils || {};

Utils = (function () {
    'use strict';


    let STATS_PATH = 'data/';
    let ROOT;

    // General purpose cache of files, map of {project: {file: data, file:data, ...}, ...}
    let projectFileCache = {};


    function statsPath() {
        if (!ROOT) {
            ROOT = Main.getRootPath();
        }
        return ROOT + STATS_PATH;
    }

    function pathForProject(project) {
        return statsPath() + project + '/';
    }

    function pathForFile(project, file) {
        let result = pathForProject(project);
        result += file;
        return result;
    }

    /**
     * Retrieve a project-specific file, and apply mapper to the contents.
     * Cache the mapped result for subsequent calls.
     * @param project The project for which the file is desired.
     * @param filename The name of the file.
     * @param mapper Optional mapper to transform the fetched data into whatever is desired. If none is provided,
     *              the raw data is cached and returned.
     * @returns {*} A promise on the mapped data.
     */
    function getFileCached(project, filename, mapper) {
        let fileCache = projectFileCache[project];
        if (fileCache === undefined) {
            fileCache = projectFileCache[project] = {};
        }
        // If the mapped data isn't already cached...
        if (fileCache[filename] === undefined) {
            fileCache[filename] = $.Deferred();
            // Try to fetch the data.
            let filepath = Utils.pathForFile(project, filename);
            $.get(filepath).done(function resolved(filedata) {
                // We got the data, so apply the mapper, if one was provided.
                filedata = (mapper && mapper(filedata)) || filedata;
                // And save it in the cache for next time!
                fileCache[filename].resolve(filedata);
            }).fail((err) => {
                // Couldn't fetch the data. Fail the request (now, and forever)
                fileCache[filename].reject(err);
            });
        }
        return fileCache[filename];
    }

    // zero padding
    pad.zeros = new Array(5).join('0');

    function pad(num, len) {
        var str = String(num),
            diff = len - str.length;
        if (diff <= 0) {
            return str;
        }
        if (diff > pad.zeros.length) {
            pad.zeros = new Array(diff + 1).join('0');
        }
        return pad.zeros.substr(0, diff) + str;
    }

    let timeCutoff = moment(moment.now()).subtract(moment.duration(2, 'days'));

    return {
        formatDateTime: function formatDateTime(dt) {
            dt = moment(dt);
            if (dt.isBefore(timeCutoff)) {
                return dt.format('LL');
            }
            return dt.format('llll');
        },
        formatDate: function formatDate(date, def) {
            if (!(date instanceof moment)) {
                date = moment(date)
            }
            if (!date.isValid() && def) {
                return def;
            }
            return date.format('YYYY-MM-DD');
        },
        formatNumber: function formatNumber(number, defaultValue) {
            if (number === 0) {
                return defaultValue !== undefined ? defaultValue : '';
            }
            if (number === null || number === undefined || isNaN(number)) {
                return defaultValue !== undefined ? defaultValue : 'n/a';
            }
            return Number(Math.round(number)).toLocaleString();
        },
        formatMinutes: function formatMinutes(number, defaultValue) {
            let fractions = ['', ' &frac14;', ' &frac12;', ' &frac34;'];
            if (number === 0) {
                return defaultValue !== undefined ? defaultValue : '';
            }
            if (number === null || number === undefined || isNaN(number)) {
                return defaultValue !== undefined ? defaultValue : 'n/a';
            }
            if (number < 60) {
                return Math.round(number) + ' minutes';
            }
            if (number < 600) {
                let hours = Math.floor(number / 60);
                // find the quarter hour.
                let frac = Math.round((number % 60) / 15);
                if (frac === 4) {
                    frac = 0;
                    hours++;
                }
                let units = (hours === 1 && frac === 0) ? ' hour' : ' hours';
                return '' + hours + fractions[frac] + units;
            }
            return Math.round(number / 60).toLocaleString() + ' hours';
        },
        formatSeconds: function formatSeconds(number) {
            if (number > 3600) {
                return this.formatMinutes(number / 60.0)
            }
            let seconds = number % 60
            let minutes = Math.floor(number / 60)
            return String(minutes) + ':' + pad(seconds, 2)
        },


        pathForFile: pathForFile,
        getFileCached: getFileCached


    };
})();
