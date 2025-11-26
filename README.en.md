## md2word · Markdown → Word

> This is the **English** README. For the Chinese version, see `README.md`.

md2word is a Markdown → Word converter built on **Next.js 14 App Router**.  
The frontend provides a visual form; the backend uses an LLM to clean Markdown, then applies a Word template to produce a `.docx` file. It runs on both Windows and Linux and ships with portable tooling and initialization scripts.

---

### Key features
- **AI‑assisted cleanup**: LLM fixes Markdown structure, keeps heading/list hierarchy and avoids hallucinations.
- **Official template library only**: All Word templates live under `templates/` and are maintained centrally.
- **Detailed error reporting**: APIs return `CONV_*` error codes plus which step failed; the UI surfaces these.
- **Health check**: Frontend can ping `/api/llm-health` to verify LLM connectivity.
- **Usage counter**: Every successful Word export increments a local counter in `data/stats.json` and updates the homepage badge.

---

### Tech stack
- Next.js 14 App Router (Node.js runtime)
- `fetch` to OpenAI‑compatible Chat Completions API
- Portable docx conversion CLI (override with `PANDOC_PATH` if you host your own binary)
- Directory layout: `config/`, `lib/`, `components/`, `app/`

---

### Environment variables
| Name | Description |
| --- | --- |
| `LLM_API_KEY` | API key for the LLM provider |
| `LLM_API_BASE_URL` | e.g. `https://api.openai.com/v1` |
| `LLM_MODEL` | e.g. `gpt-4.1-mini` |
| `PANDOC_PATH` | *(optional)* custom path to the docx conversion CLI |
| `PORTABLE_NODE_PATH` | *(optional)* custom path to portable Node |

> Initialize from the example file:
> ```bash
> # Windows PowerShell
> Copy-Item .env.local.example .env.local
> # macOS / Linux
> cp .env.local.example .env.local
> ```

---

### Local development
```bash
npm install
npm run dev
# http://localhost:3000
```
> If you do not want to use the portable Node under `tools/node/`, delete that folder and use a system Node.js 20+ instead.

---

### From GitHub to deployment
1. **Clone the repo**
   ```bash
   git clone https://github.com/sslzhou948/md2word.git
   cd md2word
   ```
2. **Configure environment variables**
   ```bash
   Copy-Item .env.local.example .env.local   # Windows
   cp .env.local.example .env.local         # macOS / Linux
   ```
3. **Run initialization scripts**
   ```powershell
   # Windows (PowerShell)
   powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1

   # Linux
   chmod +x scripts/setup-linux.sh
   ./scripts/setup-linux.sh
   ```
   - The Windows script downloads **portable Node.js** and the docx converter from a set of mirrors
     (official site, domestic mirrors, GitHub proxy, etc.), with retries, TLS 1.2 enforced, and
     BITS + `curl.exe` fallback for unstable networks.
   - The Linux script checks `curl`/`tar`, retries downloads with backoff, and then runs `npm install`.
4. **Run the app**
   ```bash
   npm run dev                    # development
   npm run build && npm run start # production
   ```

---

### Template maintenance (official templates only)
> Version 2.0 only exposes **official templates**. End users cannot upload their own templates.

1. **Where to put templates?**  
   - Place all `.docx` template files under the `templates/` directory.  
   - Filenames are free‑form, e.g. `official-document.docx`, `proposal-2024.docx`.

2. **How to expose templates in the UI?**  
   - Edit `src/config/templates.ts` and declare each template:
     ```ts
     {
       id: 'official-document',
       name: 'Official document',
       description: 'For notices and formal documents',
       filename: 'official-document.docx',
       category: 'Official',
       previewImage: 'templates/previews/official-document.svg',
     }
     ```
   - `previewImage` is resolved from `public/`, you can use simple SVG/PNG placeholders.

3. **Why not allow user uploads?**  
   - There is no user system yet, so user‑uploaded templates would be shared by everyone.  
   - This can easily leak private layouts or cause conflicts.  
   - If a custom template is needed, an admin can manually add it under `templates/` and register it in `templates.ts`.

4. **Future plans**  
   - Later versions may add a user system and per‑user template preferences or temporary templates.

---

### nginx reverse proxy notes
- `proxy_read_timeout 300s` / `proxy_send_timeout 300s` / `proxy_connect_timeout 300s`
- `send_timeout 300s` so long‑running LLM / conversion is not cut off.
- `client_max_body_size 10M`
- `proxy_buffering on`, `proxy_buffer_size 4k`, `proxy_buffers 8 4k`
- See `nginx.conf.example` for a complete sample.

---

### API flow
1. `POST /api/convert` with `markdown` and `templateId`.
2. Optionally normalize plain text into Markdown.
3. `cleanMarkdownWithLlm` uses the LLM to clean and structure the Markdown.
4. The docx converter applies the selected template and produces a file.
5. The response returns `cleanedMarkdown`, `fileBase64`, the filename, and flags like `wasConverted`.

---

### Health check & error codes
- `GET /api/llm-health` tests whether the LLM backend is reachable and returns latency plus a small sample.
- The convert API returns error codes such as:
  - `CONV_01_01` empty input
  - `CONV_02_01` template unavailable
  - `CONV_03_99` LLM cleanup failed
  - `CONV_04_02/03` template missing / permission issue
  - `CONV_99_TIMEOUT` reverse proxy or LLM timeout

---

### Common issues
| Problem | Cause | Fix |
| --- | --- | --- |
| `npm` not found | Node missing / portable Node not on PATH | Run the setup script or install Node 20+ |
| `PSSecurityException` | PowerShell blocked scripts | `Set-ExecutionPolicy -Scope Process Bypass` |
| Docx converter not found | CLI missing | Keep `tools/pandoc/` or set `PANDOC_PATH` |
| `CONV_99_TIMEOUT` | Reverse proxy timeout too short | Increase `proxy_read_timeout` (≥300s) |
| 429 / 5xx from LLM | Rate limit / upstream failure | Retry later and use the LLM health check endpoint |

---

### Directory overview
- `templates/` – Official Word templates (pair with `src/config/templates.ts`)
- `src/config/llmPrompt.ts` – LLM prompt for Markdown cleanup
- `src/lib/` – LLM client, converter wrapper, rate limiting, logging utilities
- `logs/` – Usage logs with local‑timezone timestamps
- `data/stats.json` – Counter of successful conversions (incremented by 1 per success)

---

### Roadmap (ideas)
- Template management UI (upload / preview / enable)
- Batch conversion and job queues
- Extract cleanup / conversion logic into a reusable library for Electron/Tauri
- User system with personalized template preferences

---

If you run into issues, please first check:
1. `.env.local` configuration  
2. Reverse‑proxy timeouts (nginx, etc.)  
3. The `CONV_*` error code shown in the UI  
4. Detailed logs written under `logs/` (with local‑timezone timestamps)

Feel free to open an Issue / PR, or reach out via the contact info in the Chinese README.
