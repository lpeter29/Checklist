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
        category: "Loan",
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
        category: "Business",
        tasks: [
          { id: "t3", name: "Inventory checked" },
          { id: "t4", name: "Cash count reconciled" }
        ],
        products: [
          { id: "pr3", name: "Branch Fee", price: 100 }
        ]
      }
    ],
    records: {}
  };

  var state = loadState();

  var el = {
    appTitle: document.getElementById("appTitle"),
    monthPicker: document.getElementById("monthPicker"),
    tabBtns: document.querySelectorAll(".tab-btn"),
    panels: document.querySelectorAll(".tab-panel"),
    personList: document.getElementById("personList"),
    personEmpty: document.getElementById("personEmpty"),
    personSearch: document.getElementById("personSearch"),
    personCategoryFilter: document.getElementById("personCategoryFilter"),
    branchList: document.getElementById("branchList"),
    branchEmpty: document.getElementById("branchEmpty"),
    branchSearch: document.getElementById("branchSearch"),
    branchCategoryFilter: document.getElementById("branchCategoryFilter"),
    summaryEmpty: document.getElementById("summaryEmpty"),
    summaryContent: document.getElementById("summaryContent"),
    overallBarFill: document.getElementById("overallBarFill"),
    overallText: document.getElementById("overallText"),
    summaryByEntity: document.getElementById("summaryByEntity"),
    totalPurchasesText: document.getElementById("totalPurchasesText"),
    titleInput: document.getElementById("titleInput"),
    colorInput: document.getElementById("colorInput"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFile: document.getElementById("importFile"),
    resetBtn: document.getElementById("resetBtn"),
    toast: document.getElementById("toast"),
    quickPersonNameInput: document.getElementById("quickPersonNameInput"),
    quickPersonCategoryInput: document.getElementById("quickPersonCategoryInput"),
    quickPersonAddBtn: document.getElementById("quickPersonAddBtn"),
    quickBranchNameInput: document.getElementById("quickBranchNameInput"),
    quickBranchCategoryInput: document.getElementById("quickBranchCategoryInput"),
    quickBranchAddBtn: document.getElementById("quickBranchAddBtn")
  };

  init();

  function init() {
    el.monthPicker.value = currentMonthKey();
    applyTemplateToUI();
    bindEvents();
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

    el.monthPicker.addEventListener("change", function () {
      renderChecklists();
      renderSummary();
    });

    el.personSearch.addEventListener("input", renderPersonTab);
    el.personCategoryFilter.addEventListener("change", renderPersonTab);
    el.branchSearch.addEventListener("input", renderBranchTab);
    el.branchCategoryFilter.addEventListener("change", renderBranchTab);

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

    el.quickPersonAddBtn.addEventListener("click", function () {
      createEntity("person", el.quickPersonNameInput, el.quickPersonCategoryInput);
    });
    el.quickPersonNameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") createEntity("person", el.quickPersonNameInput, el.quickPersonCategoryInput);
    });

    el.quickBranchAddBtn.addEventListener("click", function () {
      createEntity("branch", el.quickBranchNameInput, el.quickBranchCategoryInput);
    });
    el.quickBranchNameInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") createEntity("branch", el.quickBranchNameInput, el.quickBranchCategoryInput);
    });

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

  function createEntity(type, nameInput, catInput) {
    var name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    state.entities.push({
      id: uid("e"),
      name: name,
      type: type,
      category: catInput.value || "Loan",
      tasks: [],
      products: []
    });
    saveState();
    nameInput.value = "";
    renderAll();
    showToast((type === "person" ? "Person" : "Branch") + " created successfully");
  }

  function updateAccentColor(colorHex) {
    document.documentElement.style.setProperty("--accent", colorHex);
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

  function renderAll() {
    renderChecklists();
    renderSummary();
  }

  function renderChecklists() {
    renderPersonTab();
    renderBranchTab();
  }

  function renderPersonTab() {
    var monthKey = el.monthPicker.value || currentMonthKey();
    var query = el.personSearch.value.toLowerCase().trim();
    var selectedCat = el.personCategoryFilter.value;

    el.personList.innerHTML = "";
    var people = state.entities.filter(function (e) { return e.type === "person"; });

    var filtered = people.filter(function (p) {
      var matchesName = p.name.toLowerCase().includes(query);
      var matchesCat = !selectedCat || p.category === selectedCat;
      return matchesName && matchesCat;
    });

    el.personEmpty.hidden = people.length > 0 && filtered.length > 0;

    filtered.forEach(function (entity) {
      el.personList.appendChild(buildEntityCard(entity, monthKey));
    });
  }

  function renderBranchTab() {
    var monthKey = el.monthPicker.value || currentMonthKey();
    var query = el.branchSearch.value.toLowerCase().trim();
    var selectedCat = el.branchCategoryFilter.value;

    el.branchList.innerHTML = "";
    var branches = state.entities.filter(function (e) { return e.type === "branch"; });

    var filtered = branches.filter(function (b) {
      var matchesName = b.name.toLowerCase().includes(query);
      var matchesCat = !selectedCat || b.category === selectedCat;
      return matchesName && matchesCat;
    });

    el.branchEmpty.hidden = branches.length > 0 && filtered.length > 0;

    filtered.forEach(function (entity) {
      el.branchList.appendChild(buildEntityCard(entity, monthKey));
    });
  }

  function duplicateEntity(entity) {
    var copy = {
      id: uid("e"),
      name: entity.name + " (Copy)",
      type: entity.type,
      category: entity.category || "",
      tasks: entity.tasks.map(function (t) { return { id: uid("t"), name: t.name }; }),
      products: entity.products.map(function (p) { return { id: uid("pr"), name: p.name, price: p.price }; })
    };
    var idx = state.entities.findIndex(function (e) { return e.id === entity.id; });
    state.entities.splice(idx + 1, 0, copy);
    saveState();
    renderAll();
    showToast("Duplicated entry");
  }

  function buildEntityCard(entity, monthKey) {
    var card = document.createElement("div");
    card.className = "branch-card";

    var head = document.createElement("div");
    head.className = "branch-head";

    var left = document.createElement("div");
    left.className = "branch-head-left";
    
    var nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "inline-name-input";
    nameInput.value = entity.name;
    nameInput.addEventListener("change", function () {
      entity.name = nameInput.value.trim() || entity.name;
      nameInput.value = entity.name;
      saveState();
      renderChecklists();
      renderSummary();
    });
    left.appendChild(nameInput);

    var categorySelect = document.createElement("select");
    categorySelect.className = "category-select";
    ["Loan", "Business", "Debt"].forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      if (entity.category === c) opt.selected = true;
      categorySelect.appendChild(opt);
    });
    categorySelect.addEventListener("change", function () {
      entity.category = categorySelect.value;
      saveState();
      renderChecklists();
      renderSummary();
    });
    left.appendChild(categorySelect);

    var rightActions = document.createElement("div");
    rightActions.className = "branch-head-right";

    var badge = document.createElement("span");
    badge.className = "badge";
    rightActions.appendChild(badge);

    var duplicateBtn = document.createElement("button");
    duplicateBtn.className = "icon-btn icon-btn-duplicate";
    duplicateBtn.textContent = "Copy";
    duplicateBtn.addEventListener("click", function () { duplicateEntity(entity); });
    rightActions.appendChild(duplicateBtn);

    var removeBtn = document.createElement("button");
    removeBtn.className = "icon-btn";
    removeBtn.textContent = "Delete";
    removeBtn.addEventListener("click", function () {
      state.entities = state.entities.filter(function (e) { return e.id !== entity.id; });
      saveState();
      renderAll();
      showToast("Entry removed");
    });
    rightActions.appendChild(removeBtn);

    head.appendChild(left);
    head.appendChild(rightActions);
    card.appendChild(head);

    // Tasks section with inline editing/adding
    var taskLabel = document.createElement("p");
    taskLabel.className = "section-label";
    taskLabel.textContent = "Tasks";
    card.appendChild(taskLabel);

    var taskSubList = document.createElement("div");
    taskSubList.className = "sub-list";
    
    if (entity.tasks.length === 0) {
      var none = document.createElement("p");
      none.className = "no-tasks";
      none.textContent = "No tasks assigned.";
      taskSubList.appendChild(none);
    }

    entity.tasks.forEach(function (task) {
      var row = document.createElement("div");
      row.className = "task-edit-row";

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

      var taskInput = document.createElement("input");
      taskInput.type = "text";
      taskInput.value = task.name;
      taskInput.className = "sub-input";
      taskInput.addEventListener("change", function () {
        task.name = taskInput.value.trim() || task.name;
        taskInput.value = task.name;
        saveState();
        renderSummary();
      });

      var delTask = document.createElement("button");
      delTask.className = "icon-btn";
      delTask.textContent = "✕";
      delTask.addEventListener("click", function () {
        entity.tasks = entity.tasks.filter(function (t) { return t.id !== task.id; });
        saveState();
        renderAll();
      });

      row.appendChild(cb);
      row.appendChild(taskInput);
      row.appendChild(delTask);
      taskSubList.appendChild(row);
    });
    card.appendChild(taskSubList);

    var taskAddRow = document.createElement("div");
    taskAddRow.className = "add-row";
    var taskInputNew = document.createElement("input");
    taskInputNew.type = "text";
    taskInputNew.placeholder = "Add task description";
    var taskAddBtn = document.createElement("button");
    taskAddBtn.className = "btn btn-secondary";
    taskAddBtn.textContent = "Add Task";
    
    var doAddTask = function () {
      var name = taskInputNew.value.trim();
      if (!name) return;
      entity.tasks.push({ id: uid("t"), name: name });
      taskInputNew.value = "";
      saveState();
      renderAll();
    };
    taskAddBtn.addEventListener("click", doAddTask);
    taskInputNew.addEventListener("keydown", function (e) { if (e.key === "Enter") doAddTask(); });
    taskAddRow.appendChild(taskInputNew);
    taskAddRow.appendChild(taskAddBtn);
    card.appendChild(taskAddRow);

    updateTaskBadge(badge, monthKey, entity);

    // Products / Calculator Section
    card.appendChild(buildCalculator(entity, monthKey));

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
    title.textContent = "Products & Pricing Calculator";
    box.appendChild(title);

    var prodSubList = document.createElement("div");
    prodSubList.className = "sub-list";

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
      row.className = "calc-edit-row";

      var nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = product.name;
      nameInput.className = "sub-input";
      nameInput.addEventListener("change", function () {
        product.name = nameInput.value.trim() || product.name;
        nameInput.value = product.name;
        saveState();
      });

      var priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.min = "0";
      priceInput.step = "0.01";
      priceInput.value = product.price;
      priceInput.className = "calc-price-input";
      priceInput.addEventListener("change", function () {
        var v = Number(priceInput.value);
        product.price = isNaN(v) || v < 0 ? product.price : v;
        priceInput.value = product.price;
        saveState();
        recompute();
        renderSummary();
      });

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

      var del = document.createElement("button");
      del.className = "icon-btn";
      del.textContent = "✕";
      del.addEventListener("click", function () {
        entity.products = entity.products.filter(function (p) { return p.id !== product.id; });
        saveState();
        renderAll();
      });

      row.appendChild(nameInput);
      row.appendChild(priceInput);
      row.appendChild(qtyInput);
      row.appendChild(lineTotal);
      row.appendChild(del);
      prodSubList.appendChild(row);
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
    prodAddBtn.textContent = "Add Product";
    
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

    var totalLine = document.createElement("div");
    totalLine.className = "calc-total";
    var totalLabel = document.createElement("span");
    totalLabel.textContent = "Category Total";
    var totalValue = document.createElement("span");
    totalLine.appendChild(totalLabel);
    totalLine.appendChild(totalValue);
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
    var categoryTotals = {};

    var rows = state.entities.map(function (entity) {
      var done = 0;
      entity.tasks.forEach(function (task) {
        if (isTaskChecked(monthKey, entity.id, task.id)) done++;
      });
      totalTasks += entity.tasks.length;
      totalDone += done;

      var purchaseTotal = 0;
      entity.products.forEach(function (product) {
        purchaseTotal += getQty(monthKey, entity.id, product.id) * product.price;
      });
      grandPurchases += purchaseTotal;

      var cat = entity.category || "Unassigned";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + purchaseTotal;

      return { name: entity.name, type: entity.type, category: entity.category, done: done, total: entity.tasks.length, purchaseTotal: purchaseTotal };
    });

    var overallPct = totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0;
    el.overallBarFill.style.width = overallPct + "%";
    el.overallText.textContent = totalDone + " of " + totalTasks + " tasks completed (" + overallPct + "%)";

    el.summaryByEntity.innerHTML = "";
    
    var catSummaryTitle = document.createElement("p");
    catSummaryTitle.className = "section-label";
    catSummaryTitle.textContent = "Totals by Category";
    el.summaryByEntity.appendChild(catSummaryTitle);

    Object.keys(categoryTotals).forEach(function(cat) {
      var catRow = document.createElement("div");
      catRow.className = "stat-row";
      catRow.style.marginBottom = "0.5rem";
      catRow.innerHTML = '<div class="stat-label"><span><strong>' + cat + '</strong></span><span>' + formatMoney(categoryTotals[cat]) + '</span></div>';
      el.summaryByEntity.appendChild(catRow);
    });

    var entityTitleDivider = document.createElement("p");
    entityTitleDivider.className = "section-label";
    entityTitleDivider.style.marginTop = "1rem";
    entityTitleDivider.textContent = "Entity Breakdown";
    el.summaryByEntity.appendChild(entityTitleDivider);

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
    var labelText = item.name + " (" + item.type + (item.category ? " - " + item.category : "") + ")";
    name.textContent = labelText;
    var stat = document.createElement("span");
    var statText = item.total ? (item.done + "/" + item.total + " \u00b7 " + pct + "%") : "no tasks";
    statText += " \u00b7 " + formatMoney(item.purchaseTotal);
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