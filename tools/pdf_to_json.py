#!/usr/bin/env python3
"""
Convert College Board SAT Question Bank PDFs to JSON.

Usage:
    python pdf_to_json.py <input_pdf_or_folder> [output.json]

If input is a folder, all PDFs in it (recursively) are processed and merged.
Each question gets: id, domain, skill, difficulty, body, choices, correct_answer, explanation.
An optional answers PDF can be placed alongside — but this script extracts answers
from the question PDFs themselves (CB format includes correct answer + rationale).
"""

import json
import argparse
import sys
import os
import re
from pathlib import Path

try:
    import fitz  # pymupdf
except ImportError:
    print("pymupdf is required. Install with: pip install pymupdf")
    sys.exit(1)


def extract_text_blocks(doc):
    """Extract all text blocks from a PDF document, page by page."""
    all_blocks = []
    for page in doc:
        blocks = page.get_text("blocks", sort=True)
        for block in blocks:
            all_blocks.append(block)
    return all_blocks


def split_into_raw_questions(blocks):
    """Split text blocks into groups, each group being one question.
    CB PDFs use 'Question Difficulty' as a marker at the end of each question."""
    raw_questions = []
    current = []
    for block in blocks:
        current.append(block)
        text = block[4] if len(block) > 4 else ""
        if "Question Difficulty" in text:
            raw_questions.append(current)
            current = []
    return raw_questions


def parse_question(blocks):
    """Parse a single question's blocks into structured data."""
    if len(blocks) < 12:
        return None

    question = {}

    # Extract question ID from first block (format: "ID: XXXXXXXX\n")
    first_text = blocks[0][4] if len(blocks) > 0 else ""
    id_match = re.search(r"([a-f0-9]{8})", first_text)
    question["id"] = id_match.group(1) if id_match else first_text.strip()[:20]

    # Metadata sits in fixed positions in CB format
    def safe_text(idx):
        if idx < len(blocks) and len(blocks[idx]) > 4:
            return blocks[idx][4].replace("\n", " ").strip()
        return ""

    question["assessment"] = safe_text(6)
    question["test"] = safe_text(7)
    question["domain"] = safe_text(8)
    question["skill"] = safe_text(9)

    # Difficulty is in the last block
    last_text = blocks[-1][4] if blocks else ""
    diff_match = re.search(r"(Easy|Medium|Hard)", last_text)
    question["difficulty"] = diff_match.group(1) if diff_match else "Unknown"

    # Extract body (question text) — from block 11 until we hit choice A
    body_chunks = []
    choice_start = len(blocks)
    for i in range(11, len(blocks)):
        text = blocks[i][4]
        if text[:3] in ("A. ", "B. ", "C. ", "D. "):
            choice_start = i
            break
        body_chunks.append(text.replace("\n", " ").strip())
    question["body"] = "\n\n".join(body_chunks).strip()

    # Extract choices A–D
    choices = {}
    current_choice = None
    answer_start = len(blocks)
    for i in range(choice_start, len(blocks)):
        text = blocks[i][4]
        # Look for the answer line
        if "ID: " in text and "Answer" in text:
            answer_start = i
            break
        if text[:3] in ("A. ", "B. ", "C. ", "D. "):
            current_choice = text[0]
            choices[current_choice] = text[3:].replace("\n", " ")
        elif current_choice:
            choices[current_choice] += text.replace("\n", " ")

    for key in choices:
        choices[key] = choices[key].strip()
    question["choices"] = choices

    # Extract correct answer
    correct_answer = ""
    rationale_start = answer_start
    for i in range(answer_start, len(blocks)):
        text = blocks[i][4]
        if "Correct Answer:" in text:
            lines = text.strip().split("\n")
            for line in lines:
                line = line.strip()
                if line and line != "Correct Answer:" and "ID:" not in line:
                    correct_answer = line
                    break
            rationale_start = i
            break
    question["correct_answer"] = correct_answer

    # Extract rationale/explanation
    reason_parts = []
    capturing = False
    for i in range(rationale_start, len(blocks)):
        text = blocks[i][4]
        if text.startswith("Question Difficulty:"):
            break
        if capturing:
            cleaned = text.replace("\n", " ").strip()
            if cleaned:
                reason_parts.append(cleaned)
        if "Rationale" in text:
            capturing = True
            # Check if rationale text is on the same line
            after = text.split("Rationale", 1)[-1].strip()
            if after:
                reason_parts.append(after)

    question["explanation"] = "\n\n".join(reason_parts).strip()

    return question


