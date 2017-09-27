"use strict";

const fs = require("fs"),
	util = require("util");

const fs_readdir = util.promisify(fs.readdir),
	fs_stat = util.promisify(fs.stat);

module.exports = async function(root, suffix) {
	let paths = [root], files = [];
	while(paths.length > 0) {
		let dir = paths.pop();
		let names = await fs_readdir(dir), path;
		for(let i=0;i<names.length;++i) {
			path = dir + "/" + names[i];
			let stat = await fs_stat(path);
			if(stat.isDirectory()) {
				paths.push(path);
			}else if(suffix) { // 若指定 suffix 参数，需要额外的过滤
				path.endsWith(suffix) && files.push(path.substr(root.length));
			}else{ // 否则直接记录
				files.push(path.substr(root.length));
			}
		}
	}
	return files;
};
