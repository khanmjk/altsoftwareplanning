/**
 * GitStoryline v2 - Bar Chart Race
 * =================================
 * Animated racing bar chart showing file size evolution
 * with proper D3 transitions and deleted file animations
 */

const state = {
  data: null,
  currentFrame: 0,
  isPlaying: false,
  speed: 1,
  animationTimer: null,
  svg: null,
  xScale: null,
  globalMaxLines: 0, // Fixed scale based on global max
  deletedFilesShown: new Set(),
  previousFiles: new Set(), // Track files from previous frame
};

// Configuration
const CONFIG = {
  barHeight: 18,
  barPadding: 1,
  maxBars: 48,
  transitionDuration: 800,
  frameDuration: 1500, // ms between frames at 1x speed
  margin: { top: 10, right: 100, bottom: 10, left: 220 },
  newFileGlowDuration: 1500, // How long new files glow
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupTheme();
  setupControls();
  await loadData();
  document.getElementById('loading').classList.add('hidden');
}

async function loadData() {
  try {
    const response = await fetch('race_data.json');
    state.data = await response.json();

    // Calculate GLOBAL max lines across ALL frames for fixed scale
    state.globalMaxLines = 0;
    state.data.frames.forEach((frame) => {
      frame.files.forEach((f) => {
        if (f.lines > state.globalMaxLines) {
          state.globalMaxLines = f.lines;
        }
      });
    });
    console.log('Global max lines:', state.globalMaxLines);

    // Setup slider
    const slider = document.getElementById('progressSlider');
    slider.max = state.data.frames.length - 1;

    // Initialize SVG with fixed scale
    initSVG();

    // Render initial frame
    renderFrame(0);
    updateStats();
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

function initSVG() {
  const container = document.getElementById('raceChart');
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Remove any existing SVG
  d3.select(container).selectAll('*').remove();

  state.svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

  // Create groups for bars
  state.svg.append('g').attr('class', 'bars-container');

  // Initialize FIXED scale based on global max
  const chartWidth = width - CONFIG.margin.left - CONFIG.margin.right;
  state.xScale = d3
    .scaleLinear()
    .domain([0, state.globalMaxLines * 1.05]) // Fixed domain!
    .range([0, chartWidth]);
}

function setupTheme() {
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('gitstoryline-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);

  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gitstoryline-theme', next);
    updateThemeIcon(next);
  });
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('.theme-toggle i');
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function setupControls() {
  // Play/Pause
  document.getElementById('playPauseBtn').addEventListener('click', togglePlay);

  // Restart
  document.getElementById('restartBtn').addEventListener('click', () => {
    state.currentFrame = 0;
    state.deletedFilesShown.clear();
    state.previousFiles.clear();
    renderFrame(0);
    updateSlider();
    updateStats();
  });

  // Skip to end
  document.getElementById('skipBtn').addEventListener('click', () => {
    stopAnimation();
    state.currentFrame = state.data.frames.length - 1;
    renderFrame(state.currentFrame);
    updateSlider();
    updateStats();
    showGraveyard();
  });

  // Slider
  document.getElementById('progressSlider').addEventListener('input', (e) => {
    stopAnimation();
    state.currentFrame = parseInt(e.target.value);
    renderFrame(state.currentFrame);
    updateStats();
  });

  // Speed buttons
  document.querySelectorAll('.speed-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.speed = parseFloat(btn.dataset.speed);
    });
  });

  // Graveyard close
  document.getElementById('graveyardClose').addEventListener('click', () => {
    document.getElementById('graveyardOverlay').classList.remove('active');
  });
}

function togglePlay() {
  if (state.isPlaying) {
    stopAnimation();
  } else {
    startAnimation();
  }
}

function startAnimation() {
  state.isPlaying = true;
  updatePlayButton();
  animate();
}

function stopAnimation() {
  state.isPlaying = false;
  updatePlayButton();
  if (state.animationTimer) {
    clearTimeout(state.animationTimer);
  }
}

function updatePlayButton() {
  const btn = document.getElementById('playPauseBtn');
  btn.innerHTML = state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
}

function animate() {
  if (!state.isPlaying) return;

  if (state.currentFrame < state.data.frames.length - 1) {
    state.currentFrame++;
    renderFrame(state.currentFrame);
    updateSlider();
    updateStats();

    // Check for milestones and deleted files
    checkMilestone();
    checkDeletedFiles();

    const delay = CONFIG.frameDuration / state.speed;
    state.animationTimer = setTimeout(animate, delay);
  } else {
    stopAnimation();
    showGraveyard();
  }
}

