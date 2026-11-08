Write a handoff for a fresh Claude Code session that continues this work. Do not call any tool. Reply with the handoff only: no preamble, no code fence around it.

The reader starts with an empty context. It can open files on this machine but cannot see this chat. It loads CLAUDE.md, AGENTS.md and its memory index by itself, so do not repeat those.

Use this shape, in plain, short English. Leave out a section that has nothing in it.

# Handoff: <the goal, in a few words>

Continue work in `{{cwd}}`. Goal: <what the user is working toward right now>.

## What the user asked for
Every request in this chat, in order, with the user's own key words. Mark each one: done, in progress, or not started.

## Where things stand
What is done and checked, the key decisions and why, and what was tested and what was not.

## Rules the user set
Standing constraints and preferences given in this chat: words to avoid, things never to do, approval steps, tone.

## Files to open first
- `<path>`: why it matters, in one line. Only files the next step needs, at most 15. Paths only; never copy file content.

## Skills and tools to use
- `<skill, CLI or connector>`: when to use it, and any trap found in this chat.

## Errors already solved
- <the error>: <the fix>.

## Carried-over data
Only data that exists nowhere on disk: ids, URLs, numbers and decisions that live only in this chat. Verbatim.

## Next steps
1. The very next action, specific enough to start without asking a question.

Never write an API key, token or password; write where it lives instead (for example "in ~/.zshrc"). Keep it under 1,500 words.
