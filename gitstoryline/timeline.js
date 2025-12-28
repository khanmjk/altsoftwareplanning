/**
 * GitStoryline - Timeline Visualization
 * =====================================
 * Interactive visualization of codebase evolution using D3.js
 */

// Global state
const state = {
  data: null,
  currentView: 'timeline',
  selectedCommit: null,
  selectedPhase: null,
  isPlaying: false,
  animationSpeed: 'commit',
  currentTimelineIndex: 0,
  filteredTypes: new Set(['feature', 'fix', 'refactor', 'other', 'docs', 'test', 'merge']),
  theme: 'light',
};

// Initialization
document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupThemeToggle();
  setupViewNavigation();
  setupNarrativeOverlay();
  await loadData();
  hideLoading();
}

// Data Loading
async function loadData() {
  try {
    const [timelineRes, raceRes] = await Promise.all([
        fetch('timeline_data.json'),
        fetch('race_data.json')
    ]);

    const timelineData = await timelineRes.json();
    const raceData = await raceRes.json();
    
    // Merge Race Data (Frames) into State
    state.data = {
        ...timelineData,
        frames: raceData.frames
    };

    // Construct Deleted Files List from Frames
    const deletedFilesMap = new Map();
    if (state.data.frames) {
        state.data.frames.forEach(frame => {
            if (frame.files) {
                frame.files.forEach(f => {
                    if (f.status === 'deleted') {
                        deletedFilesMap.set(f.file, {
                            file: f.file,
                            deleted: frame.date,
                            created: 'Unknown', // Could derive if we scanned creation events
                            category: f.category
                        });
                    }
                });
            }
        });
    }
    state.data.deletedFiles = Array.from(deletedFilesMap.values());

    console.log('Data loaded:', state.data);

    processData(); // Process lanes
    renderStats();
    renderPhases();
    renderCurrentView();
    populateFileSelect();
    
    setupTimelineControls();
    setupTreeControls();
  } catch (error) {
    console.error('Failed to load data:', error);
    document.getElementById('loadingOverlay').innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load repository data</p>
            </div>
        `;
  }
}

function processData() {
    state.data.commits.forEach(commit => {
        commit.lane = assignLane(commit);
    });
}

function assignLane(commit) {
    // If we have file details, use them to vote
    if (commit.files && commit.files.length > 0) {
        const votes = {
            'Features & UI': 0,
            'Architecture & Services': 0,
            'AI Intelligence': 0,
            'Quality & Infra': 0,
            'Other': 0
        };

        commit.files.forEach(f => {
            const path = f.file.toLowerCase();
            if (path.includes('js/components') || path.includes('css/') || path.endsWith('.html')) {
                votes['Features & UI']++;
            } else if (path.includes('js/services') || path.includes('js/managers')) {
                votes['Architecture & Services']++;
            } else if (path.includes('ai/') || path.includes('js/ai')) {
                votes['AI Intelligence']++;
            } else if (path.includes('tests/') || path.includes('docs/') || path.includes('config') || path.includes('readme')) {
                votes['Quality & Infra']++;
            } else {
                votes['Other']++;
            }
        });

        // Return winner
        return Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
    }
    
    // Fallback based on message or type if no files
    const msg = commit.message.toLowerCase();
    if (msg.includes('ai ') || msg.includes('agent')) return 'AI Intelligence';
    if (msg.includes('service') || msg.includes('manager')) return 'Architecture & Services';
    if (msg.includes('test') || msg.includes('doc')) return 'Quality & Infra';
    if (commit.type === 'feature' || commit.type === 'style') return 'Features & UI';
    
    return 'Other';
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.classList.add('hidden');
  setTimeout(() => (overlay.style.display = 'none'), 400);
}

// Theme Toggle
function setupThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  const icon = toggle.querySelector('i');

  // Check for saved preference or system preference
  const savedTheme = localStorage.getItem('gitstoryline-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  state.theme = savedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme();

  toggle.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('gitstoryline-theme', state.theme);
    applyTheme();
  });

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    icon.className = state.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

// View Navigation
function setupViewNavigation() {
  const pills = document.querySelectorAll('.viz-pill');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const view = pill.dataset.view;
      switchView(view);
    });
  });
}

function switchView(view) {
  state.currentView = view;

  // Update pills
  document.querySelectorAll('.viz-pill').forEach((p) => {
    p.classList.toggle('active', p.dataset.view === view);
  });

  // Update views
  document.querySelectorAll('.viz-view').forEach((v) => {
    v.classList.toggle('active', v.id === view + 'View');
  });

  // Layout Management per View
  const mainContent = document.querySelector('.main-content');
  const detailsPanel = document.getElementById('detailsPanel');
  
  if (view === 'tree') {
      mainContent.style.gridTemplateColumns = '280px 1fr 0px';
      detailsPanel.style.display = 'none';
  } else {
      mainContent.style.gridTemplateColumns = '280px 1fr 300px';
      detailsPanel.style.display = 'block';
  }

  // Trigger resize for charts
  setTimeout(() => renderCurrentView(), 50);
}

function renderCurrentView() {
  if (!state.data) return;

  switch (state.currentView) {
    case 'timeline':
      renderTimeline();
      break;
    case 'tree':
      renderFileTree();
      break;
    case 'heatmap':
      renderHeatmap();
      break;
    case 'evolution':
      renderEvolution();
      break;
  }
}

// Stats Bar
function renderStats() {
  const { summary } = state.data;

  document.getElementById('statCommits').textContent = summary.totalCommits.toLocaleString();
  document.getElementById('statMonths').textContent = state.data.monthlyStats.length;
  document.getElementById('statLinesAdded').textContent = formatNumber(summary.totalLinesAdded);
  document.getElementById('statFiles').textContent = summary.totalFilesCreated;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Phases Panel
function renderPhases() {
  const container = document.getElementById('phaseTimeline');
  container.innerHTML = '';

  state.data.architecturePhases.forEach((phase, index) => {
    const item = document.createElement('div');
    item.className = 'phase-item';
    item.dataset.index = index;

    const date = phase.startDate
      ? new Date(phase.startDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        })
      : '';

    item.innerHTML = `
            <div class="phase-title">${phase.title}</div>
            <div class="phase-subtitle">${phase.subtitle}</div>
            <div class="phase-date">${date}</div>
        `;

    item.addEventListener('click', () => showPhaseNarrative(index));
    container.appendChild(item);
  });
}

// Narrative Overlay
function setupNarrativeOverlay() {
  const overlay = document.getElementById('narrativeOverlay');
  const closeBtn = document.getElementById('narrativeClose');

  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });
}

function showPhaseNarrative(index) {
  const phase = state.data.architecturePhases[index];
  const overlay = document.getElementById('narrativeOverlay');

  document.getElementById('narrativePhase').textContent = `Chapter ${phase.phase}`;
  document.getElementById('narrativeTitle').textContent = phase.title;
  document.getElementById('narrativeSubtitle').textContent = phase.subtitle;
  document.getElementById('narrativeText').textContent = phase.description;

  // Calculate stats for this phase
  const startDate = new Date(phase.startDate);
  const nextPhase = state.data.architecturePhases[index + 1];
  const endDate = nextPhase ? new Date(nextPhase.startDate) : new Date();

  const phaseCommits = state.data.commits.filter((c) => {
    const d = new Date(c.date);
    return d >= startDate && d < endDate;
  });

  const statsContainer = document.getElementById('narrativeStats');
  statsContainer.innerHTML = `
        <div class="narrative-stat">
            <div class="narrative-stat-value">${phaseCommits.length}</div>
            <div class="narrative-stat-label">Commits</div>
        </div>
        <div class="narrative-stat">
            <div class="narrative-stat-value">${formatNumber(phaseCommits.reduce((sum, c) => sum + (c.insertions || 0), 0))}</div>
            <div class="narrative-stat-label">Lines Added</div>
        </div>
        <div class="narrative-stat">
            <div class="narrative-stat-value">${new Set(phaseCommits.flatMap((c) => c.files?.map((f) => f.file) || [])).size}</div>
            <div class="narrative-stat-label">Files Changed</div>
        </div>
    `;

  // Highlight phase in sidebar
  document.querySelectorAll('.phase-item').forEach((p, i) => {
    p.classList.toggle('active', i === index);
  });

  overlay.classList.add('active');
}

// Timeline Visualization
function setupTimelineControls() {
  const playBtn = document.getElementById('playPauseBtn');
  const speedSelect = document.getElementById('speedSelect');
  const slider = document.getElementById('timelineSlider');
  const filterCheckboxes = document.querySelectorAll('.type-filter');

  playBtn.addEventListener('click', togglePlayPause);
  speedSelect.addEventListener('change', (e) => {
    state.animationSpeed = e.target.value;
  });

  slider.max = state.data.commits.length - 1;
  slider.value = slider.max;
  slider.addEventListener('input', (e) => {
    state.currentTimelineIndex = parseInt(e.target.value);
    renderTimeline();
  });

  filterCheckboxes.forEach((cb) => {
    cb.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.filteredTypes.add(e.target.value);
      } else {
        state.filteredTypes.delete(e.target.value);
      }
      renderTimeline();
    });
  });
}

function togglePlayPause() {
  state.isPlaying = !state.isPlaying;
  const btn = document.getElementById('playPauseBtn');
  btn.innerHTML = state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

  if (state.isPlaying) {
    animateTimeline();
  }
}

function animateTimeline() {
  if (!state.isPlaying) return;

  const slider = document.getElementById('timelineSlider');
  const maxIndex = state.data.commits.length - 1;

  if (state.currentTimelineIndex < maxIndex) {
    state.currentTimelineIndex++;
    slider.value = state.currentTimelineIndex;
    renderTimeline();

    // Determine delay based on speed mode
    let delay = 50;
    if (state.animationSpeed === 'realtime') {
      // Proportional to actual time between commits
      const current = new Date(state.data.commits[maxIndex - state.currentTimelineIndex].date);
      const next = state.data.commits[maxIndex - state.currentTimelineIndex - 1];
      if (next) {
        const diff = new Date(next.date) - current;
        delay = Math.min(Math.max((diff / 86400000) * 100, 30), 1000); // Scale days to ms
      }
    } else if (state.animationSpeed === 'milestone') {
      const commit = state.data.commits[maxIndex - state.currentTimelineIndex];
      if (commit.type === 'feature' || commit.message.toLowerCase().includes('major')) {
        delay = 500;
      }
    }

    setTimeout(animateTimeline, delay);
  } else {
    state.isPlaying = false;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
  }
}

function renderTimeline() {
  const container = document.getElementById('timelineCanvas');
  const commits = state.data.commits.slice().reverse(); // Chronological order

  // Filter by types
  const filteredCommits = commits.filter((c) => state.filteredTypes.has(c.type));
  const visibleCommits = filteredCommits.slice(0, state.currentTimelineIndex + 1);

  // Clear and set up SVG
  container.innerHTML = '';
  const width = container.clientWidth;
  const height = container.clientHeight || 500;
  const margin = { top: 90, right: 40, bottom: 40, left: 160 }; // Reduced top margin, using concise header

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

  // Time scale
  const timeExtent = d3.extent(filteredCommits, (d) => new Date(d.date));
  const xScale = d3
    .scaleTime()
    .domain(timeExtent)
    .range([margin.left, width - margin.right]);

  // Lane Scale
  const lanes = ['Features & UI', 'Architecture & Services', 'AI Intelligence', 'Quality & Infra', 'Other'];
  const yScale = d3.scalePoint()
    .domain(lanes)
    .range([margin.top, height - margin.bottom])
    .padding(0.5);

  // Size scale for dots
  const maxFiles = d3.max(filteredCommits, (d) => d.filesChanged || 1);
  const rScale = d3.scaleSqrt().domain([0, maxFiles]).range([3, 10]);

  // Color scale for Lanes (not types anymore, or maybe types within lanes?)
  // Let's use lane colors to reinforce the grouping
  const laneColors = d3.scaleOrdinal()
    .domain(lanes)
    .range(['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#64748b']);

  // Draw Lane Tracks
  svg.selectAll('.lane-track')
    .data(lanes)
    .enter()
    .append('rect')
    .attr('class', 'lane-track')
    .attr('x', margin.left)
    .attr('y', d => yScale(d) - 25)
    .attr('width', width - margin.left - margin.right)
    .attr('height', 50)
    .attr('fill', (d, i) => i % 2 === 0 ? 'var(--bg-secondary)' : 'transparent')
    .attr('opacity', 0.5)
    .attr('rx', 4);

  // Draw Lane Labels
  svg.selectAll('.lane-label')
    .data(lanes)
    .enter()
    .append('text')
    .attr('class', 'lane-label')
    .attr('x', margin.left - 10)
    .attr('y', d => yScale(d))
    .attr('dy', 5)
    .attr('text-anchor', 'end')
    .text(d => d)
    .style('font-size', '12px')
    .style('font-weight', '500')
    .style('fill', d => laneColors(d));

  // --- ROADMAP HEADER STYLE ---
  
  const phases = state.data.architecturePhases.slice().sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
  const headerY = margin.top - 20; // The horizontal line position

  // 1. Horizontal Header Line
  svg.append('line')
    .attr('x1', margin.left)
    .attr('x2', width - margin.right)
    .attr('y1', headerY)
    .attr('y2', headerY)
    .attr('stroke', 'var(--border-color)')
    .attr('stroke-width', 2)
    .attr('opacity', 0.5);

  // 2. Vertical Phase Markers (Dashed lines down through the chart)
  svg.selectAll('.phase-marker-line')
    .data(phases)
    .enter()
    .append('line')
    .attr('class', 'phase-marker-line')
    .attr('x1', d => xScale(new Date(d.startDate)))
    .attr('x2', d => xScale(new Date(d.startDate)))
    .attr('y1', headerY)
    .attr('y2', height - margin.bottom + 20)
    .attr('stroke', 'var(--border-color)')
    .attr('stroke-dasharray', '3,3')
    .attr('opacity', 0.3);

  // 3. Milestone Dots on Header Line
  svg.selectAll('.phase-dot')
    .data(phases)
    .enter()
    .append('circle')
    .attr('cx', d => xScale(new Date(d.startDate)))
    .attr('cy', headerY)
    .attr('r', 4)
    .attr('fill', 'var(--bg-primary)')
    .attr('stroke', 'var(--accent-primary)')
    .attr('stroke-width', 2);

  // 4. Milestone Labels with Collision Detection (Slotting)
  const labelGroup = svg.append('g').attr('class', 'phase-labels');
  
  // Levels for staggering (distance from header line)
  const levels = [20, 45, 70, 95]; 
  const occupiedSpace = [0, 0, 0, 0]; // Track the right-most X pixel for each level
  const minSpacing = 10; // Minimum pixels between labels

  phases.forEach((d) => {
      const x = xScale(new Date(d.startDate));
      
      // Estimate text width (approx 6px per char for upper-case 10px font)
      const textWidth = d.title.length * 6; 
      const halfWidth = textWidth / 2;
      const startX = x - halfWidth;
      const endX = x + halfWidth;

      // Find the first level where this label fits
      let assignedLevel = 0;
      for (let i = 0; i < levels.length; i++) {
          if (startX > occupiedSpace[i] + minSpacing) {
              assignedLevel = i;
              break;
          }
           // If we're at the last level and it still doesn't fit, just use the last level (or modulo it)
           if (i === levels.length - 1) {
               assignedLevel = 3; // Cap at max level
           }
      }

      // Update occupied space for this level
      occupiedSpace[assignedLevel] = endX;

      const levelHeight = levels[assignedLevel];
      const labelY = headerY - levelHeight;

      // Connector Line
      labelGroup.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', headerY - 4)
        .attr('y2', labelY + 8) // Touch bottom of text
        .attr('stroke', 'var(--text-muted)')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6);

      // Label Text
      labelGroup.append('text')
        .attr('x', x)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .text(d.title)
        .style('font-size', '10px')
        .style('font-weight', '600')
        .style('fill', 'var(--text-secondary)')
        .style('text-transform', 'uppercase')
        .style('letter-spacing', '0.5px')
        // Add white glow for better readability over lines
        .style('text-shadow', '0 1px 3px var(--bg-primary), 0 -1px 3px var(--bg-primary), 1px 0 3px var(--bg-primary), -1px 0 3px var(--bg-primary)');
  });

  // Draw timeline axis
  const xAxis = d3
    .axisBottom(xScale)
    .ticks(d3.timeMonth.every(1))
    .tickFormat(d3.timeFormat('%b %Y'));

  svg
    .append('g')
    .attr('class', 'timeline-axis')
    .attr('transform', `translate(0, ${height - margin.bottom + 10})`)
    .call(xAxis)
    .selectAll('text')
    .style('fill', 'var(--text-secondary)')
    .style('font-size', '10px');

  svg.selectAll('.timeline-axis path, .timeline-axis line').style('stroke', 'var(--border-color)');

  // Reduced Jitter to keep lanes cleaner
  const getYLane = (d, i) => {
      const base = yScale(d.lane);
      // Reduce jitter spread from 30 to 20
      const jitter = (parseInt(d.hash.slice(-4), 16) % 20) - 10;
      return base + jitter;
  };

  // Draw commit dots - Smaller and more transparent
  const dots = svg
    .selectAll('.timeline-dot')
    .data(visibleCommits)
    .enter()
    .append('circle')
    .attr('class', 'timeline-dot')
    .attr('cx', (d) => xScale(new Date(d.date)))
    .attr('cy', (d, i) => getYLane(d, i))
    .attr('r', (d) => Math.max(3, (d.filesChanged || 1) / 3)) // Reduce size scaling
    .attr('fill', (d) => laneColors(d.lane))
    .attr('opacity', 0.6) // More transparent

    .style('cursor', 'pointer')
    .on('mouseover', function (event, d) {
      d3.select(this)
        .attr('opacity', 1)
        .attr('r', rScale(d.filesChanged || 1) * 1.5)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
      showCommitDetails(d);
    })
    .on('mouseout', function (event, d) {
      d3.select(this)
        .attr('opacity', 0.7)
        .attr('r', rScale(d.filesChanged || 1))
        .attr('stroke', 'none');
    })
    .on('click', function (event, d) {
      state.selectedCommit = d;
      showCommitDetails(d);
      svg.selectAll('.timeline-dot').classed('selected', false);
      d3.select(this).classed('selected', true);
    });

  // Animate new dots
  dots
    .filter((d, i) => i >= visibleCommits.length - 10)
    .attr('r', 0)
    .transition()
    .duration(300)
    .attr('r', (d) => rScale(d.filesChanged || 1));
}

function showCommitDetails(commit) {
  const container = document.getElementById('detailsContent');

  const filesHtml =
    commit.files && commit.files.length > 0
      ? `
            <div class="files-list">
                <h4>Files Changed (${commit.filesChanged})</h4>
                ${commit.files
                  .slice(0, 10)
                  .map(
                    (f) => `
                    <div class="file-item">
                        <span class="file-path">${f.file}</span>
                        <span class="file-changes">
                            <span class="file-additions">+${f.insertions}</span>
                            <span class="file-deletions">-${f.deletions}</span>
                        </span>
                    </div>
                `
                  )
                  .join('')}
                ${commit.files.length > 10 ? `<div class="file-item" style="color: var(--text-muted)">...and ${commit.files.length - 10} more</div>` : ''}
            </div>
        `
      : '';

  container.innerHTML = `
        <div class="commit-detail">
            <div class="commit-hash">${commit.hash.substring(0, 8)}</div>
            <span class="commit-type-badge ${commit.type}">${commit.type}</span>
            <div class="commit-message">${commit.message}</div>
            <div class="commit-meta">
                <span><i class="fas fa-user"></i> ${commit.author}</span>
                <span><i class="fas fa-calendar"></i> ${new Date(commit.date).toLocaleDateString()}</span>
            </div>
            <div class="commit-meta" style="margin-top: 8px;">
                <span><i class="fas fa-plus" style="color: var(--color-feature)"></i> ${commit.insertions || 0}</span>
                <span><i class="fas fa-minus" style="color: #ef4444"></i> ${commit.deletions || 0}</span>
            </div>
            ${filesHtml}
        </div>
    `;
}

// File Tree Visualization
function renderFileTree(customTreeData = null, newPaths = []) {
  const container = document.getElementById('treeCanvas');
  const layoutMode = state.currentLayout || 'tree'; // 'tree' or 'galaxy'

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 500;

  // Use custom data for animation, or default to full tree
  const rawData = customTreeData || state.data.fileTree;
  
  // Convert flat tree to hierarchy
  const treeData = convertToHierarchy(rawData);

  // Calculate required size based on content
  const root = d3.hierarchy(treeData);
  const leaves = root.leaves();

  // Setup SVG once
  let svg = d3.select(container).select('svg');
  if (svg.empty()) {
      svg = d3.select(container).append('svg')
        .attr('width', '100%');
      svg.append('g').attr('class', 'tree-content');
  }

  const g = svg.select('.tree-content');
  let treeLayout, linkGen;

  if (layoutMode === 'galaxy') {
      // --- GALAXY (RADIAL) LAYOUT ---
      const radius = Math.min(width, height) / 2 - 40; // Fit to screen with padding
      
      // Update Dimensions (Fit Screen)
      svg.attr('width', width).attr('height', height);
      g.attr('transform', `translate(${width/2}, ${height/2})`); // Center it

      treeLayout = d3.cluster().size([2 * Math.PI, radius]);
      
      // Radial Link Generator
      linkGen = d3.linkRadial()
          .angle(d => d.x)
          .radius(d => d.y);

  } else {
      // --- CLASSIC TREE LAYOUT ---
      // High Density Settings
      const nodeHeight = 14; 
      const minHeight = container.clientHeight || 500;
      const dynamicHeight = Math.max(minHeight, leaves.length * nodeHeight + 40);

      // Update Dimensions (Scrollable)
      svg.attr('width', Math.max(width, 800))
         .attr('height', dynamicHeight);
      g.attr('transform', 'translate(40, 20)');

      treeLayout = d3.tree().size([dynamicHeight - 40, width - 200]);
      
      // Horizontal Link Generator
      linkGen = d3.linkHorizontal().x(d => d.y).y(d => d.x);
  }

  // Compute layout
  treeLayout(root);

  // --- Links ---
  // Use key function for object constancy
  const linkKey = (d) => `${d.source.data.path}->${d.target.data.path}`;

  const links = g.selectAll('.tree-link')
    .data(root.links(), linkKey);

  // Enter
  links.enter()
    .append('path')
    .attr('class', 'tree-link')
    .attr('fill', 'none')
    .attr('stroke', 'var(--border-color)')
    .attr('stroke-width', 1.0)
    .attr('opacity', 0) 
    .attr('d', d => {
        // Initial state for transition
        if (layoutMode === 'galaxy') {
             return linkGen({source: d.source, target: d.source}); // Collapse to source
        } else {
             const o = {x: d.source.x, y: d.source.y};
             return linkGen({source: o, target: o});
        }
    })
    .transition().duration(400)
    .attr('opacity', 0.6)
    .attr('d', linkGen);

  // Update
  links.transition().duration(400)
    .attr('opacity', 0.6)
    .attr('d', linkGen);
    
  // Exit
  links.exit().remove();

  // --- Nodes ---
  const nodeKey = (d) => d.data.path || d.data.name;
  const nodes = g.selectAll('.tree-node')
    .data(root.descendants(), nodeKey);

  // Enter
  const nodeEnter = nodes.enter()
    .append('g')
    .attr('class', 'tree-node')
    .attr('transform', d => {
        // Start position
        if (layoutMode === 'galaxy') {
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`;
        } else {
             return `translate(${d.parent ? d.parent.y : d.y}, ${d.parent ? d.parent.x : d.x})`;
        }
    })
    .attr('opacity', 0)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
        if (!state.isTreeAnimating) {
            showFileNodeDetails(d);
        }
    });

  // Flash Effect Circle
  nodeEnter.append('circle')
    .attr('r', 8) 
    .attr('fill', '#ffffff') 
    .attr('stroke', 'var(--accent-primary)')
    .attr('stroke-width', 2)
    .transition().duration(800)
    .attr('r', d => (d.children ? 4 : 2.5))
    .attr('fill', d => (d.children ? 'var(--accent-primary)' : 'var(--color-feature)'))
    .attr('stroke', 'var(--bg-primary)')
    .attr('stroke-width', 1);

  // Label
  const label = nodeEnter.append('text')
    .attr('opacity', 0)
    .style('font-size', '9px') 
    .style('font-family', 'JetBrains Mono, monospace')
    .style('fill', 'var(--text-primary)')
    .text((d) => d.data.name);

  // Label Positioning
  if (layoutMode === 'galaxy') {
      label
        .attr("dy", "0.31em")
        .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
        .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
        .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null);
  } else {
      label
        .attr('x', (d) => (d.children ? -8 : 8))
        .attr('dy', 3)
        .attr('text-anchor', (d) => (d.children ? 'end' : 'start'));
  }
    
  label.transition().duration(500).delay(200)
    .attr('opacity', 1);

  // Merge Enter + Update
  const nodeUpdate = nodeEnter.merge(nodes);

  nodeUpdate.transition().duration(400)
    .attr('transform', d => {
        if (layoutMode === 'galaxy') {
            return `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`;
        } else {
            return `translate(${d.y}, ${d.x})`;
        }
    })
    .attr('opacity', 1);
    
  // Exit
  nodes.exit().transition().duration(200)
    .attr('opacity', 0)
    .remove();
    
  // Return the new nodes (enter selection) so the animator can calculate scroll positions
  return nodeEnter;
}

