Vue.component("task-poll-stat", {
	template: '<div class="task-poll-stat">\
		<span class="task-poll-stat-name text-primary">{{taskName}}</span>\
		<span>\
			<small class="task-poll-stat-data text-secondary" v-if="taskData">[{{taskData}}]</small>\
			<small class="task-poll-stat-argv text-secondary" v-if="taskArgv">[{{taskArgv}}]</small>\
		</span>&nbsp;\
		<span class="task-poll-stat-step" v-if="taskPoll != null && taskPoll.status != -200 && taskPoll.status != -202 && taskPoll.status != -203 && taskPoll.status != -204 && taskPoll.status != -205 && taskPoll.status != -206" class="loader">...</span>\
		<span class="task-poll-stat-step" v-if="taskPoll != null && taskPoll.status == -202">✅</span>\
		<span class="task-poll-stat-step" v-if="taskPoll != null && (taskPoll.status == -203 || taskPoll.status == -204 || taskPoll.status == -205)">❌</span>\
		<span class="task-poll-stat-step" v-if="taskPoll != null && taskPoll.status == -206">⏹️</span>\
		&nbsp;\
		<small class="task-poll-stat-data text-secondary" v-if="!!taskPoll.data">{{taskPoll.data}}</small>\
		<small class="task-poll-stat-time text-secondary" v-if="!!taskPoll.time">{{parseInt( (taskPoll.time - this.taskTime)/1000*10 )/10}}s</small>\
	</div>',
	data: function () {
		return {
			taskPoll: null,
			taskName: "",
			taskData: "",
			taskArgv: "",
			taskTime: 0,
		};
	},
	computed:  {
		taskLast: function() {
			return this.taskPoll[this.taskPoll.length - 1] || {status: -202};
		},
	},
	methods: {
		start: function(name, data, argv) {
			this.taskPoll = null;
			this.push({
				status: -100,
				data: { name: name, data: this.taskData, argv: this.taskArgv },
			});
		},
		userStop: function() {
			this.push({status: -206});
		},
		errorStop: function() {
			this.push({status: -204});
		},
		noneStop: function() {
			this.push({status: -205});
		},
		push: function(poll, cb) {
			if(!this.taskTime) {
				this.taskTime = Date.now();
			}
			switch(poll.status) {
			case -100: // 准备启动
				this.taskName = poll.data.name;
				this.taskData = poll.data.data;
				this.taskArgv = poll.data.argv;
				this.taskPoll = poll;
				return 2;
			case 0: // 步骤开始
			case -101: // 进程开始
			case -102: // 无状态数据（再次等待）
			case -103: // 任务排队
			case -201: // 步骤结束
				this.taskPoll = poll;
				return 3;
			case -200: // 结束底部 (此种 UI 下无此项)
				this.taskPoll = poll;
				return 3;
			case -202: // 进程结束
			case -203: // 异常
			case -205: // 启动失败
			case -206: // 用户终止
				poll.time = Date.now();
				this.taskPoll = poll;
				return 0;
			case -204: // 状态未知
				this.taskPoll = poll;
				return 3;
			default: // > 0 状态数据
				if(poll.data) this.taskPoll = poll;
				return 3;
			}
		}
	},
});
