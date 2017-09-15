"use strict";

const cp   = require("child_process"),
	crypto = require("crypto"),
	path   = require("path"),
	config = require("../../config");

async function createTaskID() {
	return new Promise((resolve, reject) => {
		crypto.randomBytes(8, function(err, buffer) {
			err ? reject(err) :	resolve(buffer.toString("hex"));
		});
	});
};

const task_ = Symbol("task"),
	fork_   = Symbol("fork"),
	proc_   = Symbol("proc"),
	stat_   = Symbol("stat"),
	time_   = Symbol("time"),
	argv_   = Symbol("argv"),
	data_   = Symbol("data"),
	run_    = Symbol("run");

let TASK_MAP = {}, TASK_RUNNING = 0, TASK_QUEUE = [];

class TaskModel {
	constructor(id) {
		this.id = id;
	}
	[fork_](name, argv, data) {
		argv.unshift( path.normalize(config.server.root + "/task/" + name) );
		this[argv_] = argv;
		this[data_] = data;
		this[stat_] = [];
		TASK_MAP[this.id] = this;
	}
	[run_]() {
		++TASK_RUNNING;
		this[proc_] = cp.spawn(process.execPath, this[argv_], {
			env: {
				DETOUR_SERVER: config.server.addr,
				DETOUR_TASK:   this.id,
				DETOUR_DATA:   this[data_],
			},
			stdio: "inherit",
			// stdio: "ignore",
			// detached: true,
		});
		this[proc_].on("exit", () => {
			--TASK_RUNNING;
			// 由于并行限制，当进程退出时确认是否可执行任务
			if(TASK_QUEUE.length == 0) return;
			TASK_QUEUE.pop()[run_]();
		});
		// 防止异常情况数据没有清理
		this[time_] = setTimeout(() => {
			this.stop();
		}, 3600000);
	}
	async stop(sig) {
		if(sig == undefined) sig = "SIGTERM";
		return new Promise((resolve, reject) => {
			if(this[proc_]) {
				clearTimeout(this[time_]);
				this[proc_].kill(sig);
				this[proc_] = null;
			}
			delete TASK_MAP[this.id];
			TASK_QUEUE.splice(TASK_QUEUE.indexOf(this), 1);
			resolve();
		});
	}
	async push(stat) {
		this[stat_].push(stat);
	}
	async poll() {
		for(let i=0;i<10;++i) {
			if(this[stat_].length != 0) break;
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
		if(this[stat_].length == 0) {
			return exports.defaultPoll;
		}
		return this[stat_].shift();
	}
};
exports.fork = async function(name, argv, data) {
	let task = new TaskModel(await createTaskID());
	task[fork_](name, argv || [], data);
	// 控制并行的任务数量
	if(TASK_RUNNING < config.task.concurrent) {
		task[run_]();
	}else{
		task[stat_].push(exports.queuePoll);
		TASK_QUEUE.push(task);
	}
	return task;
};
exports.from = function(id) {
	return TASK_MAP[id];
};
exports.defaultPoll = {
	status: -102, // 超时无新状态
	data: null,
};
exports.queuePoll = {
	status: -103, // 排队中
	data: null,
};
exports.errorPoll = {
	status: -204,
	data: null,
};
