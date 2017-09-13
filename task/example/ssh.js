"use strict";

const 
	C = require("../../lib/controller"), // 执行、流程
	D = require("../../lib/data"), // 数据文件
	A = require('minimist')(process.argv.slice(2)); // 参数解析

let SERVER = {
	"host": "10.20.6.51",
	"port": 22,
	"username": "wuhao",
	"password": "xxxxxxxxxxx",
};

// 任务定义
C.step("连接远程服务器并执行命令", async function() {
	let sh = await C.ssh2(SERVER);
	await C.info(await sh.bash("ls -a"));
	sh.close(); // 手动关闭
});
let sftp;
C.step("连接远程服务器并写入文件", async function() {
	sftp = await C.sftp(SERVER);
	let f = sftp.createWriteStream("detourjs.txt");
	f.write("aaaaa\n");
	f.end("end\n");
	await writeAll(f);
});
C.step("远程读取文件", async function() {
	let data = await readAll(sftp.createReadStream("detourjs.txt"))
	await C.info(data);
	// sftp 在任务完成后自动关闭
});


