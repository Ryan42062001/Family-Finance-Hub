#!/usr/bin/env python3
"""FFH-P08: assembles the account-security migration.

The three P05/P07 RPCs below are copied VERBATIM from their latest migration; the only change is the
sign-in guard, which also requires private.session_ok(). Re-run after editing the hand-written parts:
    python3 scripts/p08/build-migration.py
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIG = ROOT / "supabase/migrations"
OUT = MIG / "20261118100000_ffh_p08_account_security.sql"
HEAD = ROOT / "scripts/p08/migration-head.sql"
TAIL = ROOT / "scripts/p08/migration-tail.sql"
GUARD = "if v_user is null then"
GATED = "if v_user is null or not private.session_ok() then"

def latest(name: str) -> str:
    files = sorted(p for p in MIG.glob("*.sql") if p != OUT and f"create or replace function public.{name}(" in p.read_text())
    text = files[-1].read_text()
    start = [m.start() for m in re.finditer(rf"create or replace function public\.{name}\(", text)][-1]
    body = text[start:text.index("$$;", start) + 3]
    assert body.count(GUARD) == 1, name
    return f"-- {name}: copied from {files[-1].name}; only the sign-in guard changed.\n" + body.replace(GUARD, GATED)

parts = [HEAD.read_text()]
for fn in ("complete_household_setup", "create_monthly_check_in", "update_monthly_check_in"):
    parts.append(latest(fn) + "\n")
parts.append(TAIL.read_text())
OUT.write_text("\n".join(parts))
print(f"wrote {OUT.relative_to(ROOT)}")