function renderFrame(frameIndex) {
  const frame = state.data.frames[frameIndex];
  if (!frame || !state.svg) return;

  // Update date
  const dateEl = document.getElementById('currentDate');
  const date = new Date(frame.date);
  dateEl.textContent = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

  // Prepare data - sort by lines and take top N
  const sortedFiles = [...frame.files]
    .filter((f) => f.lines > 0 || f.status === 'deleted')
    .sort((a, b) => b.lines - a.lines)
    .slice(0, CONFIG.maxBars);

  // Detect new files (not in previous frame)
  const currentFileSet = new Set(sortedFiles.map((f) => f.file));
  sortedFiles.forEach((f) => {
    f.isNew = !state.previousFiles.has(f.file);
  });

  // Assign ranks
  sortedFiles.forEach((f, i) => (f.rank = i));

  // Render bars with transitions
  renderBars(sortedFiles);

  // Update previous files for next frame
  state.previousFiles = currentFileSet;
}

function renderBars(files) {
  const container = state.svg.select('.bars-container');
  const t = d3.transition().duration(CONFIG.transitionDuration);

  // Data join
  const bars = container.selectAll('.bar-group').data(files, (d) => d.file);

  // EXIT - remove old bars (files that dropped out of top N)
  bars.exit().transition(t).style('opacity', 0).remove();

  // ENTER - new bars (files entering the race)
  const enter = bars
    .enter()
    .append('g')
    .attr('class', (d) => `bar-group ${d.isNew ? 'bar-new' : ''}`)
    .attr(
      'transform',
      (d) =>
        `translate(${CONFIG.margin.left}, ${CONFIG.margin.top + d.rank * (CONFIG.barHeight + CONFIG.barPadding)})`
    )
    .style('opacity', 0);

  // Category icon (far left)
  enter
    .append('text')
    .attr('class', 'bar-icon')
    .attr('x', -210)
    .attr('y', CONFIG.barHeight / 2 + 4)
    .style('font-size', '12px')
    .text((d) => getCategoryIcon(d.category));

  // Rank badge background
  enter
    .append('circle')
    .attr('class', 'rank-circle')
    .attr('cx', -190)
    .attr('cy', CONFIG.barHeight / 2)
    .attr('r', 9);

  // Rank number
  enter
    .append('text')
    .attr('class', 'rank-text')
    .attr('x', -190)
    .attr('y', CONFIG.barHeight / 2 + 3)
    .attr('text-anchor', 'middle')
    .attr('font-size', '8px')
    .attr('font-weight', '700')
    .attr('fill', 'white');

  // File name (between rank and bar)
  enter
    .append('text')
    .attr('class', 'bar-label')
    .attr('x', -10)
    .attr('y', CONFIG.barHeight / 2 + 4)
    .attr('text-anchor', 'end')
    .style('font-size', '10px');

  // Bar rect - NEW FILES start at width 0
  enter
    .append('rect')
    .attr('class', 'bar')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', CONFIG.barHeight)
    .attr('width', 0) // Start at 0!
    .attr('rx', 3);

  // Line count
  enter
    .append('text')
    .attr('class', 'bar-value')
    .attr('y', CONFIG.barHeight / 2 + 4);

  // Fade in new bars
  enter.transition(t).style('opacity', 1);

  // UPDATE + ENTER - update all bars
  const allBars = enter.merge(bars);

  // Transition positions (for rank changes)
  allBars
    .transition(t)
    .attr(
      'transform',
      (d) =>
        `translate(${CONFIG.margin.left}, ${CONFIG.margin.top + d.rank * (CONFIG.barHeight + CONFIG.barPadding)})`
    )
    .style('opacity', (d) => (d.status === 'deleted' ? 0.4 : 1));

  // Handle new file glow effect
  allBars.classed('bar-new', (d) => d.isNew);

  // Update rank badge
  allBars.select('.rank-circle').transition(t).attr('fill', getRankColor);

  allBars.select('.rank-text').text((d) => d.rank + 1);

  // Update file name
  allBars.select('.bar-label').text((d) => truncateFileName(d.file, 22));

  // Update bar - THIS IS THE KEY FIX: transition width properly
  allBars
    .select('.bar')
    .attr('fill', (d) => (d.isNew ? '#22c55e' : d.color)) // Green for new files
    .transition(t)
    .attr('fill', (d) => d.color) // Then transition to normal color
    .attr('width', (d) => Math.max(0, state.xScale(d.lines))); // Animate to actual width

  // Update line count with number animation
  allBars
    .select('.bar-value')
    .transition(t)
    .attr('x', (d) => state.xScale(d.lines) + 8)
    .tween('text', function (d) {
      const node = this;
      const prev = parseInt(node.textContent.replace(/,/g, '')) || 0;
      const i = d3.interpolateNumber(prev, d.lines);
      return function (t) {
        node.textContent = Math.round(i(t)).toLocaleString();
      };
    });
}

