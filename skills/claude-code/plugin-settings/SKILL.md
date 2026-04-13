---
name: Plugin Settings
description: This skill should be used when the user asks to "configure plugin", "set plugin options", "manage settings", "use .claude-plugin/settings.json", "define configuration schema", "set default values", "override settings", or needs guidance on plugin configuration management, settings structure, or configuration best practices for Claude Code plugins.
version: 0.1.0
---

## Overview
Claude Code plugins use a standardized settings system to manage user-configurable options. Understanding how to define, access, and manage these settings enables creating flexible, customizable plugins.

**Key concepts:**
- Settings defined in `.claude-plugin/settings.json`
- Default values and type enforcement
- User overrides in local configuration
- Accessing settings from commands, agents, and scripts

## Settings Configuration
The settings file defines the schema and default values for plugin options. Located at `.claude-plugin/settings.json`:

```json
{
  "api_endpoint": {
    "type": "string",
    "default": "https://api.example.com",
    "description": "Primary API endpoint for the plugin"
  },
  "enable_caching": {
    "type": "boolean",
    "default": true,
    "description": "Enable local result caching"
  },
  "max_retries": {
    "type": "number",
    "default": 3,
    "description": "Maximum number of operation retries"
  },
  "log_level": {
    "type": "string",
    "enum": ["debug", "info", "warn", "error"],
    "default": "info",
    "description": "Detail level for plugin logs"
  }
}
```

### Supported Data Types
- `string`: Any text value
- `number`: Integer or floating point numbers
- `boolean`: true or false
- `array`: List of values
- `object`: Nested configuration

### Schema Fields
- `type` (required): Data type of the setting
- `default` (required): Initial value if not overridden
- `description`: Explanation shown to the user
- `enum`: Restricted list of valid values (for strings/numbers)
- `required`: Whether the user must provide a value

## User Overrides
Users can override default settings in their project-specific or global configuration.

### Project-specific
Located in `.claude/plugin-settings.json` in the project root:
```json
{
  "plugin-name": {
    "api_endpoint": "https://staging.example.com",
    "max_retries": 5
  }
}
```

### Global
Located in user's home directory `~/.claude/plugin-settings.json`:
```json
{
  "plugin-name": {
    "enable_caching": false
  }
}
```

### Precedence Order
1. Project-specific settings (`.claude/plugin-settings.json`)
2. Global settings (`~/.claude/plugin-settings.json`)
3. Plugin defaults (`.claude-plugin/settings.json`)

## Accessing Settings
Claude Code makes settings available to all plugin components.

### In Commands
Access settings using the `$SETTINGS` variable:
```markdown
# My Command
Deliver report to endpoint: $SETTINGS(plugin-name.api_endpoint)
```

### In Scripts (via Environment Variables)
Claude Code exports settings as environment variables prefix with `CLAUDE_SETTING_`:
```bash
#!/bin/bash
# Accessing api_endpoint setting
ENDPOINT=$CLAUDE_SETTING_PLUGIN_NAME_API_ENDPOINT
curl -X POST $ENDPOINT -d @report.json
```

**Naming convention for env vars:**
`CLAUDE_SETTING_<PLUGIN_NAME_PASCAL_CASE>_<SETTING_NAME_PASCAL_CASE>`

### In Agent System Prompts
Include settings in instructions:
```markdown
---
name: my-agent
---
You are an analyzer. Use the configuration at $SETTINGS(plugin-name.api_endpoint) 
if you need to fetch additional data.
```

## Best Practices
- **Logical Names**: Use clear, descriptive names for settings (e.g., `api_key` vs `key`).
- **Reasonable Defaults**: Provide safe, working defaults whenever possible.
- **Documentation**: Always include a `description` field for every setting.
- **Validation**: Use `enum` to restrict values for critical settings.
- **Sensitive Data**: Avoid storing raw secrets in default settings; use placeholders or instructions to use environment variables.

## Example: Advanced Configuration
```json
{
  "auth": {
    "type": "object",
    "default": {
      "method": "token",
      "server": "https://auth.example.com"
    }
  },
  "allowed_domains": {
    "type": "array",
    "default": ["example.com", "test.org"],
    "description": "Domains permitted for external requests"
  }
}
```
