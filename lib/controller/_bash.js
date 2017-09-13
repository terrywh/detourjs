"use strict";

const cp = require("child_process");

exports.execute = async function(cmd, argv, cwd, env) {
	return new Promise((resolve, reject) => {
		let stat = false;
		let proc = cp.execFile(cmd, argv, {
			cwd: cwd,
			env: env,
		}, (err, stdout, stderr) => {
			if(err) {
				reject(err);
			}else if(stat) {
				resolve(stdout);
			}else{
				reject(stderr);
			}
		});
		proc.on("exit", (code, sig) => {
			if(code == 0 || code == 1 || code == 2) {
				stat = true;
			}else{
				stat = false;
			}
		});
	});
};