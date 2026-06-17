const SHEET_NAME = "Videos";
const API_SECRET_PROPERTY = "API_SECRET";
const SPREADSHEET_ID_PROPERTY = "SPREADSHEET_ID";

const COLUMNS = [
  ["id", "ID"],
  ["title", "제목"],
  ["sourceUrl", "원본 링크"],
  ["thumbnail", "썸네일"],
  ["platform", "플랫폼"],
  ["reference", "참고 포인트"],
  ["owner", "담당자"],
  ["status", "단계"],
  ["draftUrl", "초안 링크"],
  ["approval", "컨펌"],
  ["feedback", "수정 요청"],
  ["dueDate", "마감일"],
  ["scheduleDate", "예약일"],
  ["uploadUrl", "업로드 링크"],
  ["updatedAt", "최종 수정일"],
  ["updatedBy", "최종 수정자"],
];

const HEADER_ALIASES = {
  "단계": ["상태"],
};

function doPost(e) {
  try {
    const input = JSON.parse((e.postData && e.postData.contents) || "{}");
    return jsonOutput(handleAction(input));
  } catch (error) {
    return jsonOutput({ ok: false, error: error.message });
  }
}

function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;

  try {
    const input = e && e.parameter && e.parameter.payload
      ? JSON.parse(e.parameter.payload)
      : (e && e.parameter) || {};
    return jsonOutput(handleAction(input), callback);
  } catch (error) {
    return jsonOutput({ ok: false, error: error.message }, callback);
  }
}

function handleAction(input) {
  checkSecret(input.secret);

  if (input.action === "list") {
    return { ok: true, items: listItems() };
  }

  if (input.action === "upsert") {
    const item = upsertItem(input.item, input.userName);
    return { ok: true, item };
  }

  if (input.action === "refreshMetadata") {
    return { ok: true, items: refreshMetadata() };
  }

  if (input.action === "delete") {
    deleteItem(input.id);
    return { ok: true };
  }

  throw new Error("Unknown action: " + input.action);
}

function setupSheet() {
  const sheet = getSheet();
  ensureHeaders(sheet);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold").setBackground("#eef1f5");
  sheet.autoResizeColumns(1, COLUMNS.length);

  const secret = ensureApiSecret();
  Logger.log("웹앱 설정에 입력할 접속 비밀번호: " + secret);
}

function changeApiSecret() {
  const newSecret = "원하는-비밀번호로-바꾸세요";
  setApiSecret(newSecret);
  Logger.log("접속 비밀번호를 변경했습니다: " + newSecret);
}

function connectSpreadsheet() {
  const spreadsheetId = "10xjwjXmlIU0O8k8fJij3M_u_Gd4rzjfWQzSp6pak8_8";
  setSpreadsheetId(spreadsheetId);
  setupSheet();
}

function setApiSecret(secret) {
  if (!secret) {
    throw new Error("비밀번호를 입력하세요.");
  }
  PropertiesService.getScriptProperties().setProperty(API_SECRET_PROPERTY, String(secret));
}

function setSpreadsheetId(spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID를 입력하세요.");
  }
  PropertiesService.getScriptProperties().setProperty(SPREADSHEET_ID_PROPERTY, String(spreadsheetId));
}

function listItems() {
  const sheet = getSheet();
  ensureHeaders(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  return values.slice(1).filter(rowHasContent).map((row) => rowToItem(headers, row));
}

function upsertItem(rawItem, userName) {
  if (!rawItem || !rawItem.id) {
    throw new Error("저장할 항목 ID가 없습니다.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet();
    ensureHeaders(sheet);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const idColumn = headers.indexOf("ID");
    const rowIndex = findRowIndexById(values, idColumn, rawItem.id);
    const item = normalizeItem(rawItem, userName);
    enrichItemMetadata(item);
    const row = itemToRow(headers, item);

    if (rowIndex >= 0) {
      sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return item;
  } finally {
    lock.releaseLock();
  }
}

function refreshMetadata() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet();
    ensureHeaders(sheet);
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) return [];

    const headers = values[0];
    const items = [];

    for (let index = 1; index < values.length; index += 1) {
      const row = values[index];
      if (!rowHasContent(row)) continue;

      const original = rowToItem(headers, row);
      const item = normalizeItem(original, original.updatedBy);
      const before = JSON.stringify({
        title: item.title,
        sourceUrl: item.sourceUrl,
        thumbnail: item.thumbnail,
        platform: item.platform,
      });

      enrichItemMetadata(item);

      const after = JSON.stringify({
        title: item.title,
        sourceUrl: item.sourceUrl,
        thumbnail: item.thumbnail,
        platform: item.platform,
      });

      if (before !== after) {
        sheet.getRange(index + 1, 1, 1, headers.length).setValues([itemToRow(headers, item)]);
      }

      items.push(item);
    }

    return items;
  } finally {
    lock.releaseLock();
  }
}

