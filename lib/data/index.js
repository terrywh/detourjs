"use strict";
const chalk = require("chalk"),
	http = require("http"),
	url  = require("url"),
	path = require("path"),
	fs = require("fs"),
	split = require("../_split.js"),
	loader = {};
loader.js = loader.json = function(file) {
	return require(file);
};
loader.csv = function(file) {
	return new Promise((resolve, reject) => {
		fs.readFile(file, (err, data) => {
			if(err) {
				reject(err);
				return;
			}
			resolve(data.toString().trim().split("\n").map((line) => {
				return split(line.trim(), ",", '"', '"');
			}));
		});
	});
};
loader.http = function(file) {
	return new Promise((resolve, reject) => {
		let opts = url.parse(file), data = "";
		opts.method = "GET";
		let req = http.request(opts);
		req.on("response", (res) => {
			res.setEncoding("utf-8");
			res.on("data", (chunk) => {
				data += chunk;
			}).on("end", () => {
				if(data[0] == '[' || data[0] == '{') {
					try{
						resolve(JSON.parse(data));
					}catch(err){
						reject(err);
					}
				}else{
					resolve(data.trim().split("\n").map((line) => {
						return split(line.trim(), ",", '"', '"');
					}));
				}
			});
		}).on("error", reject).end();
	});
};

// 支持异步数据集
module.exports = function() {
	if(process.env["DETOUR_DATA"] && process.env["DETOUR_DATA"] != "undefined") {
		// config.server.root 在 data 的引用上下问并没有定义
		if(process.env["DETOUR_DATA"].substr(0, 5) == "http:") {
			return loader.http(process.env["DETOUR_DATA"]);
		}else{
			let file = path.normalize(__dirname + "/../../data/" + process.env["DETOUR_DATA"]),
				ext  = path.extname(file);
			try{
				return loader[ext](file);
			}catch(err) {
				console.log(chalk.hex("#ff3333")("无法加载 '" + file + "'数据文件"));
			}
		}
	}
	return [];
};
