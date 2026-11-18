/**
 * PAP Studio — Interactive Application Controller, Excel Template Exporter & PDF Report Generator
 */

(function () {
  'use strict';

  const MONTH_NAMES = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sept', 'Oct', 'Nov', 'Dic',
    'Ene+1', 'Feb+1', 'Mar+1', 'Abr+1', 'May+1', 'Jun+1'
  ];

  const QUARTER_NAMES = [
    'Trim 1', 'Trim 2', 'Trim 3', 'Trim 4',
    'Trim 5', 'Trim 6', 'Trim 7', 'Trim 8',
    'Trim 9', 'Trim 10', 'Trim 11', 'Trim 12',
    'Trim 13', 'Trim 14', 'Trim 15', 'Trim 16',
    'Trim 17', 'Trim 18'
  ];

  // Only the Faculty Preset (U.Na.M.) + Blank template for "+ Crear plan"
  const PRESETS = {
    unam_12m: {
      familyName: 'Familia TP Investigación N° 2 (FI - U.Na.M.)',
      periodUnit: 'month',
      horizonLength: 12,
      aggregateUnit: 'Unidades',
      initialWorkers: 180,
      minWorkers: 100,
      shiftsPerDay: 3,
      workersPerShift: 60,
      maxWorkers: 180,
      hoursPerShift: 8,
      hoursPerUnit: 2.3,
      machineCapacityUnits: 0,
      initialInventory: 0,
      targetEndingInventory: 0,
      costInputMode: 'hourly',
      regularHourlyCost: 4,
      overtimeHourlyCost: 6,
      idleHourlyCost: 4,
      regularUnitCost: 9.2,
      overtimeUnitCost: 13.8,
      subcontractUnitCost: 7,
      holdingCost: 6,
      hiringCost: 5000,
      layoffCost: 8000,
      backorderCost: 25,
      safetyStockMode: 'units',
      safetyStockValue: 250,
      maxOvertimePercent: 10,
      maxSubcontractUnits: 0,
      integerWorkers: true,
      integerUnits: false,
      regularPayrollFixed: true,
      allowBackorders: false,
      globalNoLayoffs: false,
      periods: [
        { name: 'Ene', workDays: 20, demand: 6255, committedOrders: 6300, pendingOrder: 600, noLayoffs: false },
        { name: 'Feb', workDays: 20, demand: 5932, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Mar', workDays: 22, demand: 6408, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Abr', workDays: 20, demand: 6298, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'May', workDays: 21, demand: 7491, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Jun', workDays: 20, demand: 7903, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Jul', workDays: 21, demand: 7811, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Ago', workDays: 21, demand: 7872, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Sept', workDays: 22, demand: 9114, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Oct', workDays: 22, demand: 10111, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Nov', workDays: 22, demand: 9914, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Dic', workDays: 20, demand: 10184, committedOrders: 0, pendingOrder: 0, noLayoffs: false }
      ]
    },

    blank: {
      familyName: 'Nuevo Plan Agregado',
      periodUnit: 'month',
      horizonLength: 6,
      aggregateUnit: 'Unidades',
      initialWorkers: 100,
      minWorkers: 60,
      shiftsPerDay: 2,
      workersPerShift: 60,
      maxWorkers: 120,
      hoursPerShift: 8,
      hoursPerUnit: 2.0,
      machineCapacityUnits: 0,
      initialInventory: 0,
      targetEndingInventory: 0,
      costInputMode: 'hourly',
      regularHourlyCost: 4,
      overtimeHourlyCost: 6,
      idleHourlyCost: 4,
      regularUnitCost: 8,
      overtimeUnitCost: 12,
      subcontractUnitCost: 7,
      holdingCost: 6,
      hiringCost: 5000,
      layoffCost: 8000,
      backorderCost: 25,
      safetyStockMode: 'units',
      safetyStockValue: 200,
      maxOvertimePercent: 10,
      maxSubcontractUnits: 0,
      integerWorkers: true,
      integerUnits: false,
      regularPayrollFixed: true,
      allowBackorders: false,
      globalNoLayoffs: false,
      periods: [
        { name: 'Ene', workDays: 20, demand: 5000, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Feb', workDays: 20, demand: 5200, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Mar', workDays: 22, demand: 5800, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Abr', workDays: 20, demand: 6000, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'May', workDays: 21, demand: 6500, committedOrders: 0, pendingOrder: 0, noLayoffs: false },
        { name: 'Jun', workDays: 20, demand: 7000, committedOrders: 0, pendingOrder: 0, noLayoffs: false }
      ]
    }
  };

  let state = {
    activeTab: 'workbench',
    activeStrategy: 'chase', // 'chase' (Caza) | 'level' (Nivelado) | 'optimal' (Optimizado)
    calculatedParams: null,
    draftParams: JSON.parse(JSON.stringify(PRESETS.blank)),
    results: null,
    isDrawerOpen: false,
    isDirty: false
  };

  // Formatters
  function fmtCurrency(val) {
    return '$' + Math.round(val || 0).toLocaleString('es-AR');
  }

  function fmtCurrencyDec(val) {
    return '$' + Number(val || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtNumber(val, maxDec = 1) {
    return Number(val || 0).toLocaleString('es-AR', { maximumFractionDigits: maxDec });
  }

  // Open or Close Plan Data Entry Dialog Modal
  function openDrawer(mode) {
    const modalBackdrop = document.getElementById('planModalBackdrop');
    const title = document.getElementById('drawerFormTitle');

    if (mode === 'create') {
      title.textContent = '+ Nuevo Plan Agregado';
      state.draftParams = JSON.parse(JSON.stringify(PRESETS.blank));
      syncFormInputsFromDraft();
      renderDraftPeriodsTable();
      setDirty(true);
    } else {
      title.textContent = 'Editar Datos de Entrada';
      state.draftParams = JSON.parse(JSON.stringify(state.calculatedParams));
      syncFormInputsFromDraft();
      renderDraftPeriodsTable();
      setDirty(false);
    }

    modalBackdrop.classList.add('open');
    state.isDrawerOpen = true;
  }

  function closeDrawer() {
    const modalBackdrop = document.getElementById('planModalBackdrop');
    modalBackdrop.classList.remove('open');
    state.isDrawerOpen = false;
    setDirty(false);
  }

  function setDirty(dirty) {
    state.isDirty = dirty;
    const ind = document.getElementById('dirtyIndicator');
    if (ind) {
      ind.classList.toggle('visible', dirty);
    }
  }

  // Adjust draft horizon length (3 to 18 periods) inside the form without recalculating the main plan
  function setDraftHorizonLength(newLen) {
    const p = state.draftParams;
    const T = Math.max(3, Math.min(18, Math.round(newLen || 6)));
    const isQuarter = p.periodUnit === 'quarter';
    const names = isQuarter ? QUARTER_NAMES : MONTH_NAMES;
    const defaultDays = isQuarter ? 62 : 21;

    while (p.periods.length < T) {
      const idx = p.periods.length;
      const prevDemand = idx > 0 ? p.periods[idx - 1].demand : 2500;
      p.periods.push({
        name: names[idx] || `P${idx + 1}`,
        workDays: defaultDays,
        demand: prevDemand,
        committedOrders: 0,
        pendingOrder: 0,
        noLayoffs: false
      });
    }
    if (p.periods.length > T) {
      p.periods.length = T;
    }

    p.horizonLength = T;
  }

  // Populate Form Inputs from draftParams
  function syncFormInputsFromDraft() {
    const p = state.draftParams;
    document.getElementById('familyNameInput').value = p.familyName;
    document.getElementById('periodUnitSelect').value = p.periodUnit;
    document.getElementById('horizonLengthInput').value = p.periods.length;
    document.getElementById('aggregateUnitInput').value = p.aggregateUnit;

    document.getElementById('initialWorkersInput').value = p.initialWorkers;
    document.getElementById('shiftsPerDayInput').value = p.shiftsPerDay || 1;
    document.getElementById('workersPerShiftInput').value = p.workersPerShift || 0;
    document.getElementById('hoursPerShiftInput').value = p.hoursPerShift;
    document.getElementById('hoursPerUnitInput').value = p.hoursPerUnit;
    document.getElementById('initialInventoryInput').value = p.initialInventory;
    document.getElementById('targetEndingInventoryInput').value = p.targetEndingInventory;

    document.getElementById('costInputModeSelect').value = p.costInputMode;
    document.getElementById('unitCostFields').style.display = p.costInputMode === 'unit' ? 'grid' : 'none';
    document.getElementById('hourlyCostFields').style.display = p.costInputMode === 'hourly' ? 'grid' : 'none';

    document.getElementById('regularUnitCostInput').value = p.regularUnitCost;
    document.getElementById('overtimeUnitCostInput').value = p.overtimeUnitCost;
    document.getElementById('regularHourlyCostInput').value = p.regularHourlyCost;
    document.getElementById('overtimeHourlyCostInput').value = p.overtimeHourlyCost;
    document.getElementById('idleHourlyCostInput').value = p.idleHourlyCost ?? p.regularHourlyCost;
    document.getElementById('subcontractUnitCostInput').value = p.subcontractUnitCost;
    document.getElementById('holdingCostInput').value = p.holdingCost;
    document.getElementById('hiringCostInput').value = p.hiringCost;
    document.getElementById('layoffCostInput').value = p.layoffCost;
    document.getElementById('backorderCostInput').value = p.backorderCost;

    document.getElementById('minWorkersInput').value = p.minWorkers || 0;
    document.getElementById('maxWorkersInput').value = p.maxWorkers;
    document.getElementById('safetyStockModeSelect').value = p.safetyStockMode;
    document.getElementById('safetyStockValueInput').value = p.safetyStockValue;
    document.getElementById('safetyStockUnitTag').textContent = p.safetyStockMode === 'percent' ? '% dem.' : 'unid.';
    document.getElementById('maxOvertimePercentInput').value = p.maxOvertimePercent;
    document.getElementById('maxSubcontractUnitsInput').value = p.maxSubcontractUnits;
    document.getElementById('machineCapacityInput').value = p.machineCapacityUnits;

    document.getElementById('integerWorkersCheck').checked = Boolean(p.integerWorkers);
    document.getElementById('regularPayrollFixedCheck').checked = Boolean(p.regularPayrollFixed);
    document.getElementById('allowBackordersCheck').checked = Boolean(p.allowBackorders);
    document.getElementById('globalNoLayoffsCheck').checked = Boolean(p.globalNoLayoffs);

    updateFormSummaryBadges();
  }

  function updateFormSummaryBadges() {
    const p = state.draftParams;
    const unitLabel = p.periodUnit === 'quarter' ? 'Trimestres' : 'Meses';
    document.getElementById('badgeHorizon').textContent = `${p.periods.length} ${unitLabel}`;
    const sampleDays = p.periods[0]?.workDays || 20;
    const sampleRate = (sampleDays * p.hoursPerShift) / p.hoursPerUnit;
    document.getElementById('badgeProductivity').textContent = `${fmtNumber(sampleRate, 1)} u/op`;
    document.getElementById('badgeCostMode').textContent = p.costInputMode === 'hourly' ? 'U.M. / Hora' : 'U.M. / Unid.';
  }

  // Render the Period Demand & WorkDays Table inside the Form Drawer
  function renderDraftPeriodsTable() {
    const tbody = document.getElementById('formPeriodsTbody');
    const periods = state.draftParams.periods;

    tbody.innerHTML = periods.map((per, idx) => `
      <tr>
        <td><input type="text" class="p-name draft-period-name" data-idx="${idx}" value="${per.name}" /></td>
        <td><input type="number" class="draft-period-days" data-idx="${idx}" min="1" max="100" value="${per.workDays}" /></td>
        <td><input type="number" class="draft-period-demand" data-idx="${idx}" min="0" step="50" value="${Math.round(per.demand)}" /></td>
        <td><input type="number" class="draft-period-comm" data-idx="${idx}" min="0" step="50" value="${Math.round(per.committedOrders || 0)}" /></td>
        <td><input type="number" class="draft-period-pend" data-idx="${idx}" min="0" step="50" value="${Math.round(per.pendingOrder || 0)}" /></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.draft-period-name').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.draftParams.periods[idx].name = e.target.value.trim() || `P${idx + 1}`;
        setDirty(true);
      });
    });

    tbody.querySelectorAll('.draft-period-days').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.draftParams.periods[idx].workDays = Math.max(1, parseInt(e.target.value, 10) || 20);
        setDirty(true);
      });
    });

    tbody.querySelectorAll('.draft-period-demand').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.draftParams.periods[idx].demand = Math.max(0, parseFloat(e.target.value) || 0);
        setDirty(true);
      });
    });

    tbody.querySelectorAll('.draft-period-comm').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.draftParams.periods[idx].committedOrders = Math.max(0, parseFloat(e.target.value) || 0);
        setDirty(true);
      });
    });

    tbody.querySelectorAll('.draft-period-pend').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx, 10);
        state.draftParams.periods[idx].pendingOrder = Math.max(0, parseFloat(e.target.value) || 0);
        setDirty(true);
      });
    });
  }

  // Read Form Inputs into draftParams (does NOT calculate the plan until "Calcular" is clicked)
  function readFormInputsIntoDraft(changedElementId) {
    const p = state.draftParams;
    p.familyName = document.getElementById('familyNameInput').value.trim() || 'Familia Agregada';
    const newUnit = document.getElementById('periodUnitSelect').value;
    let rebuildPeriodRows = false;

    if (newUnit !== p.periodUnit) {
      p.periodUnit = newUnit;
      const names = newUnit === 'quarter' ? QUARTER_NAMES : MONTH_NAMES;
      p.periods.forEach((per, idx) => {
        per.name = names[idx] || `P${idx + 1}`;
        per.workDays = newUnit === 'quarter' ? 62 : 21;
      });
      rebuildPeriodRows = true;
    }

    const newHorizon = parseInt(document.getElementById('horizonLengthInput').value, 10);
    if (!isNaN(newHorizon) && newHorizon >= 3 && newHorizon <= 18 && newHorizon !== p.periods.length) {
      setDraftHorizonLength(newHorizon);
      rebuildPeriodRows = true;
    }

    p.aggregateUnit = document.getElementById('aggregateUnitInput').value.trim() || 'Unidades';
    p.initialWorkers = Math.max(0, parseFloat(document.getElementById('initialWorkersInput').value) || 0);
    p.shiftsPerDay = Math.max(1, parseInt(document.getElementById('shiftsPerDayInput').value, 10) || 1);
    p.workersPerShift = Math.max(0, parseInt(document.getElementById('workersPerShiftInput').value, 10) || 0);

    if (changedElementId === 'shiftsPerDayInput' || changedElementId === 'workersPerShiftInput') {
      p.maxWorkers = p.shiftsPerDay * p.workersPerShift;
      document.getElementById('maxWorkersInput').value = p.maxWorkers;
    } else {
      p.maxWorkers = Math.max(0, parseFloat(document.getElementById('maxWorkersInput').value) || 0);
    }

    p.hoursPerShift = Math.max(1, parseFloat(document.getElementById('hoursPerShiftInput').value) || 8);
    p.hoursPerUnit = Math.max(0.05, parseFloat(document.getElementById('hoursPerUnitInput').value) || 1);
    p.initialInventory = Math.max(0, parseFloat(document.getElementById('initialInventoryInput').value) || 0);
    p.targetEndingInventory = Math.max(0, parseFloat(document.getElementById('targetEndingInventoryInput').value) || 0);

    p.costInputMode = document.getElementById('costInputModeSelect').value;
    document.getElementById('unitCostFields').style.display = p.costInputMode === 'unit' ? 'grid' : 'none';
    document.getElementById('hourlyCostFields').style.display = p.costInputMode === 'hourly' ? 'grid' : 'none';

    p.regularUnitCost = Math.max(0, parseFloat(document.getElementById('regularUnitCostInput').value) || 0);
    p.overtimeUnitCost = Math.max(0, parseFloat(document.getElementById('overtimeUnitCostInput').value) || 0);
    p.regularHourlyCost = Math.max(0, parseFloat(document.getElementById('regularHourlyCostInput').value) || 0);
    p.overtimeHourlyCost = Math.max(0, parseFloat(document.getElementById('overtimeHourlyCostInput').value) || 0);
    p.idleHourlyCost = Math.max(0, parseFloat(document.getElementById('idleHourlyCostInput').value) || 0);
    p.subcontractUnitCost = Math.max(0, parseFloat(document.getElementById('subcontractUnitCostInput').value) || 0);
    p.holdingCost = Math.max(0, parseFloat(document.getElementById('holdingCostInput').value) || 0);
    p.hiringCost = Math.max(0, parseFloat(document.getElementById('hiringCostInput').value) || 0);
    p.layoffCost = Math.max(0, parseFloat(document.getElementById('layoffCostInput').value) || 0);
    p.backorderCost = Math.max(0, parseFloat(document.getElementById('backorderCostInput').value) || 0);

    p.minWorkers = Math.max(0, parseFloat(document.getElementById('minWorkersInput').value) || 0);
    p.safetyStockMode = document.getElementById('safetyStockModeSelect').value;
    p.safetyStockValue = Math.max(0, parseFloat(document.getElementById('safetyStockValueInput').value) || 0);
    document.getElementById('safetyStockUnitTag').textContent = p.safetyStockMode === 'percent' ? '% dem.' : 'unid.';

    p.maxOvertimePercent = Math.max(0, parseFloat(document.getElementById('maxOvertimePercentInput').value) || 0);
    p.maxSubcontractUnits = Math.max(0, parseFloat(document.getElementById('maxSubcontractUnitsInput').value) || 0);
    p.machineCapacityUnits = Math.max(0, parseFloat(document.getElementById('machineCapacityInput').value) || 0);

    p.integerWorkers = document.getElementById('integerWorkersCheck').checked;
    p.regularPayrollFixed = document.getElementById('regularPayrollFixedCheck').checked;
    p.allowBackorders = document.getElementById('allowBackordersCheck').checked;
    p.globalNoLayoffs = document.getElementById('globalNoLayoffsCheck').checked;

    if (rebuildPeriodRows) {
      renderDraftPeriodsTable();
    }
    updateFormSummaryBadges();
    setDirty(true);
  }

  // Triggered ONLY when user clicks "Calcular"
  function executePlanCalculation() {
    state.calculatedParams = JSON.parse(JSON.stringify(state.draftParams));
    setDirty(false);
    state.results = PAPSolver.computeAllStrategies(state.calculatedParams);

    // Reveal calculated plan views and hide welcome empty states
    const welcomeEl = document.getElementById('welcomeEmptyState');
    const planViewEl = document.getElementById('planResultsView');
    const compEmptyEl = document.getElementById('comparisonEmptyState');
    const compViewEl = document.getElementById('comparisonResultsView');

    if (welcomeEl) welcomeEl.style.display = 'none';
    if (planViewEl) planViewEl.style.display = 'flex';
    if (compEmptyEl) compEmptyEl.style.display = 'none';
    if (compViewEl) compViewEl.style.display = 'flex';

    // Enable Export buttons
    document.getElementById('btnOpenExportExcel').disabled = false;
    document.getElementById('btnOpenExportPDF').disabled = false;

    renderCalculatedDashboard();
  }

  // Render the calculated plan views
  function renderCalculatedDashboard() {
    const p = state.calculatedParams;

    const unitLabel = p.periodUnit === 'quarter' ? 'Trimestres' : 'Meses';
    document.getElementById('railFamilyName').textContent = p.familyName;
    document.getElementById('railHorizon').textContent = `${p.periods.length} ${unitLabel}`;
    document.getElementById('railInitWorkers').textContent = `${fmtNumber(p.initialWorkers, 0)} op.`;
    document.getElementById('railMinWorkers').textContent = `${fmtNumber(p.minWorkers || 0, 0)} op.`;
    document.getElementById('railMaxWorkers').textContent = p.maxWorkers > 0 ? `${fmtNumber(p.maxWorkers, 0)} op.` : 'Sin límite';
    document.getElementById('railSafetyStock').textContent = p.safetyStockMode === 'percent'
      ? `${p.safetyStockValue}% dem.`
      : `${fmtNumber(p.safetyStockValue, 0)} u.`;
    document.getElementById('railMaxOt').textContent = `${p.maxOvertimePercent}%`;

    const activePlan = state.results[state.activeStrategy] || state.results.chase;

    renderKpiStrip(activePlan);
    renderPolicyBanner(activePlan);
    renderMasterTable(activePlan);
    renderStrategyComparisonTable();
    renderCharts(activePlan);
  }

  function renderKpiStrip(activePlan) {
    const t = activePlan.totals;
    document.getElementById('kpiTotalCost').textContent = fmtCurrency(t.costs.total);

    const allPlans = [
      state.results.chase,
      state.results.level,
      state.results.optimal
    ];
    const maxCost = Math.max(...allPlans.map((pl) => pl.totals.costs.total));
    const minCost = Math.min(...allPlans.map((pl) => pl.totals.costs.total));
    const diffBadge = document.getElementById('kpiCostDiffBadge');

    if (Math.abs(t.costs.total - minCost) < 10) {
      const saved = maxCost - t.costs.total;
      const pct = maxCost > 0 ? ((saved / maxCost) * 100).toFixed(1) : '0.0';
      diffBadge.innerHTML = `<span class="badge badge-success">&#9733; Mínimo costo (-${pct}% vs peor)</span>`;
    } else {
      const extra = t.costs.total - minCost;
      const pct = minCost > 0 ? ((extra / minCost) * 100).toFixed(1) : '0.0';
      diffBadge.innerHTML = `<span class="badge badge-warning">+${fmtCurrency(extra)} (+${pct}%) vs Optimizado</span>`;
    }

    document.getElementById('kpiUnitCost').textContent = fmtCurrencyDec(t.unitCost);
    document.getElementById('kpiTotalUnitsSub').textContent =
      `${fmtNumber(t.production, 0)} ${state.calculatedParams.aggregateUnit} totales`;

    document.getElementById('kpiTurnover').textContent =
      `+${fmtNumber(t.hired, 0)} / -${fmtNumber(t.laidOff, 0)} op.`;
    document.getElementById('kpiMinMaxWorkersSub').textContent =
      `Mín. Planta: ${state.calculatedParams.minWorkers || 0} | Máx: ${state.calculatedParams.maxWorkers || '∞'}`;

    document.getElementById('kpiAvgInventory').textContent = `${fmtNumber(t.avgInventory, 0)} u.`;
    document.getElementById('kpiIdleHoursSub').textContent =
      `Horas ociosas: ${fmtNumber(t.idleHours, 1)} h (${fmtCurrency(t.costs.idle)})`;

    document.getElementById('kpiUtilization').textContent = `${fmtNumber(t.avgUtilization, 1)}%`;
    document.getElementById('kpiStrategyDescShort').textContent = activePlan.strategyName;
    document.getElementById('activeStrategyTag').textContent = activePlan.strategyName;
  }

  function renderPolicyBanner(activePlan) {
    const banner = document.getElementById('policyStatusBanner');
    const title = document.getElementById('policyStatusTitle');
    const details = document.getElementById('policyStatusDetails');
    const badge = document.getElementById('policyStatusBadge');
    const p = state.calculatedParams;

    if (activePlan.warnings.length === 0) {
      banner.className = 'policy-alert-box ok';
      title.innerHTML = '&#10003; Cumplimiento Total de Políticas Operativas y Restricciones de Planta';
      details.textContent =
        `Se respeta el mínimo de ${p.minWorkers || 0} operarios en planta, el máximo de ${p.maxWorkers || '∞'} operarios (${p.shiftsPerDay || 1} turnos), el stock de seguridad (${p.safetyStockValue} u.) y el límite del ${p.maxOvertimePercent}% de horas extraordinarias.`;
      badge.className = 'badge badge-success';
      badge.textContent = '100% Factible';
    } else {
      banner.className = 'policy-alert-box warn';
      title.innerHTML = `&#9888; Atención: Se detectaron ${activePlan.warnings.length} incumplimientos de políticas o capacidad`;
      const items = activePlan.warnings.slice(0, 4).map((w) => `<li>${w}</li>`).join('');
      const more = activePlan.warnings.length > 4 ? `<li>...y ${activePlan.warnings.length - 4} alertas adicionales.</li>` : '';
      details.innerHTML = `<ul class="alert-list">${items}${more}</ul>`;
      badge.className = 'badge badge-danger';
      badge.textContent = 'Revisar Restricciones';
    }
  }

  // Render Master Aggregate Production Planning Table
  function renderMasterTable(activePlan) {
    const thead = document.getElementById('masterPapThead');
    const tbody = document.getElementById('masterPapTbody');
    const periods = activePlan.periods;
    const p = state.calculatedParams;

    let headHtml = `<tr>
      <th title="${p.familyName}">Ítem / Variable del Plan</th>
      <th style="text-align:center; min-width:72px;">Inicial</th>`;

    periods.forEach((per) => {
      headHtml += `<th style="min-width:86px; text-align:right;">${per.name}</th>`;
    });
    headHtml += `<th class="total-col">Total / Prom.</th></tr>`;
    thead.innerHTML = headHtml;

    const rows = [];

    // SECTION I
    rows.push(`<tr class="row-group-header"><td colspan="${periods.length + 3}">I. Demanda, Compromisos y Necesidades de Producción</td></tr>`);

    let forecastRow = `<tr><td>Previsión de demanda [Unid.]</td><td class="num-cell" style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      forecastRow += `<td class="num-cell">${fmtNumber(per.forecast, 0)}</td>`;
    });
    forecastRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.forecast, 0)}</td></tr>`;
    rows.push(forecastRow);

    let workDaysRow = `<tr><td>Días productivos</td><td class="num-cell" style="text-align:center;">—</td>`;
    let totalWorkDays = 0;
    periods.forEach((per) => {
      totalWorkDays += per.workDays;
      workDaysRow += `<td class="num-cell">${per.workDays}</td>`;
    });
    workDaysRow += `<td class="total-col num-cell">${totalWorkDays}</td></tr>`;
    rows.push(workDaysRow);

    let ssRow = `<tr><td>Stock de seguridad [Unid.]</td><td class="num-cell" style="text-align:center;">${fmtNumber(p.initialInventory, 0)}</td>`;
    periods.forEach((per, idx) => {
      ssRow += `<td class="num-cell">${idx === 0 || p.safetyStockMode === 'percent' ? fmtNumber(per.safetyStock, 0) : `${fmtNumber(per.safetyStock, 0)} (mant.)`}</td>`;
    });
    ssRow += `<td class="total-col num-cell">${fmtNumber(periods[0]?.safetyStock || 0, 0)}</td></tr>`;
    rows.push(ssRow);

    let pendingRow = `<tr><td>Pedido de entrega pendiente [Unid.]</td><td class="num-cell" style="text-align:center;">—</td>`;
    let sumPending = 0;
    periods.forEach((per) => {
      sumPending += per.pendingOrder || 0;
      pendingRow += `<td class="num-cell">${per.pendingOrder ? fmtNumber(per.pendingOrder, 0) : '—'}</td>`;
    });
    pendingRow += `<td class="total-col num-cell">${fmtNumber(sumPending, 0)}</td></tr>`;
    rows.push(pendingRow);

    let commRow = `<tr><td>Pedidos comprometidos [Unid.]</td><td class="num-cell" style="text-align:center;">—</td>`;
    let sumCommitted = 0;
    periods.forEach((per) => {
      sumCommitted += per.committedOrders || 0;
      commRow += `<td class="num-cell">${per.committedOrders ? fmtNumber(per.committedOrders, 0) : '—'}</td>`;
    });
    commRow += `<td class="total-col num-cell">${fmtNumber(sumCommitted, 0)}</td></tr>`;
    rows.push(commRow);

    let needRow = `<tr class="row-highlight"><td><strong>Necesidades de producción [Unid.]</strong></td><td class="num-cell" style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      needRow += `<td class="num-cell"><strong>${fmtNumber(per.demand, 0)}</strong></td>`;
    });
    needRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.demand, 0)}</td></tr>`;
    rows.push(needRow);

    // SECTION II
    rows.push(`<tr class="row-group-header"><td colspan="${periods.length + 3}">II. Fuerza Laboral (Mín. en Planta: ${p.minWorkers || 0} Op. | Máx: ${p.maxWorkers || '∞'} Op.) y Horas de Mano de Obra</td></tr>`);

    let reqHoursRow = `<tr><td>Horas MO regular requeridas [h]</td><td style="text-align:center;">—</td>`;
    let sumReqHours = 0;
    periods.forEach((per) => {
      sumReqHours += per.regularHoursRequired;
      reqHoursRow += `<td class="num-cell">${fmtNumber(per.regularHoursRequired, 1)}</td>`;
    });
    reqHoursRow += `<td class="total-col num-cell">${fmtNumber(sumReqHours, 1)}</td></tr>`;
    rows.push(reqHoursRow);

    let theoWRow = `<tr><td>Necesidad MO (teórica) [Op.]</td><td style="text-align:center;">—</td>`;
    let sumTheoW = 0;
    periods.forEach((per) => {
      sumTheoW += per.theoreticalWorkers;
      theoWRow += `<td class="num-cell" style="color:var(--text-muted);">${fmtNumber(per.theoreticalWorkers, 2)}</td>`;
    });
    theoWRow += `<td class="total-col num-cell">${fmtNumber(sumTheoW / periods.length, 2)} prom.</td></tr>`;
    rows.push(theoWRow);

    let wfRow = `<tr class="row-highlight"><td><strong>Necesidad MO ajustada (W<sub>t</sub>) [Op.]</strong></td>
      <td class="num-cell" style="text-align:center;">${fmtNumber(p.initialWorkers, 0)}</td>`;
    let sumWorkers = 0;
    periods.forEach((per) => {
      sumWorkers += per.workers;
      const belowMin = (p.minWorkers || 0) > 0 && per.workers + 0.01 < p.minWorkers;
      wfRow += `<td class="num-cell ${belowMin ? 'cell-warning' : ''}">${fmtNumber(per.workers, 1)}</td>`;
    });
    wfRow += `<td class="total-col num-cell">${fmtNumber(sumWorkers / periods.length, 1)} prom.</td></tr>`;
    rows.push(wfRow);

    let varWRow = `<tr><td>Variación en plantilla (Contrat. / Desp.) [Op.]</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      const v = per.variationWorkers;
      const cls = v > 0 ? 'num-cell cell-hire' : (v < 0 ? 'num-cell cell-layoff' : 'num-cell');
      const txt = v > 0 ? `+${fmtNumber(v, 1)}` : fmtNumber(v, 1);
      varWRow += `<td class="${cls}">${txt}</td>`;
    });
    varWRow += `<td class="total-col num-cell">+${fmtNumber(activePlan.totals.hired, 0)} / -${fmtNumber(activePlan.totals.laidOff, 0)}</td></tr>`;
    rows.push(varWRow);

    let availHoursRow = `<tr><td>Horas disponibles (jornada reg.) [h]</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      availHoursRow += `<td class="num-cell">${fmtNumber(per.availableRegHours, 0)}</td>`;
    });
    availHoursRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.availableRegHours, 0)}</td></tr>`;
    rows.push(availHoursRow);

    let maxProdRow = `<tr><td>Máxima producción posible (reg.) [Unid.]</td><td style="text-align:center;">—</td>`;
    let sumMaxProd = 0;
    periods.forEach((per) => {
      sumMaxProd += per.maxRegularUnits;
      maxProdRow += `<td class="num-cell">${fmtNumber(per.maxRegularUnits, 0)}</td>`;
    });
    maxProdRow += `<td class="total-col num-cell">${fmtNumber(sumMaxProd, 0)}</td></tr>`;
    rows.push(maxProdRow);

    let regProdRow = `<tr class="row-highlight"><td><strong>Producción en jornada regular (P<sub>t</sub>) [Unid.]</strong></td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      regProdRow += `<td class="num-cell">${fmtNumber(per.regularProd, 0)}</td>`;
    });
    regProdRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.regularProd, 0)}</td></tr>`;
    rows.push(regProdRow);

    let workedHoursRow = `<tr><td>Horas regulares trabajadas [h]</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      workedHoursRow += `<td class="num-cell">${fmtNumber(per.workedRegHours, 1)}</td>`;
    });
    workedHoursRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.workedRegHours, 1)}</td></tr>`;
    rows.push(workedHoursRow);

    let idleHoursRow = `<tr><td>Horas ociosas [h]</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      idleHoursRow += `<td class="num-cell" style="${per.idleHours > 0.5 ? 'color:var(--accent-warning); font-weight:600;' : ''}">${fmtNumber(per.idleHours, 1)}</td>`;
    });
    idleHoursRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.idleHours, 1)}</td></tr>`;
    rows.push(idleHoursRow);

    let otProdRow = `<tr><td>Producción en jornada extraordinaria (O<sub>t</sub>) [Unid.]</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      const warnOt = per.overtimeProd > per.overtimeCapacity + 0.5;
      otProdRow += `<td class="num-cell ${warnOt ? 'cell-warning' : ''}">${fmtNumber(per.overtimeProd, 0)}</td>`;
    });
    otProdRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.overtimeProd, 0)}</td></tr>`;
    rows.push(otProdRow);

    let otAvailRow = `<tr><td>Horas extraordinarias disponibles (${p.maxOvertimePercent}%) [h]</td><td style="text-align:center;">—</td>`;
    let sumOtAvail = 0;
    periods.forEach((per) => {
      sumOtAvail += per.availableOtHours;
      otAvailRow += `<td class="num-cell" style="color:var(--text-muted);">${fmtNumber(per.availableOtHours, 1)}</td>`;
    });
    otAvailRow += `<td class="total-col num-cell">${fmtNumber(sumOtAvail, 1)}</td></tr>`;
    rows.push(otAvailRow);

    let otWorkedRow = `<tr><td>Horas extraordinarias realizadas [h]</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      otWorkedRow += `<td class="num-cell">${fmtNumber(per.workedOtHours, 1)}</td>`;
    });
    otWorkedRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.overtimeHours, 1)}</td></tr>`;
    rows.push(otWorkedRow);

    let subProdRow = `<tr><td>Subcontratación (S<sub>t</sub>) [Unid.]</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      subProdRow += `<td class="num-cell">${fmtNumber(per.subcontractProd, 0)}</td>`;
    });
    subProdRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.subcontractProd, 0)}</td></tr>`;
    rows.push(subProdRow);

    // SECTION III
    rows.push(`<tr class="row-group-header"><td colspan="${periods.length + 3}">III. Balance de Stock, Faltantes y Cobertura</td></tr>`);

    let surpRow = `<tr><td>Producción sobrante / faltante del mes [Unid.]</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      const val = per.surplusDeficit;
      const cls = val < -0.5 ? 'num-cell cell-layoff' : 'num-cell';
      surpRow += `<td class="${cls}">${fmtNumber(val, 0)}</td>`;
    });
    surpRow += `<td class="total-col num-cell">—</td></tr>`;
    rows.push(surpRow);

    let invRow = `<tr class="row-highlight"><td><strong>Inventario final disponible (I<sub>t</sub>) [Unid.]</strong></td>
      <td class="num-cell" style="text-align:center;">${fmtNumber(p.initialInventory, 0)}</td>`;
    periods.forEach((per) => {
      invRow += `<td class="num-cell cell-positive">${fmtNumber(per.endingInventory, 0)}</td>`;
    });
    invRow += `<td class="total-col num-cell">${fmtNumber(activePlan.totals.avgInventory, 0)} prom.</td></tr>`;
    rows.push(invRow);

    let covRow = `<tr><td>¿Se cubre la necesidad de producción?</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      covRow += `<td style="text-align:center; font-weight:600; color:${per.demandCovered ? 'var(--accent-optimal)' : 'var(--accent-danger)'};">${per.demandCovered ? 'Sí' : 'No'}</td>`;
    });
    covRow += `<td class="total-col" style="text-align:center;">${activePlan.totals.totalBackorders <= 0.5 ? 'Sí' : 'Con retrasos'}</td></tr>`;
    rows.push(covRow);

    // SECTION IV
    rows.push(`<tr class="row-group-header"><td colspan="${periods.length + 3}">IV. Estructura de Costos Incrementales del Plan [U$M]</td></tr>`);

    const costRowsSpec = [
      { key: 'regular', label: 'Costo de horas regulares trabajadas [U$M]' },
      { key: 'overtime', label: 'Costo de horas extraordinarias realizadas [U$M]' },
      { key: 'hr', label: 'Costo Contrataciones / Despidos [U$M]', customFn: (per) => per.costs.hiring + per.costs.layoff, totalFn: (tot) => tot.costs.hrTotal },
      { key: 'idle', label: 'Costo horas regulares ociosas [U$M]' },
      { key: 'holding', label: 'Costo posesión en stock [U$M]' },
      { key: 'subcontract', label: 'Costo de subcontratación [U$M]' },
      { key: 'backorder', label: 'Costo servicio con retraso (ruptura) [U$M]' }
    ];

    for (const cSpec of costRowsSpec) {
      let cRow = `<tr><td>${cSpec.label}</td><td style="text-align:center;">—</td>`;
      periods.forEach((per) => {
        const val = cSpec.customFn ? cSpec.customFn(per) : per.costs[cSpec.key];
        cRow += `<td class="num-cell">${fmtCurrency(val)}</td>`;
      });
      const totVal = cSpec.totalFn ? cSpec.totalFn(activePlan.totals) : activePlan.totals.costs[cSpec.key];
      cRow += `<td class="total-col num-cell">${fmtCurrency(totVal)}</td></tr>`;
      rows.push(cRow);
    }

    let totalCostRow = `<tr class="row-total-cost"><td>COSTO TOTAL INCREMENTAL [U$M]</td><td style="text-align:center;">—</td>`;
    periods.forEach((per) => {
      totalCostRow += `<td class="num-cell">${fmtCurrency(per.costs.total)}</td>`;
    });
    totalCostRow += `<td class="total-col num-cell">${fmtCurrency(activePlan.totals.costs.total)}</td></tr>`;
    rows.push(totalCostRow);

    tbody.innerHTML = rows.join('');
  }

  // Render Strategy Comparison Table & Executive Diagnosis (Tab 2)
  function renderStrategyComparisonTable() {
    const thead = document.getElementById('strategyCompareThead');
    const tbody = document.getElementById('strategyCompareTbody');
    const r = state.results;
    const strategies = [r.chase, r.level, r.optimal];

    thead.innerHTML = `<tr>
      <th>Parámetro / Rubro Comparativo</th>
      <th>Caza</th>
      <th>Nivelado</th>
      <th style="background:#F0FDFA; color:#0F766E;">&#9733; Optimizado</th>
    </tr>`;

    const metrics = [
      { label: 'Producción en Jornada Regular [Unid.]', fn: (s) => fmtNumber(s.totals.regularProd, 0) },
      { label: 'Producción en Horas Extras [Unid.]', fn: (s) => fmtNumber(s.totals.overtimeProd, 0) },
      { label: 'Unidades Subcontratadas [Unid.]', fn: (s) => fmtNumber(s.totals.subcontractProd, 0) },
      { label: 'Horas Regulares Trabajadas [h]', fn: (s) => fmtNumber(s.totals.workedRegHours, 1) },
      { label: 'Horas Regulares Ociosas [h]', fn: (s) => fmtNumber(s.totals.idleHours, 1) },
      { label: 'Horas Extraordinarias Realizadas [h]', fn: (s) => fmtNumber(s.totals.overtimeHours, 1) },
      { label: 'Operarios Contratados / Despedidos', fn: (s) => `+${fmtNumber(s.totals.hired, 0)} / -${fmtNumber(s.totals.laidOff, 0)}` },
      { label: 'Inventario Final Promedio [Unid.]', fn: (s) => `${fmtNumber(s.totals.avgInventory, 0)} u.` },
      { label: 'Costo Horas Regulares Trabajadas [U$M]', fn: (s) => fmtCurrency(s.totals.costs.regular) },
      { label: 'Costo Horas Regulares Ociosas [U$M]', fn: (s) => fmtCurrency(s.totals.costs.idle) },
      { label: 'Costo Horas Extraordinarias [U$M]', fn: (s) => fmtCurrency(s.totals.costs.overtime) },
      { label: 'Costo Contratación y Despidos [U$M]', fn: (s) => fmtCurrency(s.totals.costs.hrTotal) },
      { label: 'Costo Posesión en Stock [U$M]', fn: (s) => fmtCurrency(s.totals.costs.holding) },
      { label: 'Costo Subcontratación [U$M]', fn: (s) => fmtCurrency(s.totals.costs.subcontract) },
      { label: 'Costo Servicio con Retraso [U$M]', fn: (s) => fmtCurrency(s.totals.costs.backorder) },
      { label: 'COSTO TOTAL INCREMENTAL [U$M]', fn: (s) => fmtCurrency(s.totals.costs.total), isTotal: true },
      { label: 'Costo Incremental por Unidad', fn: (s) => fmtCurrencyDec(s.totals.unitCost) },
      {
        label: 'Cumplimiento de Restricciones (W_mín, W_máx, HE)',
        fn: (s) => s.isFeasible
          ? '<span class="badge badge-success">&#10003; Cumple todo</span>'
          : `<span class="badge badge-danger">&#9888; ${s.warnings.length} alertas</span>`
      }
    ];

    tbody.innerHTML = metrics.map((m) => {
      const cls = m.isTotal ? 'class="row-total-cost"' : '';
      const cells = strategies.map((s) => `<td class="num-cell">${m.fn(s)}</td>`).join('');
      return `<tr ${cls}><td>${m.label}</td>${cells}</tr>`;
    }).join('');

    const diagContainer = document.getElementById('executiveDiagnosisBody');
    const optCost = r.optimal.totals.costs.total;
    const chaseDiff = r.chase.totals.costs.total - optCost;
    const levelDiff = r.level.totals.costs.total - optCost;
    const minW = state.calculatedParams.minWorkers || 0;

    diagContainer.innerHTML = `
      <div class="method-card">
        <span class="badge badge-info" style="align-self:flex-start;">Estrategia Caza</span>
        <h4>Impacto del Mínimo en Planta (W_mín = ${minW})</h4>
        <p>
          Al existir una restricción de <strong>${minW} operarios mínimos en planta</strong>,
          en los meses de menor demanda la estrategia de <strong>Caza</strong> genera <strong>${fmtNumber(r.chase.totals.idleHours, 1)} horas ociosas</strong>
          (${fmtCurrency(r.chase.totals.costs.idle)}) y un costo de rotación de <strong>${fmtCurrency(r.chase.totals.costs.hrTotal)}</strong>,
          totalizando <strong>${fmtCurrency(r.chase.totals.costs.total)}</strong>.
        </p>
      </div>
      <div class="method-card">
        <span class="badge badge-warning" style="align-self:flex-start;">Estrategia Nivelado</span>
        <h4>Estabilidad Laboral vs. Posesión de Stock</h4>
        <p>
          El plan <strong>Nivelado</strong> realiza un único ajuste inicial de plantilla y absorbe la estacionalidad acumulando inventario
          (${fmtCurrency(r.level.totals.costs.holding)} de costo de posesión con ${fmtNumber(r.level.totals.avgInventory, 0)} u. promedio),
          alcanzando un costo total de <strong>${fmtCurrency(r.level.totals.costs.total)}</strong>.
        </p>
      </div>
      <div class="method-card">
        <span class="badge badge-success" style="align-self:flex-start;">Estrategia Optimizado (Simplex)</span>
        <h4>Mínimo Costo Operativo</h4>
        <p>
          El plan <strong>Optimizado</strong> mediante Programación Lineal equilibra plantilla, horas extras y subcontratación para lograr el costo mínimo de
          <strong>${fmtCurrency(optCost)}</strong> (ahorrando <strong>${fmtCurrency(Math.max(0, chaseDiff))}</strong> frente a Caza y
          <strong>${fmtCurrency(Math.max(0, levelDiff))}</strong> frente a Nivelado).
        </p>
      </div>
    `;
  }

  // Render High-DPI HTML5 Canvas Charts
  function renderCharts(activePlan) {
    drawBalanceChart(document.getElementById('balanceChartCanvas'), activePlan);
    drawCostComparisonChart(document.getElementById('costComparisonChartCanvas'), state.results);
  }

  function setupHiDPICanvas(canvas) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(300, rect.width || 500);
    const height = Math.max(220, rect.height || 265);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width, height };
  }

  function drawBalanceChart(canvas, activePlan) {
    if (!canvas) return;
    const { ctx, width, height } = setupHiDPICanvas(canvas);
    ctx.clearRect(0, 0, width, height);

    const periods = activePlan.periods;
    const n = periods.length;
    if (n === 0) return;

    const pad = { top: 20, right: 20, bottom: 34, left: 58 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    let maxVal = 100;
    periods.forEach((p) => {
      maxVal = Math.max(maxVal, p.totalProd, p.demand, p.endingInventory);
    });
    maxVal = Math.ceil((maxVal * 1.12) / 500) * 500;

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748B';
    ctx.font = '13px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = (maxVal / steps) * i;
      const y = pad.top + plotH - (val / maxVal) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
      ctx.fillText(Math.round(val).toLocaleString('es-AR'), pad.left - 8, y + 4);
    }

    const groupW = plotW / n;
    const barW = Math.min(32, groupW * 0.5);

    periods.forEach((p, i) => {
      const cx = pad.left + i * groupW + groupW / 2;
      const x = cx - barW / 2;

      const hReg = (p.regularProd / maxVal) * plotH;
      const hOt = (p.overtimeProd / maxVal) * plotH;
      const hSub = (p.subcontractProd / maxVal) * plotH;

      let curY = pad.top + plotH;

      if (hReg > 0) {
        ctx.fillStyle = '#2563EB';
        ctx.fillRect(x, curY - hReg, barW, hReg);
        curY -= hReg;
      }
      if (hOt > 0) {
        ctx.fillStyle = '#D97706';
        ctx.fillRect(x, curY - hOt, barW, hOt);
        curY -= hOt;
      }
      if (hSub > 0) {
        ctx.fillStyle = '#7C3AED';
        ctx.fillRect(x, curY - hSub, barW, hSub);
      }

      ctx.fillStyle = '#334155';
      ctx.font = '600 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, cx, pad.top + plotH + 18);
    });

    ctx.strokeStyle = '#0D9488';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    periods.forEach((p, i) => {
      const cx = pad.left + i * groupW + groupW / 2;
      const y = pad.top + plotH - (p.endingInventory / maxVal) * plotH;
      if (i === 0) ctx.moveTo(cx, y);
      else ctx.lineTo(cx, y);
    });
    ctx.stroke();

    periods.forEach((p, i) => {
      const cx = pad.left + i * groupW + groupW / 2;
      const y = pad.top + plotH - (p.endingInventory / maxVal) * plotH;
      ctx.fillStyle = '#0D9488';
      ctx.beginPath();
      ctx.arc(cx, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    periods.forEach((p, i) => {
      const cx = pad.left + i * groupW + groupW / 2;
      const y = pad.top + plotH - (p.demand / maxVal) * plotH;
      if (i === 0) ctx.moveTo(cx, y);
      else ctx.lineTo(cx, y);
    });
    ctx.stroke();

    periods.forEach((p, i) => {
      const cx = pad.left + i * groupW + groupW / 2;
      const y = pad.top + plotH - (p.demand / maxVal) * plotH;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function drawCostComparisonChart(canvas, results) {
    if (!canvas || !results) return;
    const { ctx, width, height } = setupHiDPICanvas(canvas);
    ctx.clearRect(0, 0, width, height);

    const plans = [
      { label: 'Caza', plan: results.chase },
      { label: 'Nivelado', plan: results.level },
      { label: 'Optimizado', plan: results.optimal }
    ];

    const pad = { top: 24, right: 20, bottom: 34, left: 68 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    let maxCost = 1000;
    plans.forEach((item) => {
      maxCost = Math.max(maxCost, item.plan.totals.costs.total);
    });
    maxCost = Math.ceil((maxCost * 1.15) / 10000) * 10000;

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748B';
    ctx.font = '13px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = (maxCost / steps) * i;
      const y = pad.top + plotH - (val / maxCost) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
      ctx.fillText('$' + Math.round(val / 1000) + 'k', pad.left - 8, y + 4);
    }

    const groupW = plotW / plans.length;
    const barW = Math.min(58, groupW * 0.45);

    const segments = [
      { key: 'regular', color: '#2563EB' },
      { key: 'idle', color: '#64748B' },
      { key: 'overtime', color: '#D97706' },
      { key: 'subcontract', color: '#7C3AED' },
      { key: 'hrTotal', color: '#0891B2' },
      { key: 'holding', color: '#0D9488' },
      { key: 'backorder', color: '#DC2626' }
    ];

    plans.forEach((item, i) => {
      const cx = pad.left + i * groupW + groupW / 2;
      const x = cx - barW / 2;
      let curY = pad.top + plotH;
      const c = item.plan.totals.costs;

      segments.forEach((seg) => {
        const val = c[seg.key] || 0;
        const h = (val / maxCost) * plotH;
        if (h > 0.5) {
          ctx.fillStyle = seg.color;
          ctx.fillRect(x, curY - h, barW, h);
          curY -= h;
        }
      });

      ctx.fillStyle = '#0F172A';
      ctx.font = '600 13px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fmtCurrency(c.total), cx, Math.max(12, curY - 6));

      ctx.fillStyle = '#334155';
      ctx.font = '600 14px Inter, sans-serif';
      ctx.fillText(item.label, cx, pad.top + plotH + 18);
    });
  }

  // ==========================================================================
  // EXPORT MODAL & MULTI-STRATEGY EXCEL TEMPLATE / PDF REPORT GENERATORS
  // ==========================================================================

  function openExportModal(defaultFormat) {
    document.getElementById('exportFormatSelect').value = defaultFormat || 'excel';
    document.getElementById('exportValidationError').style.display = 'none';
    document.getElementById('exportModalBackdrop').classList.add('open');
  }

  function closeExportModal() {
    document.getElementById('exportModalBackdrop').classList.remove('open');
  }

  function getSelectedExportStrategies() {
    const checks = document.querySelectorAll('.export-strategy-check:checked');
    return Array.from(checks).map((c) => c.value);
  }

  /**
   * Generates an Excel (.xls) workbook template formatted like the university activity spreadsheet,
   * containing a full block (Costos proyectados + Datos + Matriz mensual + Costos) for each selected strategy.
   */
  function exportToExcelTemplate(strategyKeys) {
    const calcP = state.calculatedParams;
    const m0 = PAPSolver.getDerivedMetrics(calcP, 0);
    const eventualInit = Math.max(0, (calcP.initialWorkers || 0) - (calcP.minWorkers || 0));

    let tablesHtml = '';

    strategyKeys.forEach((sKey) => {
      const plan = state.results[sKey];
      if (!plan) return;
      const p = plan.periods;
      const tot = plan.totals;

      // Left side parameters rows (matching the exact layout of the university Excel!)
      const leftSideRows = [
        ['Item', 'Costo (U.M.)', ''],
        ['Horas estándar de mano de obra', m0.regularHourlyCost, '$/h'],
        ['Horas estándar extras de mano de obra', m0.overtimeHourlyCost, '$/h'],
        ['Hora ociosa de mano de obra', m0.idleHourlyCost, '$/h'],
        ['Contratación de un trabajador', calcP.hiringCost, '$/op'],
        ['Despido de un trabajador eventual', calcP.layoffCost, '$/op'],
        ['Subcontratación (por unidad de familia)', calcP.subcontractUnitCost, '$/u.'],
        ['Posesión en stock (por Un. y mes)', calcP.holdingCost, '$/u·m'],
        ['Servicio con retraso (por un. y mes)', calcP.backorderCost, '$/u·m'],
        ['', '', ''],
        ['Datos Operativos', 'Valor', 'Unid.'],
        ['1 ítem requiere', calcP.hoursPerUnit, '[h.e]'],
        ['Jornada laboral', calcP.hoursPerShift, '[h.e]'],
        ['Personal fijo (Mínimo en planta)', calcP.minWorkers || 0, '[personas]'],
        ['Personal eventual inicial', eventualInit, '[personas]'],
        ['Plantilla inicial total', calcP.initialWorkers, '[personas]'],
        ['Cantidad de turnos', calcP.shiftsPerDay || 1, '[turnos]'],
        ['Operarios/turno', calcP.workersPerShift || 0, '[personas]'],
        ['Máximo en planta', calcP.maxWorkers || 0, '[personas]']
      ];

      // Right side matrix rows
      const rightSideRows = [
        { label: 'Previsión [Unid.]', vals: p.map((x) => Math.round(x.forecast)), total: Math.round(tot.forecast), bold: false },
        { label: 'Días productivos', vals: p.map((x) => x.workDays), total: p.reduce((a, b) => a + b.workDays, 0), bold: false },
        { label: 'Stock de seguridad [Unid.]', vals: p.map((x, idx) => idx === 0 ? x.safetyStock : '-'), total: calcP.safetyStockValue, bold: false },
        { label: 'Pedido de entrega pendiente [Unid.]', vals: p.map((x) => x.pendingOrder || '-'), total: '', bold: false },
        { label: 'Pedidos comprometidos [Unid.]', vals: p.map((x) => x.committedOrders || '-'), total: '', bold: false },
        { label: 'Necesidades de producción [Unid.]', vals: p.map((x) => Math.round(x.demand)), total: Math.round(tot.demand), bold: true },
        { label: 'Horas MO regular requeridas [h]', vals: p.map((x) => Number(x.regularHoursRequired.toFixed(1))), total: Number((tot.demand * calcP.hoursPerUnit).toFixed(1)), bold: false },
        { label: 'Necesidad MO (teórica) [Op.]', vals: p.map((x) => Number(x.theoreticalWorkers.toFixed(2))), total: '', bold: false },
        { label: 'Necesidad MO (ajustado) [Op.]', vals: p.map((x) => x.workers), total: '', bold: true },
        { label: 'Variación en plantilla [Op.]', vals: p.map((x) => x.variationWorkers), total: `+${tot.hired} / -${tot.laidOff}`, bold: false },
        { label: 'Horas disponibles (jornada reg.) [h]', vals: p.map((x) => Math.round(x.availableRegHours)), total: Math.round(tot.availableRegHours), bold: false },
        { label: 'Máxima producción posible (reg.) [Unid.]', vals: p.map((x) => Math.round(x.maxRegularUnits)), total: '', bold: false },
        { label: 'Producción en jornada regular [Unid.]', vals: p.map((x) => Math.round(x.regularProd)), total: Math.round(tot.regularProd), bold: true },
        { label: 'Horas regulares trabajadas [h]', vals: p.map((x) => Number(x.workedRegHours.toFixed(1))), total: Number(tot.workedRegHours.toFixed(1)), bold: false },
        { label: 'Horas ociosas [h]', vals: p.map((x) => Number(x.idleHours.toFixed(1))), total: Number(tot.idleHours.toFixed(1)), bold: false },
        { label: 'Producción en jornada extraordinaria [Unid.]', vals: p.map((x) => Math.round(x.overtimeProd)), total: Math.round(tot.overtimeProd), bold: false },
        { label: `Horas extraordinarias disponibles (${calcP.maxOvertimePercent}%) [h]`, vals: p.map((x) => Number(x.availableOtHours.toFixed(1))), total: '', bold: false },
        { label: 'Horas extraordinarias realizadas [h]', vals: p.map((x) => Number(x.workedOtHours.toFixed(1))), total: Number(tot.overtimeHours.toFixed(1)), bold: false },
        { label: 'Subcontratación [Unid.]', vals: p.map((x) => Math.round(x.subcontractProd)), total: Math.round(tot.subcontractProd), bold: false },
        { label: 'Producción faltante/sobrante [Unid.]', vals: p.map((x) => Math.round(x.surplusDeficit)), total: 0, bold: false },
        { label: 'Inventario final [Unid.]', vals: p.map((x) => Math.round(x.endingInventory)), total: Math.round(tot.avgInventory), bold: true },
        { label: '¿Se cubre la necesidad de producción?', vals: p.map((x) => x.demandCovered ? 'Sí' : 'No'), total: tot.totalBackorders <= 0.5 ? 'Sí' : 'No', bold: false },
        { label: 'Costos', vals: p.map(() => ''), total: '', isSection: true },
        { label: 'Costo de horas regulares trabajadas [U$M]', vals: p.map((x) => Number(x.costs.regular.toFixed(1))), total: Number(tot.costs.regular.toFixed(1)), bold: false },
        { label: 'Costo de horas extraordinarias realizadas [U$M]', vals: p.map((x) => Number(x.costs.overtime.toFixed(1))), total: Number(tot.costs.overtime.toFixed(1)), bold: false },
        { label: 'Costo Contr./despidos [U$M]', vals: p.map((x) => Number((x.costs.hiring + x.costs.layoff).toFixed(1))), total: Number(tot.costs.hrTotal.toFixed(1)), bold: false },
        { label: 'Costo horas regulares ociosas [U$M]', vals: p.map((x) => Number(x.costs.idle.toFixed(1))), total: Number(tot.costs.idle.toFixed(1)), bold: false },
        { label: 'Costo posesión [U$M]', vals: p.map((x) => Number(x.costs.holding.toFixed(1))), total: Number(tot.costs.holding.toFixed(1)), bold: false },
        { label: 'Costo de subcontratación [U$M]', vals: p.map((x) => Number(x.costs.subcontract.toFixed(1))), total: Number(tot.costs.subcontract.toFixed(1)), bold: false },
        { label: 'Costo servicio con retraso [U$M]', vals: p.map((x) => Number(x.costs.backorder.toFixed(1))), total: Number(tot.costs.backorder.toFixed(1)), bold: false },
        { label: 'Costo total incremental [U$M]', vals: p.map((x) => Number(x.costs.total.toFixed(1))), total: Number(tot.costs.total.toFixed(1)), isTotalCost: true }
      ];

      const maxRows = Math.max(leftSideRows.length, rightSideRows.length);

      let blockRowsHtml = `
        <tr style="background:#0F172A; color:#FFFFFF; font-weight:bold;">
          <td colspan="3" style="padding:6px; border:1px solid #CBD5E1;">Costos de producción proyectados (${calcP.familyName})</td>
          <td style="border:none;"></td>
          <td style="padding:6px; border:1px solid #CBD5E1; background:#1E3A8A; color:#FFFFFF;">ESTRATEGIA: ${plan.strategyName.toUpperCase()}</td>
          ${p.map((per) => `<td style="padding:6px; border:1px solid #CBD5E1; text-align:right; background:#1E3A8A; color:#FFFFFF;">${per.name.toUpperCase()}</td>`).join('')}
          <td style="padding:6px; border:1px solid #CBD5E1; text-align:right; background:#0F172A; color:#FFFFFF;">TOTAL</td>
        </tr>
      `;

      for (let i = 0; i < maxRows; i++) {
        const left = leftSideRows[i] || ['', '', ''];
        const right = rightSideRows[i];

        const leftIsHeader = i === 0 || i === 10;
        const leftBg = leftIsHeader ? 'background:#E2E8F0; font-weight:bold;' : '';

        let leftCells = '';
        if (left[0] !== '' || left[1] !== '') {
          leftCells = `
            <td style="padding:4px 6px; border:1px solid #CBD5E1; ${leftBg}">${left[0]}</td>
            <td style="padding:4px 6px; border:1px solid #CBD5E1; text-align:right; ${leftBg}">${left[1]}</td>
            <td style="padding:4px 6px; border:1px solid #CBD5E1; color:#64748B; ${leftBg}">${left[2]}</td>
          `;
        } else {
          leftCells = `<td></td><td></td><td></td>`;
        }

        let rightCells = '';
        if (right) {
          const rowStyle = right.isTotalCost
            ? 'background:#DBEAFE; font-weight:bold; color:#1E3A8A;'
            : (right.isSection ? 'background:#F1F5F9; font-weight:bold;' : (right.bold ? 'background:#F8FAFC; font-weight:bold;' : ''));

          rightCells = `
            <td style="padding:4px 8px; border:1px solid #CBD5E1; ${rowStyle}">${right.label}</td>
            ${right.vals.map((v) => `<td style="padding:4px 8px; border:1px solid #CBD5E1; text-align:right; ${rowStyle}">${v}</td>`).join('')}
            <td style="padding:4px 8px; border:1px solid #CBD5E1; text-align:right; font-weight:bold; ${rowStyle}">${right.total}</td>
          `;
        } else {
          rightCells = `<td colspan="${p.length + 2}"></td>`;
        }

        blockRowsHtml += `<tr>${leftCells}<td style="width:24px;"></td>${rightCells}</tr>`;
      }

      tablesHtml += `
        <table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-family:Calibri, Arial, sans-serif; font-size:11pt; margin-bottom:32px;">
          ${blockRowsHtml}
        </table>
        <br/><br/>
      `;
    });

    const fullHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Planes Agregados</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        ${tablesHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + fullHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Plantilla_Plan_Agregado_${strategyKeys.join('_')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates a PDF Executive Report with:
   * 1. Main Aggregate Plan Parameters & Executive Summary
   * 2. Comparative Summary of Selected Strategies
   * 3. Complete Period-by-Period Table for each Selected Strategy
   */
  function exportToPDFReport(strategyKeys) {
    const calcP = state.calculatedParams;
    const m0 = PAPSolver.getDerivedMetrics(calcP, 0);
    const eventualInit = Math.max(0, (calcP.initialWorkers || 0) - (calcP.minWorkers || 0));

    // Check if jsPDF is loaded
    if (window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORME DE PLANEACIÓN AGREGADA DE PRODUCCIÓN', 14, 11);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Familia: ${calcP.familyName}  |  Estrategias incluidas: ${strategyKeys.map((k) => state.results[k].strategyName).join(', ')}`, 14, 17.5);

      // Section 1: Informe de Parámetros Principales del Plan Agregado
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Parámetros Principales y Restricciones Operativas del Plan Agregado', 14, 30);

      const unitLabel = calcP.periodUnit === 'quarter' ? 'Trimestres' : 'Meses';
      const totalDays = calcP.periods.reduce((a, b) => a + (b.workDays || 20), 0);
      const totalForecast = calcP.periods.reduce((a, b) => a + (b.demand || 0), 0);

      doc.autoTable({
        startY: 33,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        head: [['Parámetro de Capacidad / Horizonte', 'Valor', 'Costo Operativo Marginal', 'Valor', 'Política / Restricción de Planta', 'Valor']],
        body: [
          [
            'Horizonte de Planeación',
            `${calcP.periods.length} ${unitLabel} (${totalDays} días)`,
            'Hora Estándar MO Regular',
            `$${m0.regularHourlyCost} / h`,
            'Mínimo en Planta (Personal Fijo)',
            `${calcP.minWorkers || 0} operarios`
          ],
          [
            'Previsión Total de Demanda',
            `${fmtNumber(totalForecast, 0)} ${calcP.aggregateUnit}`,
            'Hora Estándar Extra MO',
            `$${m0.overtimeHourlyCost} / h`,
            'Máximo en Planta (Cap. Turnos)',
            `${calcP.maxWorkers || 'Sin límite'} operarios (${calcP.shiftsPerDay}x${calcP.workersPerShift})`
          ],
          [
            'Plantilla Inicial Total (W0)',
            `${calcP.initialWorkers} op. (${calcP.minWorkers} fijos + ${eventualInit} ev.)`,
            'Hora Ociosa de MO',
            `$${m0.idleHourlyCost} / h`,
            'Stock de Seguridad Requerido',
            `${calcP.safetyStockValue} ${calcP.safetyStockMode === 'percent' ? '%' : 'unid.'}`
          ],
          [
            'Tiempo Estándar por Unidad',
            `${calcP.hoursPerUnit} h.e. / unidad`,
            'Contratación / Despido Eventual',
            `$${calcP.hiringCost} / $${calcP.layoffCost}`,
            'Límite Horas Extraordinarias',
            `${calcP.maxOvertimePercent}% de jornada normal`
          ],
          [
            'Jornada Laboral Diaria',
            `${calcP.hoursPerShift} h / día`,
            'Posesión Stock / Subcontratación',
            `$${calcP.holdingCost} u·m / $${calcP.subcontractUnitCost} u.`,
            'Servicio con Retraso (Ruptura)',
            `$${calcP.backorderCost} / u·m (${calcP.allowBackorders ? 'Permitido' : 'No permitido'})`
          ]
        ]
      });

      // Section 2: Comparative Executive Synthesis of Selected Strategies
      let nextY = doc.lastAutoTable.finalY + 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Síntesis Comparativa de Estrategias Seleccionadas', 14, nextY);

      const selectedPlans = strategyKeys.map((k) => state.results[k]);
      doc.autoTable({
        startY: nextY + 3,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
        head: [[
          'Estrategia',
          'Prod. Regular',
          'Prod. Extra',
          'Subcontrat.',
          'Horas Ociosas',
          'Contrat. / Desp.',
          'Stock Prom.',
          'Costo MO + Ociosa',
          'Costo RRHH',
          'Costo Stock + HE + Sub',
          'COSTO TOTAL INCREMENTAL'
        ]],
        body: selectedPlans.map((pl) => [
          pl.strategyName,
          `${fmtNumber(pl.totals.regularProd, 0)} u.`,
          `${fmtNumber(pl.totals.overtimeProd, 0)} u.`,
          `${fmtNumber(pl.totals.subcontractProd, 0)} u.`,
          `${fmtNumber(pl.totals.idleHours, 1)} h`,
          `+${fmtNumber(pl.totals.hired, 0)} / -${fmtNumber(pl.totals.laidOff, 0)}`,
          `${fmtNumber(pl.totals.avgInventory, 0)} u.`,
          fmtCurrency(pl.totals.costs.regular + pl.totals.costs.idle),
          fmtCurrency(pl.totals.costs.hrTotal),
          fmtCurrency(pl.totals.costs.holding + pl.totals.costs.overtime + pl.totals.costs.subcontract),
          fmtCurrency(pl.totals.costs.total)
        ])
      });

      // Section 3: Detailed Table per Selected Strategy
      selectedPlans.forEach((plan, idx) => {
        doc.addPage('a4', 'landscape');
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 297, 16, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11.5);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `DETALLE MENSUAL — ESTRATEGIA ${idx + 1}: ${plan.strategyName.toUpperCase()} (Costo Total Incremental: ${fmtCurrency(plan.totals.costs.total)})`,
          14,
          10.5
        );

        const p = plan.periods;
        const tot = plan.totals;
        const headRow = ['Ítem / Periodo', ...p.map((per) => per.name), 'Total / Prom.'];

        const bodyRows = [
          ['Previsión [Unid.]', ...p.map((x) => fmtNumber(x.forecast, 0)), fmtNumber(tot.forecast, 0)],
          ['Días productivos', ...p.map((x) => x.workDays), p.reduce((a, b) => a + b.workDays, 0)],
          ['Necesidades de producción [Unid.]', ...p.map((x) => fmtNumber(x.demand, 0)), fmtNumber(tot.demand, 0)],
          ['Horas MO regular requeridas [h]', ...p.map((x) => fmtNumber(x.regularHoursRequired, 1)), fmtNumber(tot.demand * calcP.hoursPerUnit, 1)],
          ['Necesidad MO teórica [Op.]', ...p.map((x) => fmtNumber(x.theoreticalWorkers, 2)), '-'],
          ['Necesidad MO ajustada (Wt) [Op.]', ...p.map((x) => fmtNumber(x.workers, 0)), `${fmtNumber(p.reduce((a, b) => a + b.workers, 0) / p.length, 1)} prom.`],
          ['Variación en plantilla [Op.]', ...p.map((x) => (x.variationWorkers > 0 ? `+${x.variationWorkers}` : x.variationWorkers)), `+${tot.hired} / -${tot.laidOff}`],
          ['Horas disponibles reg. [h]', ...p.map((x) => fmtNumber(x.availableRegHours, 0)), fmtNumber(tot.availableRegHours, 0)],
          ['Producción jornada regular [Unid.]', ...p.map((x) => fmtNumber(x.regularProd, 0)), fmtNumber(tot.regularProd, 0)],
          ['Horas regulares trabajadas [h]', ...p.map((x) => fmtNumber(x.workedRegHours, 1)), fmtNumber(tot.workedRegHours, 1)],
          ['Horas ociosas [h]', ...p.map((x) => fmtNumber(x.idleHours, 1)), fmtNumber(tot.idleHours, 1)],
          ['Producción jornada extra [Unid.]', ...p.map((x) => fmtNumber(x.overtimeProd, 0)), fmtNumber(tot.overtimeProd, 0)],
          ['Horas extra realizadas [h]', ...p.map((x) => fmtNumber(x.workedOtHours, 1)), fmtNumber(tot.overtimeHours, 1)],
          ['Subcontratación [Unid.]', ...p.map((x) => fmtNumber(x.subcontractProd, 0)), fmtNumber(tot.subcontractProd, 0)],
          ['Inventario final disponible [Unid.]', ...p.map((x) => fmtNumber(x.endingInventory, 0)), `${fmtNumber(tot.avgInventory, 0)} prom.`],
          ['Costo horas reg. trabajadas [$]', ...p.map((x) => fmtCurrency(x.costs.regular)), fmtCurrency(tot.costs.regular)],
          ['Costo horas extra realizadas [$]', ...p.map((x) => fmtCurrency(x.costs.overtime)), fmtCurrency(tot.costs.overtime)],
          ['Costo Contrat. / Despidos [$]', ...p.map((x) => fmtCurrency(x.costs.hiring + x.costs.layoff)), fmtCurrency(tot.costs.hrTotal)],
          ['Costo horas ociosas [$]', ...p.map((x) => fmtCurrency(x.costs.idle)), fmtCurrency(tot.costs.idle)],
          ['Costo posesión stock [$]', ...p.map((x) => fmtCurrency(x.costs.holding)), fmtCurrency(tot.costs.holding)],
          ['Costo subcontratación [$]', ...p.map((x) => fmtCurrency(x.costs.subcontract)), fmtCurrency(tot.costs.subcontract)],
          ['COSTO TOTAL INCREMENTAL [$]', ...p.map((x) => fmtCurrency(x.costs.total)), fmtCurrency(tot.costs.total)]
        ];

        doc.autoTable({
          startY: 20,
          theme: 'grid',
          styles: { fontSize: 7.5, cellPadding: 1.6, halign: 'right' },
          columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 48 } },
          headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'right' },
          head: [headRow],
          body: bodyRows,
          didParseCell: function (data) {
            if (data.section === 'body' && data.row.index === bodyRows.length - 1) {
              data.cell.styles.fillColor = [219, 234, 254];
              data.cell.styles.textColor = [30, 58, 138];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
      });

      doc.save(`Informe_Plan_Agregado_${strategyKeys.join('_')}.pdf`);
    } else {
      window.print();
    }
  }

  // Initialize Event Listeners
  function initApp() {
    // Main Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        state.activeTab = target;
        document.querySelectorAll('.nav-tab').forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab-panel').forEach((panel) => {
          panel.classList.toggle('active', panel.id === `tab-${target}`);
        });
        if (target === 'workbench' && state.results) {
          setTimeout(() => renderCharts(state.results[state.activeStrategy] || state.results.chase), 30);
        }
      });
    });

    // Left Rail "+ Nuevo plan", Welcome CTA & Strategy Bar "Editar datos de entrada"
    document.getElementById('btnCreatePlan').addEventListener('click', () => openDrawer('create'));
    document.getElementById('btnWelcomeCreatePlan').addEventListener('click', () => openDrawer('create'));
    document.getElementById('btnQuickEditInputs').addEventListener('click', () => openDrawer('edit'));
    document.getElementById('btnCloseDrawer').addEventListener('click', closeDrawer);
    document.getElementById('btnCancelPlanModal').addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isDrawerOpen) {
        closeDrawer();
      }
    });

    // Restore Faculty Case inside Form Drawer
    document.getElementById('btnRestoreFacultyPreset').addEventListener('click', () => {
      state.draftParams = JSON.parse(JSON.stringify(PRESETS.unam_12m));
      syncFormInputsFromDraft();
      renderDraftPeriodsTable();
      setDirty(true);
    });

    // Form Input Listeners: ONLY update draftParams, NEVER trigger calculation in real time
    const formInputs = document.querySelectorAll(
      '#paramsSidebar .param-accordion input:not([class^="draft-period"]), #paramsSidebar .param-accordion select'
    );
    formInputs.forEach((el) => {
      el.addEventListener('input', (e) => {
        readFormInputsIntoDraft(e.target.id);
      });
      el.addEventListener('change', (e) => {
        readFormInputsIntoDraft(e.target.id);
      });
    });

    // Explicit "Calcular" Button in Form Footer
    document.getElementById('btnCalculatePlan').addEventListener('click', () => {
      readFormInputsIntoDraft();
      executePlanCalculation();
      closeDrawer();
    });

    // Strategy Selector Pills (Caza, Nivelado, Optimizado)
    document.querySelectorAll('.strategy-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        state.activeStrategy = pill.dataset.strategy;
        document.querySelectorAll('.strategy-pill').forEach((p) => p.classList.toggle('active', p === pill));
        renderCalculatedDashboard();
      });
    });

    // Export Modal Triggers (Excel & PDF)
    document.getElementById('btnOpenExportExcel').addEventListener('click', () => openExportModal('excel'));
    document.getElementById('btnOpenExportPDF').addEventListener('click', () => openExportModal('pdf'));
    document.getElementById('btnCloseExportModal').addEventListener('click', closeExportModal);
    document.getElementById('btnCancelExportModal').addEventListener('click', closeExportModal);

    document.getElementById('btnSelectAllStrategies').addEventListener('click', () => {
      document.querySelectorAll('.export-strategy-check').forEach((chk) => {
        chk.checked = true;
      });
      document.getElementById('exportValidationError').style.display = 'none';
    });

    document.getElementById('btnConfirmExport').addEventListener('click', () => {
      const selected = getSelectedExportStrategies();
      if (selected.length === 0) {
        document.getElementById('exportValidationError').style.display = 'block';
        return;
      }
      const format = document.getElementById('exportFormatSelect').value;
      closeExportModal();
      if (format === 'excel') {
        exportToExcelTemplate(selected);
      } else {
        exportToPDFReport(selected);
      }
    });

    window.addEventListener('resize', () => {
      if (state.activeTab === 'workbench' && state.results) {
        renderCharts(state.results[state.activeStrategy] || state.results.chase);
      }
    });

    // Initial boot: start clean with Welcome screen (no preloaded case)
    syncFormInputsFromDraft();
    renderDraftPeriodsTable();
  }

  document.addEventListener('DOMContentLoaded', initApp);
})();
