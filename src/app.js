'use strict';

const cluster = require('cluster');
// We use CPU count minus 1 to allow 1 CPU for loading and processing data
const numCPUs = Math.max(require('os').cpus().length - 1, 1);

const load = require('./load');

const INTERVAL_TIME = 3 * 60 * 1000; /* 3 minutes */

let latestIPList;

function createCluster() {
	let amountToAdd = numCPUs - Object.keys(cluster.workers).length;
	
	for(let i = 0; i < amountToAdd; i++) {
		cluster.fork().send(latestIPList);
	}
}

function sendToWorkers() {
	for(let id in cluster.workers) {
		cluster.workers[id].send(latestIPList);
	}
}

if (cluster.isMaster) {
	load(true)
		.then((ips) => {
			latestIPList = ips;
			
			createCluster();
			
			cluster.on('exit', (worker, code, signal) => {
				console.log(`Socker serer in process ${worker.process.pid} died with code ${code}. Recreating`);
				createCluster();
			});
		})
		.then(() => {
			console.log('Application Running')
		}, (err) => {
			console.error(err);
		});
	
	setInterval(() => {
		console.log('Updating IP Block List...')
		load(false).then((ips) => {
			latestIPList = ips;
			sendToWorkers();
			console.log('IP Blocklist Updated')
		}).catch((err) => {
			console.error('Unable to retrieve updated IP list');
			console.error(err);
		});
	}, INTERVAL_TIME);
} else {
	const server = require('./server');
}
