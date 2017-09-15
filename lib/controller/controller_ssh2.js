"use strict";
const ssh2 = require("ssh2");
const cli_ = Symbol("client"),
	ftp_ = Symbol("sftp"),
	idx_ = Symbol("index");

let CONNECTIONS = [];
class Shell {
	constructor(cli, cwd) {
		this[cli_] = cli;
	}
	// 在连接的主机上执行命令（注意：这里无法通过退出状态判断结果，仅获取输出）
	async bash(cmd, cwd, env) {
		return new Promise((resolve, reject) => {
			this[cli_].shell(false, {
				env: env,
			}, (err, sh) => {
				if(cwd) {
					sh.write("cd " + cwd + "\n");
				}
				if(Array.isArray(cmd)) {
					sh.write(cmd.join("\n") + "\n");
				}else{
					sh.write(cmd + "\n");
				}
				let data = "";
				sh.on("data", chunk => {
					data += chunk;
				}).on("end", () => {
					resolve(data);
				}).on("error", reject);
				sh.stderr.on("data", chunk => {
					data += chunk;
				});
				sh.end();
			});
			this[cli_].once("error", err => {
				reject(err);
			});
		});
	}

	close() {
		this[cli_].end();
		CONNECTIONS.splice(this[cli_][idx_], 1);
	}
};

class Transfer {
	constructor(cli, sftp) {
		this[cli_]  = cli;
		this[ftp_] = sftp;
	}
	// opts => {
	// 	flags: 'w',
	// 	encoding: null,
	// 	mode: 0o666,
	// 	autoClose: true
	// }
	createWriteStream(path, opts) {
		return this[ftp_].createWriteStream(path, opts)
	}
	// opts => {
	// 	flags: 'r',
	// 	encoding: null,
	// 	handle: null,
	// 	mode: 0o666,
	// 	autoClose: true
	//  start: 0,
	//  end: {fileSize},
	// }
	createReadStream(path, opts) {
		return this[ftp_].createReadStream(path, opts);
	}
	// attrs => {
	// 	mode: integer
	//  uid: integer
	//  gid: integer
	//  size: integer
	//  atime: integer
	//  mtime: integer
	// }
	async mkdir(path, attrs) {
		return new Promise((resolve, reject) => {
			this[ftp_].mkdir(path ,attrs, err => {
				err ? reject(err) : resolve();
			});
		});
	}
	async rmdir(path) {
		return new Promise((resolve, reject) => {
			this[ftp_].rmdir(path, err => {
				err ? reject(err) : resolve();
			});
		});
	}
	close() {
		this[sftp_].end();
		this[cli_].end();
		CONNECTIONS.splice(this[cli_][idx_], 1);
	}
};
async function createShell(opts) {
	return new Promise((resolve, reject) => {
		let cli = new ssh2.Client();
		cli.connect(opts);
		cli.once("ready", () => {
			cli[idx_] = CONNECTIONS.push(cli) - 1;
			resolve(new Shell(cli));
		}).once("error", err => {
			reject(err);
		});
	});
};
async function createSftp(opts) {
	return new Promise((resolve, reject) => {
		let cli = new ssh2.Client();
		cli.connect(opts);
		cli.once("ready", () => {
			cli.sftp((err, sftp) => {
				err ? reject(err) : resolve(new Transfer(cli, sftp));
			});
		}).once("error", err => {
			reject(err);
		});
	});
};

module.exports = function(exports) {
	// 连接主机返回 shell 对象
	exports.ssh2 = async function(opts) {
		return createShell(opts);
	};
	// 连接主机返回 sftp 对象
	exports.sftp = async function(opts) {
		return createSftp(opts);
	};
	exports.on("beforeStop", () => {
		for(let i=0;i<CONNECTIONS.length;++i) {
			CONNECTIONS[i].end();
		}
		CONNECTIONS = [];
	});
}
