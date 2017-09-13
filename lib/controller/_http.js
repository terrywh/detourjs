"use strict";
const
	http = require("http"),
	url = require("url"),
	qs  = require("querystring");


function promise_data(data, resolve, reject) {
	if(data[0] == '{') {
		try{
			data = JSON.parse(data);
		}catch(e) {
			reject("illegal json: " + data);
			return;
		}
		if(data.errno) {
			reject("(" + data.errno + ") " + errmsg);
			return;
		}else if(data.data) {
			resolve(data.data);
		}
	}
	resolve(data);
}
exports.request = async function(uri, query, data, headers) {
	return new Promise((resolve, reject) => {
		if(query) {
			uri += uri.indexOf("?") > -1 ? "&" + qs.stringify(query) : "?" + qs.stringify(query);
		}
		let opts = url.parse(uri);
		opts.timeout = 10000;
		if(headers) {
			opts.headers = headers;
		}
		if(data) {
			opts.method = "POST";
		}
		let req  = http.request(opts);
		if(typeof data !== "string") {
			data = qs.stringify(data);
		}
		req.on("timeout", () => {
			req.abort();
		}).on("error", err => {
			reject(err);
		}).on("response", (res) => {
			res.setEncoding("utf-8");
			let data = "";
			res.on("data", chunk => {
				data += chunk;
			}).on("end", () => {
				promise_data(data, resolve, reject);
			});
		}).end(data);
	});
}
exports.cookie = function(cookie) {
	if(typeof(cookie) === "object") {
		let cookies = "";
		for(let name in cookie) {
			cookies += name + "=" + cookie[name] + "; ";
		}
		return cookies;
	}
	return cookie;
}