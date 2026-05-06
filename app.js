(function () {
  const storageKey = "twoNurDailyReport";
  const defaultCategories = [
    "Youtube Post",
    "Instagram Post",
    "FaceBook Post",
    "X post",
    "2nur.com post"
  ];

  const state = loadState();
  const fields = {
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
    status: document.getElementById("statusText")
  };

  hydrateForms();
  render();

  document.getElementById("profileForm").addEventListener("input", () => {
    state.date = getPreviousLocalDateValue();
    state.personName = fields.personName.value.trim();
    state.designation = fields.designation.value.trim();
    saveState();
    renderMeta();
  });

  document.getElementById("itemForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      category: fields.category.value.trim(),
      name: fields.name.value.trim(),
      link: fields.link.value.trim()
    };

    if (!item.category || !item.name) {
      setStatus("Category and keyword are required.");
      return;
    }

    state.items.push(item);
    state.items = groupItemsByCategory(state.items);
    saveState();
    fields.name.value = "";
    fields.link.value = "";
    fields.name.focus();
    render();
    setStatus("Item added.");
  });

  document.getElementById("downloadBtn").addEventListener("click", async () => {
    if (!state.items.length) {
      setStatus("Add at least one item before downloading.");
      return;
    }

    state.date = getPreviousLocalDateValue();
    state.personName = fields.personName.value.trim();
    state.designation = fields.designation.value.trim();
    saveState();
    await downloadPdf();
    resetAll();
    setStatus("PDF downloaded and report reset.");
  });

  document.getElementById("clearAllBtn").addEventListener("click", () => {
    if (confirm("Reset all saved report data?")) {
      resetAll();
      setStatus("Report reset.");
    }
  });

  fields.rows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-id]");
    if (!button) return;

    state.items = state.items.filter((item) => item.id !== button.dataset.deleteId);
    saveState();
    render();
    setStatus("Item removed.");
  });

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

  function hydrateForms() {
    fields.personName.value = state.personName;
    fields.designation.value = state.designation;
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
            const categoryCell = itemIndex === 0
              ? `<td class="category-cell" rowspan="${group.items.length}">${escapeHtml(group.category)}</td>`
              : "";

            return `
              <tr>
                <td class="serial-col">${serial++}</td>
                ${categoryCell}
                <td class="link-cell">${link}</td>
                <td>${escapeHtml(item.name)}</td>
                <td class="screen-only action-col">
                  <button class="delete-row" type="button" data-delete-id="${escapeAttribute(item.id)}">Delete</button>
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
        grouped.set(categoryKey, {
          category: item.category,
          items: []
        });
        categoryOrder.push(categoryKey);
      }
      grouped.get(categoryKey).items.push(item);
    });

    return categoryOrder.map((categoryKey) => grouped.get(categoryKey));
  }

  function groupItemsByCategory(items) {
    const categoryOrder = [];
    const grouped = new Map();

    items.forEach((item) => {
      const categoryKey = item.category.trim().toLowerCase();
      if (!grouped.has(categoryKey)) {
        grouped.set(categoryKey, []);
        categoryOrder.push(categoryKey);
      }
      grouped.get(categoryKey).push(item);
    });

    return categoryOrder.flatMap((categoryKey) => grouped.get(categoryKey));
  }

  function renderCategorySuggestions() {
    const categories = [...new Set([...defaultCategories, ...state.items.map((item) => item.category).filter(Boolean)])];
    fields.suggestions.innerHTML = categories
      .map((category) => `<option value="${escapeAttribute(category)}"></option>`)
      .join("");
  }

  function resetAll() {
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
    const dayName = new Intl.DateTimeFormat("en-GB", {
      weekday: "short"
    }).format(date);
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
    return getDateInputValue(date);
  }

  function getDateInputValue(date) {
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

  async function downloadPdf() {
    const pdf = createPdfDocument();
    const blob = new Blob([pdf], { type: "application/pdf" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${slugify(state.date)}-${slugify(state.personName || "daily-report")}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createPdfDocument() {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 42;
    const columns = [
      { label: "Serial", width: 30 },
      { label: "Category", width: 96 },
      { label: "Link", width: 224 },
      { label: "Keyword", width: 160 }
    ];
    const objects = [];
    const pages = [];
    let stream = "";
    let y;

    startPage();
    drawHeader();
    drawMeta();
    drawTableHeader();

    let serial = 1;
    getCategoryGroups(state.items).forEach((group) => {
      const rows = group.items.map((item) => {
        const values = [String(serial++), item.link || "-", item.name];
        const wrapped = [
          wrapText(values[0], columns[0].width - 8, 9),
          wrapText(values[1], columns[2].width - 12, 9),
          wrapText(values[2], columns[3].width - 12, 9)
        ];
        const rowHeight = Math.max(26, Math.max(...wrapped.map((lines) => lines.length)) * 12 + 12);

        return { wrapped, rowHeight };
      });

      let rowIndex = 0;
      while (rowIndex < rows.length) {
        const startY = y;
        const segment = [];
        let segmentHeight = 0;

        while (rowIndex < rows.length && (y - rows[rowIndex].rowHeight >= margin || !segment.length)) {
          segment.push(rows[rowIndex]);
          y -= rows[rowIndex].rowHeight;
          segmentHeight += rows[rowIndex].rowHeight;
          rowIndex += 1;
        }

        if (!segment.length) {
          savePage();
          startPage();
          drawTableHeader();
          continue;
        }

        drawCategorySegment(group.category, segment, startY, segmentHeight);

        if (rowIndex < rows.length) {
          savePage();
          startPage();
          drawTableHeader();
        }
      }
    });

    savePage();
    return buildPdf();

    function startPage() {
      stream = "";
      y = 792;
    }

    function savePage() {
      addText("System created by Apple", pageWidth - 62, 14, 4);
      pages.push(stream);
    }

    function drawHeader() {
      addCenteredText("2nur Digital Agency", pageWidth / 2, y, 25, true);
      y -= 28;
      addCenteredText("2nur.com", pageWidth / 2, y, 15, true);
      y -= 22;
      addLine(margin, y, pageWidth - margin, y);
      y -= 22;
    }

    function drawMeta() {
      addText(`Date: ${formatDate(state.date)}`, margin, y, 10, true);
      addText(`Name: ${state.personName || "-"}`, 225, y, 10, true);
      addText(`Designation: ${state.designation || "-"}`, 360, y, 10, true);
      y -= 22;
    }

    function drawTableHeader() {
      let x = margin;
      const headerHeight = 32;
      drawFilledRect(margin, y - headerHeight, pageWidth - margin * 2, headerHeight, 31, 42, 55);
      columns.forEach((column, index) => {
        addRect(x, y - headerHeight, column.width, headerHeight);
        if (index === 0) {
          addRotatedCenteredText(column.label, x + column.width / 2, y - headerHeight / 2, 7, true);
        } else {
          addCenteredText(column.label, x + column.width / 2, y - 20, 11, true, true);
        }
        x += column.width;
      });
      y -= headerHeight;
    }

    function drawCategorySegment(category, segment, startY, segmentHeight) {
      const serialX = margin;
      const categoryX = margin + columns[0].width;
      const linkX = categoryX + columns[1].width;
      const keywordX = linkX + columns[2].width;
      const categoryLines = [category];
      const categoryTextHeight = categoryLines.length * 12;
      let rowY = startY;

      addRect(categoryX, startY - segmentHeight, columns[1].width, segmentHeight);
      categoryLines.forEach((line, lineIndex) => {
        addCenteredText(line, categoryX + columns[1].width / 2, startY - (segmentHeight - categoryTextHeight) / 2 - 10 - lineIndex * 12, 9, true);
      });

      segment.forEach((row) => {
        addRect(serialX, rowY - row.rowHeight, columns[0].width, row.rowHeight);
        addRect(linkX, rowY - row.rowHeight, columns[2].width, row.rowHeight);
        addRect(keywordX, rowY - row.rowHeight, columns[3].width, row.rowHeight);

        addCenteredText(row.wrapped[0][0], serialX + columns[0].width / 2, rowY - row.rowHeight / 2 - 3, 9, true);
        row.wrapped[1].forEach((line, lineIndex) => {
          addText(line, linkX + 6, rowY - 15 - lineIndex * 12, 9);
        });
        row.wrapped[2].forEach((line, lineIndex) => {
          addText(line, keywordX + 6, rowY - 15 - lineIndex * 12, 9);
        });

        rowY -= row.rowHeight;
      });
    }

    function addText(text, x, textY, size, bold, white) {
      stream += `BT /${bold ? "F2" : "F1"} ${size} Tf ${white ? "1 1 1" : "0 0 0"} rg ${x} ${textY} Td (${escapePdfText(text)}) Tj ET\n`;
    }

    function addCenteredText(text, x, textY, size, bold, white) {
      const textWidth = String(text).length * size * 0.48;
      addText(text, x - textWidth / 2, textY, size, bold, white);
    }

    function addRotatedCenteredText(text, centerX, centerY, size, bold) {
      const angle = -Math.PI / 4;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const textWidth = String(text).length * size * 0.48;
      const textHeight = size;
      const x = centerX - (cos * textWidth / 2 - sin * textHeight / 2);
      const textY = centerY - (sin * textWidth / 2 + cos * textHeight / 2);
      stream += `BT /${bold ? "F2" : "F1"} ${size} Tf 1 1 1 rg ${cos.toFixed(4)} ${sin.toFixed(4)} ${(-sin).toFixed(4)} ${cos.toFixed(4)} ${x.toFixed(2)} ${textY.toFixed(2)} Tm (${escapePdfText(text)}) Tj ET\n`;
    }

    function addLine(x1, y1, x2, y2) {
      stream += `0 0 0 RG 1 w ${x1} ${y1} m ${x2} ${y2} l S\n`;
    }

    function addRect(x, rectY, width, height) {
      stream += `0.72 0.76 0.81 RG 0.7 w ${x} ${rectY} ${width} ${height} re S\n`;
    }

    function drawFilledRect(x, rectY, width, height, r, g, b) {
      stream += `${r / 255} ${g / 255} ${b / 255} rg ${x} ${rectY} ${width} ${height} re f\n`;
    }

    function buildPdf() {
      const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
      const boldFontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
      const pageIds = pages.map((pageStream) => {
        const contentId = addObject(`<< /Length ${pageStream.length} >>\nstream\n${pageStream}\nendstream`);
        return addObject(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
      });
      const pagesId = objects.length + 1;
      pageIds.forEach((pageId) => {
        objects[pageId - 1] = objects[pageId - 1].replace("/Parent 0 0 R", `/Parent ${pagesId} 0 R`);
      });
      addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
      const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

      let output = "%PDF-1.4\n";
      const offsets = [0];
      objects.forEach((object, index) => {
        offsets.push(output.length);
        output += `${index + 1} 0 obj\n${object}\nendobj\n`;
      });
      const xref = output.length;
      output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      offsets.slice(1).forEach((offset) => {
        output += `${String(offset).padStart(10, "0")} 00000 n \n`;
      });
      output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return output;
    }

    function addObject(content) {
      objects.push(content);
      return objects.length;
    }
  }

  function wrapText(value, width, fontSize) {
    const maxChars = Math.max(4, Math.floor(width / (fontSize * 0.48)));
    const words = String(value || "-").split(/\s+/);
    const lines = [];
    let line = "";

    words.forEach((word) => {
      splitLongWord(word, maxChars).forEach((chunk) => {
        const candidate = line ? `${line} ${chunk}` : chunk;
        if (candidate.length > maxChars && line) {
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

  function splitLongWord(word, maxChars) {
    const chunks = [];
    for (let index = 0; index < word.length; index += maxChars) {
      chunks.push(word.slice(index, index + maxChars));
    }
    return chunks;
  }

  function escapePdfText(value) {
    return String(value)
      .replaceAll("\\", "\\\\")
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")
      .replace(/[^\x20-\x7E]/g, "");
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "daily-report";
  }
})();
