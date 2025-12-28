#!/usr/bin/env python3
"""
GitStoryline Data Mining Script
===============================
Extracts rich git history data for the timeline visualization.

Usage:
    python git_timeline_mining.py

Output:
    gitstoryline/timeline_data.json
"""

import subprocess
import json
import re
from datetime import datetime
from collections import defaultdict
from pathlib import Path

# Configuration
REPO_PATH = Path(__file__).parent.parent.resolve()
OUTPUT_FILE = REPO_PATH / "gitstoryline" / "timeline_data.json"

# Key files to track with special attention
KEY_FILES = [
    "index.html",
    "js/main.js",
    "js/app.js",  # May have existed in early versions
]


def run_git_command(cmd):
    """Run a git command and return output as string."""
    result = subprocess.run(
        cmd, cwd=REPO_PATH, capture_output=True, text=True, shell=True
    )
    return result.stdout.strip()


def parse_commit_type(message):
    """Categorize commit by its message pattern."""
    msg_lower = message.lower()
    if msg_lower.startswith("feat") or "feature" in msg_lower:
        return "feature"
    elif msg_lower.startswith("fix") or "bug" in msg_lower:
        return "fix"
    elif "refactor" in msg_lower or "cleanup" in msg_lower or "clean up" in msg_lower:
        return "refactor"
    elif msg_lower.startswith("docs") or "readme" in msg_lower or "documentation" in msg_lower:
        return "docs"
    elif "test" in msg_lower:
        return "test"
    elif "merge" in msg_lower:
        return "merge"
    elif "style" in msg_lower or "css" in msg_lower:
        return "style"
    else:
        return "other"


def get_all_commits():
    """Get all commits with full details."""
    # Format: hash|date|author|message
    cmd = 'git log --all --pretty=format:"%H|%ad|%an|%s" --date=iso-strict'
    output = run_git_command(cmd)
    
    commits = []
    for line in output.split("\n"):
        if not line.strip():
            continue
        parts = line.split("|", 3)
        if len(parts) >= 4:
            commits.append({
                "hash": parts[0],
                "date": parts[1],
                "author": parts[2],
                "message": parts[3],
                "type": parse_commit_type(parts[3])
            })
    
    return commits


def get_commit_stats(commit_hash):
    """Get file changes for a specific commit."""
    cmd = f'git show --numstat --pretty=format:"" {commit_hash}'
    output = run_git_command(cmd)
    
    files = []
    insertions = 0
    deletions = 0
    
    for line in output.split("\n"):
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) >= 3:
            ins = int(parts[0]) if parts[0].isdigit() else 0
            dels = int(parts[1]) if parts[1].isdigit() else 0
            files.append({
                "file": parts[2],
                "insertions": ins,
                "deletions": dels
            })
            insertions += ins
            deletions += dels
    
    return {
        "files": files,
        "filesChanged": len(files),
        "insertions": insertions,
        "deletions": deletions
    }


def get_file_line_count_at_commit(commit_hash, file_path):
    """Get the line count of a file at a specific commit."""
    cmd = f'git show {commit_hash}:{file_path} 2>/dev/null | wc -l'
    output = run_git_command(cmd)
    try:
        return int(output.strip())
    except ValueError:
        return 0


def get_file_history(file_path):
    """Get detailed history for a specific file."""
    cmd = f'git log --all --follow --pretty=format:"%H|%ad|%s" --date=iso-strict -- "{file_path}"'
    output = run_git_command(cmd)
    
    history = []
    for line in output.split("\n"):
        if not line.strip():
            continue
        parts = line.split("|", 2)
        if len(parts) >= 3:
            commit_hash = parts[0]
            lines = get_file_line_count_at_commit(commit_hash, file_path)
            history.append({
                "hash": commit_hash,
                "date": parts[1],
                "message": parts[2],
                "lines": lines
            })
    
    return history


def get_directory_creation_dates():
    """Find when key directories were first created."""
    directories = {
        "js/services": "Service Layer Architecture",
        "js/components": "Component Architecture", 
        "js/ai": "AI Integration",
        "ai": "AI Module",
        "css/views": "View-Specific Styling",
        "tests": "Test Infrastructure",
        "docs": "Documentation",
    }
    
    milestones = []
    for dir_path, description in directories.items():
        # Find first commit that added files to this directory
        cmd = f'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --diff-filter=A -- "{dir_path}/*" | head -1'
        output = run_git_command(cmd)
        if output:
            parts = output.split("|", 2)
            if len(parts) >= 3:
                milestones.append({
                    "type": "directory_created",
                    "directory": dir_path,
                    "description": description,
                    "date": parts[1],
                    "hash": parts[0],
                    "message": parts[2]
                })
    
    return sorted(milestones, key=lambda x: x["date"])


