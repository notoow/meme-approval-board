const STORAGE_KEY = "meme-board-settings";
const LOCAL_DATA_KEY = "meme-board-local-data";

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

let items = [];
let activeFilter = "all";
let searchQuery = "";
let settings = applySharedSettings(loadSettings());
let quickPasteTimer = null;
let quickSaving = false;

const els = {
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
  settingsDialog: document.querySelector("#settingsDialog"),
  apiUrlInput: document.querySelector("#apiUrlInput"),
  apiSecretInput: document.querySelector("#apiSecretInput"),
  userNameInput: document.querySelector("#userNameInput"),
  deleteButton: document.querySelector("#deleteButton"),
  quickAddForm: document.querySelector("#quickAddForm"),
  quickLinkInput: document.querySelector("#quickLinkInput"),
  quickReferenceInput: document.querySelector("#quickReferenceInput"),
  quickStatus: document.querySelector("#quickStatus"),
  quickAddButton: document.querySelector("#quickAddButton"),
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
document.querySelector("#saveSettingsButton").addEventListener("click", saveSettingsFromDialog);
document.querySelector("#clearSettingsButton").addEventListener("click", clearSettings);
els.quickAddForm.addEventListener("submit", submitQuickLinks);
els.quickLinkInput.addEventListener("paste", () => {
  clearTimeout(quickPasteTimer);
  quickPasteTimer = setTimeout(() => {
    if (extractUrls(els.quickLinkInput.value).length > 0) {
      submitQuickLinks({ auto: true });
    }
  }, 500);
});

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

  const urls = extractUrls(els.quickLinkInput.value);
  if (urls.length === 0) {
    setQuickStatus("등록할 링크가 없습니다");
    return;
  }

  if (!hasApiSettings()) {
    setQuickStatus("먼저 Google Sheets 연결 설정이 필요합니다");
    openSettings();
    return;
  }

  const existingKeys = new Set(items.map((item) => normalizeUrlKey(item.sourceUrl)));
  const uniqueUrls = [];
  let duplicateCount = 0;

  urls.forEach((url) => {
    const key = normalizeUrlKey(url);
    if (!key || existingKeys.has(key)) {
      duplicateCount += 1;
      return;
    }
    existingKeys.add(key);
    uniqueUrls.push(url);
  });

  if (uniqueUrls.length === 0) {
    setQuickStatus("이미 등록된 링크입니다");
    els.quickLinkInput.value = "";
    return;
  }

  quickSaving = true;
  els.quickAddButton.disabled = true;
  setQuickStatus(`${uniqueUrls.length}개 등록 중`);

  let addedCount = 0;
  const reference = els.quickReferenceInput.value.trim();

  for (const [index, url] of uniqueUrls.entries()) {
    const item = await enrichItemMetadata(createQuickItem(url, reference, index, uniqueUrls.length));
    const saved = await updateItem(item, { silent: true });
    if (!saved) break;
    addedCount += 1;
  }

  quickSaving = false;
  els.quickAddButton.disabled = false;

  if (addedCount > 0) {
    els.quickLinkInput.value = "";
    els.quickReferenceInput.value = "";
    const duplicateText = duplicateCount ? `, 중복 ${duplicateCount}개 제외` : "";
    setQuickStatus(`${addedCount}개가 시트에 등록되었습니다${duplicateText}`);
  } else {
    setQuickStatus("등록에 실패했습니다");
  }
}

function render() {
  const filtered = getFilteredItems();
  renderSummary();
  renderTable(filtered);
  renderMobile(filtered);
  els.emptyState.hidden = filtered.length > 0;
  els.listCaption.textContent = getCaption(filtered.length);
}

function renderSummary() {
  els.pendingCount.textContent = items.filter((item) => item.status === "컨펌대기").length;
  els.revisionCount.textContent = items.filter((item) => item.status === "수정중" || item.approval === "수정요청").length;
  els.dueTodayCount.textContent = items.filter((item) => isToday(item.dueDate) && item.status !== "업로드완료" && item.status !== "보류").length;
  els.doneCount.textContent = items.filter((item) => item.status === "업로드완료").length;
}

function renderTable(rows) {
  els.tableBody.innerHTML = rows
    .map((item) => {
      return `
        <tr>
          <td>
            <div class="video-cell">
              ${renderThumb(item)}
              <div>
                <a class="video-title" href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noreferrer">${renderTitlePlatform(item.platform)}${escapeHtml(item.title)}</a>
                <span class="video-meta">${escapeHtml(item.reference || "참고 포인트 없음")}</span>
              </div>
            </div>
          </td>
          <td>${renderPlatform(item.platform)}</td>
          <td>${renderStatus(item.status)}</td>
          <td><span class="date-text">${escapeHtml(item.owner || "-")}</span></td>
          <td>${renderDueDate(item.dueDate)}</td>
          <td>${renderApproval(item.approval)}</td>
          <td>
            <div class="row-actions">
              <button class="row-button approve" type="button" data-action="approve" data-id="${escapeAttr(item.id)}">승인</button>
              <button class="row-button revise" type="button" data-action="revise" data-id="${escapeAttr(item.id)}">수정</button>
              <button class="row-button" type="button" data-action="edit" data-id="${escapeAttr(item.id)}">열기</button>
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
              <a class="video-title" href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noreferrer">${renderTitlePlatform(item.platform)}${escapeHtml(item.title)}</a>
              <div class="mobile-tags">
                ${renderPlatform(item.platform)}
                ${renderStatus(item.status)}
                ${renderApproval(item.approval)}
              </div>
              <span class="video-meta">${escapeHtml(item.reference || "참고 포인트 없음")}</span>
              <span class="date-text">담당 ${escapeHtml(item.owner || "-")} · 마감 ${escapeHtml(formatDate(item.dueDate))}</span>
            </div>
          </div>
          <div class="mobile-actions">
            <button class="row-button approve" type="button" data-action="approve" data-id="${escapeAttr(item.id)}">승인</button>
            <button class="row-button revise" type="button" data-action="revise" data-id="${escapeAttr(item.id)}">수정</button>
            <button class="row-button" type="button" data-action="edit" data-id="${escapeAttr(item.id)}">열기</button>
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

  if (button.dataset.action === "approve") {
    const nextStatus = item.status === "업로드완료" || item.status === "보류" ? item.status : "수정완료";
    updateItem({ ...item, approval: "승인", status: nextStatus });
    return;
  }

  if (button.dataset.action === "revise") {
    openItemDialog({ ...item, approval: "수정요청", status: "수정중" });
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
  const item = {
    id,
    title: form.title.value.trim(),
    sourceUrl: form.sourceUrl.value.trim(),
    thumbnail: form.thumbnail.value.trim(),
    platform: form.platform.value,
    reference: form.reference.value.trim(),
    owner: form.owner.value.trim(),
    status: form.status.value,
    draftUrl: form.draftUrl.value.trim(),
    approval: form.approval.value,
    feedback: form.feedback.value.trim(),
    dueDate: form.dueDate.value,
    scheduleDate: form.scheduleDate.value,
    uploadUrl: form.uploadUrl.value.trim(),
    updatedAt: now,
    updatedBy: settings.userName || current?.updatedBy || "",
  };

  await updateItem(item);
  els.itemDialog.close();
}

async function updateItem(item, options = {}) {
  setSaveState("저장 중");

  try {
    if (hasApiSettings()) {
      const response = await requestApi("upsert", { item });
      if (response.item) {
        item = response.item;
      }
    }

    const index = items.findIndex((row) => row.id === item.id);
    if (index >= 0) {
      items[index] = normalizeItem(item);
    } else {
      items.unshift(normalizeItem(item));
    }
    persistLocalFallback();
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

async function deleteCurrentItem() {
  const id = form.id.value;
  if (!id) return;
  if (!confirm("이 콘텐츠를 삭제할까요?")) return;

  setSaveState("삭제 중");

  try {
    if (hasApiSettings()) {
      await requestApi("delete", { id });
    }
    items = items.filter((item) => item.id !== id);
    persistLocalFallback();
    setSaveState("삭제됨");
    els.itemDialog.close();
  } catch (error) {
    console.error(error);
    setSaveState("삭제 실패");
    alert("삭제에 실패했습니다. 설정의 API URL과 비밀번호를 확인해 주세요.");
  }

  render();
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
  els.apiSecretInput.value = settings.apiSecret || "";
  els.userNameInput.value = settings.userName || "";
  els.settingsDialog.showModal();
}

async function saveSettingsFromDialog() {
  settings = {
    apiUrl: els.apiUrlInput.value.trim(),
    apiSecret: els.apiSecretInput.value.trim(),
    userName: els.userNameInput.value.trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  els.settingsDialog.close();
  await loadItems();
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
  const apiSecret = params.get("apiSecret") || params.get("secret");
  const userName = params.get("userName") || params.get("user");

  if (!apiUrl && !apiSecret && !userName) return saved;

  const next = {
    ...saved,
    apiUrl: apiUrl || saved.apiUrl || "",
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

function persistLocalFallback() {
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(items));
}

function getFilteredItems() {
  return items
    .filter((item) => {
      if (activeFilter === "approval") return item.status === "컨펌대기";
      if (activeFilter === "revision") return item.status === "수정중" || item.approval === "수정요청";
      if (activeFilter === "week") return isThisWeek(item.dueDate) || isThisWeek(item.scheduleDate);
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

      const aKey = a.dueDate || "9999-12-31";
      const bKey = b.dueDate || "9999-12-31";
      return aKey.localeCompare(bKey);
    });
}

function getCaption(count) {
  const label = {
    all: "전체 콘텐츠",
    approval: "컨펌 대기 콘텐츠",
    revision: "수정 요청 콘텐츠",
    week: "이번 주 일정",
    done: "업로드 완료 콘텐츠",
  }[activeFilter];
  return `${label} ${count}개를 표시합니다.`;
}

function normalizeItems(rows) {
  return rows.map(normalizeItem);
}

async function refreshMissingMetadata() {
  if (!hasApiSettings() || !items.some(needsMetadata)) return;

  try {
    setSaveState("썸네일 확인 중");
    const targets = items.filter(needsMetadata).slice(0, 8);

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
  return !item.thumbnail || isAutoTitle(item.title, item.platform);
}

function hasMetadataChange(before, after) {
  return (
    before.title !== after.title ||
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
    if (data?.title && isAutoTitle(next.title, next.platform)) {
      next.title = data.title;
    }
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

function createQuickItem(url, reference, index, total) {
  const sourceUrl = canonicalizeSourceUrl(url);
  const platform = inferPlatform(sourceUrl);
  return {
    id: createId(),
    title: createQuickTitle(sourceUrl, platform, index, total),
    sourceUrl,
    thumbnail: youtubeThumbnail(sourceUrl),
    platform,
    reference: reference || "링크 자동 등록",
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

function createQuickTitle(url, platform, index, total) {
  const now = new Date();
  const dateText = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  const type = platform === "유튜브" && String(url).includes("/shorts/") ? "쇼츠" : "링크";
  const suffix = total > 1 ? ` ${index + 1}` : "";
  return `${platform} ${type} ${dateText}${suffix}`;
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

function renderThumb(item) {
  const imageUrl = item.thumbnail || youtubeThumbnail(item.sourceUrl);
  const mark = renderPlatformMark(item.platform);
  if (imageUrl) {
    return `<span class="thumb"><img src="${escapeAttr(imageUrl)}" alt="" loading="lazy" onerror="this.remove(); this.parentElement.classList.add('thumb-fallback')">${mark}</span>`;
  }
  return `<span class="thumb thumb-fallback">${mark}</span>`;
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
  return `<span class="platform-mark ${className}">${escapeHtml(platformInitial(normalized))}</span>`;
}

function renderTitlePlatform(platform) {
  const normalized = platform || "기타";
  const className = {
    "유튜브": "platform-youtube",
    "인스타": "platform-instagram",
    "틱톡": "platform-tiktok",
  }[normalized] || "platform-etc";
  return `<span class="title-platform ${className}">${escapeHtml(platformInitial(normalized))}</span>`;
}

function renderStatus(status) {
  const label = normalizeStatus(status);
  const className = STATUS_CLASS[label] || "status-wait";
  return `<span class="status-badge ${className}">${escapeHtml(label)}</span>`;
}

function renderApproval(approval) {
  const label = approval || "미확인";
  const className = APPROVAL_CLASS[label] || "approval-pending";
  return `<span class="approval-badge ${className}">${escapeHtml(label)}</span>`;
}

function renderDueDate(date) {
  const className = isOverdue(date) ? "date-text is-overdue" : "date-text";
  return `<span class="${className}">${escapeHtml(formatDate(date))}</span>`;
}

function formatDate(date) {
  if (!date) return "-";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(parsed);
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

function platformInitial(platform) {
  if (platform === "유튜브") return "YT";
  if (platform === "인스타") return "IN";
  if (platform === "틱톡") return "TT";
  return "URL";
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
