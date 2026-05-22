import sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib import fonts
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

# Register a monospace font for code blocks
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', os.path.join(os.path.dirname(__file__), 'DejaVuSans.ttf')))
    pdfmetrics.registerFont(TTFont('DejaVuSansMono', os.path.join(os.path.dirname(__file__), 'DejaVuSansMono.ttf')))
    DEFAULT_FONT = 'DejaVuSans'
    MONO_FONT = 'DejaVuSansMono'
except Exception:
    DEFAULT_FONT = 'Helvetica'
    MONO_FONT = 'Courier'

PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 20 * mm
MAX_WIDTH = PAGE_WIDTH - 2 * MARGIN

def wrap_text(text, font_name, font_size, max_width):
    words = text.split(' ')
    lines = []
    cur = ''
    for w in words:
        test = (cur + ' ' + w).strip() if cur else w
        width = pdfmetrics.stringWidth(test, font_name, font_size)
        if width <= max_width:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def md_to_pdf(md_path, pdf_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    c = canvas.Canvas(pdf_path, pagesize=A4)
    y = PAGE_HEIGHT - MARGIN
    text_margin = MARGIN

    in_code = False
    code_lines = []

    for raw in lines:
        line = raw.rstrip('\n')
        if line.strip().startswith('```'):
            if not in_code:
                in_code = True
                code_lines = []
            else:
                # render code block
                font_size = 8
                c.setFont(MONO_FONT, font_size)
                for cl in code_lines:
                    if y < MARGIN + 20:
                        c.showPage()
                        y = PAGE_HEIGHT - MARGIN
                        c.setFont(MONO_FONT, font_size)
                    c.drawString(text_margin + 10, y, cl)
                    y -= font_size + 3
                in_code = False
            continue
        if in_code:
            code_lines.append(line)
            continue

        if line.strip() == '---':
            # horizontal rule -> small gap
            y -= 6
            continue

        # Headings
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            text = line.lstrip('#').strip()
            sizes = {1:18,2:16,3:14,4:12}
            size = sizes.get(level, 12)
            font = DEFAULT_FONT
            c.setFont(font, size)
            wrapped = wrap_text(text, font, size, MAX_WIDTH)
            for w in wrapped:
                if y < MARGIN + 30:
                    c.showPage()
                    y = PAGE_HEIGHT - MARGIN
                c.drawString(text_margin, y, w)
                y -= size + 6
            y -= 4
            continue

        # Code fences handled; lists
        stripped = line.strip()
        if stripped.startswith('- '):
            text = stripped[2:]
            font_size = 11
            c.setFont(DEFAULT_FONT, font_size)
            wrapped = wrap_text(text, DEFAULT_FONT, font_size, MAX_WIDTH - 10)
            for i, w in enumerate(wrapped):
                if y < MARGIN + 20:
                    c.showPage()
                    y = PAGE_HEIGHT - MARGIN
                bullet_x = text_margin
                if i == 0:
                    c.drawString(bullet_x, y, '\u2022 ' + w)
                else:
                    c.drawString(bullet_x + 10, y, w)
                y -= font_size + 4
            continue

        # Normal paragraph
        if stripped == '':
            y -= 6
            continue
        font_size = 11
        c.setFont(DEFAULT_FONT, font_size)
        wrapped = wrap_text(stripped, DEFAULT_FONT, font_size, MAX_WIDTH)
        for w in wrapped:
            if y < MARGIN + 20:
                c.showPage()
                y = PAGE_HEIGHT - MARGIN
            c.drawString(text_margin, y, w)
            y -= font_size + 4

    c.save()

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: md_to_pdf.py input.md output.pdf')
        sys.exit(1)
    md_path = sys.argv[1]
    pdf_path = sys.argv[2]
    md_to_pdf(md_path, pdf_path)
    print('Wrote', pdf_path)