function showFileNodeDetails(node) {
    const container = document.getElementById('detailsContent');
    const isDir = !!node.children;
    const path = node.data.path;
    const name = node.data.name;
    
    let createdDate = 'Unknown';
    if (state.data.fileCreationTimeline) {
        const event = state.data.fileCreationTimeline.find(e => e.file === path || e.file.endsWith('/'+name));
        if (event) {
            createdDate = new Date(event.date).toLocaleDateString();
        }
    }

    container.innerHTML = `
        <div class="commit-detail">
            <h3><i class="fas ${isDir ? 'fa-folder' : 'fa-file-code'}"></i> ${name}</h3>
            <div class="commit-meta" style="margin-bottom: 1rem;">
                <span>${path}</span>
            </div>
             <div class="commit-meta">
                <span><i class="fas fa-calendar-plus"></i> Created: ${createdDate}</span>
                ${isDir ? `<span><i class="fas fa-layer-group"></i> Items: ${node.children.length}</span>` : ''}
            </div>
             ${! isDir ? `<div style="margin-top: 1rem; color: var(--text-muted); font-size: 0.8rem;">
                Click "File Evolution" tab to see history for this file.
            </div>` : ''}
        </div>
    `;
}

// Tree Animation Controls
function setupTreeControls() {
    const playBtn = document.getElementById('treePlayBtn');
    const dateLabel = document.getElementById('treeCurrentDate');
    const layoutSelect = document.getElementById('treeLayoutSelect');
    
    // Initialize Layout state
    if (!state.currentLayout) state.currentLayout = 'tree';

    if (layoutSelect) {
        layoutSelect.value = state.currentLayout;
        layoutSelect.addEventListener('change', (e) => {
            state.currentLayout = e.target.value;
            // Clear canvas to ensure clean switch
            document.getElementById('treeCanvas').querySelector('svg')?.remove();
            renderFileTree();
        });
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (state.isTreeAnimating) {
                // Stop
                state.isTreeAnimating = false;
                playBtn.innerHTML = '<i class="fas fa-play"></i> Animate Growth';
            } else {
                // Start
                state.isTreeAnimating = true;
                playBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
                animateTreeGrowth(dateLabel);
            }
        });
    }
}

