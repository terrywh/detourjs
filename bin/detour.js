#!/usr/bin/env node
"use strict";

const cluster = require("cluster"),
	os = require("os"),
	argv = require('minimist')(process.argv.slice(2));

let port = parseInt(argv.port) || 60200,
	proc = parseInt(argv.process) || os.cpus().length/2;

if(cluster.isMaster) {
	process.title = "detourjs (master)";

	function fork(i) {
		cluster.fork({
			DETOUR_SERVER: "http://" 
				+ (argv.bind || "127.0.0.1") 
				+ ":" + (port + i + 1),
		}).on("exit", function() {
			setTimeout(fork, 2000 + Math.random() * 3000, i);
		});	
	}
	for(let i=0; i<proc; ++i) {
		fork(i);
	}
}else{
	let config = require("../lib/config");
	process.title = "detourjs (server:" + config.server.port + ")";
	require("../lib/server");
}


