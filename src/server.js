'use strict';

const cluster = require('cluster');
const net = require('net');

let ipMap = Object.create(null);

const simpleIPv4Regex = /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/;

cluster.worker.on('message', (data) => {
	ipMap = data;
});

module.exports = net.createServer((connection) => {
	connection.setEncoding('utf8');
	
	function checkIp(address) {
		if(!simpleIPv4Regex.test(address)) {
			console.warn('Received IP Address in an unexpected format (%s)', address);
			
			connection.write(JSON.stringify({
				ip: address,
				allowed: false,
				error: 'Invalid IP Address Format',
			}) + '\n');
			return;
		}
		
		const parts = address.split('.');
		let curr = ipMap;
		
		while(typeof curr === 'object' && curr) {
			curr = curr[parts.shift()];
		}
		connection.write(JSON.stringify({
			ip: address,
			allowed: !curr,
			list: curr,
		}) + '\n');
	}
	
	let currChunk = '';
	connection.on('data', (chunk) => {
		currChunk += chunk;
		
		while(currChunk.indexOf('\n') >= 0) {
			let idx = currChunk.indexOf('\n');
			let addr = currChunk.substring(0, idx);
			checkIp(addr);
			currChunk = currChunk.slice(idx + 1);
		}
	});
	
	connection.on('error', function (err) {
		console.error('Socket connection error: %s', err.message);
	});
}).listen(process.env.PORT || 8000);

console.log(`Socket server has started`);
