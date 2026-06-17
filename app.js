const STORAGE_KEY = "meme-board-settings";
const LOCAL_DATA_KEY = "meme-board-local-data";
const DEFAULT_NAS_STREAM_URL = "http://127.0.0.1:8787";
const FINAL_UPLOAD_PREFIX = "\\\\192.168.0.10\\highst_영상팀\\@종편,클린본,콜렉트\\숏폼\\밈 나스링크";
const FINAL_UPLOAD_HELP = `${FINAL_UPLOAD_PREFIX}\\파일명.mp4 형식만 입력해 주세요.`;
const REFERENCE_MARKER = "__reference_link__";

const STATUS_CLASS = {
  "촬영필요": "status-wait",
  "촬영완료": "status-shot",
  "작업중": "status-working",
  "작업완료": "status-work-done",
  "컨펌대기": "status-approval",
  "수정중": "status-revision",
  "수정완료": "status-approved",
  "업로드완료": "status-done",
  "보류": "status-hold",
};

const APPROVAL_CLASS = {
  "미확인": "approval-pending",
  "승인": "approval-approved",
  "수정요청": "approval-revision",
};

const PLATFORM_LOGOS = {
  "유튜브": "./assets/platforms/youtube.png",
  "인스타": "./assets/platforms/instagram.png",
  "틱톡": "./assets/platforms/tiktok.png",
};

let items = [];
let activeFilter = "all";
let searchQuery = "";
let settings = applySharedSettings(loadSettings());
let quickSaving = false;
let activePlayerItemId = "";
let activePlayerVersionIndex = -1;

const els = {
  referenceSidebarButton: document.querySelector("#referenceSidebarButton"),
  setupNotice: document.querySelector("#setupNotice"),
  pendingCount: document.querySelector("#pendingCount"),
  revisionCount: document.querySelector("#revisionCount"),
  dueTodayCount: document.querySelector("#dueTodayCount"),
  doneCount: document.querySelector("#doneCount"),
  filterTabs: document.querySelector("#filterTabs"),
  searchInput: document.querySelector("#searchInput"),
  tableBody: document.querySelector("#tableBody"),
  mobileList: document.querySelector("#mobileList"),
  emptyState: document.querySelector("#emptyState"),
  listCaption: document.querySelector("#listCaption"),
  saveState: document.querySelector("#saveState"),
  itemDialog: document.querySelector("#itemDialog"),
  itemForm: document.querySelector("#itemForm"),
  itemDialogTitle: document.querySelector("#itemDialogTitle"),
  playerDialog: document.querySelector("#playerDialog"),
  playerTitle: document.querySelector("#playerTitle"),
  playerVersionTabs: document.querySelector("#playerVersionTabs"),
  playerBody: document.querySelector("#playerBody"),
  playerRevisionTitle: document.querySelector("#playerRevisionTitle"),
  playerRevisionStatus: document.querySelector("#playerRevisionStatus"),
  playerRevisionInput: document.querySelector("#playerRevisionInput"),
  saveRevisionButton: document.querySelector("#saveRevisionButton"),
  revisionHistory: document.querySelector("#revisionHistory"),
  playerOpenLink: document.querySelector("#playerOpenLink"),
  closePlayerButton: document.querySelector("#closePlayerButton"),
  finalDialog: document.querySelector("#finalDialog"),
  finalForm: document.querySelector("#finalForm"),
  finalItemId: document.querySelector("#finalItemId"),
  finalItemTitle: document.querySelector("#finalItemTitle"),
  finalVersionHint: document.querySelector("#finalVersionHint"),
  finalUploadUrl: document.querySelector("#finalUploadUrlInput"),
  finalComplete: document.querySelector("#finalCompleteInput"),
  closeFinalButton: document.querySelector("#closeFinalButton"),
  cancelFinalButton: document.querySelector("#cancelFinalButton"),
  saveFinalButton: document.querySelector("#saveFinalButton"),
  saveFinalPreviewButton: document.querySelector("#saveFinalPreviewButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  apiUrlInput: document.querySelector("#apiUrlInput"),
  nasStreamUrlInput: document.querySelector("#nasStreamUrlInput"),
  apiSecretInput: document.querySelector("#apiSecretInput"),
  userNameInput: document.querySelector("#userNameInput"),
  createShareLinkButton: document.querySelector("#createShareLinkButton"),
  shareLinkStatus: document.querySelector("#shareLinkStatus"),
  deleteButton: document.querySelector("#deleteButton"),
  quickAddForm: document.querySelector("#quickAddForm"),
  quickItems: document.querySelector("#quickItems"),
  addQuickItemButton: document.querySelector("#addQuickItemButton"),
  quickStatus: document.querySelector("#quickStatus"),
  quickAddButton: document.querySelector("#quickAddButton"),
  referenceBackdrop: document.querySelector("#referenceBackdrop"),
  referenceSidebar: document.querySelector("#referenceSidebar"),
  closeReferenceSidebarButton: document.querySelector("#closeReferenceSidebarButton"),
  referenceForm: document.querySelector("#referenceForm"),
  referenceTitle: document.querySelector("#referenceTitleInput"),
  referenceUrl: document.querySelector("#referenceUrlInput"),
  referenceNote: document.querySelector("#referenceNoteInput"),
  referenceStatus: document.querySelector("#referenceStatus"),
  referenceList: document.querySelector("#referenceList"),
};

const form = {
  id: document.querySelector("#itemId"),
  title: document.querySelector("#titleInput"),
  sourceUrl: document.querySelector("#sourceUrlInput"),
  thumbnail: document.querySelector("#thumbnailInput"),
  platform: document.querySelector("#platformInput"),
  reference: document.querySelector("#referenceInput"),
  owner: document.querySelector("#ownerInput"),
  status: document.querySelector("#statusInput"),
  draftUrl: document.querySelector("#draftUrlInput"),
  approval: document.querySelector("#approvalInput"),
  feedback: document.querySelector("#feedbackInput"),
  dueDate: document.querySelector("#dueDateInput"),
  scheduleDate: document.querySelector("#scheduleDateInput"),
  uploadUrl: document.querySelector("#uploadUrlInput"),
};

document.querySelector("#newItemButton").addEventListener("click", () => openItemDialog());
document.querySelector("#settingsButton").addEventListener("click", openSettings);
document.querySelector("#openSetupButton").addEventListener("click", openSettings);
document.querySelector("#refreshButton").addEventListener("click", loadItems);
document.querySelector("#saveItemButton").addEventListener("click", saveItemFromForm);
document.querySelector("#deleteButton").addEventListener("click", deleteCurrentItem);
els.referenceSidebarButton.addEventListener("click", openReferenceSidebar);
els.closeReferenceSidebarButton.addEventListener("click", closeReferenceSidebar);
els.referenceBackdrop.addEventListener("click", closeReferenceSidebar);
els.referenceForm.addEventListener("submit", saveReferenceFromForm);
els.referenceList.addEventListener("click", handleReferenceListClick);
els.finalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveFinalUploadFromForm({ preview: false });
});
els.finalUploadUrl.addEventListener("input", () => validateFinalUploadControl(els.finalUploadUrl));
els.closeFinalButton.addEventListener("click", closeFinalUploadDialog);
els.cancelFinalButton.addEventListener("click", closeFinalUploadDialog);
els.saveFinalButton.addEventListener("click", () => saveFinalUploadFromForm({ preview: false }));
els.saveFinalPreviewButton.addEventListener("click", () => saveFinalUploadFromForm({ preview: true }));
els.closePlayerButton.addEventListener("click", closePlayerDialog);
els.playerDialog.addEventListener("close", clearPlayerDialog);
els.playerBody.addEventListener("click", handlePlayerBodyClick);
els.playerVersionTabs.addEventListener("click", handlePlayerVersionClick);
els.saveRevisionButton.addEventListener("click", saveRevisionRequestFromPlayer);
document.querySelector("#saveSettingsButton").addEventListener("click", saveSettingsFromDialog);
document.querySelector("#clearSettingsButton").addEventListener("click", clearSettings);
els.createShareLinkButton.addEventListener("click", createSettingsShareLink);
els.quickAddForm.addEventListener("submit", submitQuickLinks);
els.addQuickItemButton.addEventListener("click", addQuickEntryFromButton);
els.quickItems.addEventListener("input", handleQuickEntryInput);
els.quickItems.addEventListener("click", handleQuickEntryClick);
els.quickItems.addEventListener("paste", preventMultipleLinkPaste);