def get_all_files_timeline():
    """Get timeline of all file creations and deletions."""
    # Get file additions
    cmd = 'git log --all --diff-filter=A --summary --pretty=format:"COMMIT:%H|%ad|%s" --date=iso-strict'
    output = run_git_command(cmd)
    
    events = []
    current_commit = None
    
    for line in output.split("\n"):
        if line.startswith("COMMIT:"):
            parts = line[7:].split("|", 2)
            if len(parts) >= 3:
                current_commit = {
                    "hash": parts[0],
                    "date": parts[1],
                    "message": parts[2]
                }
        elif "create mode" in line and current_commit:
            # Parse: " create mode 100644 path/to/file.js"
            match = re.search(r"create mode \d+ (.+)$", line.strip())
            if match:
                file_path = match.group(1)
                events.append({
                    "type": "file_created",
                    "file": file_path,
                    "date": current_commit["date"],
                    "hash": current_commit["hash"]
                })
    
    return events


def get_monthly_stats():
    """Aggregate statistics by month."""
    cmd = 'git log --all --pretty=format:"%ad" --date=format:"%Y-%m" --numstat'
    output = run_git_command(cmd)
    
    monthly = defaultdict(lambda: {"commits": 0, "insertions": 0, "deletions": 0, "files": set()})
    current_month = None
    
    for line in output.split("\n"):
        line = line.strip()
        if not line:
            continue
        
        # Check if it's a date line (YYYY-MM format)
        if re.match(r"^\d{4}-\d{2}$", line):
            current_month = line
            monthly[current_month]["commits"] += 1
        elif current_month and "\t" in line:
            parts = line.split("\t")
            if len(parts) >= 3:
                ins = int(parts[0]) if parts[0].isdigit() else 0
                dels = int(parts[1]) if parts[1].isdigit() else 0
                monthly[current_month]["insertions"] += ins
                monthly[current_month]["deletions"] += dels
                monthly[current_month]["files"].add(parts[2])
    
    # Convert to serializable format
    result = []
    for month in sorted(monthly.keys()):
        data = monthly[month]
        result.append({
            "month": month,
            "commits": data["commits"],
            "insertions": data["insertions"],
            "deletions": data["deletions"],
            "filesChanged": len(data["files"])
        })
    
    return result


