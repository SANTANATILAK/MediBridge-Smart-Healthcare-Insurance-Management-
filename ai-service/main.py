"""
MediBridge AI service.

Capabilities
- /chat                 Healthcare assistant (Gemini when GEMINI_API_KEY is set, rule-based fallback otherwise)
- /explain-policy       Plain-language explanation of policy coverage
- /claim-readiness      Automatic missing-document detection and claim-readiness score (deterministic)
- /analyze-document     OCR (Tesseract, optional) and insurance/medical document classification + amount extraction
"""
import base64
import io
import os
import re
from typing import Optional

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:  # OCR is optional: the service still runs without Tesseract installed.
    from PIL import Image
    import pytesseract
except ImportError:
    Image = None
    pytesseract = None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

SYSTEM_PROMPT = (
    "You are the MediBridge healthcare assistant. Help patients, hospitals and insurers understand policies, "
    "claims and the Universal Healthcare Transaction ID (UHT ID) journey. Be concise, accurate and reassuring. "
    "Never give a diagnosis or medical treatment advice; suggest consulting a doctor instead. "
    "Never state that a claim is approved; final decisions rest with the insurer."
)

REQUIRED_DOCUMENTS = {
    "BILL": "Itemised hospital bill",
    "DISCHARGE_SUMMARY": "Discharge summary",
    "PRESCRIPTION": "Doctor's prescription",
    "ID_PROOF": "Government-issued ID proof",
    "PRE_AUTH": "Pre-authorization approval",
    "DIAGNOSTIC_REPORT": "Diagnostic and lab reports",
}

DOCUMENT_PATTERNS = {
    "BILL": r"\b(invoice|bill no|amount payable|gst|grand total)\b",
    "DISCHARGE_SUMMARY": r"\bdischarge (summary|date|note)\b",
    "PRESCRIPTION": r"\b(rx|prescription|tab\.|cap\.|syrup|od|bd)\b",
    "PRE_AUTH": r"\b(pre-?authori[sz]ation|cashless|network hospital)\b",
    "DIAGNOSTIC_REPORT": r"\b(lab report|pathology|radiology|haemoglobin|hemoglobin|reference range)\b",
    "ID_PROOF": r"\b(aadhaar|passport|driving licen[cs]e|pan card|voter id)\b",
    "POLICY_SCHEDULE": r"\b(policy schedule|sum insured|premium|insured member)\b",
}

app = FastAPI(title="MediBridge AI Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ChatRequest(BaseModel):
    message: str
    role: str = "PATIENT"


class PolicyRequest(BaseModel):
    planName: str = "Health insurance plan"
    insurerName: str = "your insurer"
    sumInsured: float = 0
    usedAmount: float = 0
    remainingCoverage: float = 0
    validTo: Optional[str] = None
    role: str = "PATIENT"


class ReadinessRequest(BaseModel):
    documents: list[str] = []
    claimedAmount: float = 0
    remainingCoverage: float = 0
    role: str = "PATIENT"


class DocumentRequest(BaseModel):
    text: Optional[str] = None
    imageBase64: Optional[str] = None
    role: str = "PATIENT"


async def ask_gemini(prompt: str) -> Optional[str]:
    """Call the Gemini API. The key is sent in a header so it never appears in URLs or logs."""
    if not GEMINI_API_KEY:
        return None
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(GEMINI_URL, headers={"x-goog-api-key": GEMINI_API_KEY}, json=payload)
        response.raise_for_status()
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]


async def generate(prompt: str, fallback: str) -> str:
    try:
        text = await ask_gemini(prompt)
        return text.strip() if text else fallback
    except Exception:  # network or quota problems must never break the user experience
        return fallback


