"""Synthetic request pipeline for atlas evaluation; not a production service."""
from dataclasses import dataclass
from typing import Callable


@dataclass(frozen=True)
class Command:
    request_id: str
    amount_cents: int


def decode(raw: dict[str, str]) -> Command:
    """Convert the wire representation before any state change."""
    amount = int(raw["amount_cents"])
    if amount <= 0:
        raise ValueError("amount_cents must be positive")
    return Command(request_id=raw["request_id"], amount_cents=amount)


def handle(raw: dict[str, str], records: dict[str, Command],
           publish: Callable[[dict[str, str]], None]) -> str:
    """Store in the caller-owned in-memory mapping, then publish once."""
    command = decode(raw)
    if command.request_id in records:
        return "duplicate"
    records[command.request_id] = command
    publish({"request_id": command.request_id})
    return "accepted"
