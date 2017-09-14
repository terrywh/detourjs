"use strict";

const cp = require("child_process"),
	os = require("os"),
	argv = require('minimist')(process.argv.slice(2));

let port = parseInt(argv.port) || 60200;
for(let i=0; i<os.cpus().length/4; ++i) {
	fork(i);
}
function fork(i) {
	cp.fork(__dirname + "/../lib/server/", {
		env: {
			DETOUR_SERVER: "http://" 
				+ (argv.bind || "127.0.0.1") 
				+ ":" + (port + i + 1),
		},
	}).on("exit", function() {
		setTimeout(fork, 2000 + Math.random() * 3000, i);
	});	
}
