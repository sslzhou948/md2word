## md2word · Markdown → Word

This project uses Next.js 14 (App Router) + Pandoc + LLM to clean Markdown and export docx with custom templates. It runs on Windows or Linux servers and ships portable tooling plus automation scripts for one-command setup.

### Key Features
- LLM cleans Markdown while preserving headings/lists and avoiding hallucinations.
- Pandoc applies Word templates stored in `templates/`.
- Frontend form uploads Markdown, selects template, downloads docx, and can ping LLM health.
- API returns structured error codes + failure steps (`CONV_*`) to speed up debugging.

### Tech Stack
- Next.js 14 App Router (Node.js runtime API routes)
- `fetch` to OpenAI-compatible Chat Completions API
- Pandoc 3.5 portable (override via `PANDOC_PATH` if desired)
- Code organized under `config/`, `lib/`, `components/`, `api/`

### Environment Variables
| Name | Description |
| --- | --- |
| `LLM_API_KEY` | API key for LLM provider |
| `LLM_API_BASE_URL` | e.g. `https://api.openai.com/v1` |
| `LLM_MODEL` | e.g. `gpt-4.1-mini` |
| `PANDOC_PATH` | *(optional)* custom path to pandoc executable |
| `PORTABLE_NODE_PATH` | *(optional)* custom path to portable Node |

> Copy `.env.local.example` to `.env.local` (or `.env`), then fill the values:
> ```bash
> # Windows PowerShell
> Copy-Item .env.local.example .env.local
> # macOS / Linux
> cp .env.local.example .env.local
> ```

### Local Development
```bash
npm install
npm run dev
# http://localhost:3000
```
> Portable Node lives under `tools/node/`. Delete it if you prefer system Node.

### From GitHub to Deployment
1. **Clone**
   ```bash
   git clone https://github.com/sslzhou948/md2word.git
   cd md2word
   ```
2. **Environment variables**
   ```bash
   Copy-Item .env.local.example .env.local   # Windows
   cp .env.local.example .env.local         # macOS / Linux
   ```
3. **Initialize dependencies**
   ```powershell
   # Windows
   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
   # Linux / macOS
   chmod +x scripts/setup-linux.sh
   ./scripts/setup-linux.sh
   ```
   These scripts download portable Node.js / Pandoc (if needed) and run `npm install`.
4. **Run**
   ```bash
   npm run dev                    # development
   npm run build && npm run start # production
   ```

### nginx Reverse Proxy Essentials
- `proxy_read_timeout 300s` / `proxy_send_timeout 300s` / `proxy_connect_timeout 60s`
- `client_max_body_size 10M`
- `proxy_buffering on`, `proxy_buffer_size 4k`, `proxy_buffers 8 4k`
- Full sample: `nginx.conf.example`

### API Flow
1. `POST /api/convert` receives `markdown`, `templateId`
2. `cleanMarkdownWithLlm` normalizes Markdown through LLM
3. `convertMarkdownToDocx` uses Pandoc + template to output docx
4. Response returns docx (base64) + cleaned Markdown preview

### Health Check & Error Codes
- `GET /api/llm-health` performs a lightweight LLM ping.
- Convert API emits error codes (`CONV_01_01`, `CONV_03_99`, `CONV_99_TIMEOUT`, …).
- Frontend shows code + failure step + hints (e.g. nginx timeout, pandoc missing).

### Common Issues
| Problem | Cause | Fix |
| --- | --- | --- |
| `npm` not found | Node missing / portable Node not used | Run setup script or install Node 20+ |
| `PSSecurityException` | PowerShell blocked | `Set-ExecutionPolicy -Scope Process Bypass` |
| `pandoc: command not found` | Binary missing | Keep `tools/pandoc/` or set `PANDOC_PATH` |
| `CONV_99_TIMEOUT` | nginx timeout too short | Increase `proxy_read_timeout` (≥300s) |
| 429/5xx from LLM | Rate limit / upstream failure | Retry later, use LLM health check |

### File Structure Notes
- Templates: add docx under `templates/` and declare in `src/config/templates.ts`
- Prompt config at `src/config/llmPrompt.ts`
- Portable toolchain lives under `tools/` (ignored by Git)
- Logs output to `logs/` (ignored by Git)

### Roadmap Ideas
- Template management UI
- Batch / queue processing
- Extract formatting logic as reusable package (Electron/Tauri)

---
If something breaks, double-check `.env.local`, nginx proxy settings, or the error codes surfaced in the UI. Issues & PRs welcome!
## md2word · Markdown �?Word

