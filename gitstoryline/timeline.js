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
    const response = await fetch('timeline_data.json');
    state.data = await response.json();
    console.log('Data loaded:', state.data);

    renderStats();
    renderPhases();
    renderCurrentView();
    populateFileSelect();
    setupTimelineControls();
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

  renderCurrentView();
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
  const margin = { top: 40, right: 40, bottom: 40, left: 60 };

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

  // Time scale
  const timeExtent = d3.extent(filteredCommits, (d) => new Date(d.date));
  const xScale = d3
    .scaleTime()
    .domain(timeExtent)
    .range([margin.left, width - margin.right]);

  // Size scale for dots
  const maxFiles = d3.max(filteredCommits, (d) => d.filesChanged || 1);
  const rScale = d3.scaleSqrt().domain([0, maxFiles]).range([3, 12]);

  // Color scale for commit types
  const colorScale = d3
    .scaleOrdinal()
    .domain(['feature', 'fix', 'refactor', 'docs', 'test', 'merge', 'other'])
    .range(['#22c55e', '#3b82f6', '#f59e0b', '#06b6d4', '#a855f7', '#64748b', '#94a3b8']);

  // Draw timeline axis
  const xAxis = d3
    .axisBottom(xScale)
    .ticks(d3.timeMonth.every(1))
    .tickFormat(d3.timeFormat('%b %Y'));

  svg
    .append('g')
    .attr('class', 'timeline-axis')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(xAxis)
    .selectAll('text')
    .style('fill', 'var(--text-secondary)')
    .style('font-size', '10px');

  svg.selectAll('.timeline-axis path, .timeline-axis line').style('stroke', 'var(--border-color)');

  // Jitter y positions to avoid overlap
  const yJitter = (i) =>
    margin.top +
    (height - margin.top - margin.bottom) / 2 +
    Math.sin(i * 0.5) * 50 +
    (Math.random() - 0.5) * 30;

  // Draw commit dots
  const dots = svg
    .selectAll('.timeline-dot')
    .data(visibleCommits)
    .enter()
    .append('circle')
    .attr('class', 'timeline-dot')
    .attr('cx', (d) => xScale(new Date(d.date)))
    .attr('cy', (d, i) => yJitter(i))
    .attr('r', (d) => rScale(d.filesChanged || 1))
    .attr('fill', (d) => colorScale(d.type))
    .attr('opacity', 0.7)
    .on('mouseover', function (event, d) {
      d3.select(this)
        .attr('opacity', 1)
        .attr('r', rScale(d.filesChanged || 1) * 1.5);
      showCommitDetails(d);
    })
    .on('mouseout', function (event, d) {
      d3.select(this)
        .attr('opacity', 0.7)
        .attr('r', rScale(d.filesChanged || 1));
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

  // Draw legend
  const legend = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top - 20})`);

  const types = ['feature', 'fix', 'refactor', 'other'];
  types.forEach((type, i) => {
    legend
      .append('circle')
      .attr('cx', i * 80)
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', colorScale(type));

    legend
      .append('text')
      .attr('x', i * 80 + 10)
      .attr('y', 4)
      .text(type.charAt(0).toUpperCase() + type.slice(1))
      .style('font-size', '10px')
      .style('fill', 'var(--text-secondary)');
  });
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
function renderFileTree() {
  const container = document.getElementById('treeCanvas');
  container.innerHTML = '';

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 500;

  // Convert flat tree to hierarchy
  const treeData = convertToHierarchy(state.data.fileTree);

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

  const g = svg.append('g').attr('transform', 'translate(40, 20)');

  const treeLayout = d3.tree().size([height - 40, width - 200]);

  const root = d3.hierarchy(treeData);
  treeLayout(root);

  // Draw links
  g.selectAll('.tree-link')
    .data(root.links())
    .enter()
    .append('path')
    .attr('class', 'tree-link')
    .attr(
      'd',
      d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x)
    );

  // Draw nodes
  const nodes = g
    .selectAll('.tree-node')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('class', 'tree-node')
    .attr('transform', (d) => `translate(${d.y}, ${d.x})`);

  nodes
    .append('circle')
    .attr('r', (d) => (d.children ? 6 : 4))
    .attr('fill', (d) => (d.children ? 'var(--accent-primary)' : 'var(--color-feature)'));

  nodes
    .append('text')
    .attr('x', (d) => (d.children ? -10 : 10))
    .attr('dy', 4)
    .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
    .text((d) => d.data.name)
    .style('font-size', '10px')
    .style('font-family', 'JetBrains Mono, monospace')
    .style('fill', 'var(--text-primary)');
}

function convertToHierarchy(tree, name = 'root') {
  const children = [];

  for (const [key, value] of Object.entries(tree)) {
    if (key === '_files') {
      value.forEach((file) => {
        children.push({ name: file });
      });
    } else {
      children.push(convertToHierarchy(value, key));
    }
  }

  // Limit depth and breadth for performance
  const limitedChildren = children.slice(0, 20);

  return { name, children: limitedChildren.length > 0 ? limitedChildren : undefined };
}

// Heatmap Visualization
function renderHeatmap() {
  const container = document.getElementById('heatmapCanvas');
  container.innerHTML = '';

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 300;
  const margin = { top: 30, right: 30, bottom: 30, left: 50 };

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

  const months = state.data.monthlyStats;
  const maxCommits = d3.max(months, (d) => d.commits);

  // Create scales
  const xScale = d3
    .scaleBand()
    .domain(months.map((d) => d.month))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const colorScale = d3.scaleSequential().domain([0, maxCommits]).interpolator(d3.interpolateBlues);

  const barHeight = 40;
  const y = height / 2 - barHeight / 2;

  // Draw month bars
  svg
    .selectAll('.heatmap-bar')
    .data(months)
    .enter()
    .append('rect')
    .attr('class', 'heatmap-bar')
    .attr('x', (d) => xScale(d.month))
    .attr('y', y)
    .attr('width', xScale.bandwidth())
    .attr('height', barHeight)
    .attr('fill', (d) => colorScale(d.commits))
    .attr('rx', 4)
    .style('cursor', 'pointer')
    .on('mouseover', function (event, d) {
      d3.select(this).attr('opacity', 0.8);
      showMonthDetails(d);
    })
    .on('mouseout', function () {
      d3.select(this).attr('opacity', 1);
    });

  // Add labels
  svg
    .selectAll('.heatmap-label')
    .data(months)
    .enter()
    .append('text')
    .attr('x', (d) => xScale(d.month) + xScale.bandwidth() / 2)
    .attr('y', y + barHeight + 20)
    .attr('text-anchor', 'middle')
    .text((d) => d.month.substring(5)) // Just month number
    .style('font-size', '10px')
    .style('fill', 'var(--text-secondary)');

  // Add commit counts
  svg
    .selectAll('.heatmap-count')
    .data(months)
    .enter()
    .append('text')
    .attr('x', (d) => xScale(d.month) + xScale.bandwidth() / 2)
    .attr('y', y + barHeight / 2 + 4)
    .attr('text-anchor', 'middle')
    .text((d) => d.commits)
    .style('font-size', '12px')
    .style('font-weight', '600')
    .style('fill', (d) => (d.commits > maxCommits / 2 ? 'white' : 'var(--text-primary)'));
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

  // Add tracked files
  const fileEvolution = state.data.fileEvolution || {};
  Object.keys(fileEvolution).forEach((file) => {
    const option = document.createElement('option');
    option.value = file;
    option.textContent = file;
    select.appendChild(option);
  });

  // Add top churn files
  const optgroup = document.createElement('optgroup');
  optgroup.label = 'Most Changed Files';
  state.data.topChurnFiles.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.file;
    option.textContent = `${item.file} (${item.commits} commits)`;
    optgroup.appendChild(option);
  });
  select.appendChild(optgroup);

  select.addEventListener('change', (e) => {
    if (e.target.value) {
      renderEvolution(e.target.value);
    }
  });
}

function renderEvolution(filePath) {
  const container = document.getElementById('evolutionCanvas');
  container.innerHTML = '';

  const fileHistory = state.data.fileEvolution[filePath];
  if (!fileHistory || fileHistory.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No evolution data for this file</p></div>';
    return;
  }

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 300;
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

  // Prepare data
  const data = fileHistory
    .slice()
    .reverse()
    .map((d) => ({
      date: new Date(d.date),
      lines: d.lines,
    }));

  // Scales
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date))
    .range([margin.left, width - margin.right]);

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.lines) * 1.1])
    .range([height - margin.bottom, margin.top]);

  // Axes
  svg
    .append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%b %Y')))
    .selectAll('text')
    .style('fill', 'var(--text-secondary)');

  svg
    .append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).ticks(5))
    .selectAll('text')
    .style('fill', 'var(--text-secondary)');

  // Line
  const line = d3
    .line()
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.lines))
    .curve(d3.curveStepAfter);

  // Area under the line
  const area = d3
    .area()
    .x((d) => xScale(d.date))
    .y0(height - margin.bottom)
    .y1((d) => yScale(d.lines))
    .curve(d3.curveStepAfter);

  svg
    .append('path')
    .datum(data)
    .attr('fill', 'var(--accent-primary)')
    .attr('fill-opacity', 0.2)
    .attr('d', area);

  svg
    .append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', 'var(--accent-primary)')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Points
  svg
    .selectAll('.evolution-point')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'evolution-point')
    .attr('cx', (d) => xScale(d.date))
    .attr('cy', (d) => yScale(d.lines))
    .attr('r', 4)
    .attr('fill', 'var(--accent-primary)')
    .style('cursor', 'pointer')
    .on('mouseover', function (event, d) {
      d3.select(this).attr('r', 6);

      // Show tooltip
      const tooltip = svg
        .append('g')
        .attr('class', 'tooltip')
        .attr('transform', `translate(${xScale(d.date)}, ${yScale(d.lines) - 20})`);

      tooltip
        .append('rect')
        .attr('x', -40)
        .attr('y', -20)
        .attr('width', 80)
        .attr('height', 20)
        .attr('fill', 'var(--bg-secondary)')
        .attr('rx', 4);

      tooltip
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', -6)
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
