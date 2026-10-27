# AI新闻头条 — 部署与启动说明

本文档面向**新克隆代码的人**，目标是让项目能在本机一步不错地跑起来。

---

## 1. 项目结构

```
g:\AI新闻头条
├── ai-headlines-service   # 后端：FastAPI（独立 git 仓库，分支 develop）
└── ai-headlines-page      # 前端：Vue3 + Vant（独立 git 仓库，分支 develop）
```

两个目录各是一个独立 Git 仓库，**需要分别克隆、分别提交**。

---

## 2. 环境要求

| 依赖 | 版本建议 | 说明 |
| --- | --- | --- |
| Python | 3.10+ | 后端运行环境 |
| Node.js | 18+ | 前端构建/运行环境 |
| MySQL | 5.7 / 8.x | 业务数据（用户/新闻/收藏/历史） |
| Redis | 6+ | 登录态、验证码、缓存 |

> Redis 和 MySQL 必须**先启动**，否则后端无法起来，登录/验证码/缓存会直接报错。

---

## 3. 后端部署（ai-headlines-service）

### 3.1 复制环境配置

```powershell
cd ai-headlines-service
Copy-Item .env.example .env
```

### 3.2 编辑 `.env`（必改三个地方）

| 配置项 | 默认值 | 你要改成 |
| --- | --- | --- |
| `AI_API_KEY=` | 空 | 你自己的 SiliconFlow（或其它兼容）Key |
| `MYSQL_USER` / `MYSQL_PASSWORD` | root / 123456 | 你本机 MySQL 的账号密码 |
| `REDIS_PASSWORD` | 123456 | 你本机 Redis 的密码 |

其余（端口、缓存 TTL、模型名、系统提示词等）可按需调整，不填也有合理默认值。

> `.env` 已被 `.gitignore` 忽略，**不要提交**。仓库里只提交 `.env.example`（其中 `AI_API_KEY` 保持空值）。

### 3.3 创建虚拟环境并装依赖

```powershell
cd ai-headlines-service
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt
```

### 3.4 初始化数据库（建库 + 建表 + 初始数据）

脚本会自动：创建 `ai_news_db`、建 5 张表（`user / news / news_category / favorite / history`）、写入新闻分类与示例新闻、创建管理员 `admin / 123456`。**幂等，可重复运行，不会清掉已有数据。**

```powershell
cd ai-headlines-service
.\venv\Scripts\python init_db.py
```

> 如果只想建库建表、不想要示例数据，把 `init_db.py` 里 `seed()` 的调用那几行删掉再运行即可。想改管理员密码，直接改 3.4 脚本里 `123456` 那个位置。

### 3.5 启动后端

```powershell
cd ai-headlines-service
.\venv\Scripts\python run.py
```

启动后：
- 接口地址：`http://127.0.0.1:8000`
- 交互文档：`http://127.0.0.1:8000/docs`
- 健康检查：`http://127.0.0.1:8000/health` 返回 `{"status":"ok"}`

`DEBUG=true` 时，改 `app/` 下的代码会自动热重载。

---

## 4. 前端部署（ai-headlines-page）

### 4.1 复制环境配置

```powershell
cd ai-headlines-page
Copy-Item .env.example .env
```

前端 `.env` 里一般只需 `VITE_API_BASE_URL=http://127.0.0.1:8000`（默认就对）。如果后端不在 8000 端口，改成对应地址。

> AI 的 Key **只配在后端**，前端不再持有任何密钥。

### 4.2 安装依赖并启动

```powershell
cd ai-headlines-page
npm install
npm run dev
```

访问 `http://localhost:5173`。

---

## 5. 快速自测清单

| 检查项 | 操作 | 预期 |
| --- | --- | --- |
| 数据库连通 | `http://127.0.0.1:8000/health` | `{"status":"ok"}` |
| 新闻分类 | `http://127.0.0.1:8000/api/news/categories` | `code: 200`，返回分类列表 |
| 验证码 | `http://127.0.0.1:8000/api/captcha` | 返回 `captchaId / image / expiresIn` |
| 登录 | 用 `admin / 123456` 登录 | 需填验证码，成功后返回 token |
| AI 问答 | 聊天页发一条消息 | 需要登录；Key 未配置时返回「AI 服务未配置」 |

---

## 6. 常见问题

**Q: 启动报 `AI 服务未配置`？**
A: 后端 `.env` 里 `AI_API_KEY` 没填。填入后重启后端（改 `.env` 不会触发热重载，需手动重启一次）。

**Q: 登录/验证码报错？**
A: 确认 Redis 已启动、`REDIS_PASSWORD` 与本地一致。

**Q: 报「数据库操作异常」？**
A: 确认 MySQL 已启动、账号密码正确，且已运行过 `init_db.py`。

**Q: 前端请求报 401 后一直跳登录页？**
A: 后端过期时间短（默认 15 分钟）。这是有意设计：access token 过期后会自动用 refresh token 刷新，两个 token 都失效才会要求重新登录。

**Q: 我没有 AI 模型 Key，能跑起来吗？**
A: 能。除 AI 问答外的功能（新闻、登录、收藏、历史、验证码）都不依赖外部模型；只是 AI 聊天会提示「服务未配置」。

---

## 7. 安全约定（提交代码前）

- `.env`、`__pycache__`、`venv`、`node_modules`、`dist` 都在 `.gitignore` 里，**不入库**。
- 真实 API Key、数据库密码只放本地 `.env`，**不要**提交或填进 `.env.example`。
- AI 按量计费 Key 尤其不能入库：泄露后他人可直接调用消耗你的额度。
- 提交前自查：

```powershell
git grep -n 'sk-' -- .      # 应无输出
git status --short          # 确认没有 .env / 临时文件
```

---

## 8. 目录与端口约定

| 名称 | 路径 | 端口 |
| --- | --- | --- |
| 后端 | `ai-headlines-service` | 8000 |
| 前端 | `ai-headlines-page` | 5173 |
