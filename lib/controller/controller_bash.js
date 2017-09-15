"use strict";

const cp = require("child_process");

async function execute(cmd, argv, cwd, env) {
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

module.exports = function(exports) {
	let CMD = process.cwd();
	exports.working_dir = async function(dir) {
		let old = CWD;
		CWD = dir;
		return old;
	};
	exports.exec = async function(cmd, argv, cwd, env) {
		await exports.progress();
		return execute(cmd, argv, cwd || CWD, env);
	};
	exports.bash = async function(cmd, cwd, env) {
		await exports.progress();
		return execute("/bin/bash", ["-c", cmd], cwd, env);
	};
};
