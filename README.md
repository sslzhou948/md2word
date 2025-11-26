## md2word · Markdown → Word

> 这是 **中文** 说明文档。English version: `README.en.md`。

md2word 是一个基于 Next.js 14 的 Markdown → Word 转换工具：前端提供可视化表单，后端通过 LLM 清洗 Markdown，再结合 Word 模板产出 docx 文件。项目同时适配 Windows / Linux，内置一键初始化脚本，方便在本地或服务器部署。

---

## 核心特性
- **AI 清洗**：LLM 自动修复 Markdown 结构，保持标题/列表层级，禁止幻觉内容。
- **官方模板库**：所有 Word 模板集中存放在 `templates/`，由我们统一维护，不开放用户上传。
- **详细报错**：API 统一返回 `CONV_*` 错误码 + 环节说明，前端也会展示。
- **健康检查**：前端可一键 ping `/api/llm-health`，快速判断 LLM 服务是否可用。
- **日志 + 计数**：后端记录输入长度、耗时、故障码，并在 `data/stats.json` 中累计成功生成次数，在首页展示真实使用人数。

---

## 技术栈
- Next.js 14 App Router（Node.js runtime）
- `fetch` 调用 OpenAI 兼容的 Chat Completions API
- 可移植的 docx 转换 CLI（可用 `PANDOC_PATH` 自定义路径）
- 代码目录：`config/`、`lib/`、`components/`、`app/`

---

## 环境变量
| 变量名 | 说明 |
| --- | --- |
| `LLM_API_KEY` | LLM 服务的 API Key |
| `LLM_API_BASE_URL` | 例如 `https://api.openai.com/v1` |
| `LLM_MODEL` | 例如 `gpt-4.1-mini` |
| `PANDOC_PATH` | *(可选)* 自定义 docx 转换 CLI 路径 |
| `PORTABLE_NODE_PATH` | *(可选)* 自定义 portable Node 路径 |

> 初始化步骤  
> ```bash
> # Windows PowerShell
> Copy-Item .env.local.example .env.local
> # macOS / Linux
> cp .env.local.example .env.local
> ```

---

## 本地开发
```bash
npm install
npm run dev
# http://localhost:3000
```
> 如不想使用 portable Node，可删除 `tools/node/`，并使用系统 Node 20+。

---

## 从 GitHub 部署
1. **拉取仓库**
   ```bash
   git clone https://github.com/sslzhou948/md2word.git
   cd md2word
   ```
2. **配置环境变量**
   ```bash
   Copy-Item .env.local.example .env.local   # Windows
   cp .env.local.example .env.local         # macOS / Linux
   ```
3. **执行初始化脚本**
   ```powershell
   # Windows
   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
   # Linux / macOS
   chmod +x scripts/setup-linux.sh
   ./scripts/setup-linux.sh
   ```
   脚本会下载 portable Node / docx 转换 CLI（如需）并执行 `npm install`。
4. **运行**
   ```bash
   npm run dev                    # 开发模式
   npm run build && npm run start # 生产模式
   ```

---

## 模板维护说明（官方模板模式）
> 2.0 仅提供官方模板，暂不对最终用户开放上传。

1. **模板文件放哪里？**  
   - 所有 docx 文件放在 `templates/` 目录。
   - 文件名可以自定义，例如 `official-document.docx`、`proposal-2024.docx`。

2. **如何在前端展示？**  
   - 编辑 `src/config/templates.ts`，对每个模板填写：
     ```ts
     {
       id: 'official-document',
       name: '公文模板',
       description: '适用于公文、通知等正式场景',
       filename: 'official-document.docx',
       category: '公文',
       previewImage: 'templates/previews/公文模板.svg',
     }
     ```
   - `previewImage` 路径相对于 `public/`，可放 svg/png 占位图。

3. **为什么不允许用户上传？**  
   - 当前没有用户系统，无法区分或隔离用户模板。
   - 若允许上传会造成模板目录“公用”，存在泄露/冲突风险。
   - 如果确有自定义需求，可由管理员手动添加模板并在 `templates.ts` 注册。

