"use strict";
const
	app  = new (require("koa"))(),
	router = require("koa-router")(),
	server = require("http").createServer(app.callback());

var config = {
	server: {
		addr: process.env["DETOUR_SERVER"] || "http://127.0.0.1:60206",
	}
};
config.server.port = parseInt(config.server.addr.split(":").pop()) || 60206;
global.config = config;

require("./task.js")(router);
app.use(router.routes());
app.use(require("./static.js")(__dirname + "/../../www"));

server.listen(config.server.port);