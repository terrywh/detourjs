(function() { "use strict";
	let app = new Vue({
		el:  "#app",
		data: {
			tasks: [],
			datas: [],
			taskFilter: "",
			dataFilter: "",
			activeTask: "",
			activeData: "empty",
			activeArgv: "",
			taskStatus: 0,
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
			let selected = location.hash.substr(1).split("|", 3);
			
			this.activeTask = selected[0] || "";
			this.activeData = selected[1] || "";
			this.activeArgv = selected[3] || "";
		},
		methods: {
			reload: async function() {
				let data;
				({data} = await (await fetch("/task/list")).json());
				this.tasks = data;
				// this.tasks = data.map((item) => {
				// 	return item.substr(0, item.length-3);
				// });
				({data} = await (await fetch("/data/list")).json());
				this.datas = data;
				if(this.tasks.indexOf(this.activeTask) === -1) {
					this.activeTask = "";
				}
				if(this.datas.indexOf(this.activeData) === -1) {
					this.activeData = "";
				}
			},
			filterTask: function() {},
			filterData: function() {},
			startTask: async function() {
				++this.taskStatus;
				let r = await (await fetch("/task/start?name="
					+ encodeURIComponent(this.activeTask)
					+ "&data="
					+ encodeURIComponent(this.activeData)
					+ "&argv="
					+ encodeURIComponent(this.activeArgv))).json();
				if(r && r.errno == 0) {
					this.taskId = r.data;
					++this.taskStatus;

					this.taskPoll.splice(0, this.taskPoll.length);
					this.statTask({
						status: -100,
						data: this.activeTask + " : " + this.activeData,
					});
					this.pollTask();
				}else{
					/// TODO：启动失败如何处理
					this.taskStatus = -1;
				}
			},
			stopTask: async function() {
				--this.taskStatus;
				let r = await (await fetch("/task/stop?id=" + this.taskId)).json();
				if(r && r.errno == 0) {
					this.taskId = "";
					this.taskStatus = 0;
				}
			},
			killTask: async function() {
				--this.taskStatus;
				let r = await (await fetch("/task/kill?id=" + this.taskId)).json();
				if(r && r.errno == 0) {
					this.taskId = "";
					this.taskStatus = 0;
				}
			},
			statTask: function(task) {
				if(!this.taskTime) {
					this.taskTime = Date.now()
				}
				task.time = Date.now() - this.taskTime;
				// this.taskTime += task.time;
				switch(task.status) {
				case -100: // 准备启动
					task.time = Date.now();
					break;
				case -101: // 进程开始
					++this.taskStatus; // 3
					break;
				case 0: // 步骤开始
					break;
				case -201: // 步骤结束
					break;
				case -200: // 未知状态结束
				case -202: // 进程结束
				case -203: // 异常
					this.taskPoll.push(task);
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
				}).then((r) => {
					if(this.statTask(r && r.errno ? {status: -200} : r.data)) {
						setTimeout(this.pollTask.bind(this), 200);
						clearTimeout(this.timeoutScroll);
						this.timeoutScroll = setTimeout(() => {
							Velocity(this.$refs.progress.querySelector(".list-group-item:last-child"),
								"scroll", { container: this.$refs.progress, duration: 200 });
						}, 200);
					}
				});
			},
			selectTask: function(task) {
				this.activeTask = task;
				location.hash = "#" + this.activeTask + "|" + this.activeData + "|" + this.activeArgv;
			},
			selectData: function(data) {
				this.activeData = data;
				location.hash = "#" + this.activeTask + "|" + this.activeData + "|" + this.activeArgv;
			},
		}
	});
})();