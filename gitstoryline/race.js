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
  deletedFilesShown: new Set(),
};

// Configuration
const CONFIG = {
  barHeight: 28,
  barPadding: 4,
  maxBars: 30,
  transitionDuration: 600,
  frameDuration: 1500, // ms between frames at 1x speed (slower)
  margin: { top: 20, right: 100, bottom: 20, left: 200 },
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

    // Setup slider
    const slider = document.getElementById('progressSlider');
    slider.max = state.data.frames.length - 1;

    // Initialize SVG
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

  // Create a group for bars
  state.svg.append('g').attr('class', 'bars-container');

  // Initialize scale
  const chartWidth = width - CONFIG.margin.left - CONFIG.margin.right;
  state.xScale = d3.scaleLinear().domain([0, 1000]).range([0, chartWidth]);
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

  // Assign ranks
  sortedFiles.forEach((f, i) => (f.rank = i));

  // Calculate max for scale
  const maxLines = d3.max(sortedFiles, (d) => d.lines) || 1;

  // Update scale
  const container = document.getElementById('raceChart');
  const chartWidth = container.clientWidth - CONFIG.margin.left - CONFIG.margin.right;
  state.xScale.domain([0, maxLines * 1.1]).range([0, chartWidth]);

  // Render bars with transitions
  renderBars(sortedFiles);
}

function renderBars(files) {
  const container = state.svg.select('.bars-container');
  const t = d3.transition().duration(CONFIG.transitionDuration);

  // Data join
  const bars = container.selectAll('.bar-group').data(files, (d) => d.file);

  // EXIT - remove old bars
  bars.exit().transition(t).style('opacity', 0).remove();

  // ENTER - new bars
  const enter = bars
    .enter()
    .append('g')
    .attr('class', 'bar-group')
    .attr(
      'transform',
      (d) =>
        `translate(${CONFIG.margin.left}, ${CONFIG.margin.top + d.rank * (CONFIG.barHeight + CONFIG.barPadding)})`
    )
    .style('opacity', 0);

  // Category icon
  enter
    .append('text')
    .attr('class', 'bar-icon')
    .attr('x', -185)
    .attr('y', CONFIG.barHeight / 2 + 5)
    .text((d) => getCategoryIcon(d.category));

  // Rank badge background
  enter
    .append('circle')
    .attr('class', 'rank-circle')
    .attr('cx', -30)
    .attr('cy', CONFIG.barHeight / 2)
    .attr('r', 11);

  // Rank number
  enter
    .append('text')
    .attr('class', 'rank-text')
    .attr('x', -30)
    .attr('y', CONFIG.barHeight / 2 + 4)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .attr('font-weight', '700')
    .attr('fill', 'white');

  // File name
  enter
    .append('text')
    .attr('class', 'bar-label')
    .attr('x', -45)
    .attr('y', CONFIG.barHeight / 2 + 4)
    .attr('text-anchor', 'end');

  // Bar rect
  enter
    .append('rect')
    .attr('class', 'bar')
    .attr('x', 0)
    .attr('y', 0)
    .attr('height', CONFIG.barHeight)
    .attr('width', 0)
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

  // Transition positions
  allBars
    .transition(t)
    .attr(
      'transform',
      (d) =>
        `translate(${CONFIG.margin.left}, ${CONFIG.margin.top + d.rank * (CONFIG.barHeight + CONFIG.barPadding)})`
    )
    .style('opacity', (d) => (d.status === 'deleted' ? 0.4 : 1));

  // Update rank badge
  allBars
    .select('.rank-circle')
    .transition(t)
    .attr('fill', (d) => getRankColor(d.rank));

  allBars.select('.rank-text').text((d) => d.rank + 1);

  // Update file name
  allBars.select('.bar-label').text((d) => truncateFileName(d.file, 25));

  // Update bar width with transition
  allBars
    .select('.bar')
    .attr('fill', (d) => d.color)
    .transition(t)
    .attr('width', (d) => Math.max(0, state.xScale(d.lines)));

  // Update line count
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

function getRankColor(rank) {
  if (rank === 0) return '#ffd700'; // Gold
  if (rank === 1) return '#c0c0c0'; // Silver
  if (rank === 2) return '#cd7f32'; // Bronze
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
  const name = path.split('/').pop();
  if (name.length <= maxLen) return name;
  return name.substring(0, maxLen - 3) + '...';
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

  // Check if any file was just deleted (was in graveyard and matches this date)
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

  // Auto-hide after 1.5 seconds
  setTimeout(() => {
    overlay.classList.remove('active');
    // Reset icon
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

  // Auto-hide after 2.5 seconds
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
