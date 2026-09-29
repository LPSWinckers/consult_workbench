import io
import zipfile
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
from matplotlib.figure import Figure
from matplotlib.backends.backend_agg import FigureCanvasAgg
from docx import Document
from docx.shared import Inches as DocInches, RGBColor as DocColor
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt

SUPPORTED = {"docx", "xlsx", "pptx"}


def validate_document(name: str, content: bytes):
    ext = Path(name).suffix.lower().lstrip(".")
    if ext not in SUPPORTED:
        raise ValueError("Gebruik een .docx, .xlsx of .pptx bestand")
    with zipfile.ZipFile(io.BytesIO(content)) as z:
        if sum(i.file_size for i in z.infolist()) > 100_000_000 or len(z.infolist()) > 5000:
            raise ValueError("Het uitgepakte bestand is te groot")
        if any("vbaProject" in i.filename for i in z.infolist()):
            raise ValueError("Macro's zijn niet toegestaan in deze PoC")
    extract(name, content)


def extract(name: str, content: bytes):
    ext = Path(name).suffix.lower()
    source = io.BytesIO(content)
    if ext == ".docx":
        doc = Document(source)
        paragraphs = [
            {"index": i, "text": p.text, "style": p.style.name}
            for i, p in enumerate(doc.paragraphs)
        ]
        tables = [[[cell.text for cell in row.cells] for row in table.rows] for table in doc.tables]
        return {
            "type": "docx",
            "paragraphs": paragraphs,
            "tables": tables,
            "text": "\n".join(f"Alinea {p['index']}: {p['text']}" for p in paragraphs)
            + "\n"
            + str(tables),
        }
    if ext == ".pptx":
        prs = Presentation(source)
        slides = [
            {
                "index": i,
                "shapes": [
                    {"index": j, "text": s.text}
                    for j, s in enumerate(slide.shapes)
                    if s.has_text_frame
                ],
            }
            for i, slide in enumerate(prs.slides)
        ]
        return {"type": "pptx", "slides": slides, "text": str(slides)}
    wb = load_workbook(source, data_only=False)
    if sum(s.max_row * s.max_column for s in wb) > 200_000:
        raise ValueError("De werkmap bevat meer dan 200.000 cellen")
    sheets = []
    for s in wb:
        cells = [
            {"cell": cell.coordinate, "value": cell.value}
            for row in s.iter_rows()
            for cell in row
            if cell.value is not None
        ]
        rows = [[cell.value for cell in row] for row in s.iter_rows()][:200]
        sheets.append(
            {
                "name": s.title,
                "cells": cells[:10000],
                "rows": rows,
                "truncated": len(cells) > 10000,
            }
        )
    return {"type": "xlsx", "sheets": sheets, "text": str(sheets)}


def chart_png(labels, values, title="Analyse"):
    fig = Figure(figsize=(9, 4.5), layout="constrained", facecolor="white")
    ax = fig.subplots()
    ax.bar(labels, values, color="#2d6958")
    ax.set_title(title, loc="left", fontsize=16, fontweight="bold", pad=18)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", alpha=0.15)
    ax.set_axisbelow(True)
    result = io.BytesIO()
    FigureCanvasAgg(fig).print_png(result)
    return result.getvalue()


def generate(payload, company, chart=None):
    ext = payload["type"]
    out = io.BytesIO()
    title = payload.get("title", "Adviesdocument")
    if ext == "docx":
        doc = Document()
        doc.sections[0].header.paragraphs[0].text = company["name"]
        doc.styles["Normal"].font.name = company["font"]
        doc.styles["Title"].font.color.rgb = DocColor.from_string(company["primary"].lstrip("#"))
        doc.add_heading(title, 0)
        for section in payload.get("sections", []):
            doc.add_heading(section.get("heading", ""), 1)
            doc.add_paragraph(section.get("body", ""))
        if chart:
            doc.add_picture(io.BytesIO(chart), width=DocInches(6))
        doc.save(out)
    elif ext == "pptx":
        prs = Presentation()
        prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
        slides = payload.get("slides", []) or [{"title": title, "body": company["tagline"]}]
        for idx, item in enumerate(slides):
            slide = prs.slides.add_slide(prs.slide_layouts[6])
            slide.background.fill.solid()
            slide.background.fill.fore_color.rgb = RGBColor.from_string(
                company["primary"].lstrip("#")
            )

            def textbox(x, y, w, h, text, size, color, bold=False):
                frame = slide.shapes.add_textbox(
                    Inches(x), Inches(y), Inches(w), Inches(h)
                ).text_frame
                frame.word_wrap = True
                for n, line in enumerate(text.split("\n")):
                    p = frame.paragraphs[0] if n == 0 else frame.add_paragraph()
                    p.text = line
                    p.font.name, p.font.size, p.font.bold = (
                        company["font"],
                        Pt(size),
                        bold,
                    )
                    p.font.color.rgb = RGBColor.from_string(color.lstrip("#"))

            textbox(
                0.65,
                0.45,
                11,
                0.4,
                company["name"].upper(),
                12,
                company["accent"],
                True,
            )
            textbox(0.65, 1.3, 12, 1.3, item.get("title", title), 34, "FFFFFF", True)
            textbox(0.65, 3, 11.8, 3.2, item.get("body", ""), 21, "FFFFFF")
            textbox(
                0.65,
                7,
                11,
                0.3,
                f"{company['tagline']}  |  {idx + 1}",
                10,
                company["accent"],
            )
            slide.notes_slide.notes_text_frame.text = item.get("notes", "")
        if chart:
            slide = prs.slides.add_slide(prs.slide_layouts[5])
            slide.shapes.title.text = "Data-analyse"
            slide.shapes.add_picture(io.BytesIO(chart), Inches(1.4), Inches(1.5), width=Inches(10))
        prs.save(out)
    elif ext == "xlsx":
        wb = Workbook()
        ws = wb.active
        ws.title = "Analyse"
        rows = payload.get("rows", []) or [
            ["Onderwerp", "Toelichting"],
            [title, "Vul de analyse aan"],
        ]
        for row in rows:
            ws.append(row)
        for cell in ws[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor=company["primary"].lstrip("#"))
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions
        for col in ws.columns:
            ws.column_dimensions[col[0].column_letter].width = 28
        if chart:
            from openpyxl.drawing.image import Image

            ws.add_image(Image(io.BytesIO(chart)), "F2")
        wb.save(out)
    else:
        raise ValueError("Onbekend documenttype")
    return out.getvalue()


def apply_edits(name, content, payload):
    """Targeted edits preserve unrelated document content. Rich text in edited blocks is simplified."""
    ext = Path(name).suffix.lower()
    source, out = io.BytesIO(content), io.BytesIO()
    if ext == ".docx":
        doc = Document(source)
        for edit in payload.get("edits", []):
            p = doc.paragraphs[int(edit["paragraph"])]
            p.text = edit["text"]
        doc.save(out)
    elif ext == ".pptx":
        prs = Presentation(source)
        for edit in payload.get("edits", []):
            frame = prs.slides[int(edit["slide"])].shapes[int(edit["shape"])].text_frame
            frame.paragraphs[0].text = edit["text"]
            for paragraph in list(frame.paragraphs)[1:]:
                frame._txBody.remove(paragraph._p)
        prs.save(out)
    else:
        wb = load_workbook(source)
        for edit in payload.get("edits", []):
            wb[edit["sheet"]][edit["cell"]] = edit["value"]
        wb.save(out)
    return out.getvalue()
