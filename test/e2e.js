'use strict';

const path = require('path');
const spawnWaitFor = require('spawn-wait-for');
const net = require('net');
const should = require('should/as-function');

const PORT = process.env.PORT || 8000;

describe('End to End tests', function () {
	/** SETUP
	  * 
	  * Start a new server for running E2E tests on
	  */
	let system;
	before(() => {
		return spawnWaitFor('"' + process.execPath + '" ' + path.resolve(__dirname, '../src/app.js'), /Application Running/).then((app) => {
			system = app.process;
		});
	});
	
	/** TEARDOWN
	  * 
	  * Shutdown the server so things are cleaned up
	  */
	after(() => {
		system.kill();
	});
	
	/** TEST SETUP
	  * 
	  * Open a brand new connection to the server so we can ensure clean tests
	  */
	let connection;
	beforeEach(() => {
		return new Promise((resolve, reject) => {
			connection = net.connect(PORT, () => {
				resolve();
			});
			
			connection.setEncoding('utf8');
			
			connection.on('error', (err) => {
				reject(err);
			});
		})
	});
	
	/** TEST TEARDOWN
	  * 
	  * Close the connection so we don't leave any open or cause any issues later
	  */
	afterEach(() => {
		return new Promise((resolve, reject) => {
			connection.on('error', (err) => {
				reject(err);
			});
			
			connection.on('close', (had_err) => {
				if(had_err) {
					reject();
				} else {
					resolve();
				}
			});
			connection.end();
		})
	});
	
	
	/** TESTS
	  * 
	  */
	it('should respond to an IP address request with valid json', function (done) {
		let currChunk = '';
		connection.on('data', function (chunk) {
			currChunk += chunk;
			
			if(currChunk.indexOf('\n') >= 0) {
				let json;
				try {
					json = JSON.parse(currChunk)
				} catch(err) {
					done(err);
				}
				should(json).be.Object();
				should(json.ip).equal('127.0.0.1');
				done();
			}
		});
		
		connection.write('127.0.0.1\n');
	});
	
	it('should respond with a flag indicating an IP is not allowed if is on the blocklist', function (done) {
		let currChunk = '';
		connection.on('data', function (chunk) {
			currChunk += chunk;
			
			if(currChunk.indexOf('\n') >= 0) {
				let json;
				try {
					json = JSON.parse(currChunk)
				} catch(err) {
					done(err);
				}
				should(json).be.Object();
				should(json.ip).equal('0.0.0.1');
				should(json.allowed).be.false();
				should(json.list).be.a.String().which.is.not.empty();
				done();
			}
		});
		
		connection.write('0.0.0.1\n');
	});
	
	it('should respond with a flag indicating an IP is allowed if is not on the blocklist (uses Googlebot IP)', function (done) {
		let currChunk = '';
		connection.on('data', function (chunk) {
			currChunk += chunk;
			
			if(currChunk.indexOf('\n') >= 0) {
				let json;
				try {
					json = JSON.parse(currChunk)
				} catch(err) {
					done(err);
				}
				should(json).be.Object();
				should(json.ip).equal('104.132.7.13');
				should(json.allowed).be.true();
				done();
			}
		});
		
		connection.write('104.132.7.13\n');
	});
});
