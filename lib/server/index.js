"use strict";
const app  = new (require("koa"))(),
	router = require("koa-router")(),
	server = require("http").createServer(app.callback());

let config = require("../config");
require("./task.js")(router);
app.use(router.routes());
app.use(require("./static.js")(__dirname + "/../../www"));

server.listen(config.server.port, config.server.host);
process.on("unhandledRejection", function(err) {
	console.error(err.stack || err.toString);
});
