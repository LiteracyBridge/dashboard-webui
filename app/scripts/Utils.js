/**
 * Created by bill on 2018-05-25.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals Main, console, $, moment */


var Utils = Utils || {};

Utils = (function() {
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


    return {
        formatDate: function formatDate(date, def) {
            if (!(date instanceof moment)) { date=moment(date) }
            if (!date.isValid() && def) {
                return def;
            }
            return date.format('YYYY-MM-DD');
        },

        pathForFile: pathForFile,
        getFileCached: getFileCached


    };
})();
