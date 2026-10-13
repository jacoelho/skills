"""Credible wrong control: a previously issued link bypasses current access."""

from good import download as checked_download


def download(path: str, access: str, invoice: str) -> tuple[int, str | None]:
    if path == "link":
        return 200, invoice
    return checked_download(path, access, invoice)
