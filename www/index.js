(function() { "use strict";
	let app = new Vue({
		el:  "#app",
		data: {
			tasks: [],
			datas: [],
			taskFilter: "",
			dataFilter: "",
			taskName: "",
			taskData: "",
			taskArgv: "",
			taskStat: 0,
			taskId: "",
			taskPoll: [],
			taskTime: 0,
		},
		computed:  {
			taskLast: function() {
				return this.taskPoll[this.taskPoll.length - 1] || {status: -202};
			},
		},
		created: function() {
			this.reload();
			
			window.onbeforeunload = this.beforeUnload;
			window.onhashchange   = this.hashChange;
			this.hashChange();
		},
		methods: {
			beforeUnload: function(e) {
				if(this.taskStat != 0) {
					// 状态文字在 chrome > v51 后就看不到了~
					return "确定要走？当前任务还未结束，走了可就看不到状态啦~";
				}
			},
			hashChange: function(e) {
				let parts = location.hash.substr(1).split("|", 3);
				while(parts.length < 3) parts.push("");
				[this.taskName, this.taskData, this.taskArgv] = parts;
			},
			reload: async function() {
				let items;
				({data: items} = await (await fetch("/task/list")).json());
				this.tasks = items.map((item) => {
					return {"file": item, "hide": false};
				});
				({data: items} = await (await fetch("/data/list")).json());
				this.datas = items.map((item) => {
					return {"file": item, "hide": false};
				});
			},
			filterTask: function() {
				for(let i=0;i<this.tasks.length;++i) {
					if(this.tasks[i].file.indexOf(this.taskFilter) == -1) {
						this.tasks[i].hide = true;
					}else{
						this.tasks[i].hide = false;
					}
				}
			},
			filterData: function() {
				for(let i=0;i<this.datas.length;++i) {
					if(this.datas[i].file.indexOf(this.taskFilter) == -1) {
						this.datas[i].hide = true;
					}else{
						this.datas[i].hide = false;
					}
				}
			},
			startTask: async function() {
				++this.taskStat;
				fetch("/task/start?name="
					+ encodeURIComponent(this.taskName)
					+ "&data="
					+ encodeURIComponent(this.taskData)
					+ "&argv="
					+ encodeURIComponent(this.taskArgv)).then(res => res.json(), err => {
						return {errno: -1, errmsg: "failed to start task"};
					}).then(r => {
						if(r && r.errno == 0) {
							this.taskId = r.data;
							++this.taskStat;

							this.taskPoll.splice(0, this.taskPoll.length);
							this.statTask({
								status: -100,
								data: {
									name: this.taskName,
									data: this.taskData,
									argv: this.taskArgv,
								},
							});
							this.pollTask();
						}else{
							this.statTask({
								status: -100,
								data: {
									name: this.taskName,
									data: this.taskData,
									argv: this.taskArgv,
								},
							});
							this.statTask({status: -205});
							this.taskStat = 0;
						}
					});
			},
			killTask: async function() {
				--this.taskStat;
				let r = await (await fetch("/task/kill?id=" + this.taskId)).json();
				if(r && r.errno == 0) {
					this.taskId = "";
					this.taskStat = 0;
					this.statTask({status: -206});
					clearTimeout(this.timeoutPoll);
				}else{
					this.statTask({status: -205});
				}
			},
			statTask: function(task) {
				if(!this.taskTime) {
					this.taskTime = Date.now()
				}
				task.time = Date.now() - this.taskTime;
				// this.taskTime += task.time;
				switch(task.status) {
				case 0: // 步骤开始
					break;
				case -100: // 准备启动
					task.time = Date.now();
					break;
				case -101: // 进程开始
					++this.taskStat; // 3
					break;
				case -200: // 全部结束
					break;
				case -201: // 步骤结束
					break;
				case -202: // 进程结束
				case -203: // 异常
				case -205: // 启动失败
				case -206: // 用户终止
					this.taskStat = 0;
					this.taskPoll.push(task);
					this.statTask({status: -200});
					return false;
				case -204: // 状态未知
					this.taskStat = 2;
					this.taskPoll.push(task);
					this.statTask({status: -200});
					return false;
				default: // > 0 状态数据
					if(task.data) break;
					return true;
				}
				this.taskPoll.push(task);
				return true;
			},
			pollTask: function() {
				fetch("/task/poll?id=" + this.taskId).then((res) => {
					return res.json();
				}, (err) => {
					return {errno: 0, errmsg: "", data: {status: -204}};
				}).then((r) => {
					if(this.statTask(r && r.errno ? {status: -204} : r.data)) {
						this.timeoutPoll = setTimeout(this.pollTask.bind(this), 250);
						clearTimeout(this.timeoutScroll);
						this.timeoutScroll = setTimeout(() => {
							Velocity(this.$refs.progress.querySelector(".list-group-item:last-child"),
								"scroll", { container: this.$refs.progress, duration: 250 });
						}, 250);
					}
				}, (err) => {
					this.statTask({status: -204});
				});
			},
			setTask: function(task) {
				location.hash = "#" + task.file + "|" + this.taskData + "|" + this.taskArgv;
			},
			setData: function(data) {
				location.hash = "#" + this.taskName + "|" + data.file + "|" + this.taskArgv;
			},
			setArgv: function(argv) {
				location.hash = "#" + this.taskName + "|" +this.taskData + "|" + argv;
			},
		}
	});
})();