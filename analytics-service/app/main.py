from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="cura-analytics-service")


class SummaryRequest(BaseModel):
    texts: list[str]


class SentimentRequest(BaseModel):
    text: str


class AnomalyRequest(BaseModel):
    values: list[float]


@app.get("/health")
def health() -> dict[str, bool | str]:
    return {"ok": True, "service": "cura-analytics"}


@app.post("/summarize")
def summarize(payload: SummaryRequest) -> dict[str, str | int]:
    if not payload.texts:
        return {"summary": "No moderated evidence available.", "count": 0}

    summary = payload.texts[0]
    if len(payload.texts) > 1:
        summary = f"{payload.texts[0]} Additional evidence indicates recurring themes across {len(payload.texts)} records."

    return {"summary": summary[:280], "count": len(payload.texts)}


@app.post("/sentiment")
def sentiment(payload: SentimentRequest) -> dict[str, str]:
    text = payload.text.lower()
    if "long" in text or "delay" in text or "higher" in text:
      label = "mixed"
    elif "clear" in text or "smooth" in text or "transparent" in text:
      label = "positive"
    else:
      label = "neutral"

    return {"label": label}


@app.post("/anomaly")
def anomaly(payload: AnomalyRequest) -> dict[str, float | bool]:
    if not payload.values:
      return {"is_anomalous": False, "max_ratio": 0.0}

    mean = sum(payload.values) / len(payload.values)
    max_ratio = max(payload.values) / mean if mean else 0.0
    return {"is_anomalous": max_ratio > 1.35, "max_ratio": round(max_ratio, 3)}
