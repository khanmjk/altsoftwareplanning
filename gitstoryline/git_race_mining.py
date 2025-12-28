#!/usr/bin/env python3
"""
GitStoryline v2 - Bar Chart Race Data Mining
=============================================
Generates frame-by-frame data for racing bar chart animation.
Tracks file sizes over time including deleted files.

Usage:
    python git_race_mining.py

Output:
    gitstoryline/race_data.json
"""

import subprocess
import json
from datetime import datetime, timedelta
from collections import defaultdict
from pathlib import Path

# Configuration
REPO_PATH = Path(__file__).parent.parent.resolve()
OUTPUT_FILE = REPO_PATH / "gitstoryline" / "race_data.json"
TOP_N_FILES = 56  # Files to show in the race at any time

# File categories for coloring
FILE_CATEGORIES = {
    'component': ('#8b5cf6', ['js/components/']),
    'service': ('#22c55e', ['js/services/']),
    'ai': ('#f59e0b', ['js/ai/', 'ai/']),
    'css': ('#3b82f6', ['css/']),
    'html': ('#ec4899', ['.html']),
    'engine': ('#06b6d4', ['js/engines/']),
    'manager': ('#14b8a6', ['js/managers/']),
    'repository': ('#a855f7', ['js/repositories/']),
    'test': ('#64748b', ['tests/']),
    'other': ('#94a3b8', [])
}


def run_git_command(cmd):
    """Run a git command and return output as string."""
    result = subprocess.run(
        cmd, cwd=REPO_PATH, capture_output=True, text=True, shell=True
    )
    return result.stdout.strip()


def get_file_category(file_path):
    """Determine the category of a file for coloring."""
    for category, (color, patterns) in FILE_CATEGORIES.items():
        for pattern in patterns:
            if pattern in file_path:
                return category, color
    return 'other', '#94a3b8'


def get_all_dates_with_commits():
    """Get all unique dates that have commits."""
    cmd = 'git log --all --pretty=format:"%ad" --date=short | sort -u'
    output = run_git_command(cmd)
    return sorted(output.split('\n'))


def get_file_size_at_date(file_path, date):
    """Get the line count of a file at a specific date."""
    # Get the last commit on or before this date for this file
    cmd = f'git log -1 --until="{date} 23:59:59" --format="%H" -- "{file_path}"'
    commit = run_git_command(cmd)
    
    if not commit:
        return 0
    
    # Get file content at that commit
    cmd = f'git show {commit}:"{file_path}" 2>/dev/null | wc -l'
    output = run_git_command(cmd)
    
    try:
        return int(output.strip())
    except ValueError:
        return 0


def get_all_files_ever():
    """Get all files that ever existed in the repo."""
    # Get all files that were ever added
    cmd = 'git log --all --diff-filter=A --name-only --pretty=format:"" | sort -u'
    output = run_git_command(cmd)
    
    files = set()
    for line in output.split('\n'):
        line = line.strip()
        if line and (line.endswith('.js') or line.endswith('.css') or line.endswith('.html') or line.endswith('.md')):
            files.add(line)
    
    return files


def get_file_lifecycle(file_path):
    """Get the creation and deletion dates for a file."""
    # First commit that added this file
    cmd = f'git log --all --reverse --diff-filter=A --format="%ad" --date=short -- "{file_path}" | head -1'
    created = run_git_command(cmd)
    
    # Check if file currently exists
    full_path = REPO_PATH / file_path
    exists = full_path.exists()
    
    deleted = None
    if not exists:
        # Find when it was deleted
        cmd = f'git log --all --diff-filter=D --format="%ad" --date=short -- "{file_path}" | tail -1'
        deleted = run_git_command(cmd)
    
    return created, deleted, exists


def get_file_sizes_at_commit(commit_hash, files_set):
    """Get sizes of all tracked files at a specific commit."""
    sizes = {}
    
    # List all files at this commit
    cmd = f'git ls-tree -r --name-only {commit_hash}'
    output = run_git_command(cmd)
    existing_files = set(output.split('\n'))
    
    for file_path in files_set:
        if file_path in existing_files:
            cmd = f'git show {commit_hash}:"{file_path}" 2>/dev/null | wc -l'
            result = run_git_command(cmd)
            try:
                sizes[file_path] = int(result.strip())
            except ValueError:
                sizes[file_path] = 0
        else:
            sizes[file_path] = 0  # File doesn't exist at this commit
    
    return sizes


