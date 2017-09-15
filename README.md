
##### 启动方式
* 使用 `bin/detour.js` 将启动多个服务进程（默认按照 cpu 核心数量的一半启动进程，可通过参数 `--process={count}` 进行调节），监听从起始端口（监听的起始端口可通过 `--port={port}` 进行设置，默认 `60200`；绑定地址可以通过 `--addr={addr}` 进行设置，默认 `127.0.0.1`）开始的若干**不同**端口；单独访问每个端口都能进行同样的操作，但互相之间不可互通。
* 使用 `npm start` 将调用上述 `bin/detour.js` 也可以达到相同效果，但需要注意需要在额外的 `--` 后附加相关参数，例如：`npm start -- --port=50000 --process=1` 仅启动一个进程；

##### 
使用 nginx 进行反响代理、负载均衡，由于进程不能互通，需要绑定到任务实际的后端服务进程；这个功能需要使用 付费订阅 upstream 模块中的 sticky 功能，或开源的 [nginx-sticky-module-ng](https://bitbucket.org/nginx-goodies/nginx-sticky-module-ng) 模块（在　deps/nginx-sticky-module 直接提供）并编写与上述两个模块相对应的配置（查看 etc/detour.nginx.conf 示例）。

* 注意：`nginx-sticky-module-ng` 需要 `http_ssl_module` OpenSSL 模块；