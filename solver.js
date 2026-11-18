/**
 * PAP Studio — Aggregate Production Planning Mathematical Engine & LP Optimizer
 * Supports:
 * - Minimum Workforce in Plant (Personal Fijo / Planta Permanente: W_t >= minWorkers)
 * - Maximum Workforce in Plant (Turnos x Operarios/Turno: W_t <= maxWorkers)
 * - Committed Orders (Pedidos Comprometidos) & Initial Pending Orders (Pedidos Pendientes)
 * - Idle Time Hours & Idle Labor Cost (Horas Ociosas y Costo de Hora Ociosa)
 * - Strategies:
 *   1. Caza (Chase Strategy - Persecución con mínimo de planta)
 *   2. Nivelado (Level Strategy - Nivelación con ajuste único inicial)
 *   3. Optimizado (Linear Programming Optimal Plan - Método Simplex de Dos Fases)
 */

(function (global) {
  'use strict';

  /**
   * Two-Phase Simplex Solver for Standard Linear Programs:
   * Minimize c^T x
   * Subject to:
   *   A_eq x = b_eq
   *   A_le x <= b_le
   *   A_ge x >= b_ge
   *   x >= 0
   */
  function solveLP(c, eqConstraints, leConstraints, geConstraints) {
    const numVars = c.length;
    const rows = [];
    const rhs = [];
    const rowTypes = []; // 'eq', 'le', 'ge'

    for (const con of eqConstraints) {
      if (con.b >= 0) {
        rows.push(con.a.slice());
        rhs.push(con.b);
        rowTypes.push('eq');
      } else {
        rows.push(con.a.map((v) => -v));
        rhs.push(-con.b);
        rowTypes.push('eq');
      }
    }

    for (const con of leConstraints) {
      if (con.b >= 0) {
        rows.push(con.a.slice());
        rhs.push(con.b);
        rowTypes.push('le');
      } else {
        rows.push(con.a.map((v) => -v));
        rhs.push(-con.b);
        rowTypes.push('ge');
      }
    }

    for (const con of geConstraints) {
      if (con.b >= 0) {
        rows.push(con.a.slice());
        rhs.push(con.b);
        rowTypes.push('ge');
      } else {
        rows.push(con.a.map((v) => -v));
        rhs.push(-con.b);
        rowTypes.push('le');
      }
    }

    const m = rows.length;
    let numSlack = 0;
    let numArtificial = 0;

    for (let i = 0; i < m; i++) {
      if (rowTypes[i] === 'le') {
        numSlack++;
      } else if (rowTypes[i] === 'ge') {
        numSlack++;
        numArtificial++;
      } else if (rowTypes[i] === 'eq') {
        numArtificial++;
      }
    }

    const totalCols = numVars + numSlack + numArtificial;
    const tableau = [];
    const basis = new Array(m);
    const artificialCols = [];

    let slackIdx = numVars;
    let artIdx = numVars + numSlack;

    for (let i = 0; i < m; i++) {
      const row = new Float64Array(totalCols + 1);
      for (let j = 0; j < numVars; j++) {
        row[j] = rows[i][j];
      }
      if (rowTypes[i] === 'le') {
        row[slackIdx] = 1;
        basis[i] = slackIdx;
        slackIdx++;
      } else if (rowTypes[i] === 'ge') {
        row[slackIdx] = -1;
        slackIdx++;
        row[artIdx] = 1;
        basis[i] = artIdx;
        artificialCols.push(artIdx);
        artIdx++;
      } else if (rowTypes[i] === 'eq') {
        row[artIdx] = 1;
        basis[i] = artIdx;
        artificialCols.push(artIdx);
        artIdx++;
      }
      row[totalCols] = rhs[i];
      tableau.push(row);
    }

    const EPS = 1e-8;

    function pivot(pRow, pCol) {
      const pivotVal = tableau[pRow][pCol];
      const row = tableau[pRow];
      for (let j = 0; j <= totalCols; j++) {
        row[j] /= pivotVal;
      }
      for (let i = 0; i <= m; i++) {
        if (i !== pRow) {
          const factor = tableau[i][pCol];
          if (Math.abs(factor) > 1e-12) {
            const targetRow = tableau[i];
            for (let j = 0; j <= totalCols; j++) {
              targetRow[j] -= factor * row[j];
            }
          }
        }
      }
      basis[pRow] = pCol;
    }

    function runSimplex(maxCols, isPhase1) {
      let iter = 0;
      const maxIter = 5000;
      while (iter < maxIter) {
        iter++;
        let pCol = -1;
        let mostNegative = -EPS;
        const objRow = tableau[m];
        const useBland = iter > 600;

        for (let j = 0; j < maxCols; j++) {
          if (isPhase1 === false && j >= numVars + numSlack) continue;
          const val = objRow[j];
          if (val < mostNegative) {
            mostNegative = val;
            pCol = j;
            if (useBland) break;
          }
        }

        if (pCol === -1) {
          return { status: 'optimal', iterations: iter };
        }

        let pRow = -1;
        let minRatio = Infinity;
        for (let i = 0; i < m; i++) {
          const a_ij = tableau[i][pCol];
          if (a_ij > EPS) {
            const ratio = tableau[i][totalCols] / a_ij;
            if (
              ratio < minRatio - 1e-11 ||
              (Math.abs(ratio - minRatio) <= 1e-11 && basis[i] > (pRow >= 0 ? basis[pRow] : -1))
            ) {
              minRatio = ratio;
              pRow = i;
            }
          }
        }

        if (pRow === -1) {
          return { status: 'unbounded', iterations: iter };
        }

        pivot(pRow, pCol);
      }
      return { status: 'max_iter', iterations: iter };
    }

    const objRow = new Float64Array(totalCols + 1);
    for (const aCol of artificialCols) {
      objRow[aCol] = 1;
    }
    tableau.push(objRow);

    for (let i = 0; i < m; i++) {
      if (basis[i] >= numVars + numSlack) {
        for (let j = 0; j <= totalCols; j++) {
          tableau[m][j] -= tableau[i][j];
        }
      }
    }

    if (artificialCols.length > 0) {
      const p1 = runSimplex(totalCols, true);
      if (p1.status !== 'optimal') {
        return { feasible: false, status: p1.status };
      }
      const phase1Obj = -tableau[m][totalCols];
      if (phase1Obj > 1e-4) {
        return { feasible: false, status: 'infeasible', violation: phase1Obj };
      }

      for (let i = 0; i < m; i++) {
        if (basis[i] >= numVars + numSlack) {
          for (let j = 0; j < numVars + numSlack; j++) {
            if (Math.abs(tableau[i][j]) > EPS) {
              pivot(i, j);
              break;
            }
          }
        }
      }
    }

    for (let j = 0; j <= totalCols; j++) {
      tableau[m][j] = 0;
    }
    for (let j = 0; j < numVars; j++) {
      tableau[m][j] = c[j];
    }

    for (let i = 0; i < m; i++) {
      const bCol = basis[i];
      if (bCol < numVars + numSlack) {
        const coeff = tableau[m][bCol];
        if (Math.abs(coeff) > 1e-12) {
          for (let j = 0; j <= totalCols; j++) {
            tableau[m][j] -= coeff * tableau[i][j];
          }
        }
      }
    }

    const p2 = runSimplex(numVars + numSlack, false);
    if (p2.status !== 'optimal') {
      return { feasible: false, status: p2.status };
    }

    const solution = new Float64Array(numVars);
    for (let i = 0; i < m; i++) {
      if (basis[i] < numVars) {
        solution[basis[i]] = Math.max(0, tableau[i][totalCols]);
      }
    }

    return {
      feasible: true,
      status: 'optimal',
      objective: -tableau[m][totalCols],
      x: Array.from(solution)
    };
  }

  /**
   * Computes derived capacity, production requirement, and cost rates for periodIdx
   */
  function getDerivedMetrics(params, periodIdx) {
    const pObj = params.periods[periodIdx] || {};
    const workDays = pObj.workDays || 20;
    const hoursPerDay = params.hoursPerShift || 8;
    const hoursPerWorkerPeriod = workDays * hoursPerDay;
    const hoursPerUnit = Math.max(0.01, params.hoursPerUnit || 2.3);
    const unitsPerWorkerPeriod = hoursPerWorkerPeriod / hoursPerUnit;
    const unitsPerWorkerDay = hoursPerDay / hoursPerUnit;

    const regularHourlyCost = params.costInputMode === 'hourly'
      ? (params.regularHourlyCost ?? 4)
      : ((params.regularUnitCost ?? 40) / hoursPerUnit);

    const overtimeHourlyCost = params.costInputMode === 'hourly'
      ? (params.overtimeHourlyCost ?? 6)
      : ((params.overtimeUnitCost ?? 60) / hoursPerUnit);

    const idleHourlyCost = params.costInputMode === 'hourly'
      ? (params.idleHourlyCost ?? regularHourlyCost)
      : ((params.idleHourlyCost !== undefined ? params.idleHourlyCost : regularHourlyCost));

    const regularCostPerUnit = params.costInputMode === 'hourly'
      ? regularHourlyCost * hoursPerUnit
      : (params.regularUnitCost ?? 40);

    const overtimeCostPerUnit = params.costInputMode === 'hourly'
      ? overtimeHourlyCost * hoursPerUnit
      : (params.overtimeUnitCost ?? 60);

    const idleCostPerUnitEquivalent = idleHourlyCost * hoursPerUnit;

    const maxOvertimeRatio = (params.maxOvertimePercent ?? 10) / 100;
    const maxOvertimeHoursPerWorker = hoursPerWorkerPeriod * maxOvertimeRatio;
    const maxOvertimeUnitsPerWorker = unitsPerWorkerPeriod * maxOvertimeRatio;

    const forecast = Math.max(0, pObj.demand || 0);
    const committed = Math.max(0, pObj.committedOrders || 0);
    const pendingOrder = Math.max(0, pObj.pendingOrder || 0);
    const baseDemand = Math.max(forecast, committed);

    const safetyStock = params.safetyStockMode === 'percent'
      ? Math.ceil((baseDemand * (params.safetyStockValue || 0)) / 100)
      : (params.safetyStockValue !== undefined ? params.safetyStockValue : 0);

    let netProductionRequirement = baseDemand + pendingOrder;
    if (periodIdx === 0) {
      const initInv = params.initialInventory || 0;
      const ssNeeded = Math.max(0, safetyStock - initInv);
      netProductionRequirement += ssNeeded;
    } else if (params.safetyStockMode === 'percent') {
      const prevForecast = Math.max(
        params.periods[periodIdx - 1].demand || 0,
        params.periods[periodIdx - 1].committedOrders || 0
      );
      const prevSS = Math.ceil((prevForecast * (params.safetyStockValue || 0)) / 100);
      netProductionRequirement += (safetyStock - prevSS);
    }

    const regularHoursRequired = netProductionRequirement * hoursPerUnit;
    const theoreticalWorkers = regularHoursRequired / hoursPerWorkerPeriod;

    const minWorkers = Math.max(0, params.minWorkers || 0);
    const maxWorkers = Math.max(0, params.maxWorkers || 0);

    return {
      workDays,
      hoursPerDay,
      hoursPerWorkerPeriod,
      hoursPerUnit,
      unitsPerWorkerPeriod,
      unitsPerWorkerDay,
      regularHourlyCost,
      overtimeHourlyCost,
      idleHourlyCost,
      regularCostPerUnit,
      overtimeCostPerUnit,
      idleCostPerUnitEquivalent,
      maxOvertimeRatio,
      maxOvertimeHoursPerWorker,
      maxOvertimeUnitsPerWorker,
      forecast,
      committed,
      pendingOrder,
      baseDemand,
      safetyStock,
      demand: netProductionRequirement,
      regularHoursRequired,
      theoreticalWorkers,
      minWorkers,
      maxWorkers
    };
  }

  /**
   * Evaluates a schedule of period decisions and computes all operational rows,
   * hours (available, worked, idle, overtime), inventory above safety stock, and incremental costs.
   */
  function evaluatePlan(params, decisions, strategyMeta = {}) {
    const T = params.periods.length;
    let prevWorkers = params.initialWorkers || 0;
    const firstM = getDerivedMetrics(params, 0);
    let prevNetInventory = Math.max(0, (params.initialInventory || 0) - firstM.safetyStock);

    const periodResults = [];
    const warnings = [];

    let totalRegularCost = 0;
    let totalIdleCost = 0;
    let totalOvertimeCost = 0;
    let totalSubcontractCost = 0;
    let totalHiringCost = 0;
    let totalLayoffCost = 0;
    let totalHoldingCost = 0;
    let totalBackorderCost = 0;

    let totalForecast = 0;
    let totalDemand = 0;
    let totalRegularProd = 0;
    let totalOvertimeProd = 0;
    let totalSubcontractProd = 0;
    let totalProduction = 0;
    let totalAvailableRegHours = 0;
    let totalWorkedRegHours = 0;
    let totalIdleHours = 0;
    let totalOvertimeHours = 0;
    let totalHired = 0;
    let totalLaidOff = 0;
    let sumEndingInventory = 0;
    let sumBackorders = 0;

    for (let t = 0; t < T; t++) {
      const m = getDerivedMetrics(params, t);
      const dec = decisions[t] || {};
      const periodName = params.periods[t].name || `P${t + 1}`;
      const noLayoffsAllowed = Boolean(params.periods[t].noLayoffs || params.globalNoLayoffs);

      let workers = dec.workers !== undefined ? dec.workers : prevWorkers;
      if (params.integerWorkers) {
        workers = Math.max(0, Math.round(workers));
      } else {
        workers = Math.max(0, Number(workers.toFixed(2)));
      }

      const deltaW = workers - prevWorkers;
      const hired = deltaW > 0 ? deltaW : 0;
      const laidOff = deltaW < 0 ? -deltaW : 0;

      const availableRegHours = workers * m.hoursPerWorkerPeriod;
      const maxRegularUnitsExact = availableRegHours / m.hoursPerUnit;
      const maxRegularUnits = params.integerUnits
        ? Math.floor(maxRegularUnitsExact + 1e-7)
        : maxRegularUnitsExact;

      let regularProd = dec.regularProd !== undefined ? dec.regularProd : maxRegularUnits;
      regularProd = Math.max(0, regularProd);

      let workedRegHours = regularProd * m.hoursPerUnit;
      if (workedRegHours > availableRegHours || (params.integerUnits && Math.abs(regularProd - maxRegularUnits) < 0.5 && dec.fullShiftWorked)) {
        workedRegHours = availableRegHours;
      }
      const idleHours = Math.max(0, availableRegHours - workedRegHours);

      const availableOtHours = workers * m.maxOvertimeHoursPerWorker;
      const overtimeCapUnits = availableOtHours / m.hoursPerUnit;
      let overtimeProd = Math.max(0, dec.overtimeProd || 0);
      const workedOtHours = overtimeProd * m.hoursPerUnit;

      let subcontractProd = Math.max(0, dec.subcontractProd || 0);

      const totalPeriodProd = regularProd + overtimeProd + subcontractProd;
      const periodSurplusDeficit = totalPeriodProd - m.demand;

      const beginningInventory = Math.max(0, prevNetInventory);
      const beginningBackorder = Math.max(0, -prevNetInventory);

      const netAvailable = prevNetInventory + totalPeriodProd - m.demand;
      let endingInventory = 0;
      let endingBackorder = 0;

      if (netAvailable >= -1e-5) {
        endingInventory = Math.max(0, netAvailable);
        endingBackorder = 0;
      } else {
        endingInventory = 0;
        endingBackorder = -netAvailable;
      }

      const physicalEndingInventory = endingInventory + m.safetyStock;

      // Policy validations
      const periodWarnings = [];
      if (m.minWorkers > 0 && workers + 0.01 < m.minWorkers) {
        const msg = `${periodName}: Fuerza laboral (${fmtNum(workers)}) inferior al mínimo en planta (${m.minWorkers} op.).`;
        periodWarnings.push(msg);
        warnings.push(msg);
      }
      if (noLayoffsAllowed && laidOff > 0.01) {
        const msg = `${periodName}: Se despidieron ${fmtNum(laidOff)} trabajadores en un periodo con prohibición de despidos.`;
        periodWarnings.push(msg);
        warnings.push(msg);
      }
      if (m.maxWorkers > 0 && workers > m.maxWorkers + 0.01) {
        const msg = `${periodName}: Fuerza laboral (${fmtNum(workers)}) supera la capacidad máxima de planta (${m.maxWorkers} op.).`;
        periodWarnings.push(msg);
        warnings.push(msg);
      }
      if (regularProd > maxRegularUnitsExact + 0.5) {
        const msg = `${periodName}: Producción normal (${fmtNum(regularProd)}) excede la capacidad máxima de la plantilla (${fmtNum(maxRegularUnitsExact)}).`;
        periodWarnings.push(msg);
        warnings.push(msg);
      }
      if (overtimeProd > overtimeCapUnits + 0.5) {
        const msg = `${periodName}: Horas extras (${fmtNum(workedOtHours)} h / ${fmtNum(overtimeProd)} u.) superan el tope del ${params.maxOvertimePercent}% (${fmtNum(availableOtHours)} h).`;
        periodWarnings.push(msg);
        warnings.push(msg);
      }
      if (params.maxSubcontractUnits > 0 && subcontractProd > params.maxSubcontractUnits + 0.1) {
        const msg = `${periodName}: Subcontratación (${fmtNum(subcontractProd)} u.) supera el límite permitido (${params.maxSubcontractUnits} u.).`;
        periodWarnings.push(msg);
        warnings.push(msg);
      }
      if (params.machineCapacityUnits > 0 && (regularProd + overtimeProd) > params.machineCapacityUnits + 0.1) {
        const msg = `${periodName}: Producción interna (${fmtNum(regularProd + overtimeProd)} u.) supera la capacidad de máquinas (${params.machineCapacityUnits} u.).`;
        periodWarnings.push(msg);
        warnings.push(msg);
      }
      if (!params.allowBackorders && endingBackorder > 0.5) {
        const msg = `${periodName}: Faltante no cubierto de ${fmtNum(endingBackorder)} unidades.`;
        periodWarnings.push(msg);
        warnings.push(msg);
      }

      // Incremental Cost Calculations (excluding raw materials)
      const regularCost = workedRegHours * m.regularHourlyCost;
      const idleCost = params.regularPayrollFixed ? (idleHours * m.idleHourlyCost) : 0;
      const overtimeCost = workedOtHours * m.overtimeHourlyCost;
      const subcontractCost = subcontractProd * (params.subcontractUnitCost || 0);
      const hiringCost = hired * (params.hiringCost || 0);
      const layoffCost = laidOff * (params.layoffCost || 0);
      const holdingCost = endingInventory * (params.holdingCost || 0);
      const backorderCost = endingBackorder * (params.backorderCost || 0);

      const periodTotalCost =
        regularCost +
        idleCost +
        overtimeCost +
        subcontractCost +
        hiringCost +
        layoffCost +
        holdingCost +
        backorderCost;

      totalRegularCost += regularCost;
      totalIdleCost += idleCost;
      totalOvertimeCost += overtimeCost;
      totalSubcontractCost += subcontractCost;
      totalHiringCost += hiringCost;
      totalLayoffCost += layoffCost;
      totalHoldingCost += holdingCost;
      totalBackorderCost += backorderCost;

      totalForecast += m.forecast;
      totalDemand += m.demand;
      totalRegularProd += regularProd;
      totalOvertimeProd += overtimeProd;
      totalSubcontractProd += subcontractProd;
      totalProduction += totalPeriodProd;
      totalAvailableRegHours += availableRegHours;
      totalWorkedRegHours += workedRegHours;
      totalIdleHours += idleHours;
      totalOvertimeHours += workedOtHours;
      totalHired += hired;
      totalLaidOff += laidOff;
      sumEndingInventory += endingInventory;
      sumBackorders += endingBackorder;

      periodResults.push({
        periodIndex: t,
        name: periodName,
        workDays: m.workDays,
        forecast: m.forecast,
        committedOrders: m.committed,
        pendingOrder: m.pendingOrder,
        safetyStock: m.safetyStock,
        demand: m.demand,
        regularHoursRequired: m.regularHoursRequired,
        theoreticalWorkers: m.theoreticalWorkers,
        noLayoffs: noLayoffsAllowed,
        prevWorkers,
        workers,
        variationWorkers: deltaW,
        hired,
        laidOff,
        unitsPerWorkerPeriod: m.unitsPerWorkerPeriod,
        availableRegHours,
        maxRegularUnits,
        regularCapacity: maxRegularUnits,
        overtimeCapacity: overtimeCapUnits,
        availableOtHours,
        regularProd,
        workedRegHours,
        idleHours,
        overtimeProd,
        workedOtHours,
        subcontractProd,
        totalProd: totalPeriodProd,
        surplusDeficit: periodSurplusDeficit,
        beginningInventory,
        beginningBackorder,
        endingInventory,
        physicalEndingInventory,
        endingBackorder,
        demandCovered: endingBackorder <= 0.5,
        utilizationPct: availableRegHours > 0 ? (workedRegHours / availableRegHours) * 100 : 0,
        costs: {
          regular: regularCost,
          idle: idleCost,
          overtime: overtimeCost,
          subcontract: subcontractCost,
          hiring: hiringCost,
          layoff: layoffCost,
          holding: holdingCost,
          backorder: backorderCost,
          total: periodTotalCost
        },
        warnings: periodWarnings
      });

      prevWorkers = workers;
      prevNetInventory = netAvailable;
    }

    const totalCost =
      totalRegularCost +
      totalIdleCost +
      totalOvertimeCost +
      totalSubcontractCost +
      totalHiringCost +
      totalLayoffCost +
      totalHoldingCost +
      totalBackorderCost;

    return {
      strategyId: strategyMeta.id || 'custom',
      strategyName: strategyMeta.name || 'Plan Personalizado',
      strategyDescription: strategyMeta.description || '',
      periods: periodResults,
      totals: {
        forecast: totalForecast,
        demand: totalDemand,
        regularProd: totalRegularProd,
        overtimeProd: totalOvertimeProd,
        subcontractProd: totalSubcontractProd,
        production: totalProduction,
        availableRegHours: totalAvailableRegHours,
        workedRegHours: totalWorkedRegHours,
        idleHours: totalIdleHours,
        overtimeHours: totalOvertimeHours,
        hired: totalHired,
        laidOff: totalLaidOff,
        avgInventory: T > 0 ? sumEndingInventory / T : 0,
        sumEndingInventory,
        totalBackorders: sumBackorders,
        avgUtilization: totalAvailableRegHours > 0 ? (totalWorkedRegHours / totalAvailableRegHours) * 100 : 0,
        unitCost: totalProduction > 0 ? totalCost / totalProduction : 0,
        costs: {
          regular: totalRegularCost,
          idle: totalIdleCost,
          overtime: totalOvertimeCost,
          subcontract: totalSubcontractCost,
          hiring: totalHiringCost,
          layoff: totalLayoffCost,
          hrTotal: totalHiringCost + totalLayoffCost,
          holding: totalHoldingCost,
          backorder: totalBackorderCost,
          total: totalCost
        }
      },
      warnings,
      isFeasible: warnings.length === 0
    };
  }

  function fmtNum(n) {
    return Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 });
  }

  /**
   * 1. CAZA (Chase Strategy)
   * Adjusts workforce each period to match production need (D_t),
   * while respecting Minimum Workforce in Plant (W_t >= minWorkers) and Max Workforce (W_t <= maxWorkers).
   */
  function generateChasePlan(params) {
    const T = params.periods.length;
    const decisions = [];
    let currentWorkers = params.initialWorkers || 0;
    const firstM = getDerivedMetrics(params, 0);
    let currentNetInv = Math.max(0, (params.initialInventory || 0) - firstM.safetyStock);

    for (let t = 0; t < T; t++) {
      const m = getDerivedMetrics(params, t);
      const targetEndInv = t === T - 1 ? (params.targetEndingInventory || 0) : 0;
      const netReq = Math.max(0, m.demand + targetEndInv - currentNetInv);

      let idealWorkers = netReq / m.unitsPerWorkerPeriod;
      if (params.integerWorkers) {
        idealWorkers = Math.ceil(idealWorkers - 1e-6);
      }

      if (m.minWorkers > 0 && idealWorkers < m.minWorkers) {
        idealWorkers = m.minWorkers;
      }

      const noLayoffs = Boolean(params.periods[t].noLayoffs || params.globalNoLayoffs);
      if (noLayoffs && idealWorkers < currentWorkers) {
        idealWorkers = currentWorkers;
      }

      if (m.maxWorkers > 0 && idealWorkers > m.maxWorkers) {
        idealWorkers = m.maxWorkers;
      }

      let regCap = idealWorkers * m.unitsPerWorkerPeriod;
      if (params.machineCapacityUnits > 0 && regCap > params.machineCapacityUnits) {
        regCap = params.machineCapacityUnits;
      }

      let regularProd = Math.min(regCap, netReq);
      let remaining = Math.max(0, netReq - regularProd);

      let overtimeProd = 0;
      let subcontractProd = 0;
      if (remaining > 0) {
        const otMax = idealWorkers * m.maxOvertimeUnitsPerWorker;
        const machineRem = params.machineCapacityUnits > 0
          ? Math.max(0, params.machineCapacityUnits - regularProd)
          : Infinity;
        overtimeProd = Math.min(remaining, otMax, machineRem);
        remaining -= overtimeProd;
        if (remaining > 0) {
          const subMax = params.maxSubcontractUnits > 0 ? params.maxSubcontractUnits : Infinity;
          subcontractProd = Math.min(remaining, subMax);
        }
      }

      decisions.push({
        workers: idealWorkers,
        regularProd,
        overtimeProd,
        subcontractProd
      });

      currentWorkers = idealWorkers;
      currentNetInv = currentNetInv + regularProd + overtimeProd + subcontractProd - m.demand;
    }

    return evaluatePlan(params, decisions, {
      id: 'chase',
      name: 'Caza',
      description: 'Ajusta la fuerza laboral mes a mes para cubrir exactamente la necesidad de producción, respetando el mínimo de operarios en planta sin acumular stock.'
    });
  }

  /**
   * 2. NIVELADO (Level Strategy)
   * Keeps a constant workforce across the entire horizon (single workforce adjustment in Period 1),
   * producing proportionally to working days each period and absorbing seasonality via inventory.
   */
  function generateLevelPlan(params) {
    const T = params.periods.length;
    let totalUnitsPerWorkerAcrossHorizon = 0;
    let totalDemand = 0;

    for (let t = 0; t < T; t++) {
      const m = getDerivedMetrics(params, t);
      totalUnitsPerWorkerAcrossHorizon += m.unitsPerWorkerPeriod;
      totalDemand += m.demand;
    }

    const firstM = getDerivedMetrics(params, 0);
    const initNetInv = Math.max(0, (params.initialInventory || 0) - firstM.safetyStock);
    const totalNetReq = Math.max(0, totalDemand + (params.targetEndingInventory || 0) - initNetInv);

    const theoreticalConstantWorkers = totalNetReq / totalUnitsPerWorkerAcrossHorizon;
    let constantWorkers = theoreticalConstantWorkers;

    if (params.integerWorkers) {
      constantWorkers = Math.ceil(theoreticalConstantWorkers - 1e-6);
    } else {
      constantWorkers = Number(theoreticalConstantWorkers.toFixed(2));
    }

    if (firstM.minWorkers > 0 && constantWorkers < firstM.minWorkers) {
      constantWorkers = firstM.minWorkers;
    }
    if (params.globalNoLayoffs && constantWorkers < (params.initialWorkers || 0)) {
      constantWorkers = params.initialWorkers || 0;
    }
    if (firstM.maxWorkers > 0 && constantWorkers > firstM.maxWorkers) {
      constantWorkers = firstM.maxWorkers;
    }

    const totalWorkDays = params.periods.reduce((acc, p) => acc + (p.workDays || 20), 0);
    let remProductionToAllocate = totalNetReq;

    const decisions = [];
    for (let t = 0; t < T; t++) {
      const m = getDerivedMetrics(params, t);
      const maxReg = params.integerUnits
        ? Math.floor(constantWorkers * m.unitsPerWorkerPeriod + 1e-7)
        : constantWorkers * m.unitsPerWorkerPeriod;

      const plannedForMonth = t === T - 1
        ? remProductionToAllocate
        : Math.round((totalNetReq * m.workDays) / totalWorkDays);

      remProductionToAllocate -= plannedForMonth;

      const regProd = Math.min(maxReg, plannedForMonth);
      const deficit = Math.max(0, plannedForMonth - regProd);
      const overtimeProd = Math.min(deficit, constantWorkers * m.maxOvertimeUnitsPerWorker);
      const subcontractProd = Math.max(0, deficit - overtimeProd);

      decisions.push({
        workers: constantWorkers,
        regularProd: regProd,
        overtimeProd,
        subcontractProd
      });
    }

    return evaluatePlan(params, decisions, {
      id: 'level',
      name: 'Nivelado',
      description: 'Mantiene una plantilla constante durante todo el horizonte (con un único ajuste inicial) y absorbe las variaciones estacionales acumulando inventario.'
    });
  }

  /**
   * 3. OPTIMIZADO (Linear Programming Optimal Strategy - Simplex)
   */
  function generateOptimalLPPlan(params) {
    const T = params.periods.length;
    const VARS_PER_PERIOD = 8;
    const numVars = T * VARS_PER_PERIOD;
    const varIndex = (t, type) => t * VARS_PER_PERIOD + type;

    const c = new Array(numVars).fill(0);
    const eqConstraints = [];
    const leConstraints = [];
    const geConstraints = [];

    const firstM = getDerivedMetrics(params, 0);
    const initNetInv = Math.max(0, (params.initialInventory || 0) - firstM.safetyStock);

    for (let t = 0; t < T; t++) {
      const m = getDerivedMetrics(params, t);

      if (params.regularPayrollFixed) {
        c[varIndex(t, 0)] = m.hoursPerWorkerPeriod * m.idleHourlyCost;
        c[varIndex(t, 3)] = m.regularCostPerUnit - m.idleCostPerUnitEquivalent;
      } else {
        c[varIndex(t, 0)] = 0;
        c[varIndex(t, 3)] = m.regularCostPerUnit;
      }

      c[varIndex(t, 1)] = params.hiringCost || 0;
      c[varIndex(t, 2)] = params.layoffCost || 0;
      c[varIndex(t, 4)] = m.overtimeCostPerUnit;
      c[varIndex(t, 5)] = params.subcontractUnitCost || 0;
      c[varIndex(t, 6)] = params.holdingCost || 0;
      c[varIndex(t, 7)] = params.allowBackorders ? (params.backorderCost || 0) : 1e7;

      // 1. Workforce balance: W_t - W_{t-1} - H_t + L_t = 0
      const wfRow = new Array(numVars).fill(0);
      wfRow[varIndex(t, 0)] = 1;
      wfRow[varIndex(t, 1)] = -1;
      wfRow[varIndex(t, 2)] = 1;
      if (t === 0) {
        eqConstraints.push({ a: wfRow, b: params.initialWorkers || 0 });
      } else {
        wfRow[varIndex(t - 1, 0)] = -1;
        eqConstraints.push({ a: wfRow, b: 0 });
      }

      // 2. Inventory balance: P_t + O_t + S_t + I_{t-1} - B_{t-1} - I_t + B_t = D_t
      const invRow = new Array(numVars).fill(0);
      invRow[varIndex(t, 3)] = 1;
      invRow[varIndex(t, 4)] = 1;
      invRow[varIndex(t, 5)] = 1;
      invRow[varIndex(t, 6)] = -1;
      invRow[varIndex(t, 7)] = 1;
      if (t === 0) {
        eqConstraints.push({ a: invRow, b: m.demand - initNetInv });
      } else {
        invRow[varIndex(t - 1, 6)] = 1;
        invRow[varIndex(t - 1, 7)] = -1;
        eqConstraints.push({ a: invRow, b: m.demand });
      }

      // 3. Regular production capacity: P_t - unitsPerWorkerPeriod * W_t <= 0
      const regCapRow = new Array(numVars).fill(0);
      regCapRow[varIndex(t, 3)] = 1;
      regCapRow[varIndex(t, 0)] = -m.unitsPerWorkerPeriod;
      leConstraints.push({ a: regCapRow, b: 0 });

      // 4. Overtime limit: O_t - maxOvertimeUnitsPerWorker * W_t <= 0
      const otCapRow = new Array(numVars).fill(0);
      otCapRow[varIndex(t, 4)] = 1;
      otCapRow[varIndex(t, 0)] = -m.maxOvertimeUnitsPerWorker;
      leConstraints.push({ a: otCapRow, b: 0 });

      // 5. Target ending inventory in final period: I_{T-1} >= targetEndingInventory
      if (t === T - 1 && (params.targetEndingInventory || 0) > 0) {
        const endInvRow = new Array(numVars).fill(0);
        endInvRow[varIndex(t, 6)] = 1;
        geConstraints.push({ a: endInvRow, b: params.targetEndingInventory });
      }

      // 6. Backorder policy
      if (!params.allowBackorders || t === T - 1) {
        const boRow = new Array(numVars).fill(0);
        boRow[varIndex(t, 7)] = 1;
        leConstraints.push({ a: boRow, b: 0 });
      }

      // 7. Subcontracting max limit
      if (params.maxSubcontractUnits > 0) {
        const subRow = new Array(numVars).fill(0);
        subRow[varIndex(t, 5)] = 1;
        leConstraints.push({ a: subRow, b: params.maxSubcontractUnits });
      } else if (params.allowSubcontracting === false) {
        const subRow = new Array(numVars).fill(0);
        subRow[varIndex(t, 5)] = 1;
        leConstraints.push({ a: subRow, b: 0 });
      }

      // 8. Machine capacity limit: P_t + O_t <= machineCapacityUnits
      if (params.machineCapacityUnits > 0) {
        const machRow = new Array(numVars).fill(0);
        machRow[varIndex(t, 3)] = 1;
        machRow[varIndex(t, 4)] = 1;
        leConstraints.push({ a: machRow, b: params.machineCapacityUnits });
      }

      // 9. MINIMUM WORKERS IN PLANT: W_t >= minWorkers
      if (m.minWorkers > 0) {
        const minWRow = new Array(numVars).fill(0);
        minWRow[varIndex(t, 0)] = 1;
        geConstraints.push({ a: minWRow, b: m.minWorkers });
      }

      // 10. MAXIMUM WORKERS IN PLANT: W_t <= maxWorkers
      if (m.maxWorkers > 0) {
        const maxWRow = new Array(numVars).fill(0);
        maxWRow[varIndex(t, 0)] = 1;
        leConstraints.push({ a: maxWRow, b: m.maxWorkers });
      }

      // 11. No layoffs policy in period t: L_t <= 0
      const noLayoffs = Boolean(params.periods[t].noLayoffs || params.globalNoLayoffs);
      if (noLayoffs) {
        const nlRow = new Array(numVars).fill(0);
        nlRow[varIndex(t, 2)] = 1;
        leConstraints.push({ a: nlRow, b: 0 });
      }
    }

    const lpResult = solveLP(c, eqConstraints, leConstraints, geConstraints);
    if (!lpResult.feasible) {
      const fallback = generateLevelPlan(params);
      fallback.strategyId = 'optimal';
      fallback.strategyName = 'Optimizado';
      return fallback;
    }

    const decisions = [];
    let currentNetInv = initNetInv;
    let prevW = params.initialWorkers || 0;

    for (let t = 0; t < T; t++) {
      const m = getDerivedMetrics(params, t);
      let W = lpResult.x[varIndex(t, 0)];
      let P = lpResult.x[varIndex(t, 3)];
      let O = lpResult.x[varIndex(t, 4)];
      let S = lpResult.x[varIndex(t, 5)];

      if (params.integerWorkers) {
        const noLayoffs = Boolean(params.periods[t].noLayoffs || params.globalNoLayoffs);
        W = Math.round(W);
        if (m.minWorkers > 0 && W < m.minWorkers) W = m.minWorkers;
        if (noLayoffs && W < prevW) W = prevW;
        if (m.maxWorkers > 0 && W > m.maxWorkers) W = m.maxWorkers;

        const regCap = W * m.unitsPerWorkerPeriod;
        const targetEndInv = t === T - 1 ? (params.targetEndingInventory || 0) : 0;
        const minNeeded = Math.max(0, m.demand + targetEndInv - currentNetInv);

        P = Math.min(regCap, Math.max(P, Math.min(regCap, minNeeded)));
        if (params.machineCapacityUnits > 0 && P > params.machineCapacityUnits) {
          P = params.machineCapacityUnits;
        }
        const otMax = W * m.maxOvertimeUnitsPerWorker;
        const machRem = params.machineCapacityUnits > 0 ? Math.max(0, params.machineCapacityUnits - P) : Infinity;
        O = Math.min(O, otMax, machRem);

        const totalNow = P + O + S;
        if (totalNow < minNeeded) {
          let gap = minNeeded - totalNow;
          const addP = Math.min(gap, Math.max(0, regCap - P));
          P += addP;
          gap -= addP;
          if (gap > 0) {
            const addO = Math.min(gap, Math.max(0, otMax - O));
            O += addO;
            gap -= addO;
          }
          if (gap > 0 && params.allowSubcontracting !== false) {
            const subLimit = params.maxSubcontractUnits > 0 ? params.maxSubcontractUnits : Infinity;
            const addS = Math.min(gap, Math.max(0, subLimit - S));
            S += addS;
            gap -= addS;
          }
        }
      }

      decisions.push({
        workers: W,
        regularProd: Math.round(P * 100) / 100,
        overtimeProd: Math.round(O * 100) / 100,
        subcontractProd: Math.round(S * 100) / 100
      });

      prevW = W;
      currentNetInv = currentNetInv + P + O + S - m.demand;
    }

    return evaluatePlan(params, decisions, {
      id: 'optimal',
      name: 'Optimizado',
      description: 'Minimiza mediante Programación Lineal (Simplex) el costo total operativo combinando plantilla, horas extras, subcontratación e inventario dentro de las políticas de la empresa.'
    });
  }

  /**
   * Computes all 3 strategies (Caza, Nivelado, Optimizado)
   */
  function computeAllStrategies(params) {
    const chase = generateChasePlan(params);
    const level = generateLevelPlan(params);
    const optimal = generateOptimalLPPlan(params);

    return { chase, level, optimal };
  }

  global.PAPSolver = {
    solveLP,
    getDerivedMetrics,
    evaluatePlan,
    generateChasePlan,
    generateLevelPlan,
    generateOptimalLPPlan,
    computeAllStrategies
  };
})(typeof window !== 'undefined' ? window : globalThis);