els.filterTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".tab-button").forEach((tab) => {
    tab.classList.toggle("is-active", tab === button);
  });
  render();
});

els.searchInput.addEventListener("input", (event) => {
  searchQuery = event.target.value.trim().toLowerCase();
  render();
});

els.tableBody.addEventListener("click", handleListAction);
els.mobileList.addEventListener("click", handleListAction);

initializeQuickEntries();
loadItems();

async function loadItems() {
  setSaveState("불러오는 중");
  els.setupNotice.hidden = hasApiSettings();

  try {
    if (hasApiSettings()) {
      const response = await requestApi("list");
      items = normalizeItems(response.items || []);
      refreshMissingMetadata();
    } else {
      items = await loadLocalItems();
    }
    setSaveState("준비됨");
  } catch (error) {
    console.error(error);
    setSaveState("연결 오류");
    items = await loadLocalItems();
    els.setupNotice.hidden = false;
  }

  render();
}

async function loadLocalItems() {
  const saved = localStorage.getItem(LOCAL_DATA_KEY);
  if (saved) {
    return normalizeItems(JSON.parse(saved));
  }

  const response = await fetch("./data/sample-videos.json", { cache: "no-store" });
  const data = await response.json();
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data.items));
  return normalizeItems(data.items);
}

async function submitQuickLinks(event = {}) {
  event.preventDefault?.();
  if (quickSaving) return;

  const entries = collectQuickEntries();

  if (entries.length === 0) {
    setQuickStatus("등록할 제목과 링크를 입력해 주세요");
    focusQuickField(getQuickRows()[0], "title");
    return;
  }

  for (const entry of entries) {
    if (!entry.title) {
      setQuickStatus(`${entry.number}번 제작 제목을 입력해 주세요`);
      focusQuickField(entry.row, "title");
      return;
    }

    if (entry.urls.length === 0) {
      setQuickStatus(`${entry.number}번 링크를 입력해 주세요`);
      focusQuickField(entry.row, "link");
      return;
    }

    if (entry.urls.length > 1) {
      setQuickStatus(`${entry.number}번에는 링크 1개만 넣어 주세요`);
      focusQuickField(entry.row, "link");
      return;
    }
  }

  if (!hasApiSettings()) {
    setQuickStatus("먼저 Google Sheets 연결 설정이 필요합니다");
    openSettings();
    return;
  }

  const existingKeys = new Set(items.map((item) => normalizeUrlKey(item.sourceUrl)));
  for (const entry of entries) {
    const key = normalizeUrlKey(entry.urls[0]);
    if (!key || existingKeys.has(key)) {
      setQuickStatus(`${entry.number}번은 이미 등록된 링크입니다`);
      focusQuickField(entry.row, "link");
      return;
    }
    existingKeys.add(key);
  }

  quickSaving = true;
  els.quickAddButton.disabled = true;
  setQuickStatus(`${entries.length}개 화면에 추가 중`);

  const newItems = entries.map((entry) => normalizeItem(createQuickItem(entry.urls[0], entry.title, entry.reference)));
  items = [...newItems, ...items];
  persistLocalFallback();
  render();
  resetQuickEntries();

  setQuickStatus(`${newItems.length}개 추가됨, 시트 저장 중`);
  quickSaving = false;
  els.quickAddButton.disabled = false;
  saveQuickItemsToServer(newItems);
}

function preventMultipleLinkPaste(event) {
  if (!event.target.closest('[data-field="link"]')) return;
  const text = event.clipboardData?.getData("text") || "";
  if (extractUrls(text).length <= 1) return;
  event.preventDefault();
  setQuickStatus("한 칸에는 링크 1개만 붙여넣을 수 있습니다");
}

function initializeQuickEntries() {
  els.quickItems.innerHTML = "";
  appendQuickEntry();
}

function resetQuickEntries() {
  initializeQuickEntries();
}

function handleQuickEntryInput() {
  ensureTrailingQuickEntry();
}

function handleQuickEntryClick(event) {
  const button = event.target.closest("[data-quick-action]");
  if (!button) return;

  if (button.dataset.quickAction === "remove") {
    const row = button.closest(".quick-entry");
    row?.remove();
    if (getQuickRows().length === 0) {
      appendQuickEntry();
    }
    ensureTrailingQuickEntry();
    renumberQuickEntries();
  }
}

function addQuickEntryFromButton() {
  const rows = getQuickRows();
  const last = rows[rows.length - 1];
  if (last && !hasQuickEntryValue(last)) {
    focusQuickField(last, "title");
    return;
  }

  const row = appendQuickEntry();
  focusQuickField(row, "title");
}

function ensureTrailingQuickEntry() {
  const rows = getQuickRows();
  const last = rows[rows.length - 1];
  if (!last || hasQuickEntryValue(last)) {
    appendQuickEntry();
  }
  renumberQuickEntries();
}

function appendQuickEntry(values = {}) {
  const row = document.createElement("div");
  row.className = "quick-entry";
  row.innerHTML = `
    <div class="quick-entry-number" aria-hidden="true"></div>
    <label class="quick-field">
      <span>제작 제목</span>
      <input data-field="title" placeholder="예: 무영등 트랜지션" value="${escapeAttr(values.title || "")}" />
    </label>
    <label class="quick-field">
      <span>링크</span>
      <input data-field="link" type="url" placeholder="https://www.instagram.com/reel/..." value="${escapeAttr(values.link || "")}" />
    </label>
    <label class="quick-field">
      <span>설명 <em class="optional-label">선택</em></span>
      <input data-field="reference" placeholder="예: 이런 느낌으로 제작" value="${escapeAttr(values.reference || "")}" />
    </label>
    <button class="quick-remove-button" data-quick-action="remove" type="button" aria-label="입력 줄 삭제">×</button>
  `;
  els.quickItems.appendChild(row);
  renumberQuickEntries();
  return row;
}

function renumberQuickEntries() {
  const rows = getQuickRows();
  rows.forEach((row, index) => {
    row.querySelector(".quick-entry-number").textContent = index + 1;
    const isTrailingEmpty = index === rows.length - 1 && !hasQuickEntryValue(row);
    row.querySelector(".quick-remove-button").hidden = rows.length === 1 || isTrailingEmpty;
  });
}

function getQuickRows() {
  return Array.from(els.quickItems.querySelectorAll(".quick-entry"));
}

function getQuickEntryValues(row) {
  return {
    title: getQuickField(row, "title").value.trim(),
    link: getQuickField(row, "link").value.trim(),
    reference: getQuickField(row, "reference").value.trim(),
  };
}

function getQuickField(row, field) {
  return row.querySelector(`[data-field="${field}"]`);
}

function hasQuickEntryValue(row) {
  const values = getQuickEntryValues(row);
  return Boolean(values.title || values.link || values.reference);
}

function collectQuickEntries() {
  return getQuickRows()
    .map((row, index) => {
      const values = getQuickEntryValues(row);
      return {
        ...values,
        row,
        number: index + 1,
        urls: extractUrls(values.link),
      };
    })
    .filter((entry) => entry.title || entry.link || entry.reference);
}

function focusQuickField(row, field) {
  getQuickField(row, field)?.focus();
}

