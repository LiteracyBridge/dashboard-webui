#Amplio Analytics Dashboard

Simple implementation of a dashboard for Amplio deployment and 
usage statistics.

Features:
* Directly reads (and parses) files produced by nightly statistics runs.
* Completely static (given updated files); no server-side component. Can
even run from the file system if desired.

Technologies:
* [Yeoman](http://yeoman.io) for project scaffolding.
* [Bootstrap](http://getbootstrap.com) for styling (v3.3, currently).
* [DataTables](https://datatables.net) for sortable, searchable, pageable tables.
* [Node](https://nodejs.org/en/) powers the dev-side builds and so forth.

Installation:
1. Install Node.js. **Important:** See [this](https://github.com/sindresorhus/guides/blob/master/npm-global-without-sudo.md)
 page for instructions on installing global node modules without using sudo.
 **Note** At this time, the configured "Gulp" (3) is incompatible with the current "Node" (14). This is tested with
 node [10.16.3](https://nodejs.org/download/release/v10.16.3/).
1. Sync this project from Git.
1. Run `npm install` to install dependencies.
1. Run `bower update` to install more dependencies.
1. Change to the app directory and run `refreshData.sh` to sync test data.
1. Run `gulp serve` to compile and test.
1. Run `gulp` to build for production.
1. From the `dist` directory, run `deploy.sh` to deploy the 
[dashboard](https://s3-us-west-2.amazonaws.com/dashboard-lb-stats/index.html) 
to S3. 

TODOs:
* The pages need definitions, so everyone is working with the same 
understanding of terms.
* Some graphs and charts would spiff things up a bit, make them more
visually engaging.
* If we can get the heuristics right, calling out some "headline" statistics
would make the important facts more immediately accessible.
* When DataTables are updated to work with Bootstrap 4, update both.
* If the project grows very much, consider adopting [Angular](https://angular.io)
 for better modularity.
