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
- `proxy_read_timeout 300s` / `proxy_send_timeout 300s` / `proxy_connect_timeout 300s`
- `send_timeout 300s` to keep the downstream connection alive while Pandoc/LLM work
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