def detect_architecture_phases():
    """Detect major architectural phases based on patterns."""
    phases = []
    
    # Phase 1: Genesis - first commits
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict | head -3'
    output = run_git_command(cmd)
    lines = output.split("\n")
    if lines:
        parts = lines[0].split("|", 2)
        phases.append({
            "phase": 1,
            "title": "Genesis",
            "subtitle": "The First Lines of Code",
            "description": "It started with a single commit. A README and an index.html - the digital equivalent of breaking ground on a new building.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0] if parts else None
        })
    
    # Phase 2: Planning Era - first planning-related commit
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --grep="planning\\|plan" -i | head -1'
    output = run_git_command(cmd)
    if output:
        parts = output.split("|", 2)
        phases.append({
            "phase": 2,
            "title": "The Planning Era",
            "subtitle": "From Chaos to Structure",
            "description": "Annual planning features begin to emerge. The codebase starts to find its purpose.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0]
        })
    
    # Phase 3: Component Architecture
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --diff-filter=A -- "js/components/*" | head -1'
    output = run_git_command(cmd)
    if output:
        parts = output.split("|", 2)
        phases.append({
            "phase": 4,
            "title": "The Component Revolution",
            "subtitle": "Modular Thinking Takes Hold",
            "description": "The js/components directory is born. Views are encapsulated, reusable, testable.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0]
        })
    
    # Phase 4: Service Layer
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --diff-filter=A -- "js/services/*" | head -1'
    output = run_git_command(cmd)
    if output:
        parts = output.split("|", 2)
        phases.append({
            "phase": 5,
            "title": "Service Layer Architecture",
            "subtitle": "Separation of Concerns",
            "description": "The codebase had grown wild. Views were talking to each other, business logic was scattered. It was time for the Service Revolution.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0]
        })
    
    # Phase 5: AI Integration
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --diff-filter=A -- "js/ai/*" "ai/*" | head -1'
    output = run_git_command(cmd)
    if output:
        parts = output.split("|", 2)
        phases.append({
            "phase": 6,
            "title": "AI Awakens",
            "subtitle": "Intelligence Enters the Codebase",
            "description": "AI features emerge - context-aware chat, smart suggestions, automated workflows.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0]
        })
    
    # Phase 6: Testing/CI
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --diff-filter=A -- "tests/*" "*.test.js" | head -1'
    output = run_git_command(cmd)
    if output:
        parts = output.split("|", 2)
        phases.append({
            "phase": 8,
            "title": "Modern Era",
            "subtitle": "Testing and CI/CD Maturity",
            "description": "Unit tests arrive. Linting enforced. The codebase becomes a professional-grade project.",
            "phase": 8,
            "title": "Modern Era",
            "subtitle": "Testing and CI/CD Maturity",
            "description": "Unit tests arrive. Linting enforced. The codebase becomes a professional-grade project.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0]
        })

    # NEW PHASES
    
    # Monolith Busting (index.html reduction)
    cmd = 'git log --all --pretty=format:"%H|%ad|%s" --date=iso-strict -- "index.html"'
    output = run_git_command(cmd)
    index_history = []
    if output:
        for line in output.split('\n'):
            if line.strip():
                parts = line.split("|", 2)
                h = parts[0]
                lines = get_file_line_count_at_commit(h, "index.html")
                index_history.append({'hash': h, 'date': parts[1], 'lines': lines})
    
    # Sort history by date to find the drop
    index_history.sort(key=lambda x: x['date'])
    max_lines = 0
    for i, entry in enumerate(index_history):
        max_lines = max(max_lines, entry['lines'])
        if max_lines > 2000 and entry['lines'] < (max_lines - 1000):
            # Found the bust
            phases.append({
                "phase": 3, # Inserted
                "title": "Monolith Busting",
                "subtitle": "Breaking the Big File",
                "description": "The massive index.html is finally broken apart into separate modules, marking a major refactor point.",
                "startDate": entry['date'],
                "hash": entry['hash']
            })
            break

    # Workspace Layout
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --diff-filter=A -- "js/components/WorkspaceComponent.js" | head -1'
    output = run_git_command(cmd)
    if output:
        parts = output.split("|", 2)
        phases.append({
            "phase": 4.5, # Intermediate
            "title": "Workspace Layout",
            "subtitle": "The Sidebar Era",
            "description": "Navigation moves to a persistent sidebar. The concept of a 'Workspace' with swappable views is introduced.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0]
        })

    # Agent Contracts
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --diff-filter=A -- "docs/*contract.md" | head -1'
    output = run_git_command(cmd)
    if output:
        parts = output.split("|", 2)
        phases.append({
            "phase": 6.5,
            "title": "Agent Contracts",
            "subtitle": "Rules for Robots",
            "description": "Formal contracts (docs/*.md) are established to guide AI agents in maintaining code quality and consistency.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0]
        })

    # UI Theme Styling
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --diff-filter=A -- "css/settings/variables.css" | head -1'
    output = run_git_command(cmd)
    if output:
        parts = output.split("|", 2)
        phases.append({
            "phase": 5.5,
            "title": "UI Theme Styling",
            "subtitle": "Dark Mode & Theming",
            "description": "Introduction of semantic CSS variables and comprehensive dark mode support.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0]
        })

    # Tech Debt Paydown
    # Find a month with > 5 tech debt commits
    cmd = 'git log --all --pretty=format:"%ad" --date=format:"%Y-%m" --grep="Tech debt" --grep="compliance" -i'
    output = run_git_command(cmd)
    counts = defaultdict(int)
    tech_debt_date = None
    for line in output.split('\n'):
        if line.strip():
            counts[line.strip()] += 1
            if counts[line.strip()] >= 5:
                # Find the first commit of this month to use as start date
                cmd_first = f'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --before="{line.strip()}-30" --after="{line.strip()}-01" --grep="Tech debt" --grep="compliance" -i | head -1'
                res = run_git_command(cmd_first)
                if res:
                   tech_debt_date = res.split("|", 2)
                break
    
    if tech_debt_date:
        phases.append({
            "phase": 7,
            "title": "Tech Debt Paydown",
            "subtitle": "Focus on Compliance",
            "description": "A dedicated phase for cleaning up technical debt, improving compliance, and standardizing patterns.",
            "startDate": tech_debt_date[1] if len(tech_debt_date) > 1 else None,
            "hash": tech_debt_date[0]
        })

    # Code Quality Gates
    cmd = 'git log --all --reverse --pretty=format:"%H|%ad|%s" --date=iso-strict --diff-filter=A -- "eslint.config.mjs" "vitest.config.mjs" | head -1'
    output = run_git_command(cmd)
    if output:
        parts = output.split("|", 2)
        phases.append({
            "phase": 9,
            "title": "Code Quality Gates",
            "subtitle": "Automated Standards",
            "description": "Linting (ESLint) and Testing (Vitest) configurations are added, enforcing strict quality gates for all changes.",
            "startDate": parts[1] if len(parts) > 1 else None,
            "hash": parts[0]
        })
    
    return sorted(phases, key=lambda x: x.get("startDate", ""))


def get_top_churn_files(limit=20):
    """Find files with the most commits (highest churn)."""
    cmd = 'git log --all --name-only --pretty=format:""'
    output = run_git_command(cmd)
    
    file_counts = defaultdict(int)
    for line in output.split("\n"):
        if line.strip() and not line.startswith("."):
            file_counts[line.strip()] += 1
    
    # Sort by count and filter out deleted files
    sorted_files = sorted(file_counts.items(), key=lambda x: -x[1])[:limit * 2]
    
    # Filter to only existing files
    existing = []
    for file_path, count in sorted_files:
        full_path = REPO_PATH / file_path
        if full_path.exists():
            existing.append({"file": file_path, "commits": count})
        if len(existing) >= limit:
            break
    
    return existing


def get_file_tree_snapshot():
    """Get current file tree structure for visualization."""
    cmd = 'git ls-tree -r --name-only HEAD'
    output = run_git_command(cmd)
    
    tree = {}
    for line in output.split("\n"):
        if not line.strip():
            continue
        parts = line.split("/")
        current = tree
        for i, part in enumerate(parts):
            if i == len(parts) - 1:
                # It's a file
                if "_files" not in current:
                    current["_files"] = []
                current["_files"].append(part)
            else:
                # It's a directory
                if part not in current:
                    current[part] = {}
                current = current[part]
    
    return tree


def main():
    print("🔍 GitStoryline Data Mining")
    print("=" * 50)
    
    print("\n📊 Extracting commits...")
    commits = get_all_commits()
    print(f"   Found {len(commits)} commits")
    
    print("\n📈 Getting commit statistics...")
    # Add stats to first 100 commits (for demo) and every 10th after
    for i, commit in enumerate(commits):
        if i < 100 or i % 10 == 0:
            stats = get_commit_stats(commit["hash"])
            commit.update(stats)
        else:
            commit["files"] = []
            commit["filesChanged"] = 0
            commit["insertions"] = 0
            commit["deletions"] = 0
    
    print("\n📁 Tracking key file evolution...")
    file_evolution = {}
    for file_path in KEY_FILES:
        print(f"   Tracking: {file_path}")
        history = get_file_history(file_path)
        if history:
            file_evolution[file_path] = history
    
    print("\n🏗️  Detecting architecture milestones...")
    dir_milestones = get_directory_creation_dates()
    print(f"   Found {len(dir_milestones)} directory milestones")
    
    print("\n📅 Calculating monthly statistics...")
    monthly_stats = get_monthly_stats()
    print(f"   Aggregated {len(monthly_stats)} months")
    
    print("\n🎭 Detecting architecture phases...")
    phases = detect_architecture_phases()
    print(f"   Detected {len(phases)} phases")
    
    print("\n🔥 Finding high-churn files...")
    top_churn = get_top_churn_files(30)
    print(f"   Top {len(top_churn)} files by commit count")
    
    print("\n🌳 Capturing file tree...")
    file_tree = get_file_tree_snapshot()
    
    print("\n📁 Getting file creation timeline...")
    file_events = get_all_files_timeline()
    print(f"   Found {len(file_events)} file creation events")
    
    # Build the output
    data = {
        "generatedAt": datetime.now().isoformat(),
        "repository": {
            "name": "altsoftwareplanning",
            "description": "SMT Platform - Software Management Tool"
        },
        "summary": {
            "totalCommits": len(commits),
            "dateRange": {
                "start": commits[-1]["date"] if commits else None,
                "end": commits[0]["date"] if commits else None
            },
            "totalLinesAdded": sum(c.get("insertions", 0) for c in commits),
            "totalLinesDeleted": sum(c.get("deletions", 0) for c in commits),
            "totalFilesCreated": len(file_events)
        },
        "commits": commits,
        "fileEvolution": file_evolution,
        "directoryMilestones": dir_milestones,
        "monthlyStats": monthly_stats,
        "architecturePhases": phases,
        "topChurnFiles": top_churn,
        "fileTree": file_tree,
        "fileCreationTimeline": file_events
    }
    
    print(f"\n💾 Saving to {OUTPUT_FILE}...")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w") as f:
        json.dump(data, f, indent=2)
    
    print("\n✅ Done! Data mining complete.")
    print(f"   Output: {OUTPUT_FILE.relative_to(REPO_PATH)}")
    
    # Print summary
    print("\n📋 Summary:")
    print(f"   Total commits: {data['summary']['totalCommits']}")
    print(f"   Date range: {data['summary']['dateRange']['start'][:10]} to {data['summary']['dateRange']['end'][:10]}")
    print(f"   Lines added: {data['summary']['totalLinesAdded']:,}")
    print(f"   Lines deleted: {data['summary']['totalLinesDeleted']:,}")
    print(f"   Files created: {data['summary']['totalFilesCreated']}")


if __name__ == "__main__":
    main()
