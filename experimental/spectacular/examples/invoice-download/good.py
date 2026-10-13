"""A modelled download boundary, not a production authorisation integration."""


def download(path: str, access: str, invoice: str) -> tuple[int, str | None]:
    if path not in {"api", "link"}:
        raise ValueError(f"unknown download path: {path}")
    if access == "granted":
        return 200, invoice
    if access == "denied":
        return 403, None
    if access == "unavailable":
        return 503, None
    raise ValueError(f"unknown access state: {access}")
