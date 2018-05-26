/**
 * Created by bill on 2018-05-25.
 */
/* jshint undef:true, esversion:6, asi:true */
/* globals console, $, moment */


var Utils = Utils || {};

Utils = (function() {
    'use strict';

    return {
        formatDate: function formatDate(date, def) {
            if (!(date instanceof moment)) { date=moment(date) }
            if (!date.isValid() && def) {
                return def;
            }
            return date.format('YYYY-MM-DD');
        }


    };
})();