function animateTreeGrowth(dateDisplay) {
    if (!state.data.fileCreationTimeline) {
        console.error("No file creation timeline found");
        return;
    }

    const timeline = state.data.fileCreationTimeline.filter(e => e.type === 'file_created');
    if (timeline.length === 0) return;

    // Sort chronological first!
    timeline.sort((a,b) => new Date(a.date) - new Date(b.date));

    // Event-Paced State
    const activeFiles = new Set();
    let currentIndex = 0;
    let frameCount = 0;
    const framesPerEvent = 4; // Pace
    
    // Initial Render (empty)
    const tree = buildTreeFromFiles([]);
    renderFileTree(tree);
    
    // Smooth Scroll State
    const container = document.getElementById('treeCanvas');
    let targetScroll = 0;
    let currentScroll = container.scrollTop;
    
    // Hide scrollbars during animation to prevent flashing
    container.classList.add('no-scrollbar');

    const step = () => {
        if (!state.isTreeAnimating || currentIndex >= timeline.length) {
            state.isTreeAnimating = false;
            document.getElementById('treePlayBtn').innerHTML = '<i class="fas fa-play"></i> Animate Growth';
            
            // Restore Layout on finish
            setTimeout(() => {
                 document.querySelector('.main-content').style.gridTemplateColumns = '280px 1fr 300px';
                 document.getElementById('detailsPanel').style.display = 'block';
                 container.classList.remove('no-scrollbar'); // Restore scrollbars
                 renderFileTree(); 
            }, 1000);
            return;
        }

        frameCount++;
        if (frameCount % framesPerEvent === 0) {
            // Process Next Event
            const event = timeline[currentIndex];
            currentIndex++;
            
            const currentDate = new Date(event.date);
            dateDisplay.textContent = currentDate.toLocaleDateString();

            if (!activeFiles.has(event.file)) {
                activeFiles.add(event.file);
                const tree = buildTreeFromFiles(Array.from(activeFiles));
                const newNodes = renderFileTree(tree); // Returns enter selection
                
                // Calculate Target Scroll (Center of action)
                if (newNodes && !newNodes.empty()) {
                     const avgX = d3.mean(newNodes.data(), d => d.x);
                     if (avgX !== undefined) {
                         // Target is new node position minus half viewport height
                         targetScroll = Math.max(0, avgX - (container.clientHeight / 2));
                     }
                }
            }
        }
        
        // Smooth Camera Update (Lerp)
        // Move 10% towards target every frame
        if (Math.abs(targetScroll - currentScroll) > 1) {
            currentScroll += (targetScroll - currentScroll) * 0.1;
            container.scrollTo(0, currentScroll);
        }

        requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}

function buildTreeFromFiles(files) {
    const tree = {};
    for (const path of files) {
        const parts = path.split('/');
        let current = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                // File
                if (!current['_files']) current['_files'] = [];
                current['_files'].push(part);
            } else {
                // Directory
                if (!current[part]) current[part] = {};
                current = current[part];
            }
        }
    }
    return tree;
}

