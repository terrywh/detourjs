"use strict";

"use strict";

const _http = require("./_http.js"),
	_bash = require("./_bash.js"),
	_ssh2 = require("./_ssh2.js");

var STEPS = [], CWD = process.cwd(),
	INFOS = [], RUN, STATUS;

async function run() {
	STATUS = -101;
	await exports.progress();
	for(let step of STEPS) {
		STATUS = 0;
		await exports.progress(step.name);
		await step.proc();
		STATUS = -201;
		await exports.progress(step.name);
	}
	_ssh2.closeAll();
	// 任务完结
	STATUS = -202;
	await exports.progress();
};
process.on("unhandledRejection", function(err) {
	STATUS = -203;
	exports.progress(err.stack).then(() => {
		process.exit();
	}, () => {
		process.exit();
	});
}).on("uncaughtException", function(err) {
	STATUS = -203;
	exports.progress(err.stack).then(() => {
		process.exit();
	}, () => {
		process.exit();
	});
});

exports.step = async function(name, proc) {
	STEPS.push({name: name, proc:proc});
	clearTimeout(RUN);
	RUN = setTimeout(run, 1000);
};

async function progress1(data) {
	return _http.request(process.env["DETOUR_SERVER"] + "/task/progress", null, JSON.stringify({
		"id": process.env["DETOUR_TASK"],
		"status": STATUS < 0 ? STATUS : STATUS++,
		"data": data,
	})).catch(err => {
		if(err.code == "ECONNREFUSED") {
			progress2(data);
			exports.progress = progress2;
		}else{
			throw err;
		}
	});
};

const chalk = require("chalk"),
	util = require("util"),
	path = require("path");

async function progress2(data) {
	switch(STATUS) {
	case -101:
		process.stdout.write("[")
		process.stdout.write(chalk.white.bold(path.basename(process.argv[1])));
		process.stdout.write("]\n--------------------------------------------------\n");
		break;
	case 0:
		STATUS++;
		process.stdout.write(" → ")
		process.stdout.write(chalk.bold(data));
		process.stdout.write("\n");
		break;
	
	case -201: // 步骤结束
		process.stdout.write(" ← ");
		process.stdout.write(chalk.hex("#33ff66").bold("√"));
		process.stdout.write("\n");
		break;
	case -202: // 进程结束
		process.stdout.write("--------------------------------------------------\n");
		break;
	case -200: // 未知状态结束
		this.taskStatus = -1;
		data = "无法获取任务状态";
	case -203: // 异常
		process.stdout.write(" ← ");
		process.stdout.write(chalk.hex("#ff3333").bold("×"));
		process.stdout.write("\n--------------------------------------------------\n");
		process.stdout.write(chalk.hex("#bb6666")(data));
		process.stdout.write("\n");
		break;
	default: // > 0
		if(data) {
			process.stderr.write(chalk.hex("#007bff")(util.format("%s", data)));
			process.stdout.write("\n");
		}else{
			process.stdout.write("   .\n");
		}
		STATUS++;
	}
};
if(process.env["DETOUR_SERVER"]) {
	exports.progress = progress1;
}else{
	exports.progress = progress2;
}

global.readAll = async function(s) {
	return new Promise((resolve, reject) => {
		let data = [], size = 0, errorHandler = (error) => {
			reject(err);
		};
		s.on("data", (chunk) => {
			data.push(chunk);
			size += chunk.length;
		}).on("end", () => {
			s.removeListener("error", errorHandler);
			resolve(Buffer.concat(data, size));
		}).once("error", errorHandler);
	});
};
global.writeAll = async function(s) {
	return new Promise((resolve, reject) => {
		let errorHandler = (error) => {
			reject(err);
		}, drainHandler = () => {
			s.removeListener("error", errorHandler);
			s.removeListener("finish", drainHandler);
			s.removeListener("drain", drainHandler);
			resolve();
		};
		s.once("error", errorHandler).once("drain", drainHandler)
			.once("finish", drainHandler);
	});
}
exports.working_dir = async function(dir) {
	let old = CWD;
	CWD = dir;
	return old;
};
exports.wait = async function(duration) {
	await exports.progress();
	await new Promise(resolve => setTimeout(resolve, duration || 1000));
};
exports.fail = async function(err) {
	throw err instanceof Error ? err : new Error(err);
};
exports.info = async function(info) {
	await exports.progress("i:" + info);
};
exports.warn = async function(info) {
	await exports.progress("w:" + info);
};
exports.exec = async function(cmd, argv, cwd, env) {
	await exports.progress();
	return _bash.execute(cmd, argv, cwd || CWD, env);
};
exports.bash = async function(cmd, cwd, env) {
	await exports.progress();
	return _bash.execute("/bin/bash", ["-c", cmd], cwd, env);
};
exports.http = async function(uri, query, data, refer, agent, cookie) {
	await exports.progress();
	let headers = {};
	if(refer) {
		headers["Referer"] = refer;
	}
	if(agent) {
		headers["User-Agent"] = agent;
	}
	if(cookie) {
		headers["Cookie"] = _http.cookie(cookie);
	}
	return _http.request(uri, query, data, headers);
};
exports.curl = async function(uri, query, data) {
	await exports.progress();
	return exports.http(uri, query, data, null, "curl/7.47.0");
};
// 连接主机返回 shell 对象
exports.ssh2 = async function(opts) {
	return _ssh2.shell(opts);
};
// 连接主机返回 sftp 对象
exports.sftp = async function(opts) {
	return _ssh2.sftp(opts);
};
