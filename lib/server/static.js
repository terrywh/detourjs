"use strict"

const path = require("path"),
	fs = require("fs"),
	mtypes = {
		".html": "text/html",
		".js":   "text/javascript",
		".json": "text/json",
		".png":  "image/png",
		".jpg":  "image/jpeg",
		".gif":  "image/gif",
		".css":  "text/css"
	};

module.exports = function(www) {
	www = path.normalize(www);
	return async function(ctx, next) {
		let status = 302, file = www + path.resolve(www, ctx.path);
		while(status === 302) {
			status = await new Promise((resolve, reject) => {
				fs.stat(file, function(error, stats) {
					resolve(error ? (error.code === "ENOENT" ? 404 : 403) : (stats.isDirectory()? 302 : 200) );
				});
			});
			if(status === 302) {
				if(file.substr(-1) === '/') {
					file += "index.html";
				}else{
					file += "/index.html";
				}
			}else if(status === 200) {
				ctx.type = mtypes[path.extname(file)] || "application/octet-stream";
				ctx.body = fs.createReadStream(file);
			}else if(status === 403){
				ctx.status = status;
			}else{
				await next();
			}
		};
	};
};