function deleteItem(id) {
  if (!id) {
    throw new Error("삭제할 항목 ID가 없습니다.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet();
    ensureHeaders(sheet);
    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const idColumn = headers.indexOf("ID");
    const rowIndex = findRowIndexById(values, idColumn, id);

    if (rowIndex >= 0) {
      sheet.deleteRow(rowIndex + 1);
    }
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheetId = scriptProperties.getProperty(SPREADSHEET_ID_PROPERTY);
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("스프레드시트를 찾을 수 없습니다. setSpreadsheetId를 먼저 실행하세요.");
  }

  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  const headers = COLUMNS.map((column) => column[1]);
  const lastColumn = Math.max(sheet.getLastColumn(), headers.length);
  const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const isEmpty = current.every((value) => value === "");

  if (isEmpty) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  headers.forEach((header) => {
    const values = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (values.indexOf(header) === -1) {
      const alias = (HEADER_ALIASES[header] || []).find((name) => values.indexOf(name) !== -1);
      if (alias) {
        sheet.getRange(1, values.indexOf(alias) + 1).setValue(header);
        return;
      }
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
    }
  });
}

function rowToItem(headers, row) {
  const item = {};
  COLUMNS.forEach(([key, header]) => {
    const index = findHeaderIndex(headers, header);
    item[key] = index >= 0 ? formatCellValue(row[index]) : "";
  });
  return item;
}

function itemToRow(headers, item) {
  return headers.map((header) => {
    const column = COLUMNS.find((entry) => entry[1] === header || (HEADER_ALIASES[entry[1]] || []).indexOf(header) !== -1);
    if (!column) return "";
    return item[column[0]] || "";
  });
}

function normalizeItem(item, userName) {
  const normalized = {};
  COLUMNS.forEach(([key]) => {
    normalized[key] = item[key] == null ? "" : String(item[key]);
  });

  normalized.sourceUrl = canonicalizeSourceUrl(normalized.sourceUrl);
  normalized.platform = normalized.platform || inferPlatform(normalized.sourceUrl);
  normalized.updatedAt = new Date().toISOString();
  normalized.updatedBy = userName || item.updatedBy || "";
  normalized.status = normalizeStatus(normalized.status);
  return normalized;
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
  const valid = ["촬영필요", "촬영완료", "작업중", "작업완료", "컨펌대기", "수정중", "수정완료", "업로드완료", "보류"];
  const normalized = legacyStatus[value] || value;
  return valid.indexOf(normalized) === -1 ? "촬영필요" : normalized;
}

function enrichItemMetadata(item) {
  if (!item.sourceUrl) return item;

  const metadata = fetchLinkMetadata(item.sourceUrl);
  if (!metadata) return item;

  item.platform = item.platform || metadata.platform || inferPlatform(item.sourceUrl);

  if (metadata.title && shouldReplaceTitle(item.title, item.platform)) {
    item.title = metadata.title;
  }

  if (metadata.thumbnail && !item.thumbnail) {
    item.thumbnail = metadata.thumbnail;
  }

  return item;
}

function shouldReplaceTitle(title, platform) {
  const value = String(title || "").trim();
  const currentPlatform = platform || "링크";
  return !value ||
    value === "링크 자동 등록" ||
    value.indexOf(currentPlatform + " 링크 ") === 0 ||
    value.indexOf(currentPlatform + " 쇼츠 ") === 0;
}

function fetchLinkMetadata(url) {
  const platform = inferPlatform(url);

  if (platform === "유튜브") {
    return fetchOembedMetadata("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(url), platform, youtubeThumbnail(url));
  }

  if (platform === "틱톡") {
    return fetchOembedMetadata("https://www.tiktok.com/oembed?url=" + encodeURIComponent(url), platform, "");
  }

  return fetchHtmlMetadata(url, platform);
}

function fetchOembedMetadata(endpoint, platform, fallbackThumbnail) {
  const data = fetchJson(endpoint);
  if (!data) {
    return fallbackThumbnail ? { platform: platform, title: "", thumbnail: fallbackThumbnail } : null;
  }

  return {
    platform: platform,
    title: data.title || "",
    thumbnail: data.thumbnail_url || fallbackThumbnail || "",
  };
}

function fetchHtmlMetadata(url, platform) {
  const html = fetchHtml(url);
  if (!html) return null;

  return {
    platform: platform,
    title: firstValue([
      getMetaContent(html, "property", "og:title"),
      getMetaContent(html, "name", "twitter:title"),
      getTitleTag(html),
    ]),
    thumbnail: firstValue([
      getMetaContent(html, "property", "og:image"),
      getMetaContent(html, "name", "twitter:image"),
      getMetaContent(html, "property", "og:image:secure_url"),
    ]),
  };
}

function fetchJson(url) {
  try {
    const response = UrlFetchApp.fetch(url, fetchOptions());
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return null;
    return JSON.parse(response.getContentText());
  } catch (error) {
    return null;
  }
}

function fetchHtml(url) {
  try {
    const response = UrlFetchApp.fetch(url, fetchOptions());
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return "";
    return response.getContentText();
  } catch (error) {
    return "";
  }
}

function fetchOptions() {
  return {
    followRedirects: true,
    muteHttpExceptions: true,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
  };
}

function getMetaContent(html, attributeName, attributeValue) {
  const tags = String(html || "").match(/<meta\s+[^>]*>/gi) || [];
  for (let index = 0; index < tags.length; index += 1) {
    const tag = tags[index];
    if (getTagAttribute(tag, attributeName) === attributeValue) {
      return decodeHtml(getTagAttribute(tag, "content") || "");
    }
  }
  return "";
}

function getTagAttribute(tag, name) {
  const pattern = new RegExp(name + "\\s*=\\s*(['\"])(.*?)\\1", "i");
  const match = String(tag || "").match(pattern);
  return match ? match[2] : "";
}

function getTitleTag(html) {
  const match = String(html || "").match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].replace(/\s+/g, " ").trim()) : "";
}