4. **未来规划**  
   - 2.1 及以后会考虑“用户偏好”或“模板上传”功能，届时再引入用户体系或临时模板机制。

---

## nginx 反向代理要点
- `proxy_read_timeout 300s` / `proxy_send_timeout 300s` / `proxy_connect_timeout 300s`
- `send_timeout 300s`，避免 LLM/Pandoc 工时较长导致断连
- `client_max_body_size 10M`
- `proxy_buffering on`、`proxy_buffer_size 4k`、`proxy_buffers 8 4k`
- 完整示例参见 `nginx.conf.example`

---

## API 流程
1. `POST /api/convert` 接收 `markdown` + `templateId`
2. `normalizeText`（可选）将普通文本转 Markdown
3. `cleanMarkdownWithLlm` 使用 LLM 清洗 Markdown
4. `convertMarkdownToDocx` 调用 docx 转换 CLI + 模板生成文件
5. 响应返回 `cleanedMarkdown`、`fileBase64`、错误码等

---

## 健康检查 & 错误码
- `GET /api/llm-health`：测试 LLM 是否可用，返回延迟与示例。
- 常见错误码：
  - `CONV_01_01` 输入为空
  - `CONV_02_01` 模板不可用
  - `CONV_03_99` LLM 清洗失败
  - `CONV_04_02/03` 模板不存在 / 权限异常
  - `CONV_99_TIMEOUT` nginx/LLM 超时

---

## 常见问题

### 什么是 Markdown？怎么获取 Markdown 文档？
Markdown 是一种轻量级标记语言，靠符号表达标题、列表、引用等结构。例如：
```
# 项目目标

## 1.1 背景
- 梳理现状
- 识别机会

## 1.2 指标
1. 销售额同比 +20%
2. 运营成本降低 15%
```
常见获取途径：
- AI 工具（如 ChatGPT）大多支持“复制 Markdown”按钮，务必使用该按钮。
- Cherry Studio（AI 客户端）可在回答区域右上角选择 **更多 → 导出 Markdown**，即可保存 `.md` 文件或复制 Markdown 文本。
- 其他写作工具（Obsidian、Notion、语雀等）也能导出 Markdown；只需确保保留 `#`、`-`、`1.` 等标记即可。
若只能拿到普通文本也没关系，我们会尝试自动转换，但转换质量和耗时都会增加。

### 其他常见问题
| 问题 | 原因 | 解决方案 |
| --- | --- | --- |
| `npm` 不存在 | Node 未安装或未使用 portable Node | 运行脚本或安装 Node 20+ |
| `PSSecurityException` | PowerShell 阻止脚本 | `Set-ExecutionPolicy -Scope Process Bypass` |
| `docx CLI not found` | CLI 未下载 | 保留 `tools/pandoc/` 或设置 `PANDOC_PATH` |
| `CONV_99_TIMEOUT` | 反向代理超时 | 将 `proxy_read_timeout` 调大到 ≥300s |
| LLM 报 429/5xx | 限流或上游异常 | 稍后重试，或先执行健康检查 |

---

## 目录说明
- `templates/`：官方 Word 模板（需配合 `src/config/templates.ts` 使用）
- `src/config/llmPrompt.ts`：LLM 清洗提示词
- `src/lib/`：LLM 调用、Pandoc 封装、限流、日志等工具
- `logs/`：使用日志（按天/大小切分）
- `data/stats.json`：已完成转档数量（成功一次 +1）

---

## Roadmap（部分）
- 模板管理 UI（上传/预览/启用）
- 批量转换、任务队列
- 抽离清洗/转换逻辑供 Electron/Tauri 客户端复用
- 用户系统 & 自定义模板偏好

---

如遇问题，请优先检查：
1. `.env.local` 配置是否正确  
2. nginx 超时时间是否够长  
3. 页面显示的错误码（`CONV_*`）  
4. `logs/` 中的详细记录（含本地时区时间戳）

欢迎提 Issue / PR，或在 README 里的联系方式继续反馈。祝使用顺利！