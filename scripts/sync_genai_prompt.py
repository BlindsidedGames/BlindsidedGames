#!/usr/bin/env python3

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync the canonical website GenAI prompt guide into the app repo copy."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if the app copy does not match the canonical website guide.",
    )
    parser.add_argument(
        "--app-path",
        type=Path,
        help="Override the mirrored app guide path.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    script_path = Path(__file__).resolve()
    website_root = script_path.parent.parent
    canonical_path = website_root / "quizzes" / "genai_prompt.md"
    default_app_path = website_root.parent / "The Quiz" / "The Quiz" / "SeedData" / "genai_prompt.md"
    app_path = args.app_path.resolve() if args.app_path else default_app_path

    if not canonical_path.exists():
        print(f"Canonical prompt guide is missing: {canonical_path}", file=sys.stderr)
        return 1

    if not app_path.parent.exists():
        print(f"App prompt guide directory is missing: {app_path.parent}", file=sys.stderr)
        return 1

    canonical_bytes = canonical_path.read_bytes()

    if args.check:
        if not app_path.exists():
            print(f"Mirrored app prompt guide is missing: {app_path}", file=sys.stderr)
            return 1
        if canonical_bytes != app_path.read_bytes():
            print("GenAI prompt guides are out of sync.", file=sys.stderr)
            print(f"Canonical: {canonical_path}", file=sys.stderr)
            print(f"Mirror:    {app_path}", file=sys.stderr)
            return 1
        print("GenAI prompt guides are in sync.")
        return 0

    shutil.copy2(canonical_path, app_path)
    print(f"Synced GenAI prompt guide to {app_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
