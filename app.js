(function () {
  const storageKey = "twoNurDailyReport";
  const settingsKey = "twoNurDailyReportSettings";
  const defaultCategories = [
    "Youtube Post",
    "Instagram Post",
    "FaceBook Post",
    "X post",
    "2nur.com post"
  ];

  const state = loadState();
  const settings = loadSettings();
  let editingId = null;

  const fields = {
    reportDate: document.getElementById("reportDate"),
    personName: document.getElementById("personName"),
    designation: document.getElementById("designation"),
    category: document.getElementById("categoryInput"),
    name: document.getElementById("nameInput"),
    link: document.getElementById("linkInput"),
    rows: document.getElementById("reportRows"),
    suggestions: document.getElementById("categorySuggestions"),
    previewDate: document.getElementById("previewDate"),
    previewName: document.getElementById("previewName"),
    previewDesignation: document.getElementById("previewDesignation"),
    itemCount: document.getElementById("itemCount"),
    status: document.getElementById("statusText"),
    formTitle: document.getElementById("formTitle"),
    submitItemBtn: document.getElementById("submitItemBtn"),
    cancelEditBtn: document.getElementById("cancelEditBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    autoResetToggle: document.getElementById("autoResetToggle")
  };

  hydrateForms();
  render();

  fields.autoResetToggle.addEventListener("change", () => {
    settings.autoReset = fields.autoResetToggle.checked;
    saveSettings();
  });

  document.getElementById("profileForm").addEventListener("input", () => {
    state.date = fields.reportDate.value || getPreviousLocalDateValue();
    state.personName = fields.personName.value.trim();
    state.designation = fields.designation.value.trim();
    saveState();
    renderMeta();
  });

  document.getElementById("itemForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveCurrentFormItem();
  });

  fields.cancelEditBtn.addEventListener("click", () => {
    cancelEdit();
    setStatus("Edit cancelled.");
  });

  fields.downloadBtn.addEventListener("click", async () => {
    // If user typed something in the form but forgot to click "Add Item"
    if (fields.category.value.trim() && fields.name.value.trim() && !editingId) {
      if (confirm("You have an unsaved item in the form. Add it to the report before downloading?")) {
        saveCurrentFormItem();
      }
    }

    if (!state.items.length) {
      setStatus("Add at least one item before downloading.");
      return;
    }

    state.date = fields.reportDate.value || getPreviousLocalDateValue();
    state.personName = fields.personName.value.trim();
    state.designation = fields.designation.value.trim();
    saveState();

    fields.downloadBtn.disabled = true;
    fields.downloadBtn.textContent = "Generating PDF...";

    try {
      await downloadPdf();
      if (settings.autoReset) {
        resetAll();
        setStatus("PDF downloaded and report reset.");
      } else {
        setStatus("PDF downloaded successfully.");
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      setStatus("Download failed. Try the Print button instead.");
    } finally {
      fields.downloadBtn.disabled = false;
      fields.downloadBtn.textContent = "Download PDF";
    }
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("clearAllBtn").addEventListener("click", () => {
    if (confirm("Reset all saved report data?")) {
      resetAll();
      setStatus("Report reset.");
    }
  });

  fields.rows.addEventListener("click", (event) => {
    const deleteBtn = event.target.closest("[data-delete-id]");
    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteId;
      if (editingId === id) cancelEdit();
      state.items = state.items.filter((item) => item.id !== id);
      saveState();
      render();
      setStatus("Item removed.");
      return;
    }

    const editBtn = event.target.closest("[data-edit-id]");
    if (editBtn) {
      const item = state.items.find((entry) => entry.id === editBtn.dataset.editId);
      if (!item) return;
      editingId = item.id;
      fields.category.value = item.category;
      fields.name.value = item.name;
      fields.link.value = item.link;
      fields.formTitle.textContent = "Edit Work Item";
      fields.submitItemBtn.textContent = "Update Item";
      fields.cancelEditBtn.classList.remove("hidden");
      fields.name.focus();
      setStatus("Editing item...");
    }
  });

  function saveCurrentFormItem() {
    const category = fields.category.value.trim();
    const name = fields.name.value.trim();
    const link = normalizeLink(fields.link.value.trim());

    if (!category || !name) {
      setStatus("Category and keyword are required.");
      return false;
    }

    if (editingId) {
      const index = state.items.findIndex((item) => item.id === editingId);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], category, name, link };
      }
      cancelEdit();
      setStatus("Item updated.");
    } else {
      state.items.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        category,
        name,
        link
      });
      fields.name.value = "";
      fields.link.value = "";
      fields.name.focus();
      setStatus("Item added.");
    }

    state.items = groupItemsByCategory(state.items);
    saveState();
    render();
    return true;
  }

  function cancelEdit() {
    editingId = null;
    fields.name.value = "";
    fields.link.value = "";
    fields.formTitle.textContent = "Add Work Item";
    fields.submitItemBtn.textContent = "Add Item";
    fields.cancelEditBtn.classList.add("hidden");
  }

  function normalizeLink(raw) {
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[\w.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
    return raw;
  }

  function loadState() {
    const reportDate = getPreviousLocalDateValue();
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return {
        date: saved?.date || reportDate,
        personName: saved?.personName || "",
        designation: saved?.designation || "",
        items: Array.isArray(saved?.items) ? saved.items : []
      };
    } catch (error) {
      return { date: reportDate, personName: "", designation: "", items: [] };
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(settingsKey));
      return { autoReset: Boolean(saved?.autoReset) };
    } catch (error) {
      return { autoReset: false };
    }
  }

  function saveSettings() {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
  }

  function hydrateForms() {
    fields.reportDate.value = state.date;
    fields.personName.value = state.personName;
    fields.designation.value = state.designation;
    fields.autoResetToggle.checked = settings.autoReset;
  }

  function render() {
    renderMeta();
    renderRows();
    renderCategorySuggestions();
    fields.itemCount.textContent = `${state.items.length} ${state.items.length === 1 ? "item" : "items"}`;
  }

  function renderMeta() {
    fields.previewDate.textContent = formatDate(state.date);
    fields.previewName.textContent = state.personName || "-";
    fields.previewDesignation.textContent = state.designation || "-";
  }

  function renderRows() {
    if (!state.items.length) {
      fields.rows.innerHTML = '<tr class="empty-row"><td colspan="5">No work items added yet.</td></tr>';
      return;
    }

    let serial = 1;
    fields.rows.innerHTML = getCategoryGroups(state.items)
      .map((group) => {
        return group.items
          .map((item, itemIndex) => {
            const link = item.link
              ? `<a href="${escapeAttribute(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.link)}</a>`
              : "-";
            const categoryCell =
              itemIndex === 0
                ? `<td class="category-cell" rowspan="${group.items.length}">${escapeHtml(group.category)}</td>`
                : "";

            return `
              <tr>
                <td class="serial-col">${serial++}</td>
                ${categoryCell}
                <td class="link-cell">${link}</td>
                <td>${escapeHtml(item.name)}</td>
                <td class="screen-only action-col">
                  <div class="row-actions">
                    <button class="edit-row" type="button" data-edit-id="${escapeAttribute(item.id)}">Edit</button>
                    <button class="delete-row" type="button" data-delete-id="${escapeAttribute(item.id)}">Del</button>
                  </div>
                </td>
              </tr>
            `;
          })
          .join("");
      })
      .join("");
  }

  function getCategoryGroups(items) {
    const categoryOrder = [];
    const grouped = new Map();

    items.forEach((item) => {
      const categoryKey = item.category.trim().toLowerCase();
      if (!grouped.has(categoryKey)) {
        grouped.set(categoryKey, { category: item.category, items: [] });
        categoryOrder.push(categoryKey);
      }
      grouped.get(categoryKey).items.push(item);
    });

    return categoryOrder.map((categoryKey) => grouped.get(categoryKey));
  }

  function groupItemsByCategory(items) {
    return getCategoryGroups(items).flatMap((group) => group.items);
  }

  function renderCategorySuggestions() {
    const categories = [
      ...new Set([...defaultCategories, ...state.items.map((item) => item.category).filter(Boolean)])
    ];
    fields.suggestions.innerHTML = categories
      .map((category) => `<option value="${escapeAttribute(category)}"></option>`)
      .join("");
  }

  function resetAll() {
    cancelEdit();
    state.date = getPreviousLocalDateValue();
    state.personName = "";
    state.designation = "";
    state.items = [];
    saveState();
    hydrateForms();
    fields.category.value = "";
    fields.name.value = "";
    fields.link.value = "";
    render();
  }

  function setStatus(message) {
    fields.status.textContent = message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      fields.status.textContent = "";
    }, 3500);
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(date);
    const dateText = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
    return `${dayName}, ${dateText}`;
  }

  function getPreviousLocalDateValue() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  function normalizeTypography(value) {
    return String(value ?? "")
      .replace(/[\u2018\u2019\u201A]/g, "'")
      .replace(/[\u201C\u201D\u201E]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/\u00A0/g, " ");
  }

  function reportHasUnicode() {
    const allTexts = [
      state.personName,
      state.designation,
      formatDate(state.date),
      ...state.items.flatMap((item) => [item.category, item.name, item.link])
    ];
    return allTexts.some((text) => /[^\x20-\x7E]/.test(normalizeTypography(text)));
  }

  async function downloadPdf() {
    // Automatically use high-DPI Canvas-to-PDF if Bangla/Unicode/Emoji exists,
    // otherwise use crisp native Vector PDF. Both include clickable links!
    const pdfBytes = reportHasUnicode() ? createUnicodePdfBytes() : createVectorPdfBytes();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify(state.date)}-${slugify(state.personName || "daily-report")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Keep URL alive for 60s so slower browsers/devices finish saving completely
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* =========================================================================
   * MODE 1: NATIVE VECTOR PDF (ASCII/English, selectable text, clickable links)
   * ========================================================================= */
  function createVectorPdfBytes() {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 42;
    const bottomMargin = 46;
    const columns = [
      { label: "Serial", width: 32 },
      { label: "Category", width: 96 },
      { label: "Link", width: 223 },
      { label: "Keyword", width: 160.28 }
    ];
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

    const pages = [];
    let stream = "";
    let pageLinks = [];
    let y = 792;
    let freshTableTopY = 760;

    startPage();
    drawHeader();
    drawMeta();
    drawTableHeader();

    let serial = 1;
    getCategoryGroups(state.items).forEach((group) => {
      const categoryLines = wrapText(normalizeTypography(group.category), columns[1].width - 12, 9);
      const minCatHeight = Math.max(26, categoryLines.length * 12 + 12);

      const rows = group.items.map((item) => {
        const serialText = String(serial++);
        const linkText = normalizeTypography(item.link || "-");
        const keywordText = normalizeTypography(item.name || "-");

        const wrapped = [
          [serialText],
          wrapText(linkText, columns[2].width - 12, 9),
          wrapText(keywordText, columns[3].width - 12, 9)
        ];
        const maxLines = Math.max(wrapped[1].length, wrapped[2].length, 1);
        const rowHeight = Math.max(26, maxLines * 12 + 12);

        return { wrapped, rowHeight, url: item.link };
      });

      let rowIndex = 0;
      while (rowIndex < rows.length) {
        // Check if even the next single row fits on the current page
        const neededFirstHeight = Math.max(rows[rowIndex].rowHeight, minCatHeight);
        if (y - neededFirstHeight < bottomMargin && y < freshTableTopY - 1) {
          savePage();
          startPage();
          drawTableHeader();
          freshTableTopY = y;
        }

        const startY = y;
        const segment = [];
        let segmentHeight = 0;

        while (rowIndex < rows.length) {
          const nextRow = rows[rowIndex];
          if (segment.length > 0 && y - nextRow.rowHeight < bottomMargin) {
            break;
          }
          segment.push(nextRow);
          y -= nextRow.rowHeight;
          segmentHeight += nextRow.rowHeight;
          rowIndex += 1;
        }

        // Ensure category cell is tall enough for wrapped category label
        if (segmentHeight < minCatHeight) {
          const extra = minCatHeight - segmentHeight;
          segment[segment.length - 1].rowHeight += extra;
          y -= extra;
          segmentHeight += extra;
        }

        drawCategorySegment(categoryLines, segment, startY, segmentHeight);

        if (rowIndex < rows.length) {
          savePage();
          startPage();
          drawTableHeader();
          freshTableTopY = y;
        }
      }
    });

    savePage();
    return assembleVectorPdf(pages, pageWidth, pageHeight);

    function startPage() {
      stream = "";
      pageLinks = [];
      y = 792;
    }

    function savePage() {
      pages.push({ stream, links: pageLinks });
    }

    function drawHeader() {
      addCenteredText("2nur Digital Agency", pageWidth / 2, y, 22, true);
      y -= 22;
      addCenteredText("2nur.com", pageWidth / 2, y, 13, true);
      y -= 14;
      addLine(margin, y, margin + tableWidth, y);
      y -= 14;
    }

    function drawMeta() {
      const boxGap = 8;
      const boxWidth = (tableWidth - boxGap * 2) / 3;
      const metaItems = [
        { label: "DATE", value: normalizeTypography(formatDate(state.date)) },
        { label: "NAME", value: normalizeTypography(state.personName || "-") },
        { label: "DESIGNATION", value: normalizeTypography(state.designation || "-") }
      ];

      const wrappedValues = metaItems.map((m) => wrapText(m.value, boxWidth - 14, 10));
      const maxLines = Math.max(...wrappedValues.map((l) => l.length), 1);
      const boxHeight = Math.max(38, 22 + maxLines * 12);

      metaItems.forEach((m, i) => {
        const bx = margin + i * (boxWidth + boxGap);
        drawFilledRect(bx, y - boxHeight, boxWidth, boxHeight, 246, 248, 251);
        addRect(bx, y - boxHeight, boxWidth, boxHeight);
        addText(m.label, bx + 7, y - 13, 7.5, true, false, "muted");
        wrappedValues[i].forEach((line, li) => {
          addText(line, bx + 7, y - 26 - li * 12, 9.5, true);
        });
      });

      y -= boxHeight + 14;
    }

    function drawTableHeader() {
      let x = margin;
      const headerHeight = 32;
      drawFilledRect(margin, y - headerHeight, tableWidth, headerHeight, 31, 42, 55);
      columns.forEach((column, index) => {
        addRect(x, y - headerHeight, column.width, headerHeight);
        if (index === 0) {
          addRotatedCenteredText(column.label, x + column.width / 2, y - headerHeight / 2, 7, true);
        } else {
          addCenteredText(column.label, x + column.width / 2, y - 20, 10.5, true, true);
        }
        x += column.width;
      });
      y -= headerHeight;
    }

    function drawCategorySegment(categoryLines, segment, startY, segmentHeight) {
      const serialX = margin;
      const categoryX = margin + columns[0].width;
      const linkX = categoryX + columns[1].width;
      const keywordX = linkX + columns[2].width;

      addRect(categoryX, startY - segmentHeight, columns[1].width, segmentHeight);
      const catBlockHeight = categoryLines.length * 12;
      const catStartTextY = startY - (segmentHeight - catBlockHeight) / 2 - 9;
      categoryLines.forEach((line, li) => {
        addCenteredText(line, categoryX + columns[1].width / 2, catStartTextY - li * 12, 9, true);
      });

      let rowY = startY;
      segment.forEach((row) => {
        addRect(serialX, rowY - row.rowHeight, columns[0].width, row.rowHeight);
        addRect(linkX, rowY - row.rowHeight, columns[2].width, row.rowHeight);
        addRect(keywordX, rowY - row.rowHeight, columns[3].width, row.rowHeight);

        addCenteredText(row.wrapped[0][0], serialX + columns[0].width / 2, rowY - row.rowHeight / 2 - 3, 9, true);

        row.wrapped[1].forEach((line, li) => {
          addText(line, linkX + 6, rowY - 15 - li * 12, 9, false, false, row.url ? "link" : "text");
        });

        if (row.url && /^https?:\/\//i.test(row.url)) {
          pageLinks.push({
            rect: [linkX + 2, rowY - row.rowHeight + 2, linkX + columns[2].width - 2, rowY - 2],
            url: row.url
          });
        }

        row.wrapped[2].forEach((line, li) => {
          addText(line, keywordX + 6, rowY - 15 - li * 12, 9);
        });

        rowY -= row.rowHeight;
      });
    }

    function addText(text, x, textY, size, bold, white, color) {
      const fill = white
        ? "1 1 1"
        : color === "link"
          ? "0.02 0.27 0.68"
          : color === "muted"
            ? "0.39 0.45 0.51"
            : "0.09 0.13 0.17";
      stream += `BT /${bold ? "F2" : "F1"} ${size} Tf ${fill} rg ${x.toFixed(2)} ${textY.toFixed(2)} Td (${escapePdfString(text)}) Tj ET\n`;
    }

    function addCenteredText(text, centerX, textY, size, bold, white) {
      const w = getTextWidth(text, size);
      addText(text, centerX - w / 2, textY, size, bold, white);
    }

    function addRotatedCenteredText(text, centerX, centerY, size, bold) {
      const angle = -Math.PI / 4;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const textWidth = getTextWidth(text, size);
      const textHeight = size;
      const x = centerX - (cos * textWidth / 2 - sin * textHeight / 2);
      const textY = centerY - (sin * textWidth / 2 + cos * textHeight / 2);
      stream += `BT /${bold ? "F2" : "F1"} ${size} Tf 1 1 1 rg ${cos.toFixed(4)} ${sin.toFixed(4)} ${(-sin).toFixed(4)} ${cos.toFixed(4)} ${x.toFixed(2)} ${textY.toFixed(2)} Tm (${escapePdfString(text)}) Tj ET\n`;
    }

    function addLine(x1, y1, x2, y2) {
      stream += `0.09 0.13 0.17 RG 1.2 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
    }

    function addRect(x, rectY, width, height) {
      stream += `0.72 0.76 0.81 RG 0.7 w ${x.toFixed(2)} ${rectY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S\n`;
    }

    function drawFilledRect(x, rectY, width, height, r, g, b) {
      stream += `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg ${x.toFixed(2)} ${rectY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`;
    }
  }

  function assembleVectorPdf(pages, pageWidth, pageHeight) {
    const encoder = new TextEncoder();
    const objects = [];
    const addObj = (str) => {
      objects.push(encoder.encode(str));
      return objects.length;
    };

    const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const boldFontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

    const pageIds = pages.map((page, idx) => {
      const footer =
        `BT /F1 8 Tf 0.45 0.5 0.55 rg 42 20 Td (Page ${idx + 1} of ${pages.length}) Tj ET\n` +
        `BT /F1 6 Tf 0.55 0.6 0.65 rg ${(pageWidth - 110).toFixed(2)} 20 Td (System created by Apple) Tj ET\n`;
      const fullStream = page.stream + footer;
      const streamBytes = encoder.encode(fullStream);
      const contentId = addObj(`<< /Length ${streamBytes.length} >>\nstream\n${fullStream}\nendstream`);

      const annotIds = page.links.map((lnk) => {
        const [x1, y1, x2, y2] = lnk.rect.map((v) => v.toFixed(2));
        return addObj(
          `<< /Type /Annot /Subtype /Link /Rect [${x1} ${y1} ${x2} ${y2}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfString(lnk.url)}) >> >>`
        );
      });

      const annotsPart = annotIds.length ? ` /Annots [${annotIds.map((id) => `${id} 0 R`).join(" ")}]` : "";
      return addObj(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R${annotsPart} >>`
      );
    });

    const pagesId = objects.length + 1;
    pageIds.forEach((id) => {
      const str = new TextDecoder().decode(objects[id - 1]).replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
      objects[id - 1] = encoder.encode(str);
    });

    addObj(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
    const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    return buildBinaryPdf(objects, catalogId);
  }

  /* =========================================================================
   * MODE 2: HIGH-DPI CANVAS-TO-PDF (Full Bangla / Unicode / Emoji Support!)
   * ========================================================================= */
  function createUnicodePdfBytes() {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const scale = 2;
    const cw = Math.round(pageWidth * scale);
    const ch = Math.round(pageHeight * scale);
    const margin = 42;
    const bottomMargin = 46;
    const columns = [
      { label: "Serial", width: 32 },
      { label: "Category", width: 96 },
      { label: "Link", width: 223 },
      { label: "Keyword", width: 160.28 }
    ];
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const fontFamily = '"Segoe UI", "Noto Sans Bengali", "Hind Siliguri", Arial, sans-serif';

    const renderedPages = [];
    let canvas, ctx, y, pageLinks, freshTableTopY;

    function startPage() {
      canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageWidth, pageHeight);
      y = 42;
      pageLinks = [];
    }

    function savePage() {
      renderedPages.push({ canvas, links: pageLinks });
    }

    function wrapCanvasText(text, maxWidth, font) {
      ctx.font = font;
      const words = String(text || "-").split(/\s+/);
      const lines = [];
      let current = "";

      words.forEach((word) => {
        const chunks = splitCanvasWord(word, maxWidth);
        chunks.forEach((chunk) => {
          const test = current ? `${current} ${chunk}` : chunk;
          if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = chunk;
          } else {
            current = test;
          }
        });
      });

      if (current) lines.push(current);
      return lines.length ? lines : ["-"];
    }

    function splitCanvasWord(word, maxWidth) {
      if (ctx.measureText(word).width <= maxWidth) return [word];
      const chunks = [];
      let part = "";
      for (const ch of Array.from(word)) {
        const candidate = part + ch;
        if (part && ctx.measureText(candidate).width > maxWidth) {
          chunks.push(part);
          part = ch;
        } else {
          part = candidate;
        }
      }
      if (part) chunks.push(part);
      return chunks;
    }

    function drawHeader() {
      ctx.fillStyle = "#17212b";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = `700 22px ${fontFamily}`;
      ctx.fillText("2nur Digital Agency", pageWidth / 2, y);
      y += 26;
      ctx.font = `700 13px ${fontFamily}`;
      ctx.fillText("2nur.com", pageWidth / 2, y);
      y += 20;
      ctx.strokeStyle = "#17212b";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(margin + tableWidth, y);
      ctx.stroke();
      y += 14;
    }

    function drawMeta() {
      const boxGap = 8;
      const boxWidth = (tableWidth - boxGap * 2) / 3;
      const metaItems = [
        { label: "DATE", value: formatDate(state.date) },
        { label: "NAME", value: state.personName || "-" },
        { label: "DESIGNATION", value: state.designation || "-" }
      ];

      const valueFont = `700 10px ${fontFamily}`;
      const wrapped = metaItems.map((m) => wrapCanvasText(m.value, boxWidth - 14, valueFont));
      const maxLines = Math.max(...wrapped.map((l) => l.length), 1);
      const boxHeight = Math.max(40, 22 + maxLines * 13);

      metaItems.forEach((m, i) => {
        const bx = margin + i * (boxWidth + boxGap);
        ctx.fillStyle = "#f6f8fb";
        ctx.fillRect(bx, y, boxWidth, boxHeight);
        ctx.strokeStyle = "#d9e0e7";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(bx, y, boxWidth, boxHeight);

        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#647282";
        ctx.font = `700 7.5px ${fontFamily}`;
        ctx.fillText(m.label, bx + 7, y + 7);

        ctx.fillStyle = "#17212b";
        ctx.font = valueFont;
        wrapped[i].forEach((line, li) => {
          ctx.fillText(line, bx + 7, y + 20 + li * 13);
        });
      });

      y += boxHeight + 14;
    }

    function drawTableHeader() {
      const headerHeight = 32;
      ctx.fillStyle = "#1f2a37";
      ctx.fillRect(margin, y, tableWidth, headerHeight);

      let x = margin;
      columns.forEach((col, index) => {
        ctx.strokeStyle = "#b9c3ce";
        ctx.lineWidth = 0.7;
        ctx.strokeRect(x, y, col.width, headerHeight);

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (index === 0) {
          ctx.save();
          ctx.translate(x + col.width / 2, y + headerHeight / 2);
          ctx.rotate(-Math.PI / 4);
          ctx.font = `700 7.5px ${fontFamily}`;
          ctx.fillText(col.label, 0, 0);
          ctx.restore();
        } else {
          ctx.font = `700 10.5px ${fontFamily}`;
          ctx.fillText(col.label, x + col.width / 2, y + headerHeight / 2);
        }
        x += col.width;
      });
      y += headerHeight;
    }

    startPage();
    drawHeader();
    drawMeta();
    drawTableHeader();
    freshTableTopY = y;

    const bodyFont = `400 9.5px ${fontFamily}`;
    const boldFont = `700 9.5px ${fontFamily}`;
    const maxY = pageHeight - bottomMargin;
    let serial = 1;

    getCategoryGroups(state.items).forEach((group) => {
      const catLines = wrapCanvasText(group.category, columns[1].width - 12, boldFont);
      const minCatHeight = Math.max(26, catLines.length * 13 + 12);

      const rows = group.items.map((item) => {
        const sText = String(serial++);
        const lLines = wrapCanvasText(item.link || "-", columns[2].width - 12, bodyFont);
        const kLines = wrapCanvasText(item.name || "-", columns[3].width - 12, bodyFont);
        const rowHeight = Math.max(26, Math.max(lLines.length, kLines.length) * 13 + 12);
        return { sText, lLines, kLines, rowHeight, url: item.link };
      });

      let rowIndex = 0;
      while (rowIndex < rows.length) {
        const neededFirst = Math.max(rows[rowIndex].rowHeight, minCatHeight);
        if (y + neededFirst > maxY && y > freshTableTopY + 1) {
          savePage();
          startPage();
          drawTableHeader();
          freshTableTopY = y;
        }

        const startY = y;
        const segment = [];
        let segmentHeight = 0;

        while (rowIndex < rows.length) {
          const nextRow = rows[rowIndex];
          if (segment.length > 0 && y + nextRow.rowHeight > maxY) break;
          segment.push(nextRow);
          y += nextRow.rowHeight;
          segmentHeight += nextRow.rowHeight;
          rowIndex += 1;
        }

        if (segmentHeight < minCatHeight) {
          const extra = minCatHeight - segmentHeight;
          segment[segment.length - 1].rowHeight += extra;
          y += extra;
          segmentHeight += extra;
        }

        // Draw category cell
        const serialX = margin;
        const categoryX = margin + columns[0].width;
        const linkX = categoryX + columns[1].width;
        const keywordX = linkX + columns[2].width;

        ctx.strokeStyle = "#b9c3ce";
        ctx.lineWidth = 0.7;
        ctx.strokeRect(categoryX, startY, columns[1].width, segmentHeight);

        ctx.fillStyle = "#17212b";
        ctx.font = boldFont;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const catStartY = startY + (segmentHeight - catLines.length * 13) / 2;
        catLines.forEach((line, li) => {
          ctx.fillText(line, categoryX + columns[1].width / 2, catStartY + li * 13);
        });

        let rowY = startY;
        segment.forEach((row) => {
          ctx.strokeStyle = "#b9c3ce";
          ctx.strokeRect(serialX, rowY, columns[0].width, row.rowHeight);
          ctx.strokeRect(linkX, rowY, columns[2].width, row.rowHeight);
          ctx.strokeRect(keywordX, rowY, columns[3].width, row.rowHeight);

          ctx.fillStyle = "#17212b";
          ctx.font = boldFont;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(row.sText, serialX + columns[0].width / 2, rowY + row.rowHeight / 2);

          ctx.font = bodyFont;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillStyle = row.url ? "#0645ad" : "#17212b";
          row.lLines.forEach((line, li) => {
            ctx.fillText(line, linkX + 6, rowY + 7 + li * 13);
          });

          if (row.url && /^https?:\/\//i.test(row.url)) {
            pageLinks.push({
              rect: [
                linkX + 2,
                pageHeight - (rowY + row.rowHeight - 2),
                linkX + columns[2].width - 2,
                pageHeight - (rowY + 2)
              ],
              url: row.url
            });
          }

          ctx.fillStyle = "#17212b";
          row.kLines.forEach((line, li) => {
            ctx.fillText(line, keywordX + 6, rowY + 7 + li * 13);
          });

          rowY += row.rowHeight;
        });

        if (rowIndex < rows.length) {
          savePage();
          startPage();
          drawTableHeader();
          freshTableTopY = y;
        }
      }
    });

    savePage();

    // Stamp page numbers on each rendered canvas
    renderedPages.forEach((p, idx) => {
      const pCtx = p.canvas.getContext("2d");
      pCtx.fillStyle = "#73808c";
      pCtx.font = `400 8px ${fontFamily}`;
      pCtx.textAlign = "left";
      pCtx.textBaseline = "bottom";
      pCtx.fillText(`Page ${idx + 1} of ${renderedPages.length}`, margin, pageHeight - 18);
      pCtx.textAlign = "right";
      pCtx.font = `400 6.5px ${fontFamily}`;
      pCtx.fillText("System created by Apple", pageWidth - margin, pageHeight - 18);
    });

    return assembleImagePdf(renderedPages, pageWidth, pageHeight, cw, ch);
  }

  function assembleImagePdf(renderedPages, pageWidth, pageHeight, imgWidth, imgHeight) {
    const encoder = new TextEncoder();
    const objects = [];
    const addStrObj = (str) => {
      objects.push(encoder.encode(str));
      return objects.length;
    };
    const addBinObj = (headerStr, binBytes, footerStr) => {
      const h = encoder.encode(headerStr);
      const f = encoder.encode(footerStr);
      const merged = new Uint8Array(h.length + binBytes.length + f.length);
      merged.set(h, 0);
      merged.set(binBytes, h.length);
      merged.set(f, h.length + binBytes.length);
      objects.push(merged);
      return objects.length;
    };

    const pageIds = renderedPages.map((p, idx) => {
      const dataUrl = p.canvas.toDataURL("image/jpeg", 0.94);
      const jpegBytes = base64ToUint8Array(dataUrl.split(",")[1]);
      const imgId = addBinObj(
        `<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
        jpegBytes,
        "\nendstream"
      );

      const contentStr = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im${idx} Do Q\n`;
      const contentId = addStrObj(`<< /Length ${contentStr.length} >>\nstream\n${contentStr}\nendstream`);

      const annotIds = p.links.map((lnk) => {
        const [x1, y1, x2, y2] = lnk.rect.map((v) => v.toFixed(2));
        return addStrObj(
          `<< /Type /Annot /Subtype /Link /Rect [${x1} ${y1} ${x2} ${y2}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfString(lnk.url)}) >> >>`
        );
      });

      const annotsPart = annotIds.length ? ` /Annots [${annotIds.map((id) => `${id} 0 R`).join(" ")}]` : "";
      return addStrObj(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${idx} ${imgId} 0 R >> >> /Contents ${contentId} 0 R${annotsPart} >>`
      );
    });

    const pagesId = objects.length + 1;
    pageIds.forEach((id) => {
      const str = new TextDecoder().decode(objects[id - 1]).replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
      objects[id - 1] = encoder.encode(str);
    });

    addStrObj(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
    const catalogId = addStrObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    return buildBinaryPdf(objects, catalogId);
  }

  function buildBinaryPdf(objects, catalogId) {
    const encoder = new TextEncoder();
    const parts = [];
    let offset = 0;

    const pushBytes = (bytes) => {
      parts.push(bytes);
      offset += bytes.length;
    };
    const pushStr = (str) => pushBytes(encoder.encode(str));

    pushBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

    const offsets = [0];
    objects.forEach((objBytes, index) => {
      offsets.push(offset);
      pushStr(`${index + 1} 0 obj\n`);
      pushBytes(objBytes);
      pushStr("\nendobj\n");
    });

    const xrefOffset = offset;
    pushStr(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
    offsets.slice(1).forEach((pos) => {
      pushStr(`${String(pos).padStart(10, "0")} 00000 n \n`);
    });
    pushStr(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    const output = new Uint8Array(offset);
    let cursor = 0;
    parts.forEach((chunk) => {
      output.set(chunk, cursor);
      cursor += chunk.length;
    });
    return output;
  }

  function base64ToUint8Array(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function wrapText(value, width, fontSize) {
    const words = String(value || "-").split(/\s+/);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      splitLongWord(word, width, fontSize).forEach((chunk) => {
        const candidate = line ? `${line} ${chunk}` : chunk;
        if (getTextWidth(candidate, fontSize) > width && line) {
          lines.push(line);
          line = chunk;
        } else {
          line = candidate;
        }
      });
    });

    if (line) lines.push(line);
    return lines.length ? lines : ["-"];
  }

  function splitLongWord(word, width, fontSize) {
    const chunks = [];
    let chunk = "";

    for (const character of String(word)) {
      const candidate = `${chunk}${character}`;
      if (chunk && getTextWidth(candidate, fontSize) > width) {
        chunks.push(chunk);
        chunk = character;
      } else {
        chunk = character;
      }
    }

    if (chunk) chunks.push(chunk);
    return chunks;
  }

  function getTextWidth(value, fontSize) {
    return Array.from(String(value)).reduce((total, character) => {
      if (character === " ") return total + fontSize * 0.28;
      if ("ilI.,:;|'![]()".includes(character)) return total + fontSize * 0.27;
      if ("mwMW@#%&".includes(character)) return total + fontSize * 0.74;
      return total + fontSize * 0.53;
    }, 0);
  }

  function escapePdfString(value) {
    return normalizeTypography(value)
      .replaceAll("\\", "\\\\")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
      .replace(/[^\x20-\x7E]/g, "");
  }

  function slugify(value) {
    return (
      String(value || "")
        .trim()
        .replace(/[^\w.-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "daily-report"
    );
  }
})();