async function saveQuickItemsToServer(newItems) {
  setSaveState("시트 저장 중");

  let savedCount = 0;
  for (const item of newItems) {
    try {
      const savedItem = await saveItemToServer(item);
      savedCount += 1;

      if (items.some((row) => row.id === item.id)) {
        upsertLocalItem(savedItem);
      }
    } catch (error) {
      console.error(error);
      break;
    }
  }

  persistLocalFallback();
  render();

  if (savedCount === newItems.length) {
    setSaveState("저장됨");
    setQuickStatus(`${savedCount}개 시트 저장 완료`);
    refreshMissingMetadata();
    return;
  }

  setSaveState("일부 저장 실패");
  setQuickStatus(`${savedCount}개 저장됨, 실패 항목은 화면에 남겨뒀습니다`);
}

function render() {
  const filtered = getFilteredItems();
  renderSummary();
  renderTable(filtered);
  renderMobile(filtered);
  renderReferenceList();
  els.emptyState.hidden = filtered.length > 0;
  els.listCaption.textContent = getCaption(filtered.length);
}

function renderSummary() {
  const productionItems = getProductionItems();
  els.pendingCount.textContent = productionItems.filter((item) => item.status === "컨펌대기").length;
  els.revisionCount.textContent = productionItems.filter((item) => item.status === "수정중" || item.approval === "수정요청").length;
  els.dueTodayCount.textContent = productionItems.filter((item) => item.status === "작업완료").length;
  els.doneCount.textContent = productionItems.filter((item) => item.status === "업로드완료").length;
}