// Helper to recursive convert to d3 hierarchy
function convertToHierarchy(tree, name = 'root', parentPath = '') {
  const children = [];
  const currentPath = parentPath ? `${parentPath}/${name}` : name;

  for (const [key, value] of Object.entries(tree)) {
    if (key === '_files') {
      value.forEach((file) => {
        children.push({ name: file, path: `${currentPath}/${file}` });
      });
    } else {
      children.push(convertToHierarchy(value, key, currentPath));
    }
  }

  // Limit depth and breadth for performance
  // const limitedChildren = children.slice(0, 20);

  return { name, path: currentPath, children: children.length > 0 ? children : undefined };
}

// AI Release Data
// AI Release Data
const AI_MILESTONES = [
    // Historical (Reference)
    { date: '2021-08-31', label: 'OpenAI Codex', provider: 'openai' },
    { date: '2022-11-30', label: 'ChatGPT (GPT-3.5)', provider: 'openai' },
    { date: '2023-03-14', label: 'GPT-4 & Claude 1', provider: 'mixed' },
    
    // Active Range (Reference)
    { date: '2024-05-13', label: 'GPT-4o', provider: 'openai' },
    { date: '2024-06-20', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { date: '2024-09-12', label: 'OpenAI o1', provider: 'openai' },
    { date: '2024-10-22', label: 'Claude 3.5 Haiku', provider: 'anthropic' },
    { date: '2024-12-11', label: 'Gemini 2.0', provider: 'google' },
    
    // 2025 Releases
    { date: '2025-08-07', label: 'GPT-5', provider: 'openai' },
    { date: '2025-09-29', label: 'Claude 4.5 Sonnet', provider: 'anthropic' },
    { date: '2025-11-18', label: 'Gemini 3 & Antigravity', provider: 'google' },
    { date: '2025-11-24', label: 'Claude 4.5 Opus', provider: 'anthropic' }
];

// Activity Chart Visualization (Bar Chart)
function renderHeatmap() {
  const container = document.getElementById('heatmapCanvas');
  container.innerHTML = '';

  const width = container.clientWidth || 800;
  const height = container.clientHeight || 400;
  const margin = { top: 60, right: 30, bottom: 40, left: 60 }; // Increased top margin for labels

  const svg = d3.select(container).append('svg')
      .attr('width', width)
      .attr('height', height);

  // Parse Data
  const parseDate = d3.timeParse("%Y-%m");
  const data = state.data.monthlyStats.map(d => ({
      date: parseDate(d.month),
      commits: d.commits,
      monthStr: d.month
  }));

  const maxCommits = d3.max(data, d => d.commits) || 10;
  
  // Calculate X Domain to include milestones if needed, or just data range
  // Let's stick to data range but ensure we can map milestones to it
  const xDomain = data.map(d => d.date);
  
  // Scales
  const x = d3.scaleBand()
      .range([margin.left, width - margin.right])
      .domain(xDomain)
      .padding(0.3);

  // Time Scale for positioning milestones accurately between bands
  const xTime = d3.scaleTime()
      .range([margin.left + x.bandwidth()/2, width - margin.right - x.bandwidth()/2])
      .domain([d3.min(data, d => d.date), d3.max(data, d => d.date)]);

  const y = d3.scaleLinear()
      .domain([0, maxCommits])
      .range([height - margin.bottom, margin.top]);

  // Grid Lines (Y-axis)
  svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y)
          .tickSize(-(width - margin.left - margin.right))
          .tickFormat("")
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.1);

  // X Axis
  svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x)
          .tickFormat(d3.timeFormat("%b %y"))
      )
      .selectAll("text")
      .style("text-anchor", "middle")
      .style("font-family", "Inter, sans-serif")
      .style("font-size", "11px")
      .style("fill", "var(--text-secondary)");

  // Y Axis (Labels)
  svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .select(".domain").remove();

  // --- AI MILESTONES ---
  const milestoneColors = {
      'google': '#4285F4',
      'openai': '#10A37F',
      'anthropic': '#D97757',
      'mixed': '#888888'
  };

  const milestones = AI_MILESTONES.map(m => ({
      ...m,
      parsedDate: new Date(m.date)
  })).filter(m => m.parsedDate >= xTime.domain()[0] && m.parsedDate <= xTime.domain()[1]);

  const milestoneGroup = svg.append("g").attr("class", "milestones");

  milestoneGroup.selectAll(".milestone-line")
      .data(milestones)
      .enter()
      .append("line")
      .attr("class", "milestone-line")
      .attr("x1", d => xTime(d.parsedDate))
      .attr("x2", d => xTime(d.parsedDate))
      .attr("y1", margin.top - 20) // Extend up a bit
      .attr("y2", height - margin.bottom)
      .attr("stroke", d => milestoneColors[d.provider])
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .attr("opacity", 0.5);

  const labels = milestoneGroup.selectAll(".milestone-label")
      .data(milestones)
      .enter()
      .append("g")
      .attr("class", "milestone-label")
      .attr("transform", (d, i) => {
          const xPos = xTime(d.parsedDate);
          // Stagger Y position based on index to prevent overlap
          const level = i % 3; 
          const yPos = margin.top - 10 - (level * 18);
          return `translate(${xPos}, ${yPos})`;
      });

  labels.append("rect")
      .attr("x", -4) // Padding handled by width
      .attr("y", -10)
      .attr("rx", 4)
      .attr("height", 14)
      .attr("fill", d => milestoneColors[d.provider])
      .attr("opacity", 0.9);

  labels.append("text")
      .text(d => d.label)
      .attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-weight", "600")
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .each(function(d) {
          // Adjust rect width to fit text
          const bbox = this.getBBox();
          d3.select(this.parentNode).select("rect")
              .attr("x", bbox.x - 4)
              .attr("width", bbox.width + 8);
      });

  // --- BARS ---
  svg.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.date))
      .attr("width", x.bandwidth())
      .attr("fill", "var(--accent-primary)")
      .attr("rx", 4)
      // Initial State
      .attr("y", y(0))
      .attr("height", 0)
      .on("mouseover", function(event, d) {
          d3.select(this).style("filter", "brightness(1.2)");
          showMonthDetails(d);
      })
      .on("mouseout", function() {
          d3.select(this).style("filter", "none");
      })
      // Animate Growth
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .ease(d3.easeCubicOut)
      .attr("y", d => y(d.commits))
      .attr("height", d => y(0) - y(d.commits));

  // Value Labels
  svg.selectAll(".label")
      .data(data)
      .enter()
      .append("text")
      .attr("x", d => x(d.date) + x.bandwidth() / 2)
      .attr("y", y(0))
      .attr("text-anchor", "middle")
      .text(d => d.commits)
      .style("font-size", "10px")
      .style("fill", "var(--text-primary)")
      .style("opacity", 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 50 + 200)
      .attr("y", d => y(d.commits) - 5)
      .style("opacity", 0.8);
}

