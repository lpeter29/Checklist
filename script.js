(function () {
  "use strict";

  var STORAGE_KEY = "monthlyChecklistData";

  var defaultState = {
    title: "Monthly Checklist",
    color: "#0f766e",
    entities: [
      {
        id: "e1",
        name: "Juan Dela Cruz",
        type: "person",
        tasks: [
          { id: "t1", name: "Submitted daily sales report" },
          { id: "t2", name: "Attended morning briefing" }
        ],
        products: [
          { id: "pr1", name: "Small", price: 12 },
          { id: "pr2", name: "Big", price: 22 }
        ]
      },
      {
        id: "e2",
        name: "Branch A",
        type: "branch",
        tasks: [
          { id: "t3", name: "Inventory checked" },
          { id: "t4", name: "Cash count reconciled" }
        ],
        products: []
      }
    ],
    records: {}
  };

  var state = loadState();
  var draft = { type: "person", tasks: [], products: [] };

  var el = {
    appTitle: document.getElementById("appTitle"),
    monthPicker: document.getElementById("monthPicker"),
    tabBtns: document.querySelectorAll(".tab-btn"),
    panels: document.querySelectorAll(".tab-panel"),
    checklistList: document.getElementById("checklistList"),
    checklistEmpty: document.getElementById("checklistEmpty"),
    summaryEmpty: document.getElementById("summaryEmpty"),
    summaryContent: document.getElementById("summaryContent"),
    overallBarFill: document.getElementById("overallBarFill"),
    overallText: document.getElementById("overallText"),
    summaryByEntity: document.getElementById("summaryByEntity"),
    totalPurchasesText: document.getElementById("totalPurchasesText"),
    titleInput: document.getElementById("titleInput"),
    colorInput: document.getElementById("colorInput"),
    entityList: document.getElementById("entityList"),
    entityListEmpty: document.getElementById("entityListEmpty"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFile: document.getElementById("importFile"),
    resetBtn: document.getElementById("resetBtn"),
    toast: document.getElementById("toast"),
    draftTypeToggle: document.getElementById("draftTypeToggle"),
    draftNameInput: document.getElementById("draftNameInput"),
    draftTaskList: document.getElementById("draftTaskList"),
    draftTaskInput: document.getElementById("draftTaskInput"),
    draftTaskAddBtn: document.getElementById("draftTaskAddBtn"),
    draftProductsSection: document.getElementById("draftProductsSection"),
    draftProductList: document.getElementById("draftProductList"),
    draftProductNameInput: document.getElementById("draftProductNameInput"),
    draftProductPriceInput: document.getElementById("draftProductPriceInput"),
    draftProductAddBtn: document.getElementById("draftProductAddBtn"),
    createEntityBtn: document.getElementById("createEntityBtn")
  };

  init();

  function init() {
    el.monthPicker.value = currentMonthKey();
    applyTemplateToUI();
    bindEvents();
    renderDraft();
    renderAll();
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(defaultState);
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.entities)) return clone(defaultState);
      return Object.assign(clone(defaultState), parsed);
    } catch (e) {
      return clone(defaultState);
    }
  }

  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function uid(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function currentMonthKey() {
    var d = new Date();
    var m = (d.getMonth() + 1).toString().padStart(2, "0");
    return d.getFullYear() + "-" + m;
  }

  function getEntityRecord(monthKey, entityId) {
    if (!state.records[monthKey]) state.records[monthKey] = {};
    if (!state.records[monthKey][entityId]) {
      state.records[monthKey][entityId] = { tasks: {}, purchases: {} };
    }
    return state.records[monthKey][entityId];
  }

  function isTaskChecked(monthKey, entityId, taskId) {
    var m = state.records[monthKey];
    var e = m && m[entityId];
    return !!(e && e.tasks && e.tasks[taskId]);
  }

  function setTaskChecked(monthKey, entityId, taskId, value) {
    var rec = getEntityRecord(monthKey, entityId);
    rec.tasks[taskId] = value;
    saveState();
  }

  function getQty(monthKey, entityId, productId) {
    var m = state.records[monthKey];
    var e = m && m[entityId];
    var q = e && e.purchases && e.purchases[productId];
    return q ? Number(q) : 0;
  }

  function setQty(monthKey, entityId, productId, value) {
    var rec = getEntityRecord(monthKey, entityId);
    var n = Number(value);
    rec.purchases[productId] = n > 0 ? n : 0;
    saveState();
  }

  function bindEvents() {
    el.tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-tab")); });
    });

    document.querySelectorAll("[data-goto]").forEach(function (btn) {
      btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-goto")); });
    });

    el.monthPicker.addEventListener("change", function () {
      renderChecklist();
      renderSummary();
    });

    el.titleInput.addEventListener("input", function () {
      state.title = el.titleInput.value || defaultState.title;
      el.appTitle.textContent = state.title;
      saveState();
    });

    el.colorInput.addEventListener("input", function () {
      state.color = el.colorInput.value;
      updateAccentColor(state.color);
      saveState();
    });

    el.draftTypeToggle.querySelectorAll(".toggle-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        draft.type = btn.getAttribute("data-type");
        el.draftTypeToggle.querySelectorAll(".toggle-btn").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        el.draftProductsSection.style.display = draft.type === "person" ? "block" : "none";
      });
    });

    el.draftTaskAddBtn.addEventListener("click", addDraftTask);
    el.draftTaskInput.addEventListener("keydown", function (e) { if (e.key === "Enter") addDraftTask(); });

    el.draftProductAddBtn.addEventListener("click", addDraftProduct);
    el.draftProductNameInput.addEventListener("keydown", function (e) { if (e.key === "Enter") addDraftProduct(); });
    el.draftProductPriceInput.addEventListener("keydown", function (e) { if (e.key === "Enter") addDraftProduct(); });

    el.createEntityBtn.addEventListener("click", createEntityFromDraft);

    el.exportBtn.addEventListener("click", exportData);
    el.importBtn.addEventListener("click", function () { el.importFile.click(); });
    el.importFile.addEventListener("change", importData);

    el.resetBtn.addEventListener("click", function () {
      if (confirm("This clears all records and items. Continue?")) {
        state = clone(defaultState);
        saveState();
        applyTemplateToUI();
        renderAll();
        showToast("Reset to default layout");
      }
    });
  }

  function updateAccentColor(colorHex) {
    document.documentElement.style.setProperty("--accent", colorHex);
    // Convert hex to soft rgba equivalent
    var r = parseInt(colorHex.slice(1, 3), 16) || 15;
    var g = parseInt(colorHex.slice(3, 5), 16) || 118;
    var b = parseInt(colorHex.slice(5, 7), 16) || 110;
    document.documentElement.style.setProperty("--accent-soft", "rgba(" + r + ", " + g + ", " + b + ", 0.12)");
  }

  function switchTab(name) {
    el.tabBtns.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === name); });
    el.panels.forEach(function (p) { p.classList.toggle("active", p.id === name); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function applyTemplateToUI() {
    el.appTitle.textContent = state.title;
    document.title = state.title;
    el.titleInput.value = state.title;
    el.colorInput.value = state.color;
    updateAccentColor(state.color);
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.toast.classList.remove("show"); }, 2200);
  }

  function addDraftTask() {
    var name = el.draftTaskInput.value.trim();
    if (!name) return;
    draft.tasks.push({ id: uid("t"), name: name });
    el.draftTaskInput.value = "";
    renderDraft();
  }

  function addDraftProduct() {
    var name = el.draftProductNameInput.value.trim();
    var price = Number(el.draftProductPriceInput.value);
    if (!name || isNaN(price) || price < 0) return;
    draft.products.push({ id: uid("pr"), name: name, price: price });
    el.draftProductNameInput.value = "";
    el.draftProductPriceInput.value = "";
    renderDraft();
  }

  function renderDraft() {
    el.draftProductsSection.style.display = draft.type === "person" ? "block" : "none";

    el.draftTaskList.innerHTML = "";
    draft.tasks.forEach(function (task) {
      el.draftTaskList.appendChild(buildSubEditRow(task, function () {
        draft.tasks = draft.tasks.filter(function (t) { return t.id !== task.id; });
        renderDraft();
      }, true));
    });

    el.draftProductList.innerHTML = "";
    draft.products.forEach(function (product) {
      var row = document.createElement("div");
      row.className = "edit-row";
      var label = document.createElement("span");
      label.className = "calc-name";
      label.textContent = product.name + " \u2014 " + formatMoney(product.price);
      var del = document.createElement("button");
      del.className = "icon-btn";
      del.textContent = "Remove";
      del.addEventListener("click", function () {
        draft.products = draft.products.filter(function (p) { return p.id !== product.id; });
        renderDraft();
      });
      row.appendChild(label);
      row.appendChild(del);
      el.draftProductList.appendChild(row);
    });
  }

  function createEntityFromDraft() {
    var name = el.draftNameInput.value.trim();
    if (!name) {
      el.draftNameInput.focus();
      return;
    }
    state.entities.push({
      id: uid("e"),
      name: name,
      type: draft.type,
      tasks: draft.tasks,
      products: draft.type === "person" ? draft.products : []
    });
    saveState();

    el.draftNameInput.value = "";
    draft = { type: draft.type, tasks: [], products: [] };
    renderDraft();
    renderAll();
    showToast((draft.type === "person" ? "Person" : "Branch") + " created successfully");
  }

  function renderAll() {
    renderSetupEntities();
    renderChecklist();
    renderSummary();
  }

  function renderSetupEntities() {
    el.entityList.innerHTML = "";
    el.entityListEmpty.hidden = state.entities.length > 0;
    state.entities.forEach(function (entity) {
      el.entityList.appendChild(buildEntityEditor(entity));
    });
  }

  function buildEntityEditor(entity) {
    var box = document.createElement("div");
    box.className = "entity-editor";

    var head = document.createElement("div");
    head.className = "entity-editor-head";

    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = entity.name;
    nameInput.addEventListener("change", function () {
      entity.name = nameInput.value.trim() || entity.name;
      nameInput.value = entity.name;
      saveState();
      renderChecklist();
      renderSummary();
    });

    var typeSelect = document.createElement("select");
    ["person", "branch"].forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t === "person" ? "Person" : "Branch";
      if (entity.type === t) opt.selected = true;
      typeSelect.appendChild(opt);
    });
    typeSelect.addEventListener("change", function () {
      entity.type = typeSelect.value;
      saveState();
      renderAll();
    });

    var duplicateBtn = document.createElement("button");
    duplicateBtn.className = "icon-btn icon-btn-duplicate";
    duplicateBtn.textContent = "Duplicate";
    duplicateBtn.addEventListener("click", function () { duplicateEntity(entity); });

    var removeBtn = document.createElement("button");
    removeBtn.className = "icon-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", function () {
      state.entities = state.entities.filter(function (e) { return e.id !== entity.id; });
      saveState();
      renderAll();
      showToast("Entry removed");
    });

    head.appendChild(nameInput);
    head.appendChild(typeSelect);
    head.appendChild(duplicateBtn);
    head.appendChild(removeBtn);
    box.appendChild(head);

    var taskLabel = document.createElement("p");
    taskLabel.className = "section-label";
    taskLabel.textContent = "Tasks";
    box.appendChild(taskLabel);

    var taskSubList = document.createElement("div");
    taskSubList.className = "sub-list";
    entity.tasks.forEach(function (task) {
      taskSubList.appendChild(buildSubEditRow(task, function () {
        entity.tasks = entity.tasks.filter(function (t) { return t.id !== task.id; });
        saveState();
        renderAll();
      }));
    });
    box.appendChild(taskSubList);

    var taskAddRow = document.createElement("div");
    taskAddRow.className = "add-row";
    var taskInput = document.createElement("input");
    taskInput.type = "text";
    taskInput.placeholder = "Add task";
    var taskAddBtn = document.createElement("button");
    taskAddBtn.className = "btn btn-secondary";
    taskAddBtn.textContent = "Add";
    var doAddTask = function () {
      var name = taskInput.value.trim();
      if (!name) return;
      entity.tasks.push({ id: uid("t"), name: name });
      taskInput.value = "";
      saveState();
      renderAll();
    };
    taskAddBtn.addEventListener("click", doAddTask);
    taskInput.addEventListener("keydown", function (e) { if (e.key === "Enter") doAddTask(); });
    taskAddRow.appendChild(taskInput);
    taskAddRow.appendChild(taskAddBtn);
    box.appendChild(taskAddRow);

    if (entity.type === "person") {
      var prodLabel = document.createElement("p");
      prodLabel.className = "section-label";
      prodLabel.textContent = "Products & Prices";
      box.appendChild(prodLabel);

      var prodSubList = document.createElement("div");
      prodSubList.className = "sub-list";
      entity.products.forEach(function (product) {
        prodSubList.appendChild(buildProductEditRow(product, entity));
      });
      box.appendChild(prodSubList);

      var prodAddRow = document.createElement("div");
      prodAddRow.className = "add-row triple-row";
      var prodNameInput = document.createElement("input");
      prodNameInput.type = "text";
      prodNameInput.placeholder = "Product name";
      var prodPriceInput = document.createElement("input");
      prodPriceInput.type = "number";
      prodPriceInput.placeholder = "Price";
      prodPriceInput.min = "0";
      prodPriceInput.step = "0.01";
      var prodAddBtn = document.createElement("button");
      prodAddBtn.className = "btn btn-secondary";
      prodAddBtn.textContent = "Add";
      
      var doAddProduct = function () {
        var name = prodNameInput.value.trim();
        var price = Number(prodPriceInput.value);
        if (!name || isNaN(price) || price < 0) return;
        entity.products.push({ id: uid("pr"), name: name, price: price });
        prodNameInput.value = "";
        prodPriceInput.value = "";
        saveState();
        renderAll();
      };
      prodAddBtn.addEventListener("click", doAddProduct);
      prodNameInput.addEventListener("keydown", function (e) { if (e.key === "Enter") doAddProduct(); });
      prodPriceInput.addEventListener("keydown", function (e) { if (e.key === "Enter") doAddProduct(); });
      
      prodAddRow.appendChild(prodNameInput);
      prodAddRow.appendChild(prodPriceInput);
      prodAddRow.appendChild(prodAddBtn);
      box.appendChild(prodAddRow);
    }

    return box;
  }

  function duplicateEntity(entity) {
    var copy = {
      id: uid("e"),
      name: entity.name + " (Copy)",
      type: entity.type,
      tasks: entity.tasks.map(function (t) { return { id: uid("t"), name: t.name }; }),
      products: entity.products.map(function (p) { return { id: uid("pr"), name: p.name, price: p.price }; })
    };
    var idx = state.entities.findIndex(function (e) { return e.id === entity.id; });
    state.entities.splice(idx + 1, 0, copy);
    saveState();
    renderAll();
    showToast("Duplicated entry");
  }

  function buildSubEditRow(item, onRemove, skipRename) {
    var row = document.createElement("div");
    row.className = "edit-row";
    var input = document.createElement("input");
    input.type = "text";
    input.value = item.name;
    input.addEventListener("change", function () {
      item.name = input.value.trim() || item.name;
      input.value = item.name;
      if (!skipRename) {
        saveState();
        renderChecklist();
        renderSummary();
      }
    });
    var del = document.createElement("button");
    del.className = "icon-btn";
    del.textContent = "Remove";
    del.addEventListener("click", onRemove);

    row.appendChild(input);
    row.appendChild(del);
    return row;
  }

  function buildProductEditRow(product, entity) {
    var row = document.createElement("div");
    row.className = "edit-row";
    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = product.name;
    nameInput.addEventListener("change", function () {
      product.name = nameInput.value.trim() || product.name;
      nameInput.value = product.name;
      saveState();
      renderChecklist();
    });

    var priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.step = "0.01";
    priceInput.value = product.price;
    priceInput.addEventListener("change", function () {
      var v = Number(priceInput.value);
      product.price = isNaN(v) || v < 0 ? product.price : v;
      priceInput.value = product.price;
      saveState();
      renderChecklist();
      renderSummary();
    });

    var del = document.createElement("button");
    del.className = "icon-btn";
    del.textContent = "Remove";
    del.addEventListener("click", function () {
      entity.products = entity.products.filter(function (p) { return p.id !== product.id; });
      saveState();
      renderAll();
    });

    row.appendChild(nameInput);
    row.appendChild(priceInput);
    row.appendChild(del);
    return row;
  }

  function renderChecklist() {
    var monthKey = el.monthPicker.value || currentMonthKey();
    el.checklistList.innerHTML = "";

    if (state.entities.length === 0) {
      el.checklistEmpty.hidden = false;
      return;
    }
    el.checklistEmpty.hidden = true;

    state.entities.forEach(function (entity) {
      el.checklistList.appendChild(buildEntityCard(entity, monthKey));
    });
  }

  function buildEntityCard(entity, monthKey) {
    var card = document.createElement("div");
    card.className = "branch-card";

    var head = document.createElement("div");
    head.className = "branch-head";

    var left = document.createElement("div");
    left.className = "branch-head-left";
    var h3 = document.createElement("h3");
    h3.textContent = entity.name;
    var tag = document.createElement("span");
    tag.className = "type-tag";
    tag.textContent = entity.type;
    left.appendChild(h3);
    left.appendChild(tag);

    var badge = document.createElement("span");
    badge.className = "badge";

    head.appendChild(left);
    head.appendChild(badge);
    card.appendChild(head);

    if (entity.tasks.length === 0) {
      var none = document.createElement("p");
      none.className = "no-tasks";
      none.textContent = "No tasks assigned.";
      card.appendChild(none);
    }

    entity.tasks.forEach(function (task) {
      var row = document.createElement("div");
      row.className = "task-row";

      var cb = document.createElement("input");
      cb.type = "checkbox";
      var cbId = "cb_" + entity.id + "_" + task.id;
      cb.id = cbId;
      cb.checked = isTaskChecked(monthKey, entity.id, task.id);
      cb.addEventListener("change", function () {
        setTaskChecked(monthKey, entity.id, task.id, cb.checked);
        updateTaskBadge(badge, monthKey, entity);
        renderSummary();
      });

      var label = document.createElement("label");
      label.setAttribute("for", cbId);
      label.textContent = task.name;

      row.appendChild(cb);
      row.appendChild(label);
      card.appendChild(row);
    });

    updateTaskBadge(badge, monthKey, entity);

    if (entity.type === "person" && entity.products.length > 0) {
      card.appendChild(buildCalculator(entity, monthKey));
    }

    return card;
  }

  function updateTaskBadge(badge, monthKey, entity) {
    var done = 0;
    entity.tasks.forEach(function (task) {
      if (isTaskChecked(monthKey, entity.id, task.id)) done++;
    });
    var total = entity.tasks.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    badge.textContent = total ? (done + "/" + total + " \u00b7 " + pct + "%") : "no tasks";
  }

  function buildCalculator(entity, monthKey) {
    var box = document.createElement("div");
    box.className = "calc-box";

    var title = document.createElement("p");
    title.className = "section-label";
    title.textContent = "Calculator";
    box.appendChild(title);

    var totalLine = document.createElement("div");
    totalLine.className = "calc-total";
    var totalLabel = document.createElement("span");
    totalLabel.textContent = "Total Amount";
    var totalValue = document.createElement("span");
    totalLine.appendChild(totalLabel);
    totalLine.appendChild(totalValue);

    function recompute() {
      var grand = 0;
      entity.products.forEach(function (product) {
        var qty = getQty(monthKey, entity.id, product.id);
        grand += qty * product.price;
      });
      totalValue.textContent = formatMoney(grand);
    }

    entity.products.forEach(function (product) {
      var row = document.createElement("div");
      row.className = "calc-row";

      var name = document.createElement("span");
      name.className = "calc-name";
      name.textContent = product.name;

      var price = document.createElement("span");
      price.className = "calc-price";
      price.textContent = formatMoney(product.price) + " ea";

      var qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.className = "calc-qty";
      qtyInput.min = "0";
      qtyInput.step = "1";
      qtyInput.value = getQty(monthKey, entity.id, product.id);

      var lineTotal = document.createElement("span");
      lineTotal.className = "calc-line-total";
      lineTotal.textContent = formatMoney(qtyInput.value * product.price);

      qtyInput.addEventListener("input", function () {
        setQty(monthKey, entity.id, product.id, qtyInput.value);
        lineTotal.textContent = formatMoney(Number(qtyInput.value || 0) * product.price);
        recompute();
        renderSummary();
      });

      row.appendChild(name);
      row.appendChild(price);
      row.appendChild(qtyInput);
      row.appendChild(lineTotal);
      box.appendChild(row);
    });

    box.appendChild(totalLine);
    recompute();
    return box;
  }

  function formatMoney(n) {
    var v = Number(n) || 0;
    return "₱" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderSummary() {
    var monthKey = el.monthPicker.value || currentMonthKey();

    if (state.entities.length === 0) {
      el.summaryEmpty.hidden = false;
      el.summaryContent.style.display = "none";
      return;
    }
    el.summaryEmpty.hidden = true;
    el.summaryContent.style.display = "block";

    var totalTasks = 0;
    var totalDone = 0;
    var grandPurchases = 0;

    var rows = state.entities.map(function (entity) {
      var done = 0;
      entity.tasks.forEach(function (task) {
        if (isTaskChecked(monthKey, entity.id, task.id)) done++;
      });
      totalTasks += entity.tasks.length;
      totalDone += done;

      var purchaseTotal = 0;
      if (entity.type === "person") {
        entity.products.forEach(function (product) {
          purchaseTotal += getQty(monthKey, entity.id, product.id) * product.price;
        });
        grandPurchases += purchaseTotal;
      }

      return { name: entity.name, type: entity.type, done: done, total: entity.tasks.length, purchaseTotal: purchaseTotal };
    });

    var overallPct = totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0;
    el.overallBarFill.style.width = overallPct + "%";
    el.overallText.textContent = totalDone + " of " + totalTasks + " tasks completed (" + overallPct + "%)";

    el.summaryByEntity.innerHTML = "";
    rows
      .slice()
      .sort(function (a, b) {
        var ap = a.total ? a.done / a.total : 0;
        var bp = b.total ? b.done / b.total : 0;
        return bp - ap;
      })
      .forEach(function (r) { el.summaryByEntity.appendChild(buildStatRow(r)); });

    el.totalPurchasesText.textContent = formatMoney(grandPurchases);
  }

  function buildStatRow(item) {
    var pct = item.total ? Math.round((item.done / item.total) * 100) : 0;
    var wrap = document.createElement("div");
    wrap.className = "stat-row";

    var labelRow = document.createElement("div");
    labelRow.className = "stat-label";
    var name = document.createElement("span");
    name.textContent = item.name + " (" + item.type + ")";
    var stat = document.createElement("span");
    var statText = item.total ? (item.done + "/" + item.total + " \u00b7 " + pct + "%") : "no tasks";
    if (item.type === "person") statText += " \u00b7 " + formatMoney(item.purchaseTotal);
    stat.textContent = statText;
    labelRow.appendChild(name);
    labelRow.appendChild(stat);

    var barWrap = document.createElement("div");
    barWrap.className = "bar";
    var fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = pct + "%";
    barWrap.appendChild(fill);

    wrap.appendChild(labelRow);
    wrap.appendChild(barWrap);
    return wrap;
  }

  function exportData() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "checklist-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Data exported successfully");
  }

  function importData(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.entities)) throw new Error("bad file");
        state = Object.assign(clone(defaultState), parsed);
        saveState();
        applyTemplateToUI();
        renderAll();
        showToast("Data imported successfully");
      } catch (err) {
        alert("Invalid checklist export file.");
      }
      el.importFile.value = "";
    };
    reader.readAsText(file);
  }

})();