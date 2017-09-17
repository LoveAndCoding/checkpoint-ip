'use strict';

const cluster = require('cluster');
const load = require('./load');

// We use CPU count minus 1 to allow 1 CPU for loading and processing data
const WORKER_COUNT = Math.max(require('os').cpus().length - 1, 1);
const INTERVAL_TIME = 3 * 60 * 1000; /* 3 minutes */

function createCluster() {
	let amountToAdd = WORKER_COUNT - Object.keys(cluster.workers).length;
	
	for(let i = 0; i < amountToAdd; i++) {
		cluster.fork().send(latestIPList);
	}
}

function sendToWorkers() {
	for(let id in cluster.workers) {
		cluster.workers[id].send(latestIPList);
	}
}

let latestIPList;
function updateList(loadFromFile) {
	console.log('Updating IP Block List...')
	return load(loadFromFile).then((ips) => {
		latestIPList = ips;
		console.log('IP Blocklist Updated');
	});
}

module.exports = updateList(true)
	.then(() => {
		createCluster();
		
		cluster.on('exit', (worker, code, signal) => {
			console.log(`Socket serer in process ${worker.process.pid} died with code ${code}. Recreating`);
			createCluster();
		});
	})
	.then(() => {
		console.log('Application Running')
	}, (err) => {
		console.error(err);
	});

// Setup Interval on which to update list
setInterval(() => {
	updateList(false).then(() => {
		sendToWorkers();
	}).catch((err) => {
		console.error('Unable to retrieve updated IP list');
		console.error(err);
	});
}, INTERVAL_TIME);
