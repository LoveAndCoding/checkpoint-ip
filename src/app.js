'use strict';

const cluster = require('cluster');
const net = require('net');
const numCPUs = require('os').cpus().length;

const load = require('./load');

function sendToWorkers(data) {
	for(let id in cluster.workers) {
		cluster.workers[id].send(data);
	}
}

if (cluster.isMaster) {
	console.log(`Master ${process.pid} is running`);

	load('./firehol_level1.netset', 'Firehol Level 1')
		.then((ips) => {
			// Fork workers.
			for (let i = 0; i < numCPUs; i++) {
				cluster.fork();
			}
			
			sendToWorkers(ips);
			
			cluster.on('exit', (worker, code, signal) => {
				console.log(`worker ${worker.process.pid} died`);
			});
		})
		.then(null, (err) => {
			console.error(err);
		});
	
} else {
	const ip = require('ip');
	
	let ipMap = Object.create(null);
	
	cluster.worker.on('message', (data) => {
		ipMap = data;
	});
	
	net.createServer((connection) => {
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
}
