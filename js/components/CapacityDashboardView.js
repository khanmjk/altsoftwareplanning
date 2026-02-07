/**
 * CapacityDashboardView.js
 *
 * Dashboard component for analyzing capacity.
 * Features KPI cards, Waterfall Chart, and detailed Summary Table.
 */
class CapacityDashboardView {
  constructor() {
    this.container = null;
    this.capacityEngine = new CapacityEngine(SystemService.getCurrentSystem());
    this.currentScenario = 'FundedHC'; // Default to Funded Headcount (Budget)
    this.currentChartTeamId = '__ORG_VIEW__';
  }

  render(container) {
    this.container = container;
    this._clearElement(this.container);

    // Update Data
    this.capacityEngine.updateSystemData(SystemService.getCurrentSystem());
    const metrics = this.capacityEngine.calculateAllMetrics();

    const wrapper = document.createElement('div');
    wrapper.className = 'capacity-dashboard-view';

    // 1. Controls Row (Scenario Selector)
    this._renderControls(wrapper);

    // 2. KPI Cards
    this._renderKPICards(wrapper, metrics);

    // 3. Chart Section
    this._renderChartSection(wrapper, metrics);

    // 4. Summary Table
    this._renderSummaryTable(wrapper, metrics);

    this.container.appendChild(wrapper);
  }

  _renderControls(parent) {
    const container = document.createElement('div');
    container.className = 'capacity-dashboard-controls-container';

    // 1. Controls Row
    const row = document.createElement('div');
    row.className = 'capacity-dashboard-controls';

    // Scenario Selector
    const scenGroup = document.createElement('div');
    scenGroup.className = 'capacity-control-group';
    const scenLabel = document.createElement('span');
    scenLabel.textContent = 'Analysis Scenario:';
    scenLabel.className = 'capacity-dashboard-controls__label';
    scenGroup.appendChild(scenLabel);

    // Build scenario options for ThemedSelect
    const scenarioOptions = [
      { value: 'EffectiveBIS', text: 'Effective BIS (Actual + Borrowed)' },
      { value: 'TeamBIS', text: 'Team BIS (Actual Only)' },
      { value: 'FundedHC', text: 'Funded Headcount (Budget)' },
    ];

    this.scenarioSelect = new ThemedSelect({
      options: scenarioOptions,
      value: this.currentScenario,
      id: 'capacity-scenario-select',
      onChange: (value) => {
        this.currentScenario = value;
        this.render(this.container);
      },
    });

    scenGroup.appendChild(this.scenarioSelect.render());
    row.appendChild(scenGroup);

    // Team Filter (Moved from Chart)
    const teamGroup = document.createElement('div');
    teamGroup.className = 'capacity-control-group';
    const teamLabel = document.createElement('span');
    teamLabel.textContent = 'View For:';
    teamLabel.className = 'capacity-dashboard-controls__label';
    teamGroup.appendChild(teamLabel);

    // Build team options for ThemedSelect
    const teamOptions = [{ value: '__ORG_VIEW__', text: 'Entire Organization' }];
    (SystemService.getCurrentSystem().teams || []).forEach((t) => {
      teamOptions.push({
        value: t.teamId,
        text: t.teamIdentity || t.teamName,
      });
    });

    this.teamSelect = new ThemedSelect({
      options: teamOptions,
      value: this.currentChartTeamId,
      id: 'capacity-team-select',
      onChange: (value) => {
        this.currentChartTeamId = value;
        this.render(this.container);
      },
    });

    teamGroup.appendChild(this.teamSelect.render());
    row.appendChild(teamGroup);

    container.appendChild(row);

    // 2. Dynamic Heading
    const heading = document.createElement('div');
    heading.className = 'capacity-dashboard-context-heading';

    const scenarioText =
      scenarioOptions.find((o) => o.value === this.currentScenario)?.text || this.currentScenario;
    const teamText =
      teamOptions.find((o) => o.value === this.currentChartTeamId)?.text || this.currentChartTeamId;

    heading.append(document.createTextNode('Views reflect '));
    heading.appendChild(this._createStrong(scenarioText));
    heading.append(document.createTextNode(' for '));
    heading.appendChild(this._createStrong(teamText));
    container.appendChild(heading);

    parent.appendChild(container);
  }