function showMonthDetails(month) {
  const container = document.getElementById('detailsContent');
  container.innerHTML = `
        <div class="commit-detail">
            <div class="commit-hash">${month.month}</div>
            <div class="commit-message">Monthly Activity</div>
            <div class="commit-meta" style="flex-direction: column; gap: 8px; margin-top: 12px;">
                <span><i class="fas fa-code-commit"></i> ${month.commits} commits</span>
                <span><i class="fas fa-plus" style="color: var(--color-feature)"></i> ${formatNumber(month.insertions)} lines added</span>
                <span><i class="fas fa-minus" style="color: #ef4444"></i> ${formatNumber(month.deletions)} lines deleted</span>
                <span><i class="fas fa-file"></i> ${month.filesChanged} files changed</span>
            </div>
        </div>
    `;
}

// File Evolution Visualization
function populateFileSelect() {
  const select = document.getElementById('fileSelect');
  select.innerHTML = '<option value="">Select a file...</option>'; // Reset

  // COALESCE ALL FILES FROM FRAMES TO ENSURE NOTHING IS MISSED
  const allFilesSet = new Set();
  
  if (state.data.frames) {
      state.data.frames.forEach(frame => {
          if (frame.files) {
              frame.files.forEach(f => allFilesSet.add(f.file));
          }
      });
  }

  // Also check fileEvolution keys
  if (state.data.fileEvolution) {
      Object.keys(state.data.fileEvolution).forEach(f => allFilesSet.add(f));
  }

  // Also check deletedFiles
  if (state.data.deletedFiles) {
      state.data.deletedFiles.forEach(f => allFilesSet.add(f.file));
  }

  // Convert to array
  const allFiles = Array.from(allFilesSet);

  const topChurnFiles = state.data.topChurnFiles || [];
  const deletedFilesList = state.data.deletedFiles || [];
  const deletedSet = new Set(deletedFilesList.map(f => f.file));

  // 1. Most Changed (Top Churn) - Filtered to Active Only
  const activeTopFiles = topChurnFiles.filter(f => !deletedSet.has(f.file) && allFilesSet.has(f.file));
  
  if (activeTopFiles.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = 'Most Active Files';
      activeTopFiles.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.file;
        option.textContent = `${item.file} (${item.commits} commits)`;
        optgroup.appendChild(option);
      });
      select.appendChild(optgroup);
  }

  // 2. All Active Files (Alphabetical)
  const optgroupActive = document.createElement('optgroup');
  optgroupActive.label = 'Active Files';
  const sortedFiles = allFiles.filter(f => !deletedSet.has(f)).sort();
  
  sortedFiles.forEach((file) => {
      const option = document.createElement('option');
      option.value = file;
      option.textContent = file;
      optgroupActive.appendChild(option);
  });
  select.appendChild(optgroupActive);

  // 3. Graveyard (Deleted Files)
  if (deletedFilesList.length > 0) {
      const optgroupDeleted = document.createElement('optgroup');
      optgroupDeleted.label = 'Graveyard (Deleted)';
      deletedFilesList.sort((a,b) => a.file.localeCompare(b.file)).forEach(item => {
          const option = document.createElement('option');
          option.value = item.file;
          option.textContent = `${item.file} (Deleted)`;
          optgroupDeleted.appendChild(option);
      });
      select.appendChild(optgroupDeleted);
  }

  select.addEventListener('change', (e) => {
    if (e.target.value) {
      renderEvolution(e.target.value);
    }
  });
}

