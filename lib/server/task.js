"use strict";

const cp    = require("child_process"),
	crypto  = require("crypto"),
	path    = require("path"),
	readdir = require("./_readdir.js"),
	split   = require("./_split.js"),
	Task    = require("./model/task.js");

module.exports = function(router) {
	router.post("/task/progress", async (ctx) => {
		let stat = JSON.parse(await reqBody(ctx)),
			task = Task.from(stat.id);

		await task.push(stat);
		ctx.body = {"errno": 0, "errmsg": "", "data": Date.now()};
	});
	router.get("/task/start", async (ctx) => {
		let name, data, argv = [], task;
		if(ctx.query.name) {
			name = path.normalize(ctx.query.name);
		}
		if(ctx.query.data) {
			data = path.normalize(ctx.query.data);
		}
		if(ctx.query.argv) {
			argv = split(ctx.query.argv, ' ', '"', '"');
		}
		if(!name) {
			ctx.body = {"errno": -1, "errmsg": "task name is required"};
			return;
		}
		task = await Task.fork(name, argv, data);
		ctx.body = {
			"errno": 0,
			"errmsg": "",
			"data": task.id,
		};
	});
	router.get("/task/kill", async (ctx) => {
		let task = Task.from(ctx.query.id);
		if(task) {
			await task.stop("SIGKILL");
			ctx.body = {"errno": 0, "errmsg": "", "data": Date.now()};
		}else{
			ctx.body = {"errno": -1, "errmsg": "task not found"};
		}
	});
	router.get("/task/poll", async (ctx) => {
		let task = Task.from(ctx.query.id);
		if(task) ctx.body = {"errno": 0, "errmsg": "", "data": await task.poll()};
		else ctx.body = {"errno": 0, "errmsg": "", "data": Task.defaultPoll};
	});
	router.get("/task/list", async (ctx) => {
		ctx.body = {
			"errno": 0,
			"errmsg": "",
			"data": await readdir(__dirname + "/../../task", ".js"),
		};
	});
	router.get("/data/list", async (ctx) => {
		ctx.body = {
			"errno": 0,
			"errmsg": "",
			"data": await readdir(__dirname + "/../../data", ".js"),
		};
	});
};

async function reqBody(ctx) {
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
