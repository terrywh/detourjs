"use strict";

const chalk = require("chalk"),
	util = require("util"),
	path = require("path"),
	url  = require("url"),
	events = require("events"),
	http = require("http");

process.title = "detourjs (task:" + path.basename(process.argv[1]) + "-" + process.env["DETOUR_TASK"] + ")";

var STEPS = [], RUN, STATUS,
	CONTROLLER = new events.EventEmitter();

async function run() {
	CONTROLLER.emit("beforeStart");
	STATUS = -101;
	await CONTROLLER.progress();
	CONTROLLER.emit("afterStart");
	for(let step of STEPS) {
		CONTROLLER.emit("beforeStep");
		STATUS = 0;
		await CONTROLLER.progress(step.name);
		await step.proc();
		STATUS = -201;
		await CONTROLLER.progress(step.name);
		CONTROLLER.emit("afterStep");
	}
	CONTROLLER.emit("beforeStop");
	// 任务完结
	STATUS = -202;
	await CONTROLLER.progress();
	CONTROLLER.emit("afterStop");
};
process.on("unhandledRejection", function(err) {
	console.error(err.stack);
	STATUS = -203;
	CONTROLLER.progress(err.stack).then(() => {
		process.exit();
	}, () => {
		process.exit();
	});
}).on("uncaughtException", function(err) {
	console.error(err.stack);
	STATUS = -203;
	CONTROLLER.progress(err.stack).then(() => {
		process.exit();
	}, () => {
		process.exit();
	});
});
let progressOpts = url.parse(process.env["DETOUR_SERVER"] + "/task/progress");
progressOpts.method = "POST";
async function progress1(data) {
	return new Promise((resolve, reject) => {
		let req = http.request(progressOpts);
		req.on("response", resolve).on("error", err => {
			if(err.code == "ECONNREFUSED") {
				progress2(data);
				CONTROLLER.progress = progress2;
			}else{
				console.error(err.stack || err);
			}
			resolve();
		});
		req.end(JSON.stringify({
			"id": process.env["DETOUR_TASK"],
			"status": STATUS < 0 ? STATUS : STATUS++,
			"data": data,
		}));
	});
};

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
		if(data && data[0] == 'i' && data[1] == ':') {
			process.stderr.write(chalk.hex("#007bff")(util.format("%s", data.substr(2))));
			process.stdout.write("\n");
		}else if(data && data[0] == 'w' && data[1] == ':') {
			process.stderr.write(chalk.hex("#ffbb77")(util.format("%s", data.substr(2))));
			process.stdout.write("\n");
		}else{
			process.stdout.write("   .\n");
		}
		STATUS++;
	}
};
if(process.env["DETOUR_SERVER"]) {
	CONTROLLER.progress = progress1;
}else{
	CONTROLLER.progress = progress2;
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
};
CONTROLLER.step = async function(name, proc) {
	STEPS.push({name: name, proc:proc});
	clearTimeout(RUN);
	RUN = setTimeout(run, 1000);
};
CONTROLLER.wait = async function(duration) {
	await CONTROLLER.progress();
	await new Promise(resolve => setTimeout(resolve, duration || 1000));
};
CONTROLLER.fail = async function(err) {
	throw err instanceof Error ? err : new Error(err);
};
CONTROLLER.info = async function(info) {
	await CONTROLLER.progress("i:" + info);
};
CONTROLLER.warn = async function(info) {
	await CONTROLLER.progress("w:" + info);
};
// 其他功能插件
require("./controller_http.js")(CONTROLLER);
require("./controller_bash.js")(CONTROLLER);
require("./controller_ssh2.js")(CONTROLLER);

module.exports = CONTROLLER;