def rule_based_answer(message: str) -> str:
    msg = message.lower()
    if "uht" in msg or "transaction" in msg:
        return ("Every hospital visit gets a Universal Healthcare Transaction ID (UHT ID). Use it on the homepage "
                "tracker to follow admission, pre-authorization, bills, claims and settlement in one place.")
    if "claim" in msg:
        return ("To claim, keep your discharge summary, itemised bill, prescriptions, ID proof and reports, then "
                "submit from the Claims tab. The readiness check lists any documents still missing.")
    if "policy" in msg or "coverage" in msg or "cover" in msg:
        return ("Sum insured is the maximum your plan pays in a policy year. Remaining coverage is the sum insured "
                "minus amounts already settled. Open Policies & Coverage for the details.")
    if "hospital" in msg:
        return ("Use Find Hospitals to filter partner hospitals by city, then tick up to three to compare them side by side.")
    return ("I can explain your policy, check whether a claim is ready, or help you follow your UHT ID journey. "
            "What would you like to know?")


@app.get("/health")
def health():
    return {"status": "ok", "geminiConfigured": bool(GEMINI_API_KEY), "ocrAvailable": pytesseract is not None}


@app.post("/chat")
async def chat(req: ChatRequest):
    reply = await generate(
        f"{SYSTEM_PROMPT}\nUser role: {req.role}\nUser message: {req.message}",
        rule_based_answer(req.message),
    )
    return {"reply": reply, "source": "gemini" if GEMINI_API_KEY else "rules"}


@app.post("/explain-policy")
async def explain_policy(req: PolicyRequest):
    used_pct = round(100 * req.usedAmount / req.sumInsured, 1) if req.sumInsured else 0
    summary = (
        f"Your {req.planName} from {req.insurerName} has a sum insured of Rs {req.sumInsured:,.0f}. "
        f"You have used Rs {req.usedAmount:,.0f} ({used_pct}%), leaving Rs {req.remainingCoverage:,.0f} available"
        + (f" until {req.validTo}." if req.validTo else ".")
    )
    fallback = summary + " Check your policy wording for co-payment, waiting periods and network hospital rules."
    explanation = await generate(
        f"{SYSTEM_PROMPT}\nExplain this health insurance position to a {req.role.lower()} in 4 to 5 plain-language "
        f"sentences. Cover cashless versus reimbursement claims and what to check before a planned admission.\n{summary}",
        fallback,
    )
    return {"explanation": explanation, "summary": summary}


@app.post("/claim-readiness")
def claim_readiness(req: ReadinessRequest):
    present = {d.strip().upper() for d in req.documents}
    missing = [label for key, label in REQUIRED_DOCUMENTS.items() if key not in present]
    warnings = []
    if req.claimedAmount > req.remainingCoverage:
        warnings.append("The claimed amount is higher than the remaining coverage and will be capped or flagged for review.")
    score = round(100 * (len(REQUIRED_DOCUMENTS) - len(missing)) / len(REQUIRED_DOCUMENTS))
    return {
        "readinessScore": score,
        "ready": not missing,
        "missingDocuments": missing,
        "warnings": warnings,
    }


def run_ocr(image_b64: str) -> str:
    if Image is None or pytesseract is None:
        return ""
    try:
        raw = base64.b64decode(image_b64.split(",")[-1])
        return pytesseract.image_to_string(Image.open(io.BytesIO(raw)))
    except Exception:
        return ""


@app.post("/analyze-document")
def analyze_document(req: DocumentRequest):
    text = (req.text or "").strip()
    ocr_used = False
    if not text and req.imageBase64:
        text = run_ocr(req.imageBase64).strip()
        ocr_used = True

    lower = text.lower()
    doc_types = [name for name, pattern in DOCUMENT_PATTERNS.items() if re.search(pattern, lower)]
    amounts = []
    for raw in re.findall(r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)", lower):
        cleaned = raw.replace(",", "")
        if cleaned:
            amounts.append(float(cleaned))
    dates = re.findall(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", text)

    return {
        "documentTypes": doc_types or ["UNKNOWN"],
        "amounts": amounts,
        "total": max(amounts) if amounts else None,
        "dates": dates,
        "ocrUsed": ocr_used,
        "textPreview": text[:500],
    }