function firstValue(values) {
  for (let index = 0; index < values.length; index += 1) {
    const value = String(values[index] || "").trim();
    if (value) return value;
  }
  return "";
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, function (_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/&#([0-9]+);/g, function (_, code) {
      return String.fromCharCode(parseInt(code, 10));
    });
}

function canonicalizeSourceUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  let normalized = /^https?:\/\//i.test(value) ? value : "https://" + value;
  normalized = normalized.replace("instagram.com/reels/", "instagram.com/reel/");
  normalized = normalized.replace("www.instagram.com/reels/", "www.instagram.com/reel/");
  return normalized;
}

function inferPlatform(url) {
  const lower = String(url || "").toLowerCase();
  if (lower.indexOf("youtube.com") !== -1 || lower.indexOf("youtu.be") !== -1) return "유튜브";
  if (lower.indexOf("instagram.com") !== -1) return "인스타";
  if (lower.indexOf("tiktok.com") !== -1) return "틱톡";
  return "기타";
}

function youtubeThumbnail(url) {
  const videoId = youtubeVideoId(url);
  return videoId ? "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg" : "";
}

function youtubeVideoId(url) {
  const value = String(url || "");
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];
  for (let index = 0; index < patterns.length; index += 1) {
    const match = value.match(patterns[index]);
    if (match) return match[1];
  }
  return "";
}

function findHeaderIndex(headers, header) {
  const index = headers.indexOf(header);
  if (index >= 0) return index;

  const aliases = HEADER_ALIASES[header] || [];
  for (let aliasIndex = 0; aliasIndex < aliases.length; aliasIndex += 1) {
    const currentIndex = headers.indexOf(aliases[aliasIndex]);
    if (currentIndex >= 0) return currentIndex;
  }
  return -1;
}

function findRowIndexById(values, idColumn, id) {
  if (idColumn < 0) {
    throw new Error("ID 컬럼을 찾을 수 없습니다.");
  }

  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][idColumn]) === String(id)) {
      return index;
    }
  }
  return -1;
}

function rowHasContent(row) {
  return row.some((value) => value !== "");
}

function formatCellValue(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return value == null ? "" : String(value);
}

function checkSecret(secret) {
  const expected = PropertiesService.getScriptProperties().getProperty(API_SECRET_PROPERTY);
  if (!expected) {
    throw new Error("API_SECRET이 설정되지 않았습니다.");
  }
  if (String(secret) !== expected) {
    throw new Error("비밀번호가 올바르지 않습니다.");
  }
}

function jsonOutput(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback) {
    if (!/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(callback)) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: "잘못된 callback 이름입니다." }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService
      .createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureApiSecret() {
  const properties = PropertiesService.getScriptProperties();
  const current = properties.getProperty(API_SECRET_PROPERTY);
  if (current) return current;

  const generated = "meme-" + Utilities.getUuid().slice(0, 8);
  properties.setProperty(API_SECRET_PROPERTY, generated);
  return generated;
}