function renderTable(rows) {
  els.tableBody.innerHTML = rows
    .map((item) => {
      return `
        <tr>
          <td>
            <div class="video-cell">
              ${renderThumb(item)}
              ${renderVideoInfo(item)}
            </div>
          </td>
          <td>${renderStatus(item.status)}</td>
          <td><span class="date-text">${escapeHtml(item.owner || "-")}</span></td>
          <td>${renderUploadDate(item.scheduleDate)}</td>
          <td>
            <div class="row-actions">
              <button class="row-button upload" type="button" data-action="upload" data-id="${escapeAttr(item.id)}">완성본 업로드</button>
              <button class="row-button edit" type="button" data-action="edit" data-id="${escapeAttr(item.id)}">내용 수정</button>
              ${renderPreviewButton(item)}
              <button class="row-button delete" type="button" data-action="delete" data-id="${escapeAttr(item.id)}" aria-label="삭제" title="삭제">${renderTrashIcon()}</button>
              ${renderFinalThumb(item)}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderMobile(rows) {
  els.mobileList.innerHTML = rows
    .map((item) => {
      return `
        <article class="mobile-card">
          <div class="mobile-main">
            ${renderThumb(item)}
            <div class="mobile-info">
              ${renderVideoInfo(item)}
              <div class="mobile-tags">
                ${renderStatus(item.status)}
              </div>
              <span class="date-text">담당 ${escapeHtml(item.owner || "-")} · 업로드 ${escapeHtml(formatShortDate(item.scheduleDate))}</span>
            </div>
          </div>
          <div class="mobile-actions">
            <button class="row-button upload" type="button" data-action="upload" data-id="${escapeAttr(item.id)}">완성본 업로드</button>
            <button class="row-button edit" type="button" data-action="edit" data-id="${escapeAttr(item.id)}">내용 수정</button>
            ${renderPreviewButton(item)}
            <button class="row-button delete" type="button" data-action="delete" data-id="${escapeAttr(item.id)}" aria-label="삭제" title="삭제">${renderTrashIcon()}</button>
            ${renderFinalThumb(item)}
          </div>
        </article>
      `;
    })
    .join("");
}

function handleListAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const item = items.find((row) => row.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit") {
    openItemDialog(item);
    return;
  }

  if (button.dataset.action === "upload") {
    openFinalUploadDialog(item);
    return;
  }

  if (button.dataset.action === "delete") {
    deleteItemById(item.id);
    return;
  }

  if (button.dataset.action === "play") {
    openPlayerDialog(item);
  }
}

function openItemDialog(item = null) {
  const isEdit = Boolean(item);
  els.itemDialogTitle.textContent = isEdit ? "콘텐츠 수정" : "새 링크 추가";
  els.deleteButton.hidden = !isEdit;

  const data = item || {
    id: "",
    title: "",
    sourceUrl: "",
    thumbnail: "",
    platform: "인스타",
    reference: "",
    owner: settings.userName || "",
    status: "촬영필요",
    draftUrl: "",
    approval: "미확인",
    feedback: "",
    dueDate: "",
    scheduleDate: "",
    uploadUrl: "",
  };

  form.id.value = data.id || "";
  form.title.value = data.title || "";
  form.sourceUrl.value = data.sourceUrl || "";
  form.thumbnail.value = data.thumbnail || "";
  form.platform.value = data.platform || "인스타";
  form.reference.value = data.reference || "";
  form.owner.value = data.owner || "";
  form.status.value = normalizeStatus(data.status);
  form.draftUrl.value = data.draftUrl || "";
  form.approval.value = data.approval || "미확인";
  form.feedback.value = data.feedback || "";
  form.dueDate.value = normalizeDateInput(data.dueDate);
  form.scheduleDate.value = normalizeDateInput(data.scheduleDate);
  form.uploadUrl.value = data.uploadUrl || "";

  els.itemDialog.showModal();
}

async function saveItemFromForm() {
  if (!els.itemForm.reportValidity()) return;

  const now = new Date().toISOString();
  const id = form.id.value || createId();
  const current = items.find((item) => item.id === id);
  const feedback = form.feedback.value.trim();
  const feedbackChanged = Boolean(feedback && feedback !== String(current?.feedback || "").trim());
  const selectedStatus = form.status.value;
  const status = feedbackChanged && !["작업완료", "업로드완료", "보류"].includes(selectedStatus)
    ? "수정중"
    : selectedStatus;
  const item = {
    id,
    title: form.title.value.trim(),
    sourceUrl: form.sourceUrl.value.trim(),
    thumbnail: form.thumbnail.value.trim(),
    platform: form.platform.value,
    reference: form.reference.value.trim(),
    owner: form.owner.value.trim(),
    status,
    draftUrl: form.draftUrl.value.trim(),
    approval: form.approval.value,
    feedback,
    dueDate: form.dueDate.value,
    scheduleDate: form.scheduleDate.value,
    uploadUrl: current?.uploadUrl || form.uploadUrl.value.trim(),
    updatedAt: now,
    updatedBy: settings.userName || current?.updatedBy || "",
  };

  await updateItem(item);
  els.itemDialog.close();
}

function openFinalUploadDialog(item) {
  const nextVersion = getAllowedFinalVersions(item).length + 1;
  els.finalItemId.value = item.id;
  els.finalItemTitle.textContent = item.title || "제작 제목 없음";
  els.finalVersionHint.textContent = `이번 업로드는 v${nextVersion}로 저장됩니다. NAS 완성본 경로만 입력해 주세요.`;
  els.finalUploadUrl.value = "";
  els.finalComplete.checked = false;
  els.finalUploadUrl.setCustomValidity("");
  els.finalDialog.showModal();
  window.setTimeout(() => {
    els.finalUploadUrl.focus();
  }, 0);
}

function closeFinalUploadDialog() {
  els.finalDialog.close();
}

async function saveFinalUploadFromForm(options = {}) {
  const uploadUrl = validateFinalUploadControl(els.finalUploadUrl);
  if (!els.finalForm.reportValidity()) return;

  const id = els.finalItemId.value;
  const current = items.find((item) => item.id === id);
  if (!current) return;

  els.saveFinalButton.disabled = true;
  els.saveFinalPreviewButton.disabled = true;

  const versions = getAllowedFinalVersions(current);
  const nextVersion = {
    label: `v${versions.length + 1}`,
    url: uploadUrl,
  };

  const updated = {
    ...current,
    uploadUrl: serializeFinalVersions([...versions, nextVersion]),
    status: statusAfterFinalUpload(current.status, els.finalComplete.checked),
    updatedAt: new Date().toISOString(),
    updatedBy: settings.userName || current.updatedBy || "",
  };

  try {
    const saved = await updateItem(updated);
    if (!saved) return;

    els.finalDialog.close();

    if (options.preview) {
      openPlayerDialog(items.find((item) => item.id === id) || updated);
    }
  } finally {
    els.saveFinalButton.disabled = false;
    els.saveFinalPreviewButton.disabled = false;
  }
}

function statusAfterFinalUpload(status, isComplete = false) {
  const normalized = normalizeStatus(status);
  if (normalized === "보류") return normalized;
  return isComplete ? "작업완료" : "수정중";
}

async function updateItem(item, options = {}) {
  setSaveState("저장 중");

  try {
    item = await saveItemToServer(item);
    upsertLocalItem(item);
    setSaveState("저장됨");
  } catch (error) {
    console.error(error);
    setSaveState("저장 실패");
    if (!options.silent) {
      alert("저장에 실패했습니다. 설정의 API URL과 비밀번호를 확인해 주세요.");
    }
    render();
    return false;
  }

  render();
  return true;
}

async function saveItemToServer(item) {
  if (!hasApiSettings()) return normalizeItem(item);

  const response = await requestApi("upsert", { item });
  return normalizeItem(response.item || item);
}

function upsertLocalItem(item) {
  const normalized = normalizeItem(item);
  const index = items.findIndex((row) => row.id === normalized.id);
  if (index >= 0) {
    items[index] = normalized;
  } else {
    items.unshift(normalized);
  }
  persistLocalFallback();
  return normalized;
}

async function deleteCurrentItem() {
  const id = form.id.value;
  if (!id) return;
  await deleteItemById(id, { closeDialog: true });
}

async function deleteItemById(id, options = {}) {
  const item = items.find((row) => row.id === id);
  const title = item?.title ? ` "${item.title}"` : "";
  const message = options.confirmMessage || `이 콘텐츠${title}를 삭제할까요?`;
  if (!confirm(message)) return;

  const previousItems = [...items];
  const removedItem = item;

  items = items.filter((row) => row.id !== id);
  persistLocalFallback();
  render();
  setSaveState("삭제 중");
  if (options.closeDialog) {
    els.itemDialog.close();
  }

  try {
    if (hasApiSettings()) {
      await requestApi("delete", { id });
    }
    setSaveState("삭제됨");
  } catch (error) {
    console.error(error);
    if (removedItem) {
      items = previousItems;
      persistLocalFallback();
      render();
    }
    setSaveState("삭제 실패");
    alert("삭제에 실패했습니다. 설정의 API URL과 비밀번호를 확인해 주세요.");
  }
}

function openReferenceSidebar() {
  els.referenceBackdrop.hidden = false;
  els.referenceSidebar.hidden = false;
  document.body.classList.add("is-drawer-open");
  renderReferenceList();
  window.setTimeout(() => els.referenceUrl.focus(), 0);
}

function closeReferenceSidebar() {
  els.referenceBackdrop.hidden = true;
  els.referenceSidebar.hidden = true;
  document.body.classList.remove("is-drawer-open");
}

async function saveReferenceFromForm(event) {
  event.preventDefault();
  if (!els.referenceForm.reportValidity()) return;

  if (!hasApiSettings()) {
    setReferenceStatus("Google Sheets 연결 후 공유 레퍼런스로 저장됩니다");
  }

  const url = canonicalizeSourceUrl(els.referenceUrl.value.trim());
  const title = els.referenceTitle.value.trim() || formatReferenceTitle(url);
  const note = els.referenceNote.value.trim();
  const item = normalizeItem({
    id: createReferenceId(),
    title,
    sourceUrl: url,
    thumbnail: "",
    platform: inferPlatform(url),
    reference: note,
    owner: settings.userName || "",
    status: "보류",
    draftUrl: REFERENCE_MARKER,
    approval: "레퍼런스",
    feedback: "",
    dueDate: "",
    scheduleDate: "",
    uploadUrl: "",
    updatedAt: new Date().toISOString(),
    updatedBy: settings.userName || "",
  });

  els.referenceForm.querySelector("button[type='submit']").disabled = true;
  setReferenceStatus("레퍼런스 저장 중");

  const saved = await updateItem(item, { silent: true });
  els.referenceForm.querySelector("button[type='submit']").disabled = false;

  if (!saved) {
    setReferenceStatus("저장 실패");
    alert("레퍼런스 저장에 실패했습니다. 설정의 API URL과 비밀번호를 확인해 주세요.");
    return;
  }

  els.referenceTitle.value = "";
  els.referenceUrl.value = "";
  els.referenceNote.value = "";
  setReferenceStatus("레퍼런스 추가됨");
  renderReferenceList();
  els.referenceUrl.focus();
}

function handleReferenceListClick(event) {
  const button = event.target.closest("[data-reference-action]");
  if (!button) return;

  if (button.dataset.referenceAction === "delete") {
    const item = items.find((row) => row.id === button.dataset.id);
    const title = item?.title ? ` "${item.title}"` : "";
    deleteItemById(button.dataset.id, {
      confirmMessage: `레퍼런스${title}를 삭제할까요?`,
    });
  }
}

function renderReferenceList() {
  const references = getReferenceItems();

  if (references.length === 0) {
    els.referenceList.innerHTML = `
      <div class="reference-empty">
        <strong>아직 레퍼런스가 없습니다.</strong>
        <span>제작 요청은 아니지만 참고할 링크를 여기에 모아두세요.</span>
      </div>
    `;
    return;
  }

  els.referenceList.innerHTML = references
    .map((item) => {
      return `
        <article class="reference-card">
          <div>
            <a class="reference-title" href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.title || "레퍼런스 링크")}</a>
            <span class="reference-url">${escapeHtml(formatSourceLabel(item.sourceUrl))}</span>
            ${item.reference ? `<p>${escapeHtml(item.reference)}</p>` : ""}
          </div>
          <button class="reference-delete" type="button" data-reference-action="delete" data-id="${escapeAttr(item.id)}" aria-label="레퍼런스 삭제">${renderTrashIcon()}</button>
        </article>
      `;
    })
    .join("");
}

function getProductionItems() {
  return items.filter((item) => !isReferenceItem(item));
}

function getReferenceItems() {
  return items
    .filter(isReferenceItem)
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

function isReferenceItem(item) {
  return item?.draftUrl === REFERENCE_MARKER || item?.approval === "레퍼런스";
}

function createReferenceId() {
  return `ref_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function formatReferenceTitle(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "레퍼런스 링크";
  }
}

function setReferenceStatus(message) {
  els.referenceStatus.textContent = message;
}