function reconstructFileHistory(filePath) {
    if (!state.data.frames) return [];
    
    const history = [];
    state.data.frames.forEach(frame => {
        if (!frame.files) return;
        const fileData = frame.files.find(f => f.file === filePath);
        if (fileData) {
            history.push({
                date: frame.date,
                lines: fileData.lines
            });
        }
    });
    return history;
}

function renderEvolution(filePath) {
  const container = document.getElementById('evolutionCanvas');
  container.innerHTML = '';

  // Try pre-calculated history first, then reconstruct from frames if missing/empty
  let fileHistory = state.data.fileEvolution && state.data.fileEvolution[filePath];
  if (!fileHistory || fileHistory.length === 0) {
      fileHistory = reconstructFileHistory(filePath);
  }

  // Gather metadata for Fallback/Summary
  const deletedFile = state.data.deletedFiles ? state.data.deletedFiles.find(f => f.file === filePath) : null;
  const createdEvent = state.data.fileCreationTimeline ? state.data.fileCreationTimeline.find(e => e.file === filePath && e.type === 'file_created') : null;

  // If STILL no history (e.g. file never appeared in frames?), show summary
  if (!fileHistory || fileHistory.length === 0) {
    if (deletedFile || createdEvent) {
        // Show Lifecycle Summary
        const createdDate = createdEvent ? new Date(createdEvent.date).toLocaleDateString() : (deletedFile ? deletedFile.created : 'Unknown');
        const deletedDate = deletedFile ? deletedFile.deleted : 'N/A';
        
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas ${deletedFile ? 'fa-tombstone' : 'fa-file'} fa-3x" style="margin-bottom: 20px; color: var(--text-muted)"></i>
                <h3>${filePath}</h3>
                <p>No line-count history found in snapshots.</p>
                <div style="margin-top: 20px; text-align: left; display: inline-block;">
                    <div><strong>Created:</strong> ${createdDate}</div>
                    ${deletedFile ? `<div><strong>Deleted:</strong> ${deletedDate}</div>` : ''}
                    ${deletedFile ? `<div><strong>Status:</strong> <span style="color: #ef4444">Deleted</span></div>` : '<div><strong>Status:</strong> Active</div>'}
                </div>
            </div>
        `;
    } else {
        container.innerHTML = '<div class="empty-state"><p>No evolution data found for this file.</p></div>';
    }
    return;
  }

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 300;
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

  // Prepare data
  const data = fileHistory.map(d => ({
    date: new Date(d.date),
    lines: d.lines
  }));

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.lines)]).nice()
    .range([height - margin.bottom, margin.top]);

  // Area generator
  const area = d3.area()
    .x(d => x(d.date))
    .y0(y(0))
    .y1(d => y(d.lines))
    .curve(d3.curveMonotoneX); // Smooth curve

  // Add gradient
  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient')
    .attr('id', 'area-gradient')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '0%').attr('y2', '100%');
  
  gradient.append('stop').attr('offset', '0%').attr('stop-color', 'var(--accent-primary)').attr('stop-opacity', 0.6);
  gradient.append('stop').attr('offset', '100%').attr('stop-color', 'var(--accent-primary)').attr('stop-opacity', 0.1);

  // Draw area
  svg.append('path')
    .datum(data)
    .attr('fill', 'url(#area-gradient)')
    .attr('d', area);

  // Draw line
  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', 'var(--accent-primary)')
    .attr('stroke-width', 2)
    .attr('d', d3.line()
      .x(d => x(d.date))
      .y(d => y(d.lines))
      .curve(d3.curveMonotoneX)
    );

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%b %y")))
    .selectAll('text')
    .style('fill', 'var(--text-secondary)');

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .style('fill', 'var(--text-secondary)');
  
  // Remove domain lines for cleaner look
  svg.selectAll('.domain').remove();
  
  // Add Grid
  svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.1);

  // Add circles for data points
  svg.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'dot')
    .attr('cx', d => x(d.date))
    .attr('cy', d => y(d.lines))
    .attr('r', 4)
    .attr('fill', 'var(--accent-primary)')
    .attr('stroke', 'var(--background-color)')
    .attr('stroke-width', 1.5)
    .on('mouseover', function (event, d) {
      d3.select(this).attr('r', 6);
      const tooltip = svg.append('g')
        .attr('class', 'tooltip')
        .attr('transform', `translate(${x(d.date)}, ${y(d.lines)})`);

      tooltip.append('rect')
        .attr('x', -30)
        .attr('y', -25)
        .attr('width', 60)
        .attr('height', 20)
        .attr('rx', 4)
        .attr('fill', 'var(--background-color)')
        .attr('stroke', 'var(--border-color)')
        .attr('stroke-width', 1);

      tooltip.append('text')
        .attr('text-anchor', 'middle')
        .attr('y', -12)
        .text(`${d.lines} lines`)
        .style('font-size', '11px')
        .style('fill', 'var(--text-primary)');
    })
    .on('mouseout', function () {
      d3.select(this).attr('r', 4);
      svg.selectAll('.tooltip').remove();
    });

  // Title
  svg
    .append('text')
    .attr('x', width / 2)
    .attr('y', margin.top / 2)
    .attr('text-anchor', 'middle')
    .text(`Evolution of ${filePath}`)
    .style('font-size', '14px')
    .style('font-weight', '600')
    .style('fill', 'var(--text-primary)');
}

// Resize handler
window.addEventListener('resize', () => {
  if (state.data) {
    renderCurrentView();
  }
});
