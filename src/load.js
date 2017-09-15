'use strict';

const fs = require('fs');
const split = require('split');
const ip = require('ip');

module.exports = (file, name) => {
	const addresses = Object.create(null);
	
	const saveValue = {
		file,
		name,
	};
	
	function addAddress(address) {
		if(!address) return;
		
		const parts = address.split('/');
		if(ip.isV4Format(address)) {
			// Single address, add it
			let route = address.split('.'),
				byt0 = route[0],
				byt1 = route[1],
				byt2 = route[2],
				byt3 = route[3];
			
			if(!addresses[byt0]) {
				addresses[byt0] = Object.create(null);
			} else if (typeof addresses[byt0] === 'string') {
				return;
			}
			
			if(!addresses[byt0][byt1]) {
				addresses[byt0][byt1] = Object.create(null);
			} else if (typeof addresses[byt0][byt1] === 'string') {
				return;
			}
			
			if(!addresses[byt0][byt1][byt2]) {
				addresses[byt0][byt1][byt2] = Object.create(null);
			} else if (typeof addresses[byt0][byt1][byt2] === 'string') {
				return;
			}
			
			addresses[byt0][byt1][byt2][byt3] = name;
		} else if(parts.length === 2 && ip.isV4Format(parts[0]) && Number(parts[1]) == parts[1]) {
			// We've got a IP v4 range of addresses
			const range = ip.cidrSubnet(address);
			const startLong = ip.toLong(range.firstAddress);
			const endLong = ip.toLong(range.lastAddress);
			const firstAddrParts = range.firstAddress.split('.');
			const lastAddrParts = range.lastAddress.split('.');
			const maskLen = range.subnetMaskLength;
			
			/* 
			console.log('Adding a range of %d for %s from %s to %s', range.numHosts, address, range.firstAddress, range.lastAddress);
			console.log('Memory Usage: ');
			console.log(process.memoryUsage());
			if(range.subnetMaskLength <= 8) {
				addresses[firstAddrParts[0]] = name;
			} else if (range.subnetMaskLength <= 16 && typeof addresses[firstAddrParts[0]] !== 'string') {
				if(!addresses[firstAddrParts[0]]) {
					addresses[firstAddrParts[0]] = Object.create(null);
				}
				addresses[firstAddrParts[0]][firstAddrParts[1]] = name;
			} else if (range.subnetMaskLength <= 24 && typeof addresses[firstAddrParts[0]] !== 'string' && (typeof addresses[firstAddrParts[0]] === 'undefined' || typeof addresses[firstAddrParts[0]][firstAddrParts[1]] !== 'string')) {
				if(!addresses[firstAddrParts[0]]) {
					addresses[firstAddrParts[0]] = Object.create(null);
				}
				if(!addresses[firstAddrParts[0]][firstAddrParts[1]]) {
					addresses[firstAddrParts[0]][firstAddrParts[1]] = Object.create(null);
				}
				addresses[firstAddrParts[0]][firstAddrParts[1]][firstAddrParts[2]] = name;
			}
			 */
			function addToTree(rootObject, depth) {
				if(depth >= 4) {
					return name;
				}
				
				const lowerBound = +firstAddrParts[depth];
				const upperBound = +lastAddrParts[depth];
				
				for(let i = lowerBound; i <= upperBound; i++) {
					let curr = '' + i;
					if(maskLen <= (depth + 1) * 8) {
						rootObject[curr] = name;
					} else {
						if(!rootObject[curr]) {
							rootObject[curr] = Object.create(null);
						}
						
						rootObject[curr] = addToTree(rootObject[curr], depth + 1);
					}
				}
				
				return rootObject;
			}
			
			addToTree(addresses, 0);
			/* 
			let startRange = +addresses[firstAddrParts[0]];
			let endRange = +addresses[lastAddrParts[0]];
			
			if(maskLen <= 16) {
				addresses[firstAddrParts[0]] = name;
			} else if(!addresses[firstAddrParts[0]]) {
				addresses[firstAddrParts[0]] = Object.create(null);
			}
			
			for(let addr = startLong; addr <= endLong; addr++) {
				addAddress(ip.fromLong(addr));
			}
			
			console.log(process.memoryUsage());
			*/
		} // Else: do nothing, not an ip address we understand
	}
	
	return new Promise((resolve, reject) => {
		fs.createReadStream(file, {
				encoding: 'utf8',
			})
			.pipe(split())
			.on('data', (line) => {
				line = line || '';
				if(line === '' || line.startsWith('#')) {
					// Comment or emtpy line, ignore it
					return;
				}
				
				addAddress(line);
			})
			.on('error', (err) => {
				reject(err);
			})
			.on('close', () => {
				resolve(addresses);
			});
	});
};