function getRankColor(d) {
  if (d.rank === 0) return '#ffd700'; // Gold
  if (d.rank === 1) return '#c0c0c0'; // Silver
  if (d.rank === 2) return '#cd7f32'; // Bronze
  return '#64748b';
}

function getCategoryIcon(category) {
  const icons = {
    component: '🧩',
    service: '⚙️',
    ai: '🤖',
    css: '🎨',
    html: '📄',
    engine: '🚀',
    manager: '📊',
    repository: '💾',
    test: '🧪',
    other: '📁',
  };
  return icons[category] || '📁';
}

function truncateFileName(path, maxLen) {
  // Show /category/filename format
  const parts = path.split('/');
  const filename = parts.pop();
  const category = parts.length > 0 ? parts[parts.length - 1] : '';

  // Build breadcrumb: /category/filename or just /filename
  const breadcrumb = category ? `/${category}/${filename}` : `/${filename}`;

  if (breadcrumb.length <= maxLen) return breadcrumb;

  // Truncate filename but keep category
  const prefix = category ? `/${category}/` : '/';
  const availableLen = maxLen - prefix.length - 3; // -3 for ...
  if (availableLen > 5) {
    return prefix + filename.substring(0, availableLen) + '...';
  }
  return breadcrumb.substring(0, maxLen - 3) + '...';
}

function updateSlider() {
  document.getElementById('progressSlider').value = state.currentFrame;
}

function updateStats() {
  if (!state.data) return;

  const frame = state.data.frames[state.currentFrame];
  if (!frame) return;

  document.getElementById('totalFiles').textContent = frame.totalFiles;
  document.getElementById('totalLines').textContent = formatNumber(frame.totalLines);
  document.getElementById('frameCounter').textContent =
    `${state.currentFrame + 1}/${state.data.frames.length}`;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function checkMilestone() {
  const frame = state.data.frames[state.currentFrame];
  const milestone = state.data.milestones.find((m) => m.date === frame.date);

  if (milestone) {
    showMilestone(milestone);
  }
}

function checkDeletedFiles() {
  const frame = state.data.frames[state.currentFrame];

  // Check if any file was just deleted
  state.data.graveyard.forEach((file) => {
    if (file.deleted === frame.date && !state.deletedFilesShown.has(file.file)) {
      state.deletedFilesShown.add(file.file);
      showDeletedFileCallout(file);
    }
  });
}

function showDeletedFileCallout(file) {
  const overlay = document.getElementById('milestoneOverlay');
  const icon = document.querySelector('.milestone-icon i');
  icon.className = 'fas fa-skull';
  icon.style.color = '#ef4444';

  document.getElementById('milestoneTitle').textContent = `💀 ${file.file.split('/').pop()}`;
  document.getElementById('milestoneDesc').textContent = `Deprecated and removed from codebase`;

  overlay.classList.add('active');

  setTimeout(() => {
    overlay.classList.remove('active');
    icon.className = 'fas fa-star';
    icon.style.color = '';
  }, 1500);
}

function showMilestone(milestone) {
  const overlay = document.getElementById('milestoneOverlay');
  const icon = document.querySelector('.milestone-icon i');
  icon.className = 'fas fa-star';
  icon.style.color = '';

  document.getElementById('milestoneTitle').textContent = milestone.title;
  document.getElementById('milestoneDesc').textContent = milestone.description;

  overlay.classList.add('active');

  setTimeout(() => {
    overlay.classList.remove('active');
  }, 2500);
}

function showGraveyard() {
  if (!state.data.graveyard || state.data.graveyard.length === 0) return;

  const list = document.getElementById('graveyardList');
  list.innerHTML = '';

  state.data.graveyard.slice(0, 30).forEach((file) => {
    const item = document.createElement('div');
    item.className = 'graveyard-item';
    item.innerHTML = `
            <span class="graveyard-item-name">💀 ${file.file.split('/').pop()}</span>
            <span class="graveyard-item-dates">${file.created || '?'} → ${file.deleted || '?'}</span>
        `;
    list.appendChild(item);
  });

  if (state.data.graveyard.length > 30) {
    const more = document.createElement('div');
    more.className = 'graveyard-item';
    more.innerHTML = `<span style="color: var(--text-muted)">...and ${state.data.graveyard.length - 30} more files retired</span>`;
    list.appendChild(more);
  }

  document.getElementById('graveyardOverlay').classList.add('active');
}

// Resize handler
window.addEventListener('resize', () => {
  if (state.data) {
    initSVG();
    renderFrame(state.currentFrame);
  }
});
