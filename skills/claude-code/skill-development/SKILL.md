---
name: Skill Development
description: This skill should be used when the user wants to "create a skill", "add a skill to plugin", "write a new skill", "improve skill description", "organize skill content", or needs guidance on skill structure, progressive disclosure, or skill development best practices for Claude Code plugins.
version: 0.1.0
---

This skill provides guidance for creating effective skills for Claude Code plugins.

Skills are modular, self-contained packages that extend Claude's capabilities by providing specialized knowledge, workflows, and tools.

### Anatomy of a Skill
Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md (required)
**Metadata Quality:** The `name` and `description` in YAML frontmatter determine when Claude will use the skill. Be specific about what the skill does and when to use it. Use the third-person (e.g. "This skill should be used when..." instead of "Use this skill when...").

#### Bundled Resources (optional)
##### Scripts (`scripts/`)
Executable code (Python/Bash/etc.) for tasks that require deterministic reliability.

##### References (`references/`)
Documentation and reference material intended to be loaded as needed into context. 
**Avoid duplication**: Information should live in either SKILL.md or references files, not both. Prefer references files for detailed information unless it's truly core to the skill.

##### Assets (`assets/`)
Files not intended to be loaded into context, but rather used within the output Claude produces.

### Progressive Disclosure Design Principle
Skills use a three-level loading system:
1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by Claude (Unlimited*)

### Step 1: Understanding the Skill with Concrete Examples
To create an effective skill, clearly understand concrete examples of how the skill will be used. 

### Step 2: Planning the Reusable Skill Contents
Identify what scripts, references, and assets would be helpful when executing workflows repeatedly.

### Step 3: Create Skill Structure
For Claude Code plugins:
```bash
mkdir -p plugin-name/skills/skill-name/{references,examples,scripts}
touch plugin-name/skills/skill-name/SKILL.md
```

### Step 4: Edit the Skill
Focus on including information that would be beneficial and non-obvious to Claude.

#### Start with Reusable Skill Contents
Start with the reusable resources identified above: `scripts/`, `references/`, and `assets/` files.

#### Update SKILL.md
**Writing Style:** Write using **imperative/infinitive form** (verb-first instructions), not second person.

**Description (Frontmatter):** Use third-person format with specific trigger phrases:
```yaml
---
name: Skill Name
description: This skill should be used when the user asks to "specific phrase 1", "specific phrase 2", "specific phrase 3"...
version: 0.1.0
---
```

**Keep SKILL.md lean:** Target 1,500-2,000 words. Move detailed content to references/.

### Step 5: Validate and Test
1. **Check structure**
2. **Validate SKILL.md** (frontmatter)
3. **Check trigger phrases** (description)
4. **Verify writing style** (imperative form)
5. **Test progressive disclosure** (lean body)

### Study Best Practices
Study the skills in `plugins/plugin-dev/skills/` as examples:
- **hook-development**
- **agent-development**
- **plugin-settings**

✅ **DO:**
- Use third-person in description
- Include specific trigger phrases
- Keep SKILL.md lean (1,500-2,000 words)
- Use progressive disclosure
- Write in imperative/infinitive form
- Reference supporting files clearly

❌ **DON'T:**
- Use second person anywhere
- Have vague trigger conditions
- Put everything in SKILL.md (>3,000 words)
- Leave resources unreferenced
- Include broken or incomplete examples