  _renderKPICards(parent, metrics) {
    // Determine data source based on selection
    let data;
    if (this.currentChartTeamId === '__ORG_VIEW__') {
      data = metrics.totals[this.currentScenario];
    } else {
      data = metrics[this.currentChartTeamId]?.[this.currentScenario];
    }

    if (!data) {
      // Handle edge case where team data might be missing
      const alert = document.createElement('div');
      alert.className = 'alert alert-warning';
      alert.textContent = 'No data available for this selection.';
      parent.appendChild(alert);
      return;
    }

    const row = document.createElement('div');
    row.className = 'capacity-kpi-row';

    const createCard = (title, value, subtext, colorClass) => {
      const card = document.createElement('div');
      card.className = `card text-white bg-${colorClass} capacity-kpi-card`;

      const h5 = document.createElement('h5');
      h5.className = 'card-title capacity-kpi-card__title';
      h5.textContent = title;
      card.appendChild(h5);

      const h2 = document.createElement('h2');
      h2.className = 'card-text capacity-kpi-card__value';
      h2.textContent = value;
      card.appendChild(h2);

      const p = document.createElement('p');
      p.className = 'card-text capacity-kpi-card__subtext';
      p.textContent = subtext;
      card.appendChild(p);

      return card;
    };

    // Gross
    row.appendChild(
      createCard('Gross Capacity', data.grossYrs.toFixed(1), 'Total SDE Years (Raw)', 'secondary')
    );

    // Deductions
    row.appendChild(
      createCard(
        'Total Deductions',
        `-${data.deductYrs.toFixed(1)}`,
        'Leave, Holidays, Overhead',
        'danger'
      )
    );

    // AI Gain
    const aiGain = data.deductionsBreakdown.aiProductivityGainYrs || 0;
    row.appendChild(
      createCard('AI Productivity Gain', `+${aiGain.toFixed(1)}`, 'Efficiency Uplift', 'success')
    );

    if (this.currentScenario === 'FundedHC') {
      const hiringGap = data.hiringGap || 0;
      row.appendChild(
        createCard(
          'Hiring Gap',
          hiringGap.toFixed(1),
          'Funded roles not yet staffed',
          hiringGap > 0 ? 'warning' : 'success'
        )
      );
    }

    // Net
    row.appendChild(
      createCard('Net Project Capacity', data.netYrs.toFixed(1), 'Available for Roadmap', 'primary')
    );

    parent.appendChild(row);
  }

  _renderChartSection(parent, metrics) {
    const section = document.createElement('div');
    section.className = 'card capacity-chart-section';

    const header = document.createElement('div');
    header.className = 'capacity-chart-header';

    const title = document.createElement('h4');
    title.textContent = 'Capacity Waterfall Analysis';
    header.appendChild(title);

    // Removed local filter, now global

    section.appendChild(header);

    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'capacity-chart-container';

    const canvas = document.createElement('canvas');
    canvasContainer.appendChild(canvas);
    section.appendChild(canvasContainer);

    parent.appendChild(section);

    // Draw Chart (defer slightly to ensure DOM is ready)
    setTimeout(() => this._drawChart(canvas, metrics), 0);
  }

