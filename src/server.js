'use strict';

const cluster = require('cluster');
const net = require('net');
const ip = require('ip');

let ipMap = Object.create(null);

cluster.worker.on('message', (data) => {
	ipMap = data;
});

module.exports = net.createServer((connection) => {
	connection.setEncoding('utf8');
	
	function checkIp(address) {
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
	
}).listen(process.env.PORT || 8000);

console.log(`Worker ${process.pid} started`);