async function requestApi(action, payload = {}) {
  const requestPayload = {
    action,
    secret: settings.apiSecret,
    userName: settings.userName || "",
    ...payload,
  };

  let response;
  try {
    response = await fetch(settings.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (error) {
    return requestApiJsonp(requestPayload, error);
  }

  if (!response.ok) {
    return requestApiJsonp(requestPayload, new Error(`API request failed: ${response.status}`));
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    return requestApiJsonp(requestPayload, error);
  }

  if (!data.ok) {
    throw new Error(data.error || "Unknown API error");
  }
  return data;
}

function requestApiJsonp(payload, originalError) {
  return new Promise((resolve, reject) => {
    const callbackName = `memeBoardJsonp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(originalError || new Error("API request timed out"));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (data) => {
      cleanup();
      if (!data || !data.ok) {
        reject(new Error(data?.error || "Unknown API error"));
        return;
      }
      resolve(data);
    };

    try {
      const url = new URL(settings.apiUrl);
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("payload", JSON.stringify(payload));
      script.src = url.toString();
      script.onerror = () => {
        cleanup();
        reject(originalError || new Error("API request failed"));
      };
      document.head.appendChild(script);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function openSettings() {
  els.apiUrlInput.value = settings.apiUrl || "";
  els.nasStreamUrlInput.value = settings.nasStreamUrl || DEFAULT_NAS_STREAM_URL;
  els.apiSecretInput.value = settings.apiSecret || "";
  els.userNameInput.value = settings.userName || "";
  els.shareLinkStatus.textContent = "담당자 이름까지 포함해서 복사됩니다";
  els.settingsDialog.showModal();
}

async function saveSettingsFromDialog() {
  settings = {
    apiUrl: els.apiUrlInput.value.trim(),
    nasStreamUrl: normalizeNasStreamUrl(els.nasStreamUrlInput.value.trim()),
    apiSecret: els.apiSecretInput.value.trim(),
    userName: els.userNameInput.value.trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  els.settingsDialog.close();
  await loadItems();
}

async function createSettingsShareLink() {
  const apiUrl = els.apiUrlInput.value.trim();
  const nasStreamUrl = normalizeNasStreamUrl(els.nasStreamUrlInput.value.trim());
  const apiSecret = els.apiSecretInput.value.trim();
  const userName = els.userNameInput.value.trim();

  if (!apiUrl || !apiSecret || !userName) {
    els.shareLinkStatus.textContent = "URL, 비밀번호, 담당자 이름을 모두 입력해 주세요";
    return;
  }

  const shareUrl = new URL(window.location.href);
  shareUrl.hash = new URLSearchParams({
    apiUrl,
    nasStreamUrl,
    apiSecret,
    userName,
  }).toString();

  const copied = await copyText(shareUrl.toString());
  els.shareLinkStatus.textContent = copied ? "공유 링크가 복사되었습니다" : shareUrl.toString();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    textarea.remove();
    return copied;
  }
}

function clearSettings() {
  if (!confirm("연결 설정을 지울까요? 샘플 화면으로 돌아갑니다.")) return;
  localStorage.removeItem(STORAGE_KEY);
  settings = loadSettings();
  els.settingsDialog.close();
  loadItems();
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function applySharedSettings(saved) {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const apiUrl = params.get("apiUrl") || params.get("api");
  const nasStreamUrl = params.get("nasStreamUrl") || params.get("nas");
  const apiSecret = params.get("apiSecret") || params.get("secret");
  const userName = params.get("userName") || params.get("user");

  if (!apiUrl && !nasStreamUrl && !apiSecret && !userName) return saved;

  const next = {
    ...saved,
    apiUrl: apiUrl || saved.apiUrl || "",
    nasStreamUrl: normalizeNasStreamUrl(nasStreamUrl || saved.nasStreamUrl || ""),
    apiSecret: apiSecret || saved.apiSecret || "",
    userName: userName || saved.userName || "",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  return next;
}

function hasApiSettings() {
  return Boolean(settings.apiUrl && settings.apiSecret);
}

function getNasStreamUrl() {
  return normalizeNasStreamUrl(settings.nasStreamUrl || DEFAULT_NAS_STREAM_URL);
}

function normalizeNasStreamUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function persistLocalFallback() {
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(items));
}

function getFilteredItems() {
  return getProductionItems()
    .filter((item) => {
      if (activeFilter === "approval") return item.status === "컨펌대기";
      if (activeFilter === "revision") return item.status === "수정중" || item.approval === "수정요청";
      if (activeFilter === "uploadWait") return item.status === "작업완료";
      if (activeFilter === "done") return item.status === "업로드완료";
      return true;
    })
    .filter((item) => {
      if (!searchQuery) return true;
      const haystack = [
        item.title,
        item.sourceUrl,
        item.platform,
        item.reference,
        item.owner,
        item.status,
        item.approval,
        item.feedback,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchQuery);
    })
    .sort((a, b) => {
      const priority = {
        "컨펌대기": 1,
        "수정중": 2,
        "작업중": 3,
        "작업완료": 4,
        "수정완료": 5,
        "촬영완료": 6,
        "촬영필요": 7,
        "업로드완료": 8,
        "보류": 99,
      };
      const aPriority = priority[a.status] || 9;
      const bPriority = priority[b.status] || 9;
      if (aPriority !== bPriority) return aPriority - bPriority;

      const aKey = a.scheduleDate || "9999-12-31";
      const bKey = b.scheduleDate || "9999-12-31";
      return aKey.localeCompare(bKey);
    });
}

function getCaption(count) {
  const label = {
    all: "전체 콘텐츠",
    approval: "컨펌 대기 콘텐츠",
    revision: "수정 중 콘텐츠",
    uploadWait: "업로드 대기 콘텐츠",
    done: "업로드 완료 콘텐츠",
  }[activeFilter];
  return `${label} ${count}개를 표시합니다.`;
}

function normalizeItems(rows) {
  return rows.map(normalizeItem);
}

async function refreshMissingMetadata() {
  if (!hasApiSettings() || !items.some((item) => !isReferenceItem(item) && needsMetadata(item))) return;

  try {
    setSaveState("썸네일 확인 중");
    const targets = items.filter((item) => !isReferenceItem(item) && needsMetadata(item)).slice(0, 8);

    for (const item of targets) {
      const enriched = await enrichItemMetadata(item);
      if (hasMetadataChange(item, enriched)) {
        await updateItem(enriched, { silent: true });
      }
    }

    try {
      const response = await requestApi("refreshMetadata");
      if (response.items) {
        items = normalizeItems(response.items);
        persistLocalFallback();
        render();
      }
    } catch (error) {
      console.warn("server metadata refresh unavailable", error);
    }

    setSaveState("준비됨");
  } catch (error) {
    console.warn("metadata refresh failed", error);
    setSaveState("준비됨");
  }
}

function needsMetadata(item) {
  return !item.thumbnail;
}

function hasMetadataChange(before, after) {
  return (
    before.thumbnail !== after.thumbnail ||
    before.sourceUrl !== after.sourceUrl ||
    before.platform !== after.platform
  );
}

async function enrichItemMetadata(item) {
  const next = {
    ...item,
    sourceUrl: canonicalizeSourceUrl(item.sourceUrl),
    platform: item.platform || inferPlatform(item.sourceUrl),
  };

  if (next.platform === "유튜브" && !next.thumbnail) {
    next.thumbnail = youtubeThumbnail(next.sourceUrl);
  }

  const endpoint = metadataEndpoint(next.sourceUrl, next.platform);
  if (!endpoint) return next;

  try {
    const data = await fetchJson(endpoint);
    if (data?.thumbnail_url && !next.thumbnail) {
      next.thumbnail = data.thumbnail_url;
    }
  } catch (error) {
    console.warn("metadata fetch failed", error);
  }

  return next;
}

function metadataEndpoint(url, platform) {
  if (platform === "유튜브") {
    return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  }
  if (platform === "틱톡") {
    return `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  }
  return "";
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`metadata request failed: ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function isAutoTitle(title, platform) {
  const value = String(title || "").trim();
  if (!value) return true;
  const currentPlatform = platform || "링크";
  return (
    value === "링크 자동 등록" ||
    value.startsWith(`${currentPlatform} 링크 `) ||
    value.startsWith(`${currentPlatform} 쇼츠 `)
  );
}

function normalizeStatus(status) {
  const value = String(status || "").trim();
  const legacyStatus = {
    "": "촬영필요",
    "아이디어": "촬영필요",
    "제작대기": "촬영필요",
    "미촬영": "촬영필요",
    "제작중": "작업중",
    "컨펌요청": "컨펌대기",
    "수정요청": "수정중",
    "승인": "수정완료",
    "예약완료": "수정완료",
  };
  const normalized = legacyStatus[value] || value;
  return STATUS_CLASS[normalized] ? normalized : "촬영필요";
}

function normalizeItem(row) {
  const sourceUrl = canonicalizeSourceUrl(row.sourceUrl);
  return {
    id: String(row.id || createId()),
    title: row.title || "",
    sourceUrl,
    thumbnail: row.thumbnail || "",
    platform: row.platform || inferPlatform(sourceUrl),
    reference: row.reference || "",
    owner: row.owner || "",
    status: normalizeStatus(row.status),
    draftUrl: row.draftUrl || "",
    approval: row.approval || "미확인",
    feedback: row.feedback || "",
    dueDate: normalizeDateInput(row.dueDate),
    scheduleDate: normalizeDateInput(row.scheduleDate),
    uploadUrl: row.uploadUrl || "",
    updatedAt: row.updatedAt || "",
    updatedBy: row.updatedBy || "",
  };
}

function createId() {
  return `meme_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createQuickItem(url, title, reference) {
  const sourceUrl = canonicalizeSourceUrl(url);
  const platform = inferPlatform(sourceUrl);
  return {
    id: createId(),
    title: createQuickTitle(sourceUrl, platform, title),
    sourceUrl,
    thumbnail: youtubeThumbnail(sourceUrl),
    platform,
    reference: reference || "",
    owner: settings.userName || "",
    status: "촬영필요",
    draftUrl: "",
    approval: "미확인",
    feedback: "",
    dueDate: "",
    scheduleDate: "",
    uploadUrl: "",
    updatedAt: new Date().toISOString(),
    updatedBy: settings.userName || "",
  };
}

function createQuickTitle(url, platform, title = "") {
  const cleanTitle = String(title || "").trim();
  if (cleanTitle) {
    return cleanTitle;
  }

  const now = new Date();
  const dateText = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  return `제작 제목 미정 ${dateText}`;
}

function extractUrls(text) {
  const pattern = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|youtube\.com|youtu\.be|tiktok\.com)\/[^\s<>"']+/gi;
  const matches = String(text || "").match(pattern) || [];
  const seen = new Set();
  const urls = [];

  matches.forEach((rawUrl) => {
    let url = rawUrl.trim().replace(/[),.;\]}]+$/, "");
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    const key = normalizeUrlKey(url);
    if (!key || seen.has(key)) return;
    seen.add(key);
    urls.push(url);
  });

  return urls;
}

function normalizeUrlKey(url) {
  const value = canonicalizeSourceUrl(url);
  if (!value) return "";

  const youtubeId = youtubeVideoId(value);
  if (youtubeId) return `youtube:${youtubeId}`;

  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    parsed.hash = "";
    parsed.search = "";
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}`.replace(/\/+$/, "").toLowerCase();
  } catch {
    return value.replace(/\/+$/, "").toLowerCase();
  }
}

function getFinalVersions(item) {
  const rawValue = String(item.uploadUrl || "").trim();
  if (!rawValue) return [];

  const jsonVersions = parseJsonFinalVersions(rawValue);
  if (jsonVersions.length > 0) return jsonVersions;

  const lines = rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsedLines = lines
    .map(parseFinalVersionLine)
    .filter(Boolean);

  if (parsedLines.length > 0) {
    return parsedLines;
  }

  return [
    {
      label: "v1",
      url: normalizeFinalUploadPath(rawValue),
    },
  ];
}

function getAllowedFinalVersions(item) {
  return getFinalVersions(item).filter((version) => isAllowedFinalUploadPath(version.url));
}

function parseJsonFinalVersions(value) {
  try {
    const parsed = JSON.parse(value);
    const versions = Array.isArray(parsed) ? parsed : parsed.versions;
    if (!Array.isArray(versions)) return [];
    return versions
      .map((version, index) => ({
        label: String(version.label || `v${index + 1}`),
        url: normalizeFinalUploadPath(version.url || version.path || ""),
      }))
      .filter((version) => version.url);
  } catch {
    return [];
  }
}

function parseFinalVersionLine(line) {
  const match = String(line || "").match(/^(v\d+)\s*\|\s*(.+)$/i);
  if (!match) return null;
  return {
    label: match[1].toLowerCase(),
    url: normalizeFinalUploadPath(match[2]),
  };
}

function serializeFinalVersions(versions) {
  return versions
    .map((version, index) => ({
      label: String(version.label || `v${index + 1}`).toLowerCase(),
      url: normalizeFinalUploadPath(version.url),
    }))
    .filter((version) => version.url)
    .map((version) => `${version.label} | ${version.url}`)
    .join("\n");
}

function getRevisionRequests(item) {
  const rawValue = String(item.feedback || "").trim();
  if (!rawValue) return [];

  const parsedLines = rawValue
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseRevisionLine)
    .filter(Boolean);

  if (parsedLines.length > 0) {
    return parsedLines;
  }

  return [
    {
      label: "기존 메모",
      version: "-",
      date: "-",
      note: rawValue,
    },
  ];
}

function parseRevisionLine(line) {
  const parts = String(line || "").split("|").map((part) => part.trim());
  if (parts.length < 4) return null;

  return {
    label: parts[0] || "수정 요청",
    version: parts[1] || "-",
    date: parts[2] || "-",
    note: parts.slice(3).join(" | ").trim(),
  };
}

function serializeRevisionRequests(revisions) {
  return revisions
    .map((revision) => ({
      label: String(revision.label || "수정 요청").trim(),
      version: String(revision.version || "-").trim(),
      date: String(revision.date || "-").trim(),
      note: sanitizeRevisionNote(revision.note),
    }))
    .filter((revision) => revision.note)
    .map((revision) => `${revision.label} | ${revision.version} | ${revision.date} | ${revision.note}`)
    .join("\n");
}

function nextRevisionLabel(revisions) {
  const sequenceNumbers = revisions
    .map((revision) => String(revision.label || "").match(/^(\d+)차\s*수정/))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .filter(Number.isFinite);

  const next = sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) + 1 : 1;
  return `${next}차 수정`;
}

function sanitizeRevisionNote(note) {
  return String(note || "")
    .replace(/\s*\r?\n\s*/g, " / ")
    .replace(/\|/g, "/")
    .trim();
}

function formatRevisionTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function validateFinalUploadControl(control) {
  const normalized = normalizeFinalUploadPath(control.value);

  if (!normalized) {
    control.setCustomValidity("");
    return "";
  }

  if (!isAllowedFinalUploadPath(normalized)) {
    control.setCustomValidity(FINAL_UPLOAD_HELP);
    return "";
  }

  if (!isDirectVideoUrl(normalized)) {
    control.setCustomValidity("완성본 영상 파일 경로만 입력해 주세요. 예: 파일명.mp4");
    return "";
  }

  control.value = normalized;
  control.setCustomValidity("");
  return normalized;
}

function normalizeFinalUploadPath(value) {
  let path = stripWrappingQuotes(String(value || "").trim());
  if (!path) return "";

  path = path.replace(/^file:(\/\/\/)?/i, "");
  path = stripWrappingQuotes(path);

  if (path.startsWith("//")) {
    path = `\\\\${path.slice(2)}`;
  }

  if (path.startsWith("\\\\") || /^[a-zA-Z]:[\\/]/.test(path)) {
    path = path.replace(/\//g, "\\");
  }

  return path;
}

function stripWrappingQuotes(value) {
  let next = String(value || "").trim();
  const quotePairs = {
    "\"": "\"",
    "'": "'",
    "“": "”",
    "‘": "’",
  };

  let changed = true;
  while (changed && next.length >= 2) {
    changed = false;
    const first = next[0];
    const last = next[next.length - 1];
    if (quotePairs[first] === last) {
      next = next.slice(1, -1).trim();
      changed = true;
    }
  }

  return next;
}

function isAllowedFinalUploadPath(value) {
  const pathKey = normalizeFinalPathForCompare(value);
  const prefixKey = normalizeFinalPathForCompare(FINAL_UPLOAD_PREFIX);
  return pathKey === prefixKey || pathKey.startsWith(`${prefixKey}\\`);
}

function normalizeFinalPathForCompare(value) {
  return normalizeFinalUploadPath(value).replace(/\\+$/, "").toLowerCase();
}

function renderThumb(item) {
  const imageUrl = item.thumbnail || youtubeThumbnail(item.sourceUrl);
  if (imageUrl) {
    return `<span class="thumb"><img src="${escapeAttr(imageUrl)}" alt="" loading="lazy" onerror="this.remove(); this.parentElement.classList.add('thumb-fallback')"></span>`;
  }
  return `<span class="thumb thumb-fallback">썸네일 없음</span>`;
}

function renderVideoInfo(item) {
  const title = String(item.title || "").trim() || "제작 제목 없음";
  const reference = String(item.reference || "").trim() || "참고 메모 없음";
  const sourceLabel = formatSourceLabel(item.sourceUrl);

  return `
    <div class="video-copy">
      <div class="video-title"><span class="video-title-text">${escapeHtml(title)}</span></div>
      <span class="video-meta">${escapeHtml(reference)}</span>
      <a class="source-link" href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(sourceLabel)}</a>
    </div>
  `;
}

function renderPreviewButton(item) {
  if (!getPlaybackLink(item)) {
    return `<button class="row-button play" type="button" disabled title="완성본 링크를 먼저 업로드해 주세요">완성본 미리보기</button>`;
  }
  return `<button class="row-button play" type="button" data-action="play" data-id="${escapeAttr(item.id)}">완성본 미리보기</button>`;
}

function renderFinalThumb(item) {
  const versions = getFinalVersions(item);
  const latest = versions[versions.length - 1];
  if (!latest) {
    return `<span class="final-thumb-empty" title="완성본 없음">없음</span>`;
  }

  return `
    <button class="final-thumb-button" type="button" data-action="play" data-id="${escapeAttr(item.id)}" aria-label="최신 완성본 ${escapeAttr(latest.label)} 미리보기">
      ${renderFinalThumbMedia(latest.url)}
      <span class="final-thumb-version">${escapeHtml(latest.label)}</span>
    </button>
  `;
}

function renderFinalThumbMedia(url) {
  const normalized = normalizeFinalUploadPath(url);
  const youtubeId = youtubeVideoId(normalized);

  if (youtubeId) {
    return `
      <img class="final-thumb-media" src="${escapeAttr(youtubeThumbnail(normalized))}" alt="" loading="lazy" onerror="this.parentElement.classList.add('is-fallback')" />
      <span class="final-thumb-fallback">완성본</span>
    `;
  }

  if (isAllowedFinalUploadPath(normalized)) {
    const mediaUrl = buildNasStreamUrl(normalized);
    return `
      <video class="final-thumb-media" src="${escapeAttr(mediaUrl)}" preload="metadata" muted playsinline onloadedmetadata="this.currentTime = Math.min(0.1, this.duration || 0.1)" onerror="this.parentElement.classList.add('is-fallback')"></video>
      <span class="final-thumb-fallback">완성본</span>
    `;
  }

  if (/^https?:\/\//i.test(normalized) && isDirectVideoUrl(normalized)) {
    return `
      <video class="final-thumb-media" src="${escapeAttr(normalized)}" preload="metadata" muted playsinline onloadedmetadata="this.currentTime = Math.min(0.1, this.duration || 0.1)" onerror="this.parentElement.classList.add('is-fallback')"></video>
      <span class="final-thumb-fallback">완성본</span>
    `;
  }

  return `<span class="final-thumb-fallback is-visible">경로 확인</span>`;
}

function openPlayerDialog(item, versionIndex = null) {
  const versions = getFinalVersions(item);
  const selectedIndex = versionIndex == null ? versions.length - 1 : versionIndex;
  const selected = versions[selectedIndex];
  const link = selected?.url || getPlaybackLink(item);
  if (!link) return;

  const player = buildPlayerEmbed(link);
  const isSameOpenPlayer = els.playerDialog.open && activePlayerItemId === item.id;
  activePlayerItemId = item.id;
  activePlayerVersionIndex = Math.max(selectedIndex, 0);
  els.playerTitle.textContent = item.title || "완성본";
  if (!isSameOpenPlayer) {
    els.playerRevisionInput.value = "";
  }
  renderPlayerVersionTabs(versions, activePlayerVersionIndex);
  els.playerBody.innerHTML = player.html;
  renderRevisionPanel(item, versions, activePlayerVersionIndex);

  if (player.openUrl) {
    els.playerOpenLink.hidden = false;
    els.playerOpenLink.href = player.openUrl;
  } else {
    els.playerOpenLink.hidden = true;
    els.playerOpenLink.removeAttribute("href");
  }

  if (!els.playerDialog.open) {
    els.playerDialog.showModal();
  }
}

function renderPlayerVersionTabs(versions, activeIndex) {
  if (versions.length <= 1) {
    els.playerVersionTabs.innerHTML = "";
    els.playerVersionTabs.hidden = true;
    return;
  }

  els.playerVersionTabs.hidden = false;
  els.playerVersionTabs.innerHTML = versions
    .map((version, index) => {
      const activeClass = index === activeIndex ? " is-active" : "";
      return `<button class="version-tab${activeClass}" type="button" data-version-index="${index}">${escapeHtml(version.label)}</button>`;
    })
    .join("");
}

function renderRevisionPanel(item, versions, activeIndex) {
  const selected = versions[activeIndex] || versions[versions.length - 1] || { label: "현재 버전" };
  const revisions = getRevisionRequests(item);
  const countLabel = revisions.length > 0 ? `${revisions.length}개 기록됨` : "영상을 보면서 수정 내용을 남기세요";

  els.playerRevisionTitle.textContent = `${selected.label} 수정 요청`;
  els.playerRevisionStatus.textContent = countLabel;
  renderRevisionHistory(revisions);
}

function renderRevisionHistory(revisions) {
  if (revisions.length === 0) {
    els.revisionHistory.innerHTML = `<div class="revision-empty">수정 요청 기록 없음</div>`;
    return;
  }

  els.revisionHistory.innerHTML = revisions
    .slice()
    .reverse()
    .map((revision) => {
      const version = revision.version && revision.version !== "-" ? `<span>${escapeHtml(revision.version)}</span>` : "";
      const date = revision.date && revision.date !== "-" ? `<small>${escapeHtml(revision.date)}</small>` : "";

      return `
        <div class="revision-entry">
          <div class="revision-entry-head">
            <strong>${escapeHtml(revision.label || "수정 요청")}</strong>
            ${version}
          </div>
          ${date}
          <p>${escapeHtml(revision.note || "")}</p>
        </div>
      `;
    })
    .join("");
}

async function saveRevisionRequestFromPlayer() {
  const item = items.find((row) => row.id === activePlayerItemId);
  if (!item) return;

  const note = sanitizeRevisionNote(els.playerRevisionInput.value);
  if (!note) {
    els.playerRevisionInput.focus();
    return;
  }

  const versions = getFinalVersions(item);
  const selectedVersion = versions[activePlayerVersionIndex] || versions[versions.length - 1] || { label: "-" };
  const revisions = getRevisionRequests(item);
  const nextRevision = {
    label: nextRevisionLabel(revisions),
    version: selectedVersion.label || "-",
    date: formatRevisionTimestamp(new Date()),
    note,
  };

  const updated = {
    ...item,
    feedback: serializeRevisionRequests([...revisions, nextRevision]),
    approval: "수정요청",
    status: "수정중",
    updatedAt: new Date().toISOString(),
    updatedBy: settings.userName || item.updatedBy || "",
  };

  els.saveRevisionButton.disabled = true;
  els.playerRevisionStatus.textContent = "수정 요청 저장 중";

  const saved = await updateItem(updated, { silent: true });
  els.saveRevisionButton.disabled = false;

  if (!saved) {
    els.playerRevisionStatus.textContent = "저장 실패";
    alert("수정 요청 저장에 실패했습니다. 설정의 API URL과 비밀번호를 확인해 주세요.");
    return;
  }

  els.playerRevisionInput.value = "";
  const refreshed = items.find((row) => row.id === item.id) || updated;
  renderRevisionPanel(refreshed, getFinalVersions(refreshed), activePlayerVersionIndex);
  els.playerRevisionStatus.textContent = `${nextRevision.label} 저장됨`;
}

function handlePlayerVersionClick(event) {
  const button = event.target.closest("[data-version-index]");
  if (!button || !activePlayerItemId) return;

  const item = items.find((row) => row.id === activePlayerItemId);
  if (!item) return;

  openPlayerDialog(item, Number(button.dataset.versionIndex));
}

function closePlayerDialog() {
  els.playerDialog.close();
}

function clearPlayerDialog() {
  activePlayerItemId = "";
  activePlayerVersionIndex = -1;
  els.playerVersionTabs.innerHTML = "";
  els.playerVersionTabs.hidden = true;
  els.playerBody.innerHTML = "";
  els.playerRevisionTitle.textContent = "수정 요청";
  els.playerRevisionStatus.textContent = "영상을 보면서 수정 내용을 남기세요";
  els.playerRevisionInput.value = "";
  els.revisionHistory.innerHTML = "";
  els.saveRevisionButton.disabled = false;
  els.playerOpenLink.removeAttribute("href");
}

function handlePlayerBodyClick(event) {
  const button = event.target.closest("[data-copy-player-link]");
  if (!button) return;
  copyText(button.dataset.copyPlayerLink || "");
  button.textContent = "복사됨";
}

function getPlaybackLink(item) {
  const versions = getFinalVersions(item);
  return versions[versions.length - 1]?.url || "";
}

function buildPlayerEmbed(rawUrl) {
  const url = normalizeFinalUploadPath(rawUrl);
  const escapedUrl = escapeAttr(url);

  if (isNasFilePath(url) && !isAllowedFinalUploadPath(url)) {
    return buildInvalidFinalPathPlayer(url);
  }

  if (isNasFilePath(url)) {
    const streamUrl = buildNasStreamUrl(url);
    return {
      openUrl: streamUrl,
      html: `
        <video class="player-video" src="${escapeAttr(streamUrl)}" controls autoplay playsinline></video>
        <p class="player-hint">NAS 경로를 스트리밍 서버로 연결했습니다. 재생이 안 되면 NAS 스트리밍 서버가 켜져 있는지 확인해 주세요.</p>
      `,
    };
  }

  const youtubeId = youtubeVideoId(url);
  if (youtubeId) {
    return {
      openUrl: url,
      html: `
        <iframe
          class="player-frame"
          src="https://www.youtube.com/embed/${escapeAttr(youtubeId)}"
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      `,
    };
  }

  if (isDirectVideoUrl(url)) {
    return {
      openUrl: url,
      html: `<video class="player-video" src="${escapedUrl}" controls autoplay playsinline></video>`,
    };
  }

  if (/^https?:\/\//i.test(url)) {
    return {
      openUrl: url,
      html: `
        <iframe class="player-frame" src="${escapedUrl}" title="완성본 링크"></iframe>
        <p class="player-hint">일부 NAS 공유 페이지는 보안 설정 때문에 팝업 안에서 안 보일 수 있습니다. 그때는 새 창으로 열어 주세요.</p>
      `,
    };
  }

  return {
    openUrl: "",
    html: `
      <div class="player-message">
        <strong>재생할 수 없는 링크 형식입니다.</strong>
        <p>${escapeHtml(FINAL_UPLOAD_HELP)}</p>
        <code>${escapeHtml(url)}</code>
      </div>
    `,
  };
}

function buildInvalidFinalPathPlayer(url) {
  return {
    openUrl: "",
    html: `
      <div class="player-message">
        <strong>허용된 NAS 완성본 경로가 아닙니다.</strong>
        <p>${escapeHtml(FINAL_UPLOAD_HELP)}</p>
        <code>${escapeHtml(url)}</code>
      </div>
    `,
  };
}

function isNasFilePath(url) {
  const value = String(url || "").trim();
  return value.startsWith("\\\\") || value.startsWith("//") || /^[a-zA-Z]:\\/.test(value);
}

function buildNasStreamUrl(path) {
  const base = getNasStreamUrl();
  return `${base}/stream?path=${encodeURIComponent(path)}`;
}

function isDirectVideoUrl(url) {
  try {
    const parsed = new URL(url);
    return /\.(mp4|m4v|webm|ogg|ogv|mov)$/i.test(parsed.pathname);
  } catch {
    return /\.(mp4|m4v|webm|ogg|ogv|mov)(?:[?#].*)?$/i.test(String(url || ""));
  }
}

function formatSourceLabel(url) {
  const value = String(url || "").trim();
  if (!value) return "원본 링크 없음";

  try {
    const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${host}${path}`;
  } catch {
    return value;
  }
}

