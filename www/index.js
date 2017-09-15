(function() { "use strict";
	async function invokeApi(uri) {
		return fetch(uri).then((res) => {
			return res.json();
		}).then((r) => {
			if(r.errno) {
				let err = new Error(r.errmsg);
				err.code = r.errno;
				return Promise.reject(err);
			}else{
				return r.data;
			}
		});
	}
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
		created: function() {
			this.reload().catch((err) => {
				console.error("failed to load task definition:", err);
				this.taskStat = -1;
			});
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
				items = await invokeApi("/task/list");
				this.tasks = items.map((item) => {
					return {"file": item, "hide": false};
				});
				items = await invokeApi("/data/list");
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
			startTask: function() {
				++this.taskStat;
				invokeApi("/task/start?name="
					+ encodeURIComponent(this.taskName)
					+ "&data="
					+ encodeURIComponent(this.taskData)
					+ "&argv="
					+ encodeURIComponent(this.taskArgv)).then(id => {
						this.taskId = id;
						++this.taskStat;
						this.taskStat = this.$refs.taskPoll.start(
							this.taskName, this.taskData, this.taskArgv);
						this.pollTask();
					}, err => {
						this.$refs.taskPoll.start();
						this.taskStat = this.$refs.taskPoll.noneStop();
					});
			},
			killTask: function() {
				--this.taskStat;
				invokeApi("/task/kill?id=" + this.taskId).then(() => {
					this.taskId = "";
					this.taskStat = this.$refs.taskPoll.userStop();
				}, err => {
					this.taskStat = this.$refs.taskPoll.noneStop();
				});
			},
			pollTask: function() {
				fetch("/task/poll?id=" + this.taskId).then((res) => {
					return res.json();
				}).then((r) => {
					if(this.taskStat == 0) return; // 被用户提前终止时，取消本次结果
					if(r && r.errno) {
						this.taskStat = this.$refs.taskPoll.errorStop();
					}else{
						this.taskStat = this.$refs.taskPoll.push(r.data);
						if(this.taskStat > 1) this.pollNext();
					}
				}).catch(err => {
					this.taskStat = this.$refs.taskPoll.errorStop();
				});
			},
			pollNext: function() {
				this.timeoutPoll = setTimeout(this.pollTask.bind(this), 250);
				clearTimeout(this.timeoutScroll);
				let el = this.$refs.progress.querySelector(".list-group-item:last-child");
				if(el) {
					this.timeoutScroll = setTimeout(() => {
						Velocity(el,"scroll", { container: this.$refs.progress, duration: 250 });
					}, 250);
				}
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