透過 Next.js 14 (App Router) + Pandoc + LLM，將 Markdown 檔快速整理並輸出符合 Word 樣板�?docx，適合需要套用企業模板或進行格式清洗的情境�?
### 功能亮點
- 使用 LLM 自動清洗 Markdown（維持標�?清單層級且不新增內容�?- Pandoc 套用 	emplates/ 內的 Word 參考檔，自動套�?- 前端表單可輸�?Markdown、選擇模板，並可檢測 LLM 健康狀�?- 429/5xx 會自動重試，並提供錯誤代碼／失敗步驟以利排查

### 技術堆�?- Next.js 14 App Router (Node.js runtime API Route)
- etch 直呼 OpenAI Chat Completions 兼容 API
- Pandoc 3.5 Windows portable (可改�?PANDOC_PATH 指向其他平台/版本)
- �?config/ / lib/ / components/ / pi/ 模組化程式碼

### 環境需�?| 名稱 | 說明 |
| --- | --- |
| LLM_API_KEY | LLM 認證金鑰 |
| LLM_API_BASE_URL | 例如 https://api.openai.com/v1 或自建端�?|
| LLM_MODEL | 例如 gpt-4.1-mini |
| PANDOC_PATH | *(可選)* 指向自訂 Pandoc 可執行檔 |
| PORTABLE_NODE_PATH | *(可選)* 指向自訂 portable Node |

> 版本庫提�?.env.local.example 作為環境變數範本�?>
> `ash
> # Windows PowerShell
> Copy-Item .env.local.example .env.local
> # macOS / Linux
> cp .env.local.example .env.local
> `
>
> 然後編輯 .env.local（或 .env）填入實際的 API Key / Base URL / Model�?
### 本機開發
`ash
npm install
npm run dev
# http://localhost:3000
`
> 預設會使�?	ools/node/node.exe；若想用系統 Node，可自行刪除 portable 版本或覆�?scripts/run-with-portable-node.cjs�?
### �?GitHub 拉取後的初始化流�?1. **Clone 專案**
   `ash
   git clone https://github.com/sslzhou948/md2word.git
   cd md2word
   `
2. **建立環境變數�?*
   `ash
   Copy-Item .env.local.example .env.local   # Windows
   cp .env.local.example .env.local         # macOS / Linux
   `
   填入 LLM API Key、Base URL、Model 等真實值�?3. **執行初始化腳�?*
   `ash
   # Windows
   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
   # Linux / macOS
   chmod +x scripts/setup-linux.sh
   ./scripts/setup-linux.sh
   `
   會自動下�?portable Node.js / Pandoc 並執�?
pm install�?4. **啟動或部�?*
   `ash
   npm run dev                    # 開發模式
   npm run build && npm run start # 正式模式
   `

### Nginx 反向代理重點
- 記得放寬超時：`proxy_read_timeout 300s、`proxy_send_timeout 300s、`proxy_connect_timeout 60s
- 允許較大的請求：client_max_body_size 10M
- 調整緩衝：`proxy_buffering on、`proxy_buffer_size 4k、`proxy_buffers 8 4k
- 完整範例請見 
ginx.conf.example

### API 流程
1. POST /api/convert 取得 markdown, 	emplateId
2. cleanMarkdownWithLlm(markdown) 呼叫 LLM 進行清洗
3. convertMarkdownToDocx(cleanedMarkdown, template) 透過 Pandoc 產生 docx
4. 回傳 JSON（含 base64 docx、檔名、清洗後內容�?
### LLM 健康檢查
- GET /api/llm-health 會送極輕量對話�?LLM，回傳延遲與樣本文字
- 若出�?429/5xx，前端會提醒使用者先檢查 LLM 可用�?
### GitHub / 部署小抄
| 情境 | 指令 / 操作 | 備註 |
| --- | --- | --- |
| 初始�?Git | git init && git add . && git commit -m  chore: prepare project | .gitignore 已排�?
ode_modules/、`tools/ 等產�?|
| 推�?| git remote add origin https://github.com/sslzhou948/md2word.git<br>git push -u origin main | 第一次推送若遠端已有檔案，請�?git pull --rebase origin main |
| 更新 .env | 只需維護 .env.local，範�?.env.local.example 已納入版本控�?| 不要將真實金鑰提交到 Git |
| 常見錯誤：`CONV_99_TIMEOUT | nginx 代理超時 | 調整 proxy_read_timeout（建�?�?300 秒） |
| 常見錯誤：`pandoc: command not found | 找不�?Pandoc | 確認 	ools/pandoc/ 是否存在或設 PANDOC_PATH |

### 後續擴充建議
- 製作模板管理 UI（對�?src/config/templates.ts�?- 新增任務佇列／批次轉�?- 將核心整理邏輯抽成獨立套件，以利未來整合 Electron / Tauri

---
若在部署/執行過程遇到問題，可先檢�?.env.local 是否完整、nginx 超時是否足夠，或查看錯誤代碼（前端會顯示故障碼與失敗環節）。需要更多協助再告訴我！

