"use strict";
const chalk = require("chalk"),
	path = require("path");

module.exports = (function() {
	if(process.env["DETOUR_DATA"]) {
		let file = path.normalize(__dirname + "/../../data/" + process.env["DETOUR_DATA"]);
		try{
			return require(file);
		}catch(err) {
			console.log(chalk.hex("#ff3333")("无法加载 '" + file + "'数据文件"));
		}
	}
	return [];
})();