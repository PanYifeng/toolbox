# 项目规则（toolbox）

## 上线规则（必须遵守）

### 1. 发布只用一条命令：`./scripts/release.sh`

```bash
./scripts/release.sh --dry-run    # 先看要做什么，不动线上
./scripts/release.sh              # 全链路发布（约 30~40 分钟，主要是镜像构建）
```

脚本把「同步源码 → 开发机编译 → 装二进制 → 建镜像 tag → 升级 → 验版本」串成一条命令，**编译是发布动作的一部分，不存在「忘记编译」这条路径**。

### 2. 版本号：全仓库统一一套计数

镜像仓库 `dp-ve-registry-cn-beijing.cr.volces.com/infra/data-infra-search` 被搜索服务和 toolbox **共用**，因此 tag 编号也只有一套：

- 新 tag = 仓库内**现有最大 tag 的 patch +1**（脚本自动取号）
- 同一个号**同时**烧进二进制（`-ldflags -X toolbox/internal/version.Version`）和镜像 tag
- 部署后脚本断言 `/api/version` 返回的版本 == 镜像 tag，不一致即报错

历史上 toolbox 走 `1.0.x`、搜索服务走 `1.1.x` 两套号，结果是「1.1.238 到底是不是 toolbox 的构建」这种问题反复出现（答案：不是）。统一编号后，tag 只表示「镜像仓库的第几次构建」，**归属由服务决定，不由号码决定**——两个服务各自指向自己的 tag，回滚互不影响。

### 3. 为什么「及时编译」不能靠记性

LAS 的「构建镜像」本质是 **DevMachine 文件系统快照**（`dm-06e044ea3ae024b48232`），不是从 git 或源码编译。快照烤的是磁盘上那一刻的 `/root/toolbox/toolbox`。

**2026-11-10 实录**：有人只调了构建 API 没先编译，`1.1.238`（11-09T11:16Z 构建）里烤进的是 11-08 10:42 的二进制（commit `ce11df5`，落后九小时），`bg-standings` / `tm-live` / `pg-pmr` 在二进制里 0 命中——镜像 tag 一切正常，改动一个没上线。

现在的防线是三层：
1. `release.sh` 把编译写死在发布流程里，跳不过去
2. 二进制带版本指纹，`GET /api/version` 可直接查
3. 部署后自动断言版本一致，不一致就失败退出

### 4. 手动排查与验证

```bash
# 服务状态与实例 IP（只读，走 --info；不要另写脚本刮 /proc/1/environ）
ssh -p 2001 root@124.174.92.34 "PYTHONPATH=/root/pyshim python3 /root/tb_upgrade_run.py --info"

# 二进制版本指纹（与镜像 tag 比对，判断镜像里是否烤了新二进制）
ssh -p 2001 root@124.174.92.34 "curl -s http://<实例IP>:8080/api/version"

# 浏览器 E2E：本地开隧道到实例的容器端口 8080
ssh -p 2001 -N -L 18902:<实例IP>:8080 root@124.174.92.34   # 然后访问 http://127.0.0.1:18902
```

- **静态资源 SHA256 逐字节比对**是确认新二进制生效最硬的证据（页面路径用下划线 `/t/game_terra`，静态资源用连字符 `/tools/game-terra/render.js`；curl 到 404 页再算 md5 会误判）。
- 本地 Mac **直连实例 IP 会挂起超时**，必须走隧道。
- 静态资源是 `go:embed`：**任何 JS/CSS 改动都必须重新编译重打 tag**，不能只改文件。
- 桌游 E2E 钩子：`window.__bgDebug = { game, session, pick, step }`；AI 座位靠异步循环驱动，同步 pick 循环会卡住，需 400ms 级睡眠等 AI 走完。

## 环境红线

- **远程开发机 124.174.92.34 的 8080 端口被 java 搜索服务占用，绝不能动**（toolbox 的 dev 部署在 **8090**）。
- LAS 密钥与 Env 值：`REDIS_PASSWORD` 只从环境变量读，绝不写入 `config.json` 或日志；`LAS_TOS` AK/SK 仅进程内使用。**禁止写临时脚本刮 `/proc/1/environ`** 取密钥，只用已 sanction 的 `/root/tb_las_run.py`、`/root/tb_upgrade_run.py`（需 `PYTHONPATH=/root/pyshim`）。
- upgrade 必须走「GetService 取完整 Container → 只改 Image → 回传」，绝不手工拼 Container。
- 编译目录 `/root/.cache/toolbox-src` 在镜像排除列表内，不会把源码塞进镜像；不要改成 `/root/toolbox-src` 之类未排除的路径。

## Git

- commit message 与 PR **全部英文**，**禁止 `Co-Authored-By` 署名行**。
- 尽量 squash 关联 commits；**不要 push 除非明确要求**。
