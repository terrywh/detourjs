"use strict";

const cp   = require("child_process"),
	crypto = require("crypto"),
	path   = require("path");

async function create_id() {
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
	time_   = Symbol("time");

let TASKS = {};

class TaskModel {
	constructor(id) {
		this.id = id;
	}
	async [fork_](name, argv, data) {
		argv.unshift( path.normalize(config.server.root + "/task/" + name) );
		this[proc_] = cp.spawn(process.execPath, argv, {
			env: {
				DETOUR_SERVER: config.server.addr,
				DETOUR_TASK:   this.id,
				DETOUR_DATA:   data,
			},
			stdio: "inherit",
			// detached: true,
		});
		this[stat_] = [];
		this[time_] = setTimeout(() => { // cleanup incase of polling failed
			this.stop();
		}, 600000);
		TASKS[this.id] = this;
	}
	async stop(sig) {
		if(sig == undefined) sig = "SIGTERM";
		return new Promise((resolve, reject) => {
			if(this[proc_]) {
				clearTimeout(this[time_]);
				this[proc_].kill(sig);
				this[proc_] = null;
				delete TASKS[this.id];
			}
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
	let task = new TaskModel(await create_id());
	task[fork_](name, argv || [], data);
	return task;
};
exports.from = function(id) {
	return TASKS[id];
};
exports.defaultPoll = {
	status: -204,
	data: null,
};
