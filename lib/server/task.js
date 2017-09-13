"use strict";

const cp = require("child_process"),
	crypto = require("crypto"),
	path = require("path"),
	util = require("util"),
	fs = require("fs");

const fs_readdir = util.promisify(fs.readdir),
	fs_stat = util.promisify(fs.stat),
	readdir = async function(root) {
		let paths = [root], files = [];
		while(paths.length > 0) {
			let dir = paths.pop();
			let names = await fs_readdir(dir), path;
			for(let i=0;i<names.length;++i) {
				path = dir + "/" + names[i];
				let stat = await fs_stat(path);
				if(stat.isDirectory()) {
					paths.push(path);
				}else{
					files.push(path.substr(root.length));
				}
			}
		}
		return files;
	};
const splitsw = function(str, sep, w1, w2) {
	let s = 0, m = 0, r = [];
	for(let i=0;i<str.length;++i) {
		switch(s) {
		case 0:
			if(str[i] == w1) {
				m = i + 1;
				s = 2;
			}else if(str[i] == sep) {
			}else{
				m = i;
				s = 1;
				--i;
			}
			break;
		case 1:
			if(str[i] == sep || i == str.length - 1) {
				r.push(str.substr(m, Math.max(i - m, 1)));
				s = 0;
			}
			break;
		case 2:
			if(str[i] == w2 || i == str.length - 1) {
				r.push(str.substr(m, Math.max(i - m, 1)));
				s = 0;
			}
			break;
		}
	}
	return r;
};

module.exports = function(router) {
	router.post("/task/progress", async (ctx) => {
		let task = JSON.parse(await request_body(ctx));
		await push_task(task.id, task);
		ctx.body = {"errno": 0, "errmsg": "", "data": Date.now()};
	});
	router.get("/task/start", async (ctx) => {
		let name, data, argv = [];
		if(ctx.query.name) {
			name = path.normalize(ctx.query.name);
		}
		if(ctx.query.data) {
			data = path.normalize(ctx.query.data);
		}
		if(ctx.query.argv) {
			argv = splitsw(ctx.query.argv, ' ', '"', '"');
		}
		if(!name) {
			ctx.body = {"errno": -1, "errmsg": "task name is required"};
			return;
		}
		ctx.body = {
			"errno": 0,
			"errmsg": "",
			"data": await fork_task(name, data, argv)
		};
	});
	router.get("/task/stop", async (ctx) => {
		await stop_task(ctx.query.id, "SIGTERM");
		ctx.body = {
			"errno": 0,
			"errmsg": "",
			"data": Date.now(),
		};
	});
	router.get("/task/kill", async (ctx) => {
		await stop_task(ctx.query.id, "SIGKILL");
		ctx.body = {
			"errno": 0,
			"errmsg": "",
			"data": Date.now(),
		};
	});
	router.get("/task/poll", async (ctx) => {
		ctx.body = {
			"errno": 0,
			"errmsg": "",
			"data": await poll_task(ctx.query.id),
		};
	});
	router.get("/task/list", async (ctx) => {
		ctx.body = {
			"errno": 0,
			"errmsg": "",
			"data": await readdir(__dirname + "/../../task"),
		};
	});
	router.get("/data/list", async (ctx) => {
		ctx.body = {
			"errno": 0,
			"errmsg": "",
			"data": await readdir(__dirname + "/../../data"),
		};
	});
};

async function request_body(ctx) {
	return new Promise((resolve, reject) => {
		ctx.req.setEncoding("utf-8");
		let data = "";
		ctx.req.on("data", chunk => {
			data += chunk;
		}).on("end", () => {
			resolve(data);
		});
	});
}

async function create_task() {
	return new Promise((resolve, reject) => {
		crypto.randomBytes(8, function(err, buffer) {
			err ? reject(err) :	resolve(buffer.toString("hex"));
		});
	});
}

let PROCS = {}, STATS = {}, TIMES = {};
async function fork_task(name, data, argv) {
	let id = await create_task();
	argv.unshift( path.normalize(__dirname + "/../../task/" + name) );
	PROCS[id] = cp.spawn(process.execPath, argv, {
		env: {
			DETOUR_SERVER: config.server.addr,
			DETOUR_TASK:   id,
			DETOUR_DATA:   data || "empty",
		},
		stdio: "inherit",
		// detached: true,
	});
	STATS[id] = [];
	TIMES[id] = setTimeout(() => { // cleanup incase of polling failed
		delete PROCS[id];
		delete STATS[id];
		delete TIMES[id];
	}, 600000);
	return id;
}

async function stop_task(id, sig) {
	if(!PROCS[id]) return Promise.resolve();
	return new Promise((resolve, reject) => {
		PROCS[id].kill(sig);
		delete PROCS[id];
		delete STATS[id];
		clearTimeout(TIMES[id]);
		delete TIMES[id];
		setTimeout(resolve, 200);
	});
}
async function push_task(id, task) {
	let stat = STATS[id];
	if(!stat) return Promise.reject("task '"+id+"' does not exist");
	stat.push(task);
}
async function poll_task(id) {
	let stat = STATS[id];
	if(!stat) return Promise.reject("task '" + id + "' does not exist");
	for(let i=0;i<10;++i) {
		if(stat.length == 0) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}
	if(stat.length == 0) {
		return {
			id: id,
			status: -200,
			data: null,
		};
	}else{
		return stat.shift();
	}
}

async function progress_task(task) {
	console.log(task);
}
