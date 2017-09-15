"use strict";
const path = require("path"),
	url = require("url");
var config = {
	server: {
		root: path.normalize(__dirname + "/../../"),
		addr: process.env["DETOUR_SERVER"] || "http://127.0.0.1:60200",
	}
};
let addr = url.parse(config.server.addr);
config.server.port = parseInt(addr.port) || 60206;
config.server.host = addr.hostname || "127.0.0.1";

module.exports = config;