## md2word · Markdown → Word

本项目使用 Next.js 14 (App Router) + AI Markdown 格式化/转换引擎 + LLM 来清洗 Markdown 并导出带自定义模板的 docx 文档。可在 Windows 或 Linux 服务器上运行，内置便携式工具链和自动化脚本，支持一键初始化。

### 核心功能
- LLM 清洗 Markdown，保留标题/列表结构，避免幻觉
- docx 转换 CLI 应用 Word 模板（存储在 `templates/` 目录）
- 前端表单支持上传 Markdown、选择模板、下载 docx，并可检测 LLM 健康状态
- API 返回结构化错误码 + 失败步骤（`CONV_*`），便于快速调试

### 技术栈
- Next.js 14 App Router（Node.js 运行时 API 路由）
- `fetch` 调用 OpenAI 兼容的 Chat Completions API
- docx 转换 CLI 3.5 便携版（可通过 `PANDOC_PATH` 自定义路径）
- 代码组织：`config/`、`lib/`、`components/`、`api/`

### 环境变量
| 名称 | 说明 |
| --- | --- |
| `LLM_API_KEY` | LLM 服务商的 API 密钥 |
| `LLM_API_BASE_URL` | 例如 `https://api.openai.com/v1` |
| `LLM_MODEL` | 例如 `gpt-4.1-mini` |
| `PANDOC_PATH` | *(可选)* docx 转换 CLI 可执行文件的自定义路径 |
| `PORTABLE_NODE_PATH` | *(可选)* 便携式 Node 的自定义路径 |

> 将 `.env.local.example` 复制为 `.env.local`（或 `.env`），然后填写相应值：
> ```bash
> # Windows PowerShell
> Copy-Item .env.local.example .env.local
> # macOS / Linux
> cp .env.local.example .env.local
> ```

### 本地开发
```bash
npm install
npm run dev
# http://localhost:3000
```
> 便携式 Node 位于 `tools/node/` 目录。如果更偏好使用系统 Node，可删除该目录。

### 从 GitHub 到部署
1. **克隆仓库**
   ```bash
   git clone https://github.com/sslzhou948/md2word.git
   cd md2word
   ```
2. **配置环境变量**
   ```bash
   Copy-Item .env.local.example .env.local   # Windows
   cp .env.local.example .env.local         # macOS / Linux
   ```
3. **初始化依赖**
   ```powershell
   # Windows（推荐使用批处理文件，自动处理编码问题）
   .\scripts\setup.bat
   # 或者直接使用 PowerShell（如果遇到编码错误，请先执行 chcp 65001）
   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
   # Linux / macOS
   chmod +x scripts/setup-linux.sh
   ./scripts/setup-linux.sh
   ```
   这些脚本会下载便携式 Node.js / docx 转换 CLI（如需要），并运行 `npm install`。
   
   > **Windows 编码问题**: 如果遇到 "字符串缺少终止符" 或中文乱码错误，请使用 `.\scripts\setup.bat` 执行，或先运行 `chcp 65001` 设置代码页为 UTF-8。
4. **运行**
   ```bash
   npm run dev                    # 开发模式
   npm run build && npm run start # 生产模式
   ```

### Nginx 反向代理要点
- `proxy_read_timeout 300s` / `proxy_send_timeout 300s` / `proxy_connect_timeout 300s`
- `send_timeout 300s` 以在 docx 转换 CLI/LLM 处理期间保持下游连接活跃
- `client_max_body_size 10M`
- `proxy_buffering on`、`proxy_buffer_size 4k`、`proxy_buffers 8 4k`
- 完整示例：`nginx.conf.example`

### API 流程
1. `POST /api/convert` 接收 `markdown`、`templateId`
2. `cleanMarkdownWithLlm` 通过 LLM 规范化 Markdown
3. `convertMarkdownToDocx` 使用 docx 转换 CLI + 模板输出 docx
4. 响应返回 docx（base64）+ 清洗后的 Markdown 预览

### 健康检查与错误码
- `GET /api/llm-health` 执行轻量级 LLM 连通性检测
- 转换 API 发出错误码（`CONV_01_01`、`CONV_03_99`、`CONV_99_TIMEOUT` 等）
- 前端显示错误码 + 失败步骤 + 提示（例如 nginx 超时、docx 转换 CLI 缺失）

### 常见问题
| 问题 | 原因 | 解决方法 |
| --- | --- | --- |
| `npm` 未找到 | Node 缺失 / 未使用便携式 Node | 运行初始化脚本或安装 Node 20+ |
| `PSSecurityException` | PowerShell 被阻止 | `Set-ExecutionPolicy -Scope Process Bypass` |
| `pandoc: command not found` | 二进制文件缺失 | 保留 `tools/pandoc/` 或设置 `PANDOC_PATH` |
| `CONV_99_TIMEOUT` | nginx 超时时间过短 | 增加 `proxy_read_timeout`（≥300s） |
| LLM 返回 429/5xx | 速率限制 / 上游故障 | 稍后重试，使用 LLM 健康检查 |

### 文件结构说明
- 模板：在 `templates/` 目录下添加 docx 文件，并在 `src/config/templates.ts` 中声明
- 提示词配置位于 `src/config/llmPrompt.ts`
- 便携式工具链位于 `tools/` 目录（Git 忽略）
- 日志输出到 `logs/` 目录（Git 忽略）

### 模板维护说明
- 仅支持官方模板，模板文件需放置在 `templates/` 目录
- 在 `src/config/templates.ts` 中配置模板信息（ID、名称、描述、文件名、预览图等）
- 预览图需放置在 `public/templates/previews/` 目录
- 详细说明请参考代码注释

### 路线图
- 模板管理 UI
- 批量 / 队列处理
- 将格式化逻辑提取为可复用包（Electron/Tauri）

---
如果出现问题，请检查 `.env.local`、nginx 代理设置或 UI 中显示的错误码。欢迎提交 Issue 和 PR！

[English](README.en.md) | [中文](README.md)
