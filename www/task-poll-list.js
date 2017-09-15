Vue.component("task-poll-list", {
	template: '<div class="list-group">\
		<li v-for="poll in taskPoll" class="list-group-item"\
				v-bind:class="{\
					\'list-group-item-light\': poll.status == -100 || poll.status == -200,\
					\'list-group-item-info\': poll.status > 0 && poll.data.substr(0,2) == \'i:\',\
					\'list-group-item-warning\': poll.status > 0 && poll.data.substr(0,2) == \'w:\',\
					\'list-group-item-danger\': poll.status == -203 || poll.status == -204 || poll.status == -205,\
					\'list-group-item-warning\': poll.status == -206}">\
			<small v-if="poll.status != -100 && poll.status != -103 && poll.status != -200" class="float-right badge badge-light badge-pill">{{parseInt(poll.time/1000*10)/10}}s</small>\
			<div v-if="poll.status == -100">\
				<h5>\
					{{poll.data.name}}\
					<small><span class="text-secondary">\
						{{poll.data.data}}\
					</span></small>\
				</h5>\
				<div><small><span class="text-secondary">\
					{{poll.data.argv}}\
				</span></small></div>\
			</div>\
			\
			<span v-if="poll.status == -103">💤 任务并行队列已满，等待 ...</span>\
			<span v-if="poll.status == -101">✴️ 任务开始<small class="text-secondary">（进程启动 及 排队等待）</small></span>\
			<span v-if="poll.status == 0">🕑 步骤： <code>{{poll.data}}</code></span>\
			<span v-if="poll.status == -201">✔️ 完成： <code>{{poll.data}}</code></span>\
			<pre v-if="poll.status > 0"><code>{{poll.data.substr(2)}}</code></pre>\
			<span v-if="poll.status == -202">✅ 任务结束</span>\
			<pre v-if="poll.status == -203">❌ {{poll.data}}</pre>\
			<pre v-if="poll.status == -204">❌ 错误：无法获取任务状态，任务可能还在运行~</pre>\
			<pre v-if="poll.status == -205">❌ 错误：无法获取任务状态，任务可能没有启动~</pre>\
			<pre v-if="poll.status == -206">⏹️ 终止：由于任务被用户提前终止，无法确认任务执行结果~</pre>\
			<span v-if="poll.status == -200"></span>\
		</li>\
		<li class="list-group-item"\
			v-if="taskLast.status != -200 && taskLast.status != -202 && taskLast.status != -203 && taskLast.status != -204 && taskLast.status != -205 && taskLast.status != -206">\
			<i class="loader">...</i>\
		</li>\
	</div>',
	data: function() {
		return {
			taskPoll: [],
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
			this.taskPoll.splice(0, this.taskPoll.length);
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
				this.taskTime = Date.now()
			}
			poll.time = Date.now() - this.taskTime;
			this.taskTime += poll.time;
			switch(poll.status) {
			case -100: // 准备启动
				poll.time = Date.now();
				this.taskPoll.push(poll);
				return 2;
			case 0: // 步骤开始
			case -101: // 进程开始
			case -102: // 无状态数据（再次等待）
			case -103: // 任务排队
			case -200: // 结束底部
			case -201: // 步骤结束
				this.taskPoll.push(poll);
				return 3;
			case -202: // 进程结束
			case -203: // 异常
			case -205: // 启动失败
			case -206: // 用户终止
				this.taskPoll.push(poll);
				this.taskPoll.push({status: -200});
				return 0;
			case -204: // 状态未知
				this.taskPoll.push(poll);
				this.taskPoll.push({status: -200});
				return 3;
			default: // > 0 状态数据
				if(poll.data) this.taskPoll.push(poll);
				return 3;
			}
		}
	},
});
