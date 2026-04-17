# Git Hooks for Mission Control

This directory contains git hooks that automatically detect and track AI tool configuration changes.

## Hooks

### pre-commit
Detects changes to AI tool configuration files such as:
- `.cursorrules`
- `CLAUDE.md`
- `AGENTS.md`
- `.claude/` directory
- `.cursor/` directory
- `.github/workflows/`

When these files change, the hook creates a marker file for the post-commit hook.

### post-commit
After a commit containing AI tool changes, this hook:
1. Reads the marker file created by pre-commit
2. Creates ReviewItem entries for each changed AI file
3. Stores them in `.mc/reviews/pending_reviews.jsonl`

## Installation

To install these hooks in your git repository, run:

```bash
# Make hooks executable
chmod +x pre-commit post-commit

# Create symlinks to .git/hooks
ln -sf ../../backend/scripts/git_hooks/pre-commit .git/hooks/pre-commit
ln -sf ../../backend/scripts/git_hooks/post-commit .git/hooks/post-commit
```

Or copy them directly:

```bash
cp pre-commit .git/hooks/
cp post-commit .git/hooks/
chmod +x .git/hooks/pre-commit .git/hooks/post-commit
```

## How It Works

1. When you commit changes that include AI tool files, pre-commit detects them
2. post-commit creates a review entry for each AI tool file that was changed
3. These review entries can be processed by Mission Control to track AI tool changes

## Integration with Mission Control

The pending reviews are stored in `.mc/reviews/pending_reviews.jsonl` in JSON Lines format.
A future integration will automatically import these into the Mission Control backend API.

## Current Limitations

- The hooks create local JSON files rather than calling the API directly
- Future versions will support direct API integration
- Currently supports git-based detection only
