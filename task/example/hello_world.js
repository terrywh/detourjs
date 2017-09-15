"use strict";

const 
	C = require("../../lib/controller"), // 执行、流程
	D = require("../../lib/data"), // 数据文件
	A = require('minimist')(process.argv.slice(2)); // 参数解析

// 任务定义
C.step("获取参数", async function() {
	await C.info(JSON.stringify(A));
	await C.warn("this is a warning message");
});
C.step("执行 SHELL 命令", async function() {
	await C.wait(1000);
	// 执行 shell 命令
	let files = (await C.bash("ls | grep json")).split("\n");
	await C.wait(1000);
	files.pop();
	await C.wait(1000);
	await C.info(JSON.stringify(files));
});
C.step("请求 HTTP 接口获取外网地址", async function() {
	await C.wait(1000);
	// 模拟 curl 发起 http 请求
	let ipaddr = (await C.curl("http://ip.cn")).trim();
	await C.info(ipaddr); // 回传信息
});
