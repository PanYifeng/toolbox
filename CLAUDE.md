# 项目规则（toolbox）

## 上线规则（必须遵守）

### 1. toolbox 只能自己构建镜像，不能复用搜索服务的 tag

镜像仓库 `dp-ve-registry-cn-beijing.cr.volces.com/infra/data-infra-search` 是 toolbox 和 data-infra-search **共用**的：

| tag 段 | 归属 | 能否用来发 toolbox |
|--------|------|-------------------|
| `1.0.x` | toolbox | ✅ 只有这一系列是 toolbox 的构建 |
| `1.1.2xx` | data-infra-search 搜索服务 | ❌ **绝对不能** |

原因：LAS 的「构建镜像」本质是 **DevMachine 文件系统快照**（`dm-06e044ea3ae024b48232`），不是从 git 编译。搜索服务建 `1.1.2xx` tag 时，快照里烤进去的 `/root/toolbox/toolbox` 是**建 tag 那一刻 dev 机上的二进制**——可能落后好几小时甚至好几天。

**2026-11-10 实录**：`1.1.238`（构建于 11-09T11:16Z）内含的 toolbox 二进制 mtime 是 11-08 10:42 +0800（commit `ce11df5`），比当时的 HEAD `f38dd0a` 落后九小时。用它升级后线上 `/core/boardgame.js` 仍是 18,550 字节（旧版），`bg-standings` / `tm-live` / `pg-pmr` / `ca.ui.projSettled` 在二进制里全部 0 命中——改动一个没上线，白升一轮。

### 2. 上线四步，顺序不能变

```bash
# ① 交叉编译（dev 机是 linux/amd64；darwin 二进制会被 start.sh 当脚本执行，满屏 Mach-O 乱码）
GOOS=linux GOARCH=amd64 go build -o ./toolbox-linux ./cmd/server

# ② 传二进制并安装（先备份旧版）
scp -P 2001 ./toolbox-linux root@124.174.92.34:/root/toolbox-linux
ssh -p 2001 root@124.174.92.34 \
  "cp /root/toolbox/toolbox /root/toolbox/toolbox.bak-<旧tag> && \
   cp /root/toolbox-linux /root/toolbox/toolbox && chmod +x"

# ③ 建新 tag（-desc 必填；同 tag 重建既不换实例也不重新部署，必须递增）
ssh -p 2001 root@124.174.92.34 \
  "setsid nohup env PYTHONPATH=/root/pyshim python3 /root/tb_las_run.py \
     build --tag 1.0.<N+1> --desc '...' > /root/tb_build_1_0_<N+1>.log 2>&1 < /dev/null &"

# ④ 升级 + 等 READY
ssh -p 2001 root@124.174.92.34 \
  "PYTHONPATH=/root/pyshim python3 /root/tb_upgrade_run.py --tag 1.0.<N+1> --yes"
```

- **② 必须在 ③ 之前**：快照烤的是磁盘上那一刻的 `/root/toolbox/toolbox`。忘了装 → 生产 serve 的还是旧 `go:embed` 静态资源（1.0.7 实录）。
- 静态资源是 `go:embed`，所以**任何 JS/CSS 改动都要重新编译 + 重新建 tag**，不能只改文件。
- build 用 `setsid nohup … < /dev/null` 脱离 SSH，否则连接抖断会把构建杀掉（tag 不会创建）。

### 3. 验证（每次上线必做）

```bash
# 服务状态（只读，走 --info；不要另写脚本刮 /proc/1/environ）
ssh -p 2001 root@124.174.92.34 "PYTHONPATH=/root/pyshim python3 /root/tb_upgrade_run.py --info"

# 浏览器 E2E：本地开隧道到实例 IP 的容器端口 8080
ssh -p 2001 -N -L 18902:<实例IP>:8080 root@124.174.92.34   # 然后访问 http://127.0.0.1:18902
```

- **静态资源 SHA256 逐字节比对**是确认新二进制生效最硬的证据（`curl` 页面路径 404 会误判；页面用下划线 `/t/game_terra`，静态用连字符 `/tools/game-terra/render.js`）。
- 本地 Mac **直连实例 IP 会挂起超时**，必须走隧道。
- 桌游 E2E 钩子：`window.__bgDebug = { game, session, pick, step }`；AI 座位靠异步循环驱动，同步 pick 循环会卡住，需 400ms 级睡眠等 AI 走完。

## 环境红线

- **远程开发机 124.174.92.34 的 8080 端口被 java 搜索服务占用，绝不能动**（toolbox 的 dev 部署在 **8090**）。
- LAS 密钥与 Env 值：`REDIS_PASSWORD` 只从环境变量读，绝不写入 `config.json` 或日志；`LAS_TOS` AK/SK 仅进程内使用。**禁止写临时脚本刮 `/proc/1/environ`** 取密钥，只用已 sanction 的 `/root/tb_las_run.py`、`/root/tb_upgrade_run.py`（需 `PYTHONPATH=/root/pyshim`）。
- upgrade 必须走「GetService 取完整 Container → 只改 Image → 回传」，绝不手工拼 Container。

## Git

- commit message 与 PR **全部英文**，**禁止 `Co-Authored-By` 署名行**。
- 尽量 squash 关联 commits；**不要 push 除非明确要求**。
