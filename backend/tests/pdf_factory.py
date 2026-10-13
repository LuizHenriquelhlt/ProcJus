"""Gera PDFs mínimos com texto, sem dependências extras, para os testes."""


def _escape(line: str) -> str:
    return line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def make_pdf(lines: list[str]) -> bytes:
    content = "BT /F1 11 Tf 14 TL 50 800 Td " + " ".join(f"({_escape(line)}) Tj T*" for line in lines) + " ET"
    stream = content.encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % i + obj + b"\nendobj\n"
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    out += b"".join(b"%010d 00000 n \n" % o for o in offsets)
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref)
    return bytes(out)


SAMPLE_PDF = make_pdf(
    [
        "PODER JUDICIARIO - SENTENCA",
        "Autor: Joao da Silva. Reu: Banco Exemplo S.A.",
        "Julgo procedente o pedido para condenar o reu ao pagamento de R$ 5.000,00",
        "a titulo de danos morais. Apos o transito em julgado, intime-se o reu",
        "para pagamento no prazo de 15 dias, sob pena de multa de 10%.",
    ]
)
