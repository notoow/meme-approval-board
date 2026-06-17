const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const DEFAULT_ALLOWED_PREFIX = "\\\\192.168.0.10\\highst_영상팀\\@종편,클린본,콜렉트\\숏폼\\밈 나스링크";
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const allowedPrefixes = String(process.env.NAS_ALLOWED_PREFIX || DEFAULT_ALLOWED_PREFIX)
  .split(";")
  .map((prefix) => normalizeFilePath(prefix))
  .filter(Boolean);

const MIME_TYPES = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
};

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (requestUrl.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        allowedPrefixes,
      });
      return;
    }

    if (requestUrl.pathname !== "/stream") {
      sendJson(res, 404, { ok: false, error: "Unknown endpoint" });
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    const rawPath = requestUrl.searchParams.get("path") || "";
    const filePath = normalizeFilePath(rawPath);

    if (!filePath) {
      sendJson(res, 400, { ok: false, error: "Missing path" });
      return;
    }

    if (!isAllowedPath(filePath)) {
      sendJson(res, 403, {
        ok: false,
        error: "Path is outside the allowed NAS folder",
      });
      return;
    }

    await streamFile(req, res, filePath);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, error: error.message || "Server error" });
    } else {
      res.destroy(error);
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`NAS stream server listening at http://${HOST}:${PORT}`);
  console.log("Allowed NAS folders:");
  allowedPrefixes.forEach((prefix) => console.log(`- ${prefix}`));
});

async function streamFile(req, res, filePath) {
  const stat = await fs.promises.stat(filePath);
  if (!stat.isFile()) {
    sendJson(res, 400, { ok: false, error: "Path is not a file" });
    return;
  }

  const fileSize = stat.size;
  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "Content-Disposition": contentDisposition(filePath),
      "Content-Length": fileSize,
      "Content-Type": contentType,
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const parsedRange = parseRange(range, fileSize);
  if (!parsedRange) {
    res.writeHead(416, {
      "Content-Range": `bytes */${fileSize}`,
    });
    res.end();
    return;
  }

  const { start, end } = parsedRange;
  const chunkSize = end - start + 1;

  res.writeHead(206, {
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Disposition": contentDisposition(filePath),
    "Content-Length": chunkSize,
    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
    "Content-Type": contentType,
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(filePath, { start, end }).pipe(res);
}

function parseRange(rangeHeader, fileSize) {
  const match = String(rangeHeader || "").match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  let start = match[1] ? Number(match[1]) : null;
  let end = match[2] ? Number(match[2]) : null;

  if (start == null && end == null) return null;

  if (start == null) {
    const suffixLength = end;
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(fileSize - suffixLength, 0);
    end = fileSize - 1;
  } else {
    if (!Number.isFinite(start) || start < 0) return null;
    if (end == null || end >= fileSize) end = fileSize - 1;
  }

  if (!Number.isFinite(end) || start > end || start >= fileSize) return null;
  return { start, end };
}

function normalizeFilePath(value) {
  let filePath = String(value || "").trim();
  if (!filePath) return "";

  filePath = filePath.replace(/^file:(\/\/\/)?/i, "");
  if (filePath.startsWith("//")) {
    filePath = `\\\\${filePath.slice(2)}`;
  }
  filePath = filePath.replace(/\//g, "\\");
  return path.win32.normalize(filePath);
}

function isAllowedPath(filePath) {
  const comparablePath = normalizeForCompare(filePath);
  return allowedPrefixes.some((prefix) => {
    const comparablePrefix = normalizeForCompare(prefix);
    return comparablePath === comparablePrefix || comparablePath.startsWith(`${comparablePrefix}\\`);
  });
}

function normalizeForCompare(value) {
  return normalizeFilePath(value).replace(/\\+$/, "").toLowerCase();
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function contentDisposition(filePath) {
  const filename = path.win32.basename(filePath);
  return `inline; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
