import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import json  
import re

load_dotenv() 

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_KEY = os.getenv("GOOGLE_API_KEY")
if not API_KEY:
    raise Exception("Missing GOOGLE_API_KEY in environment variables")

genai.configure(api_key=API_KEY)
gemini_model = genai.GenerativeModel("gemini-1.5-flash-latest")

# Load questions once on startup
def load_questions():
    df = pd.read_csv("Assessment_chat_v2.csv")
    if 'ID' not in df.columns:
        df['ID'] = df.index + 1
    return df

questions_df = load_questions()

# Data Models
class UserProfile(BaseModel):
    age: int
    education_level: str
    field: str
    interests: List[str]
    aspirations: str

class MCQScoreDict(BaseModel):
    Cognitive_and_Creative_Skills: int
    Work_and_Professional_Behavior: int
    Emotional_and_Social_Competence: int
    Learning_and_Self_Management: int
    Family_and_Relationships: int

class OpenEndedRequest(BaseModel):
    user_profile: UserProfile
    mcq_scores: MCQScoreDict

@app.get("/")
def root():
    return {"message": "Skill Assessment Backend Running"}

@app.post("/generate_open_ended_questions")
def generate_open_ended_questions(req: OpenEndedRequest):
    prompt = f"""
You are an expert skill assessor tasked with generating 3 personalized open-ended questions that cover the following 5 core skill categories:

1. Cognitive & Creative Skills  
2. Work & Professional Behavior  
3. Emotional & Social Competence  
4. Personal Management & Wellness  
5. Family & Relationships

Instructions:
- Use the user's profile and their MCQ performance to generate *3 diverse, personalized, open-ended questions* that cover all 5 categories collectively (at least once per category across the 3).
- Each question should be mapped to a *primary category* and optionally *secondary categories*.
- Prioritize weaker-scoring categories from the MCQs when assigning primary categories.
- Avoid redundant or overly similar questions.
- Questions should be clear, real-world oriented, and require a reflective response.

User Profile:
- Age: {req.user_profile.age}
- Education Level: {req.user_profile.education_level}
- Field of Study/Profession: {req.user_profile.field}
- Interests: {', '.join(req.user_profile.interests)}
- Aspirations: {req.user_profile.aspirations}

MCQ Scores by Category (0–100):
{{
  "Cognitive & Creative Skills": {req.mcq_scores.Cognitive_and_Creative_Skills},
  "Work & Professional Behavior": {req.mcq_scores.Work_and_Professional_Behavior},
  "Emotional & Social Competence": {req.mcq_scores.Emotional_and_Social_Competence},
  "Personal Management & Wellness": {req.mcq_scores.Learning_and_Self_Management},
  "Family & Relationships": {req.mcq_scores.Family_and_Relationships}
}}

Return ONLY in the following JSON format:
{{
  "questions": [
    {{
      "question": "Describe a time you had to resolve a misunderstanding with a family member.",
      "primary_category": "Family & Relationships",
      "secondary_categories": ["Emotional & Social Competence"]
    }},
    {{
      "question": "How do you approach learning new concepts or tools when faced with a challenge at work or school?",
      "primary_category": "Learning & Self Management",
      "secondary_categories": ["Cognitive & Creative Skills", "Work & Professional Behavior"]
    }},
    {{
      "question": "Tell us about a time when your creativity helped solve a complex problem.",
      "primary_category": "Cognitive & Creative Skills",
      "secondary_categories": ["Work & Professional Behavior"]
    }}
  ]
}}
Only return valid JSON. Do not include anything else.
    """
    try:
        response = gemini_model.generate_content(prompt)
        raw_text = response.text.strip()
        print("Raw Gemini response:", raw_text)

        # Strip markdown code block markers if present (```json ... ``` or ```)
        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()

        # Parse the cleaned string as JSON
        json_data = json.loads(clean_text)

        if "questions" not in json_data:
            raise HTTPException(status_code=500, detail="Response missing 'questions' key")

        return json_data  # FastAPI will serialize dict to JSON response automatically

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse JSON from Gemini API response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {e}")
class OpenEndedAnswer(BaseModel):
    question: str
    answer: str
    categories: List[str]

class ScoreOpenEndedRequest(BaseModel):
    user_profile: UserProfile
    answers: List[OpenEndedAnswer]

@app.post("/score_open_ended_responses")
def score_open_ended_responses(req: ScoreOpenEndedRequest):
    questions = req.answers  # list of OpenEndedAnswer
    prompt = f"""
You are a skill evaluator assessing a user's responses to open-ended questions. Each response is associated with one or more categories (Primary and Secondary). Your job is to evaluate how well the answer demonstrates the user's competence in each listed category.

List of all categories:
1. Cognitive & Creative Skills  
2. Work & Professional Behavior  
3. Emotional & Social Competence  
4. Personal Management & Wellness 
5. Family & Relationships

Instructions:
- Carefully read each open-ended question and its response.
- Each question is mapped to *one or more categories*. Evaluate the response for each listed category separately.
- Assign a score from 0 to 100 for how well the user demonstrates that skill in the context of the answer.
- Provide a short justification (1–2 lines) per score.
- Do NOT skip any listed category. Even if the response doesn’t reflect that skill, assign a low score (with explanation).
- Output in strict JSON format.

User Profile:
- Age: {req.user_profile.age}
- Education Level: {req.user_profile.education_level}
- Field of Study/Profession: {req.user_profile.field}
- Interests: {', '.join(req.user_profile.interests)}
- Aspirations: {req.user_profile.aspirations}

Evaluate the following:
""" + "\n".join([
        f"""
Question {idx+1}:
{q.question}
Answer:
{q.answer}
Categories: {', '.join(q.categories)}
""" for idx, q in enumerate(questions)
    ]) + """
Return only this output format (strict JSON):

{
  "scores": [
    {
      "question": 1,
      "category": "Cognitive & Creative Skills",
      "score": 88,
      "justification": "Demonstrates originality and practical problem-solving clearly."
    },
    {
      "question": 1,
      "category": "Emotional & Social Competence",
      "score": 62,
      "justification": "Some reflection on empathy, but lacks depth."
    }
  ]
}
Only return valid JSON. Do not include anything else.
"""

    try:
        response = gemini_model.generate_content(prompt)
        raw_text = response.text.strip()
        print("Raw Gemini scoring response:", raw_text)

        # Clean response if wrapped in ```json or ```
        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        json_data = json.loads(clean_text)

        if "scores" not in json_data:
            raise HTTPException(status_code=500, detail="Response missing 'scores' key")

        return json_data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse JSON from Gemini API response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {e}")