  _drawChart(canvas, metrics) {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    let data;
    if (this.currentChartTeamId === '__ORG_VIEW__') {
      data = metrics.totals[this.currentScenario];
    } else {
      data = metrics[this.currentChartTeamId]?.[this.currentScenario];
    }

    if (!data) return;

    const bd = data.deductionsBreakdown;

    const labels = [
      'Gross Capacity',
      'Std Leave',
      'Var Leave',
      'Specific Leave',
      'Holidays',
      'Org Events',
      'Team Activities',
      'Overhead',
    ];
    const values = [
      data.grossYrs,
      -bd.stdLeaveYrs,
      -bd.varLeaveYrs,
      -bd.specificLeaveYrs,
      -bd.holidayYrs,
      -bd.orgEventYrs,
      -bd.teamActivityYrs,
      -bd.overheadYrs,
    ];
    const bgColors = [
      '#6c757d', // Gross (Grey)
      '#dc3545',
      '#dc3545',
      '#dc3545',
      '#d63384',
      '#dc3545',
      '#dc3545',
      '#dc3545', // Deductions
    ];

    // Conditional Hire Ramp-up Sink (Only for FundedHC with values)
    if (this.currentScenario === 'FundedHC' && (bd.newHireRampUpSinkYrs || 0) > 0) {
      labels.push('Hire Ramp-up');
      values.push(-(bd.newHireRampUpSinkYrs || 0));
      bgColors.push('#fd7e14'); // Orange for Ramp-up Sink
    }

    // AI Gain
    labels.push('AI Gain');
    values.push(bd.aiProductivityGainYrs);
    bgColors.push('#28a745'); // Green for AI Gain

    // Conditional New Hire Gain (Only for FundedHC with values)
    if (this.currentScenario === 'FundedHC' && (bd.newHireGainYrs || 0) > 0) {
      labels.push('New Hires');
      values.push(bd.newHireGainYrs || 0);
      bgColors.push('#20c997'); // Teal for New Hire Gain
    }

    labels.push('Net Capacity');
    values.push(data.netYrs);
    bgColors.push('#007bff'); // Net (Blue)

    // Custom Plugin for Data Labels
    const dataLabelsPlugin = {
      id: 'customDataLabels',
      afterDatasetsDraw: (chart) => {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          if (!meta.hidden) {
            meta.data.forEach((element, index) => {
              // Get value
              const value = dataset.data[index];
              if (value === 0) return; // Skip zero values

              const valueText = value.toFixed(1);

              // Font settings
              ctx.font = 'bold 11px "Inter", sans-serif';
              ctx.fillStyle = '#495057';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';

              // Position
              const position = element.tooltipPosition();
              let yPos = position.y - 5; // Default above

              // Adjust for negative values to be below
              if (value < 0) {
                yPos = position.y + 15;
              }

              ctx.fillText(valueText, position.x, yPos);
            });
          }
        });
      },
    };

    this.chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'SDE Years',
            data: values,
            backgroundColor: bgColors,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.raw.toFixed(2)} SDE Years`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'SDE Years' },
            grace: '10%', // Add space for labels
          },
        },
      },
      plugins: [dataLabelsPlugin],
    });
  }

  _renderSummaryTable(parent, metrics) {
    const scenarioName =
      {
        EffectiveBIS: 'Effective BIS',
        TeamBIS: 'Team BIS',
        FundedHC: 'Funded Headcount',
      }[this.currentScenario] || this.currentScenario;

    this._createCollapsibleSection(
      `Detailed Team Breakdown (${scenarioName})`,
      (container) => {
        const table = document.createElement('table');
        table.className = 'table table-striped table-hover';

        const thead = table.createTHead();
        const headerRow = thead.insertRow();

        const hcColumnName = `Headcount (${scenarioName})`;
        const showNewHireCol = this.currentScenario === 'FundedHC';

        const headers = ['Team', hcColumnName, 'Gross', 'Deductions', 'AI Gain'];
        if (showNewHireCol) headers.push('New Hires');
        headers.push('Net Capacity');

        headers.forEach((text) => {
          const th = document.createElement('th');
          th.textContent = text;
          headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        const teams = SystemService.getCurrentSystem().teams || [];

        teams.forEach((team) => {
          const m = metrics[team.teamId]?.[this.currentScenario];
          if (!m) return;

          const row = tbody.insertRow();
          row.insertCell().textContent = team.teamIdentity || team.teamName;
          row.insertCell().textContent = m.totalHeadcount.toFixed(1);
          row.insertCell().textContent = m.grossYrs.toFixed(2);

          const dedCell = row.insertCell();
          dedCell.textContent = `-${m.deductYrs.toFixed(2)}`;
          dedCell.className = 'capacity-summary-deduction';

          const aiCell = row.insertCell();
          aiCell.textContent = `+${(m.deductionsBreakdown.aiProductivityGainYrs || 0).toFixed(2)}`;
          aiCell.className = 'capacity-summary-gain';

          if (showNewHireCol) {
            const nhCell = row.insertCell();
            nhCell.textContent = `+${(m.deductionsBreakdown.newHireGainYrs || 0).toFixed(2)}`;
            nhCell.className = 'capacity-summary-gain';
          }

          const netCell = row.insertCell();
          netCell.textContent = m.netYrs.toFixed(2);
          netCell.className = 'capacity-summary-net';
          if (m.netYrs <= 0) netCell.classList.add('capacity-summary-net--negative');
        });

        container.appendChild(table);
      },
      parent,
      true // collapsed by default
    );

    // Render Narrative Section below table
    this._renderNarrativeSection(parent, metrics);
  }

  _renderNarrativeSection(parent, metrics) {
    this._createCollapsibleSection(
      'Capacity Narrative',
      (container) => {
        const totals = metrics.totals[this.currentScenario];
        const scenarioName = this.currentScenario;
        const aiHC = totals.totalHeadcount - totals.humanHeadcount;

        const wrapper = document.createElement('div');
        wrapper.className = 'capacity-narrative-content';

        // 1. Overall Summary
        const h4 = document.createElement('h4');
        h4.textContent = `Overall Capacity Summary (${scenarioName})`;
        h4.className = 'capacity-narrative-heading';
        wrapper.appendChild(h4);

        const p1 = document.createElement('p');
        p1.append(document.createTextNode("For this scenario, the organization's "));
        p1.appendChild(
          this._createStrong(`Gross Capacity is ${totals.grossYrs.toFixed(2)} SDE Years`)
        );
        p1.append(
          document.createTextNode('. This initial figure is derived from a total headcount of ')
        );
        p1.appendChild(this._createStrong(totals.totalHeadcount.toFixed(1)));
        p1.append(document.createTextNode(', which is composed of '));
        p1.appendChild(this._createStrong(`${totals.humanHeadcount.toFixed(1)} Human Engineers`));
        p1.append(document.createTextNode(' and '));
        p1.appendChild(this._createStrong(`${aiHC.toFixed(1)} AI Engineers`));
        p1.append(document.createTextNode('.'));
        wrapper.appendChild(p1);

        const p2 = document.createElement('p');
        p2.append(
          document.createTextNode(
            'To determine realistic project availability, we first subtract time for operational overheads. These "capacity sinks"—such as leave, public holidays, recurring meetings, and organizational events—amount to a total deduction of '
          )
        );
        p2.appendChild(this._createStrong(`${totals.deductYrs.toFixed(2)} SDE Years`));
        p2.append(
          document.createTextNode(
            ". It's important to note that these sinks are calculated based on the "
          )
        );
        p2.appendChild(this._createEm('human headcount only'));
        p2.append(
          document.createTextNode(
            ', as AI engineers do not take vacation or attend most team meetings.'
          )
        );
        wrapper.appendChild(p2);

        const aiGain = totals.deductionsBreakdown.aiProductivityGainYrs || 0;
        const p3 = document.createElement('p');
        p3.append(
          document.createTextNode(
            'After accounting for those deductions, a productivity dividend is applied. The use of AI tooling provides a calculated gain of '
          )
        );
        p3.appendChild(this._createStrong(`${aiGain.toFixed(2)} SDE Years`));
        p3.append(
          document.createTextNode(
            ' across the organization. This gain is applied back to the available human capacity.'
          )
        );
        wrapper.appendChild(p3);

        // New Hire Narrative
        const newHireGain = totals.deductionsBreakdown.newHireGainYrs || 0;
        if (this.currentScenario === 'FundedHC' && newHireGain > 0) {
          const pNH = document.createElement('p');
          pNH.append(
            document.createTextNode(
              'Additionally, based on the latest Resource Forecasting simulation, we project a '
            )
          );
          pNH.appendChild(
            this._createStrong(`New Hire Capacity Gain of ${newHireGain.toFixed(2)} SDE Years`)
          );
          pNH.append(
            document.createTextNode(
              '. This represents the productive capacity contributed by new hires ramping up during the forecast period.'
            )
          );
          wrapper.appendChild(pNH);
        }

        const p4 = document.createElement('p');
        p4.append(
          document.createTextNode(
            'Therefore, after subtracting the sinks from the gross capacity and adding back the AI productivity gains'
          )
        );
        if (newHireGain > 0) {
          p4.append(document.createTextNode(' and new hire capacity'));
        }
        p4.append(document.createTextNode(', the final estimated '));
        p4.appendChild(
          this._createStrong(`Net Project Capacity is ${totals.netYrs.toFixed(2)} SDE Years`)
        );
        p4.append(document.createTextNode(' for the organization.'));
        wrapper.appendChild(p4);

        // 2. Team Breakdown
        const hr = document.createElement('hr');
        hr.className = 'capacity-narrative-divider';
        wrapper.appendChild(hr);

        const h4Team = document.createElement('h4');
        h4Team.textContent = `Team-Specific Breakdown (${scenarioName} Scenario)`;
        h4Team.className = 'capacity-narrative-heading';
        wrapper.appendChild(h4Team);

        const teams = SystemService.getCurrentSystem().teams || [];
        teams.forEach((team) => {
          const m = metrics[team.teamId]?.[this.currentScenario];
          if (!m) return;

          const tGain = m.deductionsBreakdown.aiProductivityGainYrs || 0;
          const tNHGain = m.deductionsBreakdown.newHireGainYrs || 0;

          const pTeam = document.createElement('p');
          pTeam.className = 'capacity-narrative-team-paragraph';
          pTeam.appendChild(this._createStrong(team.teamIdentity || team.teamName));
          pTeam.append(document.createTextNode(': Starts with a Gross Capacity of '));
          pTeam.appendChild(this._createStrong(`${m.grossYrs.toFixed(2)} SDE Years`));
          pTeam.append(document.createTextNode('. From this, '));
          pTeam.appendChild(this._createStrong(`${m.deductYrs.toFixed(2)} SDE Years`));
          pTeam.append(
            document.createTextNode(
              ' are deducted for human-centric sinks (leave, overhead, etc.). An estimated '
            )
          );
          pTeam.appendChild(this._createStrong(`${tGain.toFixed(2)} SDE Years`));
          pTeam.append(
            document.createTextNode(
              ' are then regained through AI tooling productivity enhancements.'
            )
          );
          if (this.currentScenario === 'FundedHC' && tNHGain > 0) {
            pTeam.append(document.createTextNode(' We also project a '));
            pTeam.appendChild(this._createStrong(`${tNHGain.toFixed(2)} SDE Years`));
            pTeam.append(document.createTextNode(' gain from new hires.'));
          }
          pTeam.append(
            document.createTextNode(' This results in a final Net Project Capacity of ')
          );
          pTeam.appendChild(this._createStrong(`${m.netYrs.toFixed(2)} SDE Years`));
          pTeam.append(document.createTextNode(' for this team.'));
          wrapper.appendChild(pTeam);
        });

        container.appendChild(wrapper);
      },
      parent,
      true // collapsed by default
    );
  }

  _createCollapsibleSection(titleText, contentRenderer, parent, isCollapsed = true) {
    const section = document.createElement('div');
    section.className = 'capacity-collapsible-section';
    // Removed inline margin-top to rely on CSS classes

    const header = document.createElement('div');
    header.className = 'capacity-collapsible-header';

    const titleGroup = document.createElement('div');
    const title = document.createElement('h4');
    title.className = 'capacity-section-title';
    title.textContent = titleText;
    titleGroup.appendChild(title);
    header.appendChild(titleGroup);

    const icon = document.createElement('i');
    icon.className = `fas fa-chevron-${isCollapsed ? 'down' : 'up'} capacity-collapsible-icon`;
    header.appendChild(icon);

    const body = document.createElement('div');
    body.className = 'capacity-collapsible-body';
    if (!isCollapsed) {
      body.classList.add('capacity-collapsible-body--visible');
    }

    header.onclick = () => {
      const isVisible = body.classList.contains('capacity-collapsible-body--visible');
      const nextVisible = !isVisible;
      body.classList.toggle('capacity-collapsible-body--visible', nextVisible);
      icon.className = `fas fa-chevron-${nextVisible ? 'up' : 'down'} capacity-collapsible-icon`;
      header.classList.toggle('capacity-collapsible-header--active', nextVisible);
    };

    section.appendChild(header);
    contentRenderer(body);
    section.appendChild(body);
    parent.appendChild(section);
  }

  /**
   * Returns structured context data for AI Chat Panel integration
   * Implements the AI_VIEW_REGISTRY contract
   * @returns {Object} Context object with view-specific data
   */
  getAIContext() {
    const metrics = this.capacityEngine?.calculateAllMetrics();
    const data =
      this.currentChartTeamId === '__ORG_VIEW__'
        ? metrics?.totals?.[this.currentScenario]
        : metrics?.[this.currentChartTeamId]?.[this.currentScenario];

    return {
      viewTitle: 'Capacity Dashboard',
      currentScenario: this.currentScenario,
      currentTeamView:
        this.currentChartTeamId === '__ORG_VIEW__' ? 'Organization' : this.currentChartTeamId,
      grossCapacity: data?.grossYrs?.toFixed(2),
      netCapacity: data?.netYrs?.toFixed(2),
      totalDeductions: data?.deductYrs?.toFixed(2),
      aiProductivityGain: data?.deductionsBreakdown?.aiProductivityGainYrs?.toFixed(2),
      teamCount: SystemService.getCurrentSystem()?.teams?.length || 0,
    };
  }

  _createStrong(text) {
    const strong = document.createElement('strong');
    strong.textContent = text;
    return strong;
  }

  _createEm(text) {
    const em = document.createElement('em');
    em.textContent = text;
    return em;
  }

  _clearElement(element) {
    if (!element) return;
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }
}