def generate_race_frames():
    """Generate frame data for the bar chart race."""
    print("🔍 GitStoryline v2 - Bar Chart Race Mining")
    print("=" * 50)
    
    print("\n📅 Getting all commit dates...")
    all_dates = get_all_dates_with_commits()
    print(f"   Found {len(all_dates)} unique dates")
    
    print("\n📁 Finding all files that ever existed...")
    all_files = get_all_files_ever()
    print(f"   Found {len(all_files)} JS/CSS/HTML files")
    
    print("\n📊 Getting file lifecycles...")
    file_info = {}
    deleted_files = []
    
    for file_path in all_files:
        created, deleted, exists = get_file_lifecycle(file_path)
        category, color = get_file_category(file_path)
        
        file_info[file_path] = {
            'created': created,
            'deleted': deleted,
            'exists': exists,
            'category': category,
            'color': color
        }
        
        if deleted:
            deleted_files.append({
                'file': file_path,
                'created': created,
                'deleted': deleted,
                'category': category
            })
    
    print(f"   Found {len(deleted_files)} deleted files")
    
    print("\n🎬 Generating frames (this may take a while)...")
    
    frames = []
    prev_sizes = {}
    
    # Sample dates (every Nth date to reduce processing time)
    sample_interval = max(1, len(all_dates) // 100)  # ~100 frames max
    sampled_dates = all_dates[::sample_interval]
    
    # Always include the last date
    if all_dates[-1] not in sampled_dates:
        sampled_dates.append(all_dates[-1])
    
    for i, date in enumerate(sampled_dates):
        if i % 10 == 0:
            print(f"   Processing {date} ({i+1}/{len(sampled_dates)})...")
        
        # Get the latest commit on this date
        cmd = f'git log -1 --until="{date} 23:59:59" --format="%H"'
        commit = run_git_command(cmd)
        
        if not commit:
            continue
        
        # Get file sizes at this commit
        sizes = get_file_sizes_at_commit(commit, all_files)

        # Get monthly commit count
        # Calculate start and end of the month for this date
        dt = datetime.strptime(date, '%Y-%m-%d')
        start_of_month = dt.replace(day=1).strftime('%Y-%m-%d')
        # Simple way to get end of month: first day of next month - 1 day, 
        # but for simplicity let's just count commits in the last 30 days window up to this date
        # to show "current velocity" rather than strict calendar month totals which fluctuate weirdly mid-month
        start_window = (dt - timedelta(days=30)).strftime('%Y-%m-%d')
        
        cmd = f'git rev-list --count --since="{start_window}" --until="{date}" --all'
        try:
            monthly_commits = int(run_git_command(cmd))
            daily_commits = round(monthly_commits / 30, 1)
        except ValueError:
            monthly_commits = 0
            daily_commits = 0
        
        # Count Tech Debt / Compliance commits
        cmd_tech = f'git rev-list --since="{start_window}" --until="{date}" --grep="Tech debt" --grep="compliance" --count --all -i'
        try:
            tech_debt_commits = int(run_git_command(cmd_tech))
        except ValueError:
            tech_debt_commits = 0
            daily_commits = 0
        
        # Build frame data
        frame_files = []
        for file_path, lines in sizes.items():
            info = file_info[file_path]
            
            # Determine status
            status = 'active'
            if info['deleted'] and date >= info['deleted']:
                status = 'deleted'
            elif info['created'] and date < info['created']:
                status = 'not_created'
            elif lines == 0 and prev_sizes.get(file_path, 0) > 0:
                status = 'deleted'  # Just deleted
            
            if status != 'not_created' and (lines > 0 or status == 'deleted'):
                frame_files.append({
                    'file': file_path,
                    'name': file_path.split('/')[-1],
                    'lines': lines,
                    'category': info['category'],
                    'color': info['color'],
                    'status': status
                })
        
        # Sort by lines and keep top N + recently deleted
        active_files = [f for f in frame_files if f['status'] == 'active' and f['lines'] > 0]
        deleted_this_frame = [f for f in frame_files if f['status'] == 'deleted']
        
        active_files.sort(key=lambda x: -x['lines'])
        top_files = active_files[:TOP_N_FILES]
        
        # Add recently deleted files (keep visible for a few frames)
        for df in deleted_this_frame:
            if df not in top_files:
                df['lines'] = 0  # Show at 0 before fadeout
                top_files.append(df)
        
        frames.append({
            'date': date,
            'files': top_files,
            'totalFiles': len([f for f in frame_files if f['lines'] > 0]),
            'totalFiles': len([f for f in frame_files if f['lines'] > 0]),
            'totalLines': sum(f['lines'] for f in frame_files),
            'monthlyCommits': monthly_commits,
            'dailyCommits': daily_commits,
            'techDebtCommits': tech_debt_commits
        })
        
        prev_sizes = sizes
    
    return frames, deleted_files, file_info


def detect_milestones(frames, file_info):
    """Detect key milestones in the timeline."""
    milestones = []
    
    # Find when services directory started appearing
    for frame in frames:
        service_files = [f for f in frame['files'] if f['category'] == 'service']
        if service_files and not any(m['type'] == 'service_layer' for m in milestones):
            milestones.append({
                'date': frame['date'],
                'type': 'service_layer',
                'title': 'Service Layer Emerges',
                'description': 'Architecture shift: business logic moves to dedicated services'
            })
        
        component_files = [f for f in frame['files'] if f['category'] == 'component']
        if len(component_files) >= 5 and not any(m['type'] == 'components' for m in milestones):
            milestones.append({
                'date': frame['date'],
                'type': 'components',
                'title': 'Component Architecture',
                'description': 'Modular views take shape with reusable components'
            })
        
        ai_files = [f for f in frame['files'] if f['category'] == 'ai']
        if ai_files and not any(m['type'] == 'ai' for m in milestones):
            milestones.append({
                'date': frame['date'],
                'type': 'ai',
                'title': 'AI Integration',
                'description': 'Intelligent features enter the codebase'
            })
    
    return milestones

def detect_milestones(frames, file_info):
    """Detect key milestones in the timeline."""
    milestones = []
    
    # Track index.html size for monolith busting
    initial_index_lines = 0
    # Find max size of index.html encountered
    max_index_lines = 0
    
    for frame in frames:
        # Check for index.html size
        index_file = next((f for f in frame['files'] if f['name'] == 'index.html'), None)
        if index_file:
            if max_index_lines == 0:
                max_index_lines = index_file['lines']
            max_index_lines = max(max_index_lines, index_file['lines'])
        
        # 1. Monolith Busting
        # Trigger: index.html drops significantly (>1000 lines drop from max) AND total files increases (>5)
        # We need a latch so we don't trigger repeatedly
        if index_file and max_index_lines > 2000 and index_file['lines'] < (max_index_lines - 1000) and frame['totalFiles'] >= 5:
            if not any(m['type'] == 'monolith_busting' for m in milestones):
                milestones.append({
                    'date': frame['date'],
                    'type': 'monolith_busting',
                    'title': 'Monolith Busting',
                    'description': 'Breaking apart the monolithic index.html into separate modules'
                })

        # 2. Workspace UI
        # Trigger: WorkspaceComponent.js or sidebar.css exists
        has_workspace = any(f in file_info and file_info[f]['created'] and frame['date'] >= file_info[f]['created'] 
                            for f in ['js/components/WorkspaceComponent.js', 'css/layout/sidebar.css'])
        if has_workspace and not any(m['type'] == 'workspace_ui' for m in milestones):
            milestones.append({
                'date': frame['date'],
                'type': 'workspace_ui',
                'title': 'Workspace Layout',
                'description': 'Navigation moves to sidebar, introducing the workspace concept'
            })

        # 3. Agent Contracts
        # Trigger: docs/*contract.md exists
        has_contracts = any('docs/' in f and 'contract.md' in f and file_info[f]['created'] and frame['date'] >= file_info[f]['created'] 
                           for f in file_info.keys())
        if has_contracts and not any(m['type'] == 'agent_contracts' for m in milestones):
             milestones.append({
                'date': frame['date'],
                'type': 'agent_contracts',
                'title': 'Agent Contracts',
                'description': 'Standardized rules for AI agents to maintain code quality'
            })
            
        # 3.5. UI Theme Styling
        # Trigger: variables.css exists
        has_theme = any('css/settings/variables.css' in f and file_info[f]['created'] and frame['date'] >= file_info[f]['created'] 
                           for f in file_info.keys())
        if has_theme and not any(m['type'] == 'ui_theme' for m in milestones):
             milestones.append({
                'date': frame['date'],
                'type': 'ui_theme',
                'title': 'UI Theme Styling',
                'description': 'Introduction of dark mode and semantic variables'
            })

        # 4. Tech Debt Phase
        # Trigger: > 5 tech debt commits in window
        if frame.get('techDebtCommits', 0) > 5 and not any(m['type'] == 'tech_debt' for m in milestones):
             milestones.append({
                'date': frame['date'],
                'type': 'tech_debt',
                'title': 'Tech Debt Paydown',
                'description': 'Team shifts focus to compliance and reducing technical debt'
            })

        # 5. Code Quality & Testing
        # Trigger: eslint/vitest config or tests/ folder
        has_quality = any(k in file_info and file_info[k]['created'] and frame['date'] >= file_info[k]['created']
                         for k in ['eslint.config.mjs', 'vitest.config.mjs'])
        has_tests = any(f.startswith('tests/') and file_info[f]['created'] and frame['date'] >= file_info[f]['created'] for f in file_info.keys())
        
        if (has_quality or has_tests) and not any(m['type'] == 'code_quality' for m in milestones):
             milestones.append({
                'date': frame['date'],
                'type': 'code_quality',
                'title': 'Code Quality Gates',
                'description': 'Introduction of linting and automated test suites'
            })

        # Existing Milestones
        # Service Layer
        service_files = [f for f in frame['files'] if f['category'] == 'service']
        if service_files and not any(m['type'] == 'service_layer' for m in milestones):
            milestones.append({
                'date': frame['date'],
                'type': 'service_layer',
                'title': 'Service Layer Emerges',
                'description': 'Architecture shift: business logic moves to dedicated services'
            })
        
        # Components
        component_files = [f for f in frame['files'] if f['category'] == 'component']
        if len(component_files) >= 5 and not any(m['type'] == 'components' for m in milestones):
            milestones.append({
                'date': frame['date'],
                'type': 'components',
                'title': 'Component Architecture',
                'description': 'Modular views take shape with reusable components'
            })
        
        # AI Integration
        ai_files = [f for f in frame['files'] if f['category'] == 'ai']
        if ai_files and not any(m['type'] == 'ai' for m in milestones):
            milestones.append({
                'date': frame['date'],
                'type': 'ai',
                'title': 'AI Integration',
                'description': 'Intelligent features enter the codebase'
            })
    
    return milestones


def main():
    frames, deleted_files, file_info = generate_race_frames()
    
    print("\n🏆 Detecting milestones...")
    milestones = detect_milestones(frames, file_info)
    print(f"   Found {len(milestones)} milestones")
    
    # Build final output
    output = {
        'generatedAt': datetime.now().isoformat(),
        'config': {
            'topN': TOP_N_FILES,
            'totalFrames': len(frames)
        },
        'summary': {
            'dateRange': {
                'start': frames[0]['date'] if frames else None,
                'end': frames[-1]['date'] if frames else None
            },
            'totalFilesTracked': len(file_info),
            'deletedFiles': len(deleted_files)
        },
        'categories': {cat: {'color': color} for cat, (color, _) in FILE_CATEGORIES.items()},
        'frames': frames,
        'milestones': milestones,
        'graveyard': sorted(deleted_files, key=lambda x: x.get('deleted', '9999'))
    }
    
    print(f"\n💾 Saving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)
    
    print("\n✅ Done! Bar chart race data ready.")
    print(f"   Frames: {len(frames)}")
    print(f"   Deleted files in graveyard: {len(deleted_files)}")
    print(f"   Output: {OUTPUT_FILE.relative_to(REPO_PATH)}")


if __name__ == "__main__":
    main()
