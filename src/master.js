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

exports.start = updateList(true)
	.then(() => {
		createCluster();
		
		cluster.on('exit', (worker, code) => {
			console.log(`Socket serer in process ${worker.process.pid} died with code ${code}. Recreating`);
			createCluster();
		});
		
		// Start a timer for updating the block list
		exports.updateTimer = setTimeout(() => {
			exports.triggerUpdate(true);
		}, INTERVAL_TIME);
	})
	.then(() => {
		console.log('Application Running')
	}, (err) => {
		console.error(err);
	});

// Setup Interval on which to update list
exports.triggerUpdate = (setTimer) => {
	// We're updating, cancel any pending timed updates
	exports.cancelUpdate();
	
	return updateList(false).then(() => {
		sendToWorkers();
		
		if(setTimer) {
			exports.updateTimer = setTimeout(() => {
				exports.triggerUpdate(setTimer);
			}, INTERVAL_TIME);
			return exports.updateTimer;
		}
	}).catch((err) => {
		console.error('Unable to retrieve updated IP list');
		console.error(err);
	});
};

exports.cancelUpdate = () => {
	if(exports.updateTimer) {
		clearTimeout(exports.updateTimer);
	}
	exports.updateTimer = null;
};
