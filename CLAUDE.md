# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Agent Instructions

You're working inside the **WAT framework** (Workflows, Agents, Tools). This architecture separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution. That separation is what makes this system reliable.

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases

**Layer 2: Agents (The Decision-Maker)**
- This is your role: read the relevant workflow, run tools in the correct sequence, handle failures gracefully, ask clarifying questions when needed
- Example: To pull data from a website, read `workflows/scrape_website.md`, determine required inputs, then execute `tools/scrape_single_site.py`

**Layer 3: Tools (The Execution)**
- Python scripts in `tools/` that do the actual work — API calls, data transformations, file operations
- Credentials and API keys are stored in `.env`

**Why this matters:** When AI handles every step directly, accuracy compounds negatively — 90% accuracy per step means 59% end-to-end success after five steps. Deterministic scripts keep execution reliable while you focus on orchestration.

## How to Operate

**1. Look for existing tools first**
Check `tools/` before building anything new. Only create new scripts when nothing exists for the task.

**2. Running tools**
```bash
pip install -r requirements.txt   # install dependencies
python tools/<script_name>.py     # run a tool
```
All scripts load credentials via `python-dotenv` — call `load_dotenv()` at startup. Never hardcode values from `.env`.

**3. Learn and adapt when things fail**
- Read the full error message and trace
- Fix the script and retest — if it uses paid API calls or credits, check with the user before re-running
- Document what you learned in the relevant workflow (rate limits, timing quirks, unexpected behavior)

**4. Keep workflows current**
Update workflows when you find better methods or encounter new constraints. **Do not create or overwrite workflows without asking** — these are durable instructions, not disposable notes.

## File Structure

```
.tmp/           # Temporary files (scraped data, intermediate exports) — disposable
tools/          # Python scripts for deterministic execution
workflows/      # Markdown SOPs defining what to do and how
.env            # API keys and environment variables
credentials.json, token.json  # Google OAuth (gitignored)
```

Final deliverables go to cloud services (Google Sheets, Slides, etc.) where the user can access them directly. Everything in `.tmp/` is disposable and regenerated as needed.

## The Self-Improvement Loop

Every failure is a chance to make the system stronger:
1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow with the new approach