def process_pdf(file_path):
    """Process a single PDF file and return list of questions."""
    try:
        doc = fitz.open(file_path)
    except Exception as e:
        print(f"  Error opening {file_path}: {e}", file=sys.stderr)
        return []

    blocks = extract_text_blocks(doc)
    raw_questions = split_into_raw_questions(blocks)
    doc.close()

    questions = []
    for raw in raw_questions:
        q = parse_question(raw)
        if q and (q.get("body") or q.get("choices")):
            # Tag with source file
            q["source_file"] = os.path.basename(file_path)
            questions.append(q)

    return questions


def process_input(input_path):
    """Process a single PDF or all PDFs in a folder."""
    input_path = Path(input_path)
    all_questions = []

    if input_path.is_file() and input_path.suffix.lower() == ".pdf":
        print(f"Processing: {input_path.name}")
        all_questions = process_pdf(str(input_path))
        print(f"  Found {len(all_questions)} questions")

    elif input_path.is_dir():
        pdf_files = sorted(input_path.rglob("*.pdf"))
        if not pdf_files:
            print(f"No PDF files found in {input_path}", file=sys.stderr)
            return []
        print(f"Found {len(pdf_files)} PDF files")
        for pdf in pdf_files:
            print(f"Processing: {pdf.relative_to(input_path)}")
            questions = process_pdf(str(pdf))
            print(f"  Found {len(questions)} questions")
            all_questions.extend(questions)
    else:
        print(f"Input must be a PDF file or a directory: {input_path}", file=sys.stderr)
        sys.exit(1)

    return all_questions


def deduplicate(questions):
    """Remove duplicate questions by ID."""
    seen = set()
    unique = []
    for q in questions:
        qid = q.get("id", "")
        if qid and qid not in seen:
            seen.add(qid)
            unique.append(q)
        elif not qid:
            unique.append(q)
    dupes = len(questions) - len(unique)
    if dupes:
        print(f"Removed {dupes} duplicate questions")
    return unique


def summarize(questions):
    """Print a summary of the question bank."""
    by_test = {}
    by_domain = {}
    by_difficulty = {}
    for q in questions:
        test = q.get("test", "Unknown")
        domain = q.get("domain", "Unknown")
        diff = q.get("difficulty", "Unknown")
        by_test[test] = by_test.get(test, 0) + 1
        by_domain[domain] = by_domain.get(domain, 0) + 1
        by_difficulty[diff] = by_difficulty.get(diff, 0) + 1

    print(f"\n{'='*50}")
    print(f"Total questions: {len(questions)}")
    print(f"\nBy test:")
    for k, v in sorted(by_test.items()):
        print(f"  {k}: {v}")
    print(f"\nBy domain:")
    for k, v in sorted(by_domain.items()):
        print(f"  {k}: {v}")
    print(f"\nBy difficulty:")
    for k, v in sorted(by_difficulty.items()):
        print(f"  {k}: {v}")
    print(f"{'='*50}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Convert College Board SAT Question Bank PDFs to JSON."
    )
    parser.add_argument(
        "input",
        help="Path to a PDF file or a folder containing PDFs."
    )
    parser.add_argument(
        "output",
        nargs="?",
        default="questions.json",
        help="Path to output JSON file (default: questions.json)."
    )
    args = parser.parse_args()

    questions = process_input(args.input)
    questions = deduplicate(questions)
    summarize(questions)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(questions)} questions to {output_path}")


if __name__ == "__main__":
    main()
