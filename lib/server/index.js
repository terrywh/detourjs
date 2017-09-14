"use strict";
const
	path   = require("path"),
	url    = require("url"),
	app    = new (require("koa"))(),
	router = require("koa-router")(),
	server = require("http").createServer(app.callback());

var config = {
	server: {
		root: path.normalize(__dirname + "/../../"),
		addr: process.env["DETOUR_SERVER"] || "http://127.0.0.1:60200",
	}
};
let addr = url.parse(config.server.addr);
config.server.port = parseInt(addr.port) || 60206;
config.server.host = addr.hostname || "127.0.0.1";
global.config = config;

require("./task.js")(router);
app.use(router.routes());
app.use(require("./static.js")(__dirname + "/../../www"));

server.listen(config.server.port, config.server.host);
process.on("unhandledRejection", function(err) {
	console.error(err.stack || err.toString);
});