function renderPlatform(platform) {
  return `<span class="pill">${escapeHtml(platform || "기타")}</span>`;
}

function renderPlatformMark(platform) {
  const normalized = platform || "기타";
  const className = {
    "유튜브": "platform-youtube",
    "인스타": "platform-instagram",
    "틱톡": "platform-tiktok",
  }[normalized] || "platform-etc";
  return renderPlatformLogo(normalized, `platform-mark ${className}`);
}

function renderTitlePlatform(platform) {
  const normalized = platform || "기타";
  const className = {
    "유튜브": "platform-youtube",
    "인스타": "platform-instagram",
    "틱톡": "platform-tiktok",
  }[normalized] || "platform-etc";
  return renderPlatformLogo(normalized, `title-platform ${className}`);
}

function renderPlatformLogo(platform, className) {
  const logo = PLATFORM_LOGOS[platform];
  if (!logo) {
    return `<span class="${className}">URL</span>`;
  }
  return `<span class="${className}"><img src="${escapeAttr(logo)}" alt="${escapeAttr(platform)}" loading="lazy" /></span>`;
}

function renderTrashIcon() {
  return `
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  `;
}

function renderStatus(status) {
  const label = normalizeStatus(status);
  const className = STATUS_CLASS[label] || "status-wait";
  const displayLabel = label === "작업완료" ? "작업완료 / 업로드대기" : label;
  return `<span class="status-badge ${className}">${escapeHtml(displayLabel)}</span>`;
}

