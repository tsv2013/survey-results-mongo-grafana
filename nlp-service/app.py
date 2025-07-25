from fastapi import FastAPI
from pydantic import BaseModel
import spacy
from textblob import TextBlob
from datetime import datetime

app = FastAPI()
nlp = spacy.load("en_core_web_sm")

def process(text):
    # Sentiment Analysis
    blob = TextBlob(text)
    sentiment = {
        "polarity": blob.sentiment.polarity,
        "subjectivity": blob.sentiment.subjectivity,
        "label": "positive" if blob.sentiment.polarity > 0 else "negative" if blob.sentiment.polarity < 0 else "neutral"
    }
    
    # NER
    doc = nlp(text)
    entities = [
        {"text": ent.text, "label": ent.label_, "start": ent.start_char, "end": ent.end_char}
        for ent in doc.ents
    ]
    
    # Key Phrases
    key_phrases = [chunk.text for chunk in doc.noun_chunks]
    
    return {
        "sentiment": sentiment,
        "entities": entities,
        "key_phrases": key_phrases,
        "processed_text": text
    }    

class TextRequest(BaseModel):
    text: str

@app.get("/health")
async def root():
    return { "status": 'healthy', "timestamp": datetime.now().isoformat() }

@app.get("/sentiment")
def sentiment_text(text):
    return process(text)

@app.post("/analyze")
def analyze_text(request: TextRequest):
    text = request.text
    return process(text)
