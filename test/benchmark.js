'use strict';

const net = require('net');
const ttlTable = require('tty-table');
const program = require('commander')
	.option('-n, --requests <n>', 'Number of requests to make', parseInt)
	.option('-c, --concurrent <n>', 'Number of concurrent open sockets', parseInt)
	.option('-p, --port <n>', 'Port to send data to', parseInt)
	.parse(process.argv);

const PORT = program.port || process.env.PORT || 8000;
const CONCURRENT = program.concurrent || 1;
const REQUESTS = program.requests || 100000;
const TEST_IPS = ['127.0.0.1', '0.245.15.2', '212.15.24.37', '3.15.28.55', '118.224.255.4', '214.89.168.37', '17.244.120.2'];

let RESULTS_RECIEVED = 0;
// TIMERS
let startTotal = process.hrtime();
let endTotal;
let startConnections;
let endConnections;
let startRequests;
let endRequests;
let startResponses;
let endResponses;

function getConnection () {
	return new Promise((resolve, reject) => {
		const connection = net.connect(PORT);
		let currChunk = '';
		connection.on('data', (chunk) => {
			currChunk += chunk;
			
			if(!startResponses) {
				startResponses = process.hrtime();
			}
			
			while(currChunk.indexOf('\n') >= 0) {
				let idx = currChunk.indexOf('\n');
				RESULTS_RECIEVED++;
				currChunk = currChunk.slice(idx + 1);
				
				if(RESULTS_RECIEVED == REQUESTS) {
					endResponses = process.hrtime();
					done();
				}
			}
		});
		connection.on('connect', () => {
			resolve(connection);
		});
		connection.on('error', (err) => {
			reject(err);
		});
	});
}

function getDifference(hrStart, hrEnd) {
	const nsToMs = 1000000
	const s = hrEnd[0] - hrStart[0];
	const ns = hrEnd[1] - hrStart[1];
	
	const ms = (s * 1000) + // seconds to milliseconds
		(ns / 1000000); // nanoseconds to milliseconds
	
	return ms;
}

function done() {
	endTotal = process.hrtime();
	const tableRows = [];
	
	const connectionTime = getDifference(startConnections, endConnections);
	const requestTime = getDifference(startRequests, endRequests);
	const responseTime = getDifference(startRequests, endResponses);
	
	tableRows.push([ 'Connections Made', CONCURRENT, connectionTime, connectionTime / CONCURRENT, '']);
	tableRows.push([ 'Requests', REQUESTS, requestTime, requestTime / REQUESTS, Math.round(REQUESTS / (requestTime / 1000))]);
	tableRows.push([ 'Responses', RESULTS_RECIEVED, responseTime, responseTime / RESULTS_RECIEVED, Math.round(RESULTS_RECIEVED / (responseTime / 1000))]);
	
	let table = ttlTable([
		{
			value: 'name',
			align: 'right',
		},
		{
			value: 'count',
		},
		{
			value: 'time (ms)',
		},
		{
			value: 'average time (ms)',
		},
		{
			value: '# per second',
		},
	], tableRows);
	
	
	
	console.log('Benchmark complete');
	console.log(table.render());
	console.log('Time between first request and first response: ', getDifference(startRequests, startResponses), 'ms');
	console.log('Time between last request and last response: ', getDifference(endRequests, endResponses), 'ms');
	console.log('Total test took %d', getDifference(startTotal, endTotal), 'ms');
	process.exit(0);
}

console.log('Starting Benchmark Tests...')

const connectionPromises = [];
startConnections = process.hrtime();
for(var c = 0; c < CONCURRENT; c++) {
	connectionPromises.push(getConnection());
}

Promise.all(connectionPromises)
	.then((connections) => {
		endConnections = process.hrtime();
		
		startRequests = process.hrtime();
		let requestsSent = 0;
		for(var r = 0; r < REQUESTS; r++) {
			// Round robin distribution of test requests
			connections[r % connections.length].write(TEST_IPS[r % TEST_IPS.length] + '\n', () => {
				requestsSent++;
				if(requestsSent === REQUESTS) {
					endRequests = process.hrtime();
				}
			});
		}
		
	},(err) => {
		console.error('Unable to make initial connection, server cannot be reached. Please make sure the server has been started and is running properly');
		console.error(err);
		process.exit(1);
	})
	.catch((err) => {
		console.error('Error running benchmark code');
		console.error(err);
		process.exit(2);
	});
