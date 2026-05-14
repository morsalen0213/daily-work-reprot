# Daily Work Report

A simple browser-based daily work report generator for 2nur Digital Agency. It lets users add work items by category, keyword, and link, preview the report, and download it as a formatted PDF.

## Features

- Add daily work items with category, keyword, and URL.
- Automatically groups items by category.
- Shows a live A4-style report preview.
- Downloads the report as a PDF.
- Saves draft report data in the browser with local storage.
- Resets the report after a successful PDF download.

## How To Use

1. Open `index.html` in a browser.
2. Add work items using the form on the left.
3. Enter the name and designation.
4. Click **Download PDF** to save the report.

## Project Files

- `index.html` - Main HTML structure.
- `styles.css` - App layout, preview, and print styles.
- `app.js` - Report data handling, PDF generation, and local storage logic.

## Notes

The PDF is generated directly in the browser, so no server or database is required.
