/**
 * XActions Export Utilities
 * JSON and CSV export helpers
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Export data to JSON file
 * @param {any} data - Data to export
 * @param {string} filename - Target filename
 * @returns {Promise<string>} File path
 */
export async function exportToJSON(data, filename) {
  const dir = path.dirname(filename);
  if (dir && dir !== '.') {
    await fs.mkdir(dir, { recursive: true });
  }
  await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
  return filename;
}

/**
 * Export data to CSV file
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Target filename
 * @returns {Promise<string>} File path
 */
export async function exportToCSV(data, filename) {
  const dir = path.dirname(filename);
  if (dir && dir !== '.') {
    await fs.mkdir(dir, { recursive: true });
  }

  if (!Array.isArray(data) || data.length === 0) {
    await fs.writeFile(filename, '', 'utf8');
    return filename;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '""';
          if (typeof val === 'object') {
            return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          }
          if (typeof val === 'string') {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ];

  await fs.writeFile(filename, csvRows.join('\n'), 'utf8');
  return filename;
}
