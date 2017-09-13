/**	Extract
  *	
  *	Gets the IP Blocklist from the Git repository
  *	
  **/
'use strict';

const fs = require('fs');
const git = require('simple-git');

const BLOCK_REPO = 'git@github.com:firehol/blocklist-ipsets.git';

console.log('Starting extraction');
if(!fs.existsSync('./blocklists')) {
	console.log('Cloning Repo');
	// We haven't cloned it before, get the repo
	git()
		.clone(BLOCK_REPO, 'blocklists', {
			'--single-branch': 'true',
			'-b': 'master',
			'--depth': '1',
		}, (err, data) => {
			if(err) {
				console.error(err);
				process.exit(1);
			}
			
			console.log('Repo Cloned');
		});
} else {
	console.log('Updating Repo');
	// We have the cloned repo, just update it
	git('./blocklists')
		.pull((err, data) => {
			if(err) {
				console.error(err);
				process.exit(2);
			}
			
			console.log('Update Finished');
		});
}
