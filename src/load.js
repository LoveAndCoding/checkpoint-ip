'use strict';

const path = require('path');
const http = require('https');
const fs = require('fs');
const split = require('split');
const ip = require('ip');

const PRIMARY_URL = 'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/firehol_level1.netset';
const BACKUP_URL = 'https://iplists.firehol.org/files/firehol_level1.netset';
const LOCAL_BACKUP = path.resolve(__dirname, '../firehol_level1.netset');
const LIST_NAME = 'Firehol Level 1';

function getFromUrl(url) {
	return new Promise((resolve, reject) => {
		http.get(url, (res) => {
			if(res.statusCode !== 200) {
				res.resume();
				reject(new Error('URL (' + url + ') currently unavailable'));
				return;
			}
			
			res.setEncoding('utf8');
			resolve(attachToStream(res));
		});
	});
}

function attachToStream(stream) {
	const addressTree = Object.create(null);
	
	return new Promise((resolve, reject) => {
		stream.pipe(split())
			.on('data', (line) => {
				line = line || '';
				if(line === '' || line.startsWith('#')) {
					// Comment or emtpy line, ignore it
					return;
				}
				
				addToTree(addressTree, line);
			})
			.on('error', (err) => {
				reject(err);
			})
			.on('close', () => {
				resolve(addressTree);
			});
	});
}

function addToTree(tree, address) {
	if(!address) {
		return;
	}
	
	const parts = address.split('/');
	if(ip.isV4Format(address)) {
		// Single address, add it
		let route = address.split('.'),
			byt0 = route[0],
			byt1 = route[1],
			byt2 = route[2],
			byt3 = route[3];
		
		if(!tree[byt0]) {
			tree[byt0] = Object.create(null);
		} else if (typeof tree[byt0] === 'string') {
			return;
		}
		
		if(!tree[byt0][byt1]) {
			tree[byt0][byt1] = Object.create(null);
		} else if (typeof tree[byt0][byt1] === 'string') {
			return;
		}
		
		if(!tree[byt0][byt1][byt2]) {
			tree[byt0][byt1][byt2] = Object.create(null);
		} else if (typeof tree[byt0][byt1][byt2] === 'string') {
			return;
		}
		
		tree[byt0][byt1][byt2][byt3] = LIST_NAME;
	} else if(parts.length === 2 && ip.isV4Format(parts[0]) && parts[1].match(/^[0-2]?[0-9]$/)) {
		// We've got a IP v4 range of addresses
		const range = ip.cidrSubnet(address);
		const firstAddrParts = range.firstAddress.split('.');
		const lastAddrParts = range.lastAddress.split('.');
		const maskLen = range.subnetMaskLength;
		
		function addRangeToTree(rootObject, depth) {
			if(depth >= 4) {
				return LIST_NAME;
			}
			
			const lowerBound = +firstAddrParts[depth];
			const upperBound = +lastAddrParts[depth];
			
			for(let i = lowerBound; i <= upperBound; i++) {
				let curr = '' + i;
				if(maskLen <= (depth + 1) * 8) {
					rootObject[curr] = LIST_NAME;
				} else {
					if(!rootObject[curr]) {
						rootObject[curr] = Object.create(null);
					}
					
					rootObject[curr] = addRangeToTree(rootObject[curr], depth + 1);
				}
			}
			
			return rootObject;
		}
		
		addRangeToTree(tree, 0);
	} // Else: do nothing, not an ip address we understand
}

module.exports = (useLocalBackup) => {
	// Try to get and load the file from the Primary URL first
	return getFromUrl(PRIMARY_URL).catch((err) => {
		console.error('Error getting file from primary url. Falling back');
		console.error(err.message || err);
		// If we can't get it, try the backup URL instead
		return getFromUrl(BACKUP_URL);
	}).catch((err) => {
		console.error('Error getting file from secondary url. Falling back');
		console.error(err.message || err);
		
		if(!useLocalBackup) {
			// If we don't want to use the local backup, just rethrow
			throw err;
		}
		return attachToStream(fs.createReadStream(LOCAL_BACKUP, {
			encoding: 'utf8',
		}));
	});
};
