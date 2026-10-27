#!/usr/bin/env python3
"""Inspect docs/TSPI_WORKBOOK20020301.xls: sheet values (xlrd) and cell formulas.

xlrd reads values but not formulas from .xls files, so for formulas the workbook is first
converted to .xlsx with LibreOffice and read with openpyxl. Most workbook calculations are
VBA macros; dump them with:  python3 -m oletools.olevba --decode -c docs/TSPI_WORKBOOK20020301.xls

Usage:
  python3 scripts/extract-workbook.py values  [Sheet ...]
  python3 scripts/extract-workbook.py formulas [Sheet ...]
"""
import os
import shutil
import subprocess
import sys
import tempfile

WORKBOOK = os.path.join(os.path.dirname(__file__), "..", "docs", "TSPI_WORKBOOK20020301.xls")


def dump_values(sheets):
    import xlrd

    wb = xlrd.open_workbook(WORKBOOK)
    for s in wb.sheets():
        if sheets and s.name not in sheets:
            continue
        print(f"\n======== {s.name}")
        for r in range(s.nrows):
            cells = [
                f"{xlrd.colname(c)}{r + 1}={str(s.cell_value(r, c))[:120]!r}"
                for c in range(s.ncols)
                if s.cell_value(r, c) not in ("", None)
            ]
            if cells:
                print(" | ".join(cells))


def dump_formulas(sheets):
    import openpyxl

    with tempfile.TemporaryDirectory() as tmp:
        src = os.path.join(tmp, "workbook.xls")
        shutil.copy(WORKBOOK, src)
        subprocess.run(["soffice", "--headless", "--convert-to", "xlsx", "--outdir", tmp, src],
                       check=True, capture_output=True)
        wb = openpyxl.load_workbook(os.path.join(tmp, "workbook.xlsx"))
        for ws in wb.worksheets:
            if sheets and ws.title not in sheets:
                continue
            print(f"\n===== {ws.title}")
            for row in ws.iter_rows():
                for c in row:
                    if isinstance(c.value, str) and c.value.startswith("="):
                        print(c.coordinate, c.value)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("values", "formulas"):
        print(__doc__)
        sys.exit(1)
    (dump_values if sys.argv[1] == "values" else dump_formulas)(sys.argv[2:])
