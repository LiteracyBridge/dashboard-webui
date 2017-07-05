/* jshint esversion:6, asi:true */
/* global $, console, ProjectDetailsData, Main */

var UserFeedbackData = UserFeedbackData || {};

UserFeedbackData = (function () {
    'use strict';
    
    /**
     * This is what data might look like (subsetted). 'categoryData' will describe all defined categories, whether or
     * not they're used in this data. 'progressData' is an array of daily snapshots, with uncategorized, categorized,
     * and other (9-someting other than 0). These are sparse, with entries only where there are counts.
     *
     *  var UserFeedbackData =
     *    {
 *      categoryData: {
 *        name: 'root',
 *        fullname: 'root',
 *        children: {
 *          '9': {
 *            id: '9',
 *            name: 'Feedback from Users',
 *            fullname: 'Feedback from Users',
 *            children: {
 *              '9-0': {
 *                id: '9-0',
 *                name: 'General Feedback',
 *                fullname: 'Feedback from Users:General Feedback',
 *                children: {}
 *              },
 *              '9-2': {id: '9-2', name: 'Useless', fullname: 'Feedback from Users:Useless', children: {}},
 *              // . . .
 *            }
 *          },
 *          '90': {// . . .
 *          }
 *        }
 *      },
 *      'progressData': [{
 *        date: '2017-04-20T00:00:00.000Z',
 *        uncategorized: {
 *          id: 'uncategorized',
 *          children: {
 *            '9': {
 *              id: '9',
 *              name: 'Feedback from Users',
 *              fullname: 'Feedback from Users',
 *              children: {
 *                '9-0': {
 *                  id: '9-0',
 *                  name: 'General Feedback',
 *                  fullname: 'Feedback from Users:General Feedback',
 *                  count: 3177
 *                }
 *              }
 *            }
 *          }
 *        },
 *        categorized: {id: 'categorized'},
 *        other: {id: 'other'}
 *      }, {
 *        date: '2017-04-28T00:00:00.000Z',
 *        other: {
 *          id: 'other',
 *          children: {
 *            '9': {
 *              id: '9',
 *              name: 'Feedback from Users',
 *              fullname: 'Feedback from Users',
 *              children: {
 *                '9-2': {
 *                  id: '9-2',
 *                  name: 'Useless',
 *                  fullname: 'Feedback from Users:Useless',
 *                  count: 201
 *                },
 *                '9-6': {
 *                  id: '9-6',
 *                  name: 'General Endorsements',
 *                  fullname: 'Feedback from Users:General Endorsements',
 *                  count: 2
 *                },
 *                '9-8': {
 *                  id: '9-8',
 *                  name: 'General Suggestions',
 *                  fullname: 'Feedback from Users:General Suggestions',
 *                  count: 1
 *                }
 *              }
 *            }
 *          }
 *        },
 *        categorized: {
 *          id: 'categorized',
 *          children: {
 *            '90': {
 *              id: '90',
 *              name: 'Categorized Feedback',
 *              fullname: 'Categorized Feedback',
 *              children: {
 *                '90-13': {
 *                  id: '90-13',
 *                  name: 'Hand Washing',
 *                  fullname: 'Categorized Feedback:Hand Washing',
 *                  children: {
 *                    '90-13-1': {
 *                      id: '90-13-1',
 *                      name: 'children',
 *                      fullname: 'Categorized Feedback:Hand Washing:children',
 *                      children: {
 *                        '90-13-1-2': {
 *                          id: '90-13-1-2',
 *                          name: 'Endorsement',
 *                          fullname: 'Categorized Feedback:Hand Washing:children:Endorsement',
 *                          count: 1
 *                        }
 *                      }
 *                    },
 *                    // 90-13-2 ...
 *                  }
 *                },
 *                // 90-14 ...
 *              }
 *            },
 *            // 91 ...
 *          }
 *        },
 *
 *        uncategorized: {
 *          id: 'uncategorized',
 *          children: {
 *            '9': {
 *              id: '9',
 *              name: 'Feedback from Users',
 *              fullname: 'Feedback from Users',
 *              children: {
 *                '9-0': {
 *                  id: '9-0',
 *                  name: 'General Feedback',
 *                  fullname: 'Feedback from Users:General Feedback',
 *                  count: 2950
 *                },
 *                // 9-1 ...
 *              }
 *            }
 *          }
 *        }
 *
 *      },
 *        // more days
 *      ]
 *    };
     *
     */
    
    let UF_PATH = 'uf/data/';
    var ROOT;
    
    function ufPath() {
        if (!ROOT) {
            ROOT = Main.getRootPath();
        }
        return ROOT + UF_PATH;
    }
    
    function projectPath(proj) {
        return ufPath() + proj + '/'
    }
    
    function categoriesPath(proj) {
        return projectPath(proj) + 'categories.csv';
    }
    
    function summaryPath(proj) {
        return projectPath(proj) + 'summary.csv';
    }
    
    function messagesPath(proj) {
        return projectPath(proj) + 'messages.csv';
    }
    
    function projectNamePath(proj) {
        return projectPath(proj) + 'project.txt';
    }
    
    function projectsListPath() {
        return ufPath() + 'projects.txt';
    }
    
    // Promises keyed by project name.
    // Each is a promise resoved with {categories:[category rows...], progress:[progress rows...]
    var progressPromises = {};
    // Promises keyed by project name.
    // Each is a promise resolved with [{label:' 0 - 2 seconds', data:123}, ...]
    var durationsPromises = {};
    
    var projectsListPromise;
    
    /**
     * This class represents the Category hierarchy, and parses a list of category entries into the hierarchy. Each
     * Construct a new category with:
     * @param id The taxonomy id of the category item.
     * @param name The string naem of the category item.
     * @param fullname A concatenation of parent fullname with this category's name.
     * @constructor
     */
    function Category(id, name, fullname) {
        if (id) {
            this.id = id
        }
        if (name) {
            this.name = name
        }
        if (fullname) {
            this.fullname = fullname
        }
    }
    
    Category.prototype = {
        createNew: function create(id, name, fullname) {
            return new Category(id, name, fullname);
        },
        /**
         * Determines if the given id is a direct child of this Category. Convenience function.
         * @param id for which to search.
         * @returns {boolean} True if a child.
         */
        hasChild: function hasChild(id) {
            return this.children && this.children.hasOwnProperty(id);
        },
        /**
         * Gets the list of children as an array. For iterating over children.
         * @returns {Array}
         */
        getChildList: function getChildList() {
            if (!this.children) {
                return []
            }
            return Object.keys(this.children).map(c => this.children[c]);
        },
        /**
         * Determines if the category or a sub-category has a sub-category named 'question'.
         * @returns {boolean}
         */
        hasBuckets: function hasBuckets() {
            var children = this.getChildList();
            return (children.some(c => c.name.toLowerCase() === 'question') ||
            children.some(c => c.hasBuckets()));
        },
        /**
         * Given an id, determines the parent id. if no parent, returns undefined.
         * @param id The id in question.
         * @returns {string} Parent's id, or undefined if no parent.
         */
        parentIdOf: function parentIdOf(id) {
            // If there's no id, there's certainly no parent.
            if (!id) {
                return
            }
            // Split off the last -XX part. if there isn't any -XX part, this is a root node; has no parent.
            var lastIx = id.lastIndexOf('-');
            if (lastIx < 1) {
                return
            }
            return id.substring(0, lastIx);
        },
        /**
         * Returns the parent category of the given id. For id's with no parent id, returns the root object. Will create an
         * unnamed parent category if necessary.
         * @param id The id for which to return the parent.
         * @returns {Category}
         */
        getParentOf: function getParentOf(id) {
            // get the parent id of the given id, that is drop the last -xx, if any.
            var parentId = this.parentIdOf(id);
            // If there is no parent (ie, just an XX), then this is the parent
            if (!parentId) {
                return this
            }
            // Otherwise find the parent of the parent. Eventually, we'll recurse to the point that this is the ancestor.
            var grandParent = this.getParentOf(parentId);
            if (!grandParent.hasChild(parentId)) {
                // We found where the parent should be. If it doesn't exist (yet), create a placeholder
                if (!grandParent.children) {
                    grandParent.children = {}
                }
                grandParent.children[parentId] = this.createNew(parentId);
            }
            return grandParent.children[parentId];
        },
        /**
         * Adds a Category to the hierarchy. If the category was previously created, unnamed, fills in the details of
         * the existing category.
         * @param id The new category's id
         * @param name The new category's name
         * @param fullname The new category's fullname
         */
        addCategory: function addCategory(id, name, fullname) {
            var parent = this.getParentOf(id);
            if (parent.hasChild(id)) {
                var existing = parent.children[id];
                if (name) {
                    existing.name = name
                }
                if (fullname) {
                    existing.fullname = fullname
                }
                return existing;
            }
            if (!parent.children) {
                parent.children = {}
            }
            parent.children[id] = this.createNew(id, name, fullname);
            return parent.children[id];
        },
        /**
         * Searches for a given Category id in the hierarchy. Can search from anywhere in the hierarchy.
         * @param id to be found
         * @returns {*} The Category, or undefined if not found.
         */
        findCategory: function findCategory(id) {
            var parent;
            var parentId = this.parentIdOf(id);
            if (!parentId) {
                parent = this
            } else {
                parent = this.findCategory(parentId);
            }
            return parent && parent.children && parent.children[id];
        }
    }
    
    /**
     * Daily progress data. It's much like Category data, except that it is sparse (only categories with actual
     * content), and has a count.
     * @param id
     * @param name
     * @param fullname
     * @constructor
     */
    function Progress(id, name, fullname) {
        Category.call(this, id, name, fullname);
    }
    
    Progress.prototype = Object.create(Category.prototype, {
        createNew: {
            /**
             * Creates a new Progress object. The count must be put in later.
             * @param id for the new Progress object.
             * @param name for the Progress object (corresponds to the content id)
             * @param fullname for the Progress object (corresponds to the content id)
             * @returns {Progress}
             */
            value: function (id, name, fullname) {
                // If we aren't given name, fullname, try to look them up from the category.
                if (!name || !fullname) {
                    var cat = categoryRoot.findCategory(id);
                    if (cat) {
                        name = cat.name || name;
                        fullname = cat.fullname || fullname;
                    }
                }
                var result = new Progress(id, name, fullname);
                return result;
            },
            configurable: true, enumerable: true, writable: true
        },
        add: {
            value: function (id, count) {
                // Look up the id in the list of Categories, to get name, fullname
                var cat = categoryRoot.findCategory(id) || {name: 'id: ' + id};
                var result = this.addCategory(id, cat.name, cat.fullname);
                if (count) {
                    result.count = count
                }
            },
            configurable: true, enumerable: true, writable: true
        },
        total: {
            /**
             * Gets the total of all counts in this category and sub-categories
             * @returns {*|number}
             */
            value: function () {
                var sum = (this.count || 0);
                this.getChildList().forEach(p => {
                    sum += p.total()
                });
                return sum;
            },
            configurable: true, enumerable: true, writable: true
        }
    });
    Progress.prototype.constructor = Progress;
    
    // Global variable because it is needed by parseProgress. Gets reset with each set of categories, but that's
    // OK because it isn't needed by Progress after the parsing is done.
    var categoryRoot;
    
    /**
     * Parses a series of individual category objects, creates and returns a hierarchical category object.
     * @param cats An array of {ID, NAME, FULLNAME} objects
     * @return an object with {id, name, fullname, children{}, hasBuckets()} properties, with id, name, and fullname
     * empty, and with only the top-level as children
     * categories. hasBuckets() is a helper that returns true if any child is named 'Question'.
     */
    function parseCategories(cats) {
        categoryRoot = new Category('', 'root', 'root');
        cats.forEach(c => {
            categoryRoot.addCategory(c.ID, c.NAME, c.FULLNAME);
        });
        return categoryRoot;
    }
    
    function parseProgress(dailies) {
        var progressRoot = [];
        var categoryUselessRe = /^9-2$/;
        var categoryRe = /^[0-9-]*$/;
        var categorizedRe = /^90/;
        var uncategorizedRe = /^9-0/;
        dailies.forEach(dailySummary => {
            var dailyProgress = {};
            // Convert string like '2016-04-11' to Date object.
            dailyProgress.date = new Date(dailySummary.date);
            progressRoot.push(dailyProgress);
            
            // Slices of counts, organized by useless, categorized, uncategorized.
            dailyProgress.categorized = new Progress('Categorized', 'Categorized');
            dailyProgress.uncategorized = new Progress('Uncategorized', 'Uncategorized');
            dailyProgress.useless = new Progress('Useless', 'Useless');
            
            Object.keys(dailySummary).forEach(k => {
                // If there is a count, and it looks like a category
                if (+dailySummary[k] && categoryRe.test(k)) {
                    //dailyProgress.add(k, +dailySummary[k]);
                    if (categorizedRe.test(k)) {
                        dailyProgress.categorized.add(k, +dailySummary[k]);
                    } else if (uncategorizedRe.test(k)) {
                        dailyProgress.uncategorized.add(k, +dailySummary[k]);
                    } else {
                        dailyProgress.useless.add(k, +dailySummary[k]);
                    }
                }
            });
        });
        return progressRoot;
    }
    
    // bucket by 2, 5, 10, 20 seconds; 1, 2, 5, + minutes
    var durations = {
        2: ' 0 - 2 sec',
        5: ' 3 - 5 sec',
        10: ' 6 - 10 sec',
        20: ' 11 - 20 sec',
        60: ' 21 sec - 1 min',
        120: ' 1:01 - 2 min',
        300: ' 2:01 - 5 min',
        1000000: ' > 5 minutes', // a very long length of time
    }
    
    function parseMessages(msgs) {
        // Keep messages with categories; keep just category and duration
        msgs = msgs.filter(msg => msg.CATEGORIES).map(msg => {
            return {category: msg.CATEGORIES, duration: +msg.LB_DURATION}
        });
        
        // Count up the # messages in length buckets (0-2 seconds, 3-5 seconds, etc)
        
        // Initialize buckets to 0
        var keys = Object.keys(durations); // 2, 5, 10, 20, etc. Upper bounds for buckets
        var buckets = {}
        keys.forEach(k => {
            buckets[k] = 0
        })
        // For each message, count the duration into the proper bucket
        msgs.forEach(msg => {
            // Is there some 'upper bound' for which the message duration is <= that upper bound?
            // If so, increment the corresponding bucket.
            keys.some((k) => {
                return (msg.duration <= k) ? ++(buckets[k]) : 0;
            });
        });
        // Turn the data from {2: 123, ...} -> [{label:' 0 - 2 seconds', data:123}, ...]
        var durationData = [];
        durationData = keys.map((k) => {
            return {label: durations[k], data: buckets[k]};
        })
        return durationData;
    }
    
    /**
     * Fetch progress statistics for the project.
     * @returns {*} A promise that resolves to an object with 3 members:
     *  .categories -- an array of objects like {id, name, fullname}
     *  .progress -- an array of objects like {date, uncategorized, categorized, '9-0', '90-11', ...}
     */
    function getData(project) {
        // Already have it?
        if (progressPromises[project] !== undefined) {
            return progressPromises[project];
        }
        var progressPromise = $.Deferred();
        progressPromises[project] = progressPromise;
        
        var categories = $.get(categoriesPath(project));
        var progress = $.get(summaryPath(project));
        
        // Wait for all to load. TODO: handle timeouts.
        $.when(categories, progress)
            .done(function resolved(categories, progress) {
                // Parse the files.
                // Can't refactor the options because $.csv craps on the options object.
                var categoryRoot = parseCategories($.csv.toObjects(categories[0], {separator: ',', delimiter: '"'}));
                var progressRoot = parseProgress($.csv.toObjects(progress[0], {separator: ',', delimiter: '"'}));
                
                progressPromise.resolve({
                    categoryData: categoryRoot,
                    progressData: progressRoot
                });
            }).fail((err) => {
            progressPromise.reject(err);
        });
        
        return progressPromise;
    }
    
    function getDurations(project) {
        // Already have it?
        if (durationsPromises[project] !== undefined) {
            return durationsPromises[project];
        }
        var durationsPromise = $.Deferred();
        durationsPromises[project] = durationsPromise;
        
        var messages = $.get(messagesPath(project));
        
        // Wait for all to load. TODO: handle timeouts.
        $.when(messages)
            .done(function resolved(messages) {
                // Parse the files.
                // Can't refactor the options because $.csv craps on the options object.
                var durationData = parseMessages($.csv.toObjects(messages, {separator: ',', delimiter: '"'}));
                
                durationsPromise.resolve(durationData);
            }).fail((err) => {
            durationsPromise.reject(err);
        });
        
        return durationsPromise;
    }
    
    function getProjectName(project) {
        return $.get(projectNamePath(project));
    }
    
    function getProjectsList() {
        // Resolved with an object like {proj:[{label:update, acmName:ufAcmName}, {label:...}], proj2:[]...}
        // Resolved with an object like:
        // { proj1 : { update1: acmname1, update2: acmname2, ...},
        //   proj2 : { update3: acmname3, update4: acmname4, ...}, ...
        projectsListPromise = $.Deferred();
        $.when($.get(projectsListPath()), ProjectDetailsData.getProjectList())
            .then((ufProjects, projects) => {
                var nl = /\s/
                var ufAcmNames = ufProjects[0].split(nl);
                var projList = projects;
                var result = {};
                // For each user feedback project...
                ufAcmNames.forEach((acmName) => {
                    // Examine every project in turn...
                    projList.some((proj) => {
                        // Until we find the one containing this user feedback.
                        if (acmName.startsWith('ACM-' + proj)) {
                            var label = acmName.substring(4 + proj.length);
                            if (label.startsWith('-FB-')) {
                                label = label.substring(4);
                            }
                            // Extend or create the list of uf for the project.
                            var ufAcms = result[proj] || (result[proj] = {});
                            ufAcms[label] = acmName;
                            return true;
                        }
                    })
                })
                projectsListPromise.resolve(result);
            }, projectsListPromise.reject);
        return projectsListPromise;
    }
    
    
    return {
        getProjectsList: getProjectsList,
        getProjectName: getProjectName,
        getData: getData,
        getDurations: getDurations
    };
})
();
