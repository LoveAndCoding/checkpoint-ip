'use strict';

const cluster = require('cluster');
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
	const server = require('./server');
}