function renderApproval(approval) {
  const label = approval || "미확인";
  const className = APPROVAL_CLASS[label] || "approval-pending";
  return `<span class="approval-badge ${className}">${escapeHtml(label)}</span>`;
}

function renderUploadDate(date) {
  return `<span class="date-text">${escapeHtml(formatShortDate(date))}</span>`;
}

function formatShortDate(date) {
  if (!date) return "-";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  const year = String(parsed.getFullYear()).slice(-2);
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function normalizeDateInput(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isToday(date) {
  if (!date) return false;
  return date === new Date().toISOString().slice(0, 10);
}

function isOverdue(date) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return target < today;
}

function isThisWeek(date) {
  if (!date) return false;
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + 7);
  return target >= today && target <= end;
}

function inferPlatform(url) {
  const lower = String(url || "").toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "유튜브";
  if (lower.includes("instagram.com")) return "인스타";
  if (lower.includes("tiktok.com")) return "틱톡";
  return "기타";
}

function canonicalizeSourceUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  let normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  normalized = normalized.replace("instagram.com/reels/", "instagram.com/reel/");
  normalized = normalized.replace("www.instagram.com/reels/", "www.instagram.com/reel/");
  return normalized;
}

function youtubeThumbnail(url) {
  const videoId = youtubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
}

function youtubeVideoId(url) {
  const value = String(url || "");
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function setSaveState(message) {
  els.saveState.textContent = message;
}

function setQuickStatus(message) {
  els.quickStatus.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
