/**
 * Created by bill on 2018-05-25.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals Main, console, $, moment */

var Utils = (function () {
    'use strict';

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
        pad: pad,
    };
})();
