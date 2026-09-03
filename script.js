(function () {
  "use strict";

  var STORAGE_KEY = "monthlyChecklistData";

  var defaultState = {
    title: "Monthly Checklist",
    color: "#2f6f62",
    people: [
      { id: "p1", name: "Branch A" },
      { id: "p2", name: "Branch B" }
    ],
    tasks: [
      { id: "t1", name: "Sales report submitted" },
      { id: "t2", name: "Inventory checked" },
      { id: "t3", name: "Cash count reconciled" }
    ],
    records: {}
  };

  var state = loadState();

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
    summaryByBranch: document.getElementById("summaryByBranch"),
    summaryByTask: document.getElementById("summaryByTask"),
    titleInput: document.getElementById("titleInput"),
    colorInput: document.getElementById("colorInput"),
    peopleList: document.getElementById("peopleList"),
    taskList: document.getElementById("taskList"),
    newPersonInput: document.getElementById("newPersonInput"),
    newTaskInput: document.getElementById("newTaskInput"),
    addPersonBtn: document.getElementById("addPersonBtn"),
    addTaskBtn: document.getElementById("addTaskBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFile: document.getElementById("importFile"),
    resetBtn: document.getElementById("resetBtn"),
    toast: document.getElementById("toast")
  };

  init();

  function init() {
    el.monthPicker.value = currentMonthKey();
    applyTemplateToUI();
    bindEvents();
    renderAll();
  }

  // ---------- state ----------

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return clone(defaultState);
      var parsed = JSON.parse(raw);
      return Object.assign(clone(defaultState), parsed);
    } catch (e) {
      return clone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uid(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function currentMonthKey() {
    var d = new Date();
    var m = (d.getMonth() + 1).toString().padStart(2, "0");
    return d.getFullYear() + "-" + m;
  }

  function getMonthRecords(monthKey) {
    if (!state.records[monthKey]) state.records[monthKey] = {};
    return state.records[monthKey];
  }

  function isChecked(monthKey, personId, taskId) {
    var m = state.records[monthKey];
    return !!(m && m[personId] && m[personId][taskId]);
  }

  function setChecked(monthKey, personId, taskId, value) {
    var m = getMonthRecords(monthKey);
    if (!m[personId]) m[personId] = {};
    m[personId][taskId] = value;
    saveState();
  }

  // ---------- UI wiring ----------

  function bindEvents() {
    el.tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-tab"));
      });
    });

    document.querySelectorAll("[data-goto]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-goto"));
      });
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
      document.documentElement.style.setProperty("--accent", state.color);
      saveState();
    });

    el.addPersonBtn.addEventListener("click", function () {
      addEntry(state.people, el.newPersonInput);
    });
    el.newPersonInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") addEntry(state.people, el.newPersonInput);
    });

    el.addTaskBtn.addEventListener("click", function () {
      addEntry(state.tasks, el.newTaskInput);
    });
    el.newTaskInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") addEntry(state.tasks, el.newTaskInput);
    });

    el.exportBtn.addEventListener("click", exportData);
    el.importBtn.addEventListener("click", function () { el.importFile.click(); });
    el.importFile.addEventListener("change", importData);

    el.resetBtn.addEventListener("click", function () {
      if (confirm("This clears all branches, tasks and checked records on this device. Continue?")) {
        state = clone(defaultState);
        saveState();
        applyTemplateToUI();
        renderAll();
        showToast("Reset to a blank template");
      }
    });
  }

  function switchTab(name) {
    el.tabBtns.forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    el.panels.forEach(function (p) {
      p.classList.toggle("active", p.id === name);
    });
  }

  function applyTemplateToUI() {
    el.appTitle.textContent = state.title;
    document.title = state.title;
    el.titleInput.value = state.title;
    el.colorInput.value = state.color;
    document.documentElement.style.setProperty("--accent", state.color);
  }

  function addEntry(list, input) {
    var name = input.value.trim();
    if (!name) return;
    list.push({ id: uid("i"), name: name });
    input.value = "";
    saveState();
    renderAll();
  }

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.toast.hidden = true; }, 2200);
  }

  // ---------- rendering ----------

  function renderAll() {
    renderSetupLists();
    renderChecklist();
    renderSummary();
  }

  function renderSetupLists() {
    el.peopleList.innerHTML = "";
    state.people.forEach(function (person) {
      el.peopleList.appendChild(buildEditRow(person, state.people, false));
    });

    el.taskList.innerHTML = "";
    state.tasks.forEach(function (task) {
      el.taskList.appendChild(buildEditRow(task, state.tasks, true));
    });
  }

  function buildEditRow(item, list) {
    var row = document.createElement("div");
    row.className = "edit-row";

    var input = document.createElement("input");
    input.type = "text";
    input.value = item.name;
    input.addEventListener("change", function () {
      item.name = input.value.trim() || item.name;
      input.value = item.name;
      saveState();
      renderChecklist();
      renderSummary();
    });

    var del = document.createElement("button");
    del.className = "icon-btn";
    del.textContent = "Remove";
    del.addEventListener("click", function () {
      var idx = list.indexOf(item);
      if (idx > -1) list.splice(idx, 1);
      saveState();
      renderAll();
    });

    row.appendChild(input);
    row.appendChild(del);
    return row;
  }

  function renderChecklist() {
    var monthKey = el.monthPicker.value || currentMonthKey();
    el.checklistList.innerHTML = "";

    if (state.people.length === 0 || state.tasks.length === 0) {
      el.checklistEmpty.hidden = false;
      return;
    }
    el.checklistEmpty.hidden = true;

    state.people.forEach(function (person) {
      var card = document.createElement("div");
      card.className = "branch-card";

      var head = document.createElement("div");
      head.className = "branch-head";

      var h3 = document.createElement("h3");
      h3.textContent = person.name;

      var badge = document.createElement("span");
      badge.className = "badge";

      head.appendChild(h3);
      head.appendChild(badge);
      card.appendChild(head);

      state.tasks.forEach(function (task) {
        var row = document.createElement("div");
        row.className = "task-row";

        var cb = document.createElement("input");
        cb.type = "checkbox";
        var cbId = "cb_" + person.id + "_" + task.id;
        cb.id = cbId;
        cb.checked = isChecked(monthKey, person.id, task.id);
        cb.addEventListener("change", function () {
          setChecked(monthKey, person.id, task.id, cb.checked);
          updateBadge(badge, monthKey, person.id);
          renderSummary();
        });

        var label = document.createElement("label");
        label.setAttribute("for", cbId);
        label.textContent = task.name;

        row.appendChild(cb);
        row.appendChild(label);
        card.appendChild(row);
      });

      updateBadge(badge, monthKey, person.id);
      el.checklistList.appendChild(card);
    });
  }

  function updateBadge(badge, monthKey, personId) {
    var done = 0;
    state.tasks.forEach(function (task) {
      if (isChecked(monthKey, personId, task.id)) done++;
    });
    var total = state.tasks.length;
    var pct = total ? Math.round((done / total) * 100) : 0;
    badge.textContent = done + "/" + total + " \u00b7 " + pct + "%";
  }

  function renderSummary() {
    var monthKey = el.monthPicker.value || currentMonthKey();

    if (state.people.length === 0 || state.tasks.length === 0) {
      el.summaryEmpty.hidden = false;
      el.summaryContent.style.display = "none";
      return;
    }
    el.summaryEmpty.hidden = true;
    el.summaryContent.style.display = "block";

    var totalCells = state.people.length * state.tasks.length;
    var totalDone = 0;

    var perPerson = state.people.map(function (person) {
      var done = 0;
      state.tasks.forEach(function (task) {
        if (isChecked(monthKey, person.id, task.id)) done++;
      });
      totalDone += done;
      return { name: person.name, done: done, total: state.tasks.length };
    });

    var perTask = state.tasks.map(function (task) {
      var done = 0;
      state.people.forEach(function (person) {
        if (isChecked(monthKey, person.id, task.id)) done++;
      });
      return { name: task.name, done: done, total: state.people.length };
    });

    var overallPct = totalCells ? Math.round((totalDone / totalCells) * 100) : 0;
    el.overallBarFill.style.width = overallPct + "%";
    el.overallText.textContent = totalDone + " of " + totalCells + " items completed (" + overallPct + "%)";

    el.summaryByBranch.innerHTML = "";
    perPerson
      .slice()
      .sort(function (a, b) { return (b.done / b.total) - (a.done / a.total); })
      .forEach(function (p) { el.summaryByBranch.appendChild(buildStatRow(p)); });

    el.summaryByTask.innerHTML = "";
    perTask
      .slice()
      .sort(function (a, b) { return (b.done / b.total) - (a.done / a.total); })
      .forEach(function (t) { el.summaryByTask.appendChild(buildStatRow(t)); });
  }

  function buildStatRow(item) {
    var pct = item.total ? Math.round((item.done / item.total) * 100) : 0;
    var wrap = document.createElement("div");
    wrap.className = "stat-row";

    var labelRow = document.createElement("div");
    labelRow.className = "stat-label";
    var name = document.createElement("span");
    name.textContent = item.name;
    var stat = document.createElement("span");
    stat.textContent = item.done + "/" + item.total + " \u00b7 " + pct + "%";
    labelRow.appendChild(name);
    labelRow.appendChild(stat);

    var bar = document.createElement("div");
    bar.className = "bar";
    var fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = pct + "%";
    bar.appendChild(fill);

    wrap.appendChild(labelRow);
    wrap.appendChild(bar);
    return wrap;
  }

  // ---------- import / export ----------

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
    showToast("Exported");
  }

  function importData(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed.people || !parsed.tasks) throw new Error("bad file");
        state = Object.assign(clone(defaultState), parsed);
        saveState();
        applyTemplateToUI();
        renderAll();
        showToast("Data imported");
      } catch (err) {
        alert("That file doesn't look like a valid checklist export.");
      }
      el.importFile.value = "";
    };
    reader.readAsText(file);
  }

})();
