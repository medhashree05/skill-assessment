import os
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import pandas as pd
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import json  
import re
from typing import Dict  
from typing import Optional
from google.oauth2 import service_account  
import random

load_dotenv() 

app = FastAPI()

origins = [  
    "https://skill-assessment-1.onrender.com",
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:3000"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-2.5-flash")

def load_questions():
    df = pd.read_csv("Assessment_chat_v2.csv")
    if 'ID' not in df.columns:
        df['ID'] = df.index + 1
    return df

questions_df = load_questions()

class UserProfile(BaseModel):
    name: Optional[str]
    age: Optional[int]
    education_level: Optional[str]
    field: Optional[str]
    domain: Optional[str]
    exp_level: Optional[str]
    career_goal: Optional[str]
    interests: Optional[List[str]]

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
- Aspirations: {req.user_profile.career_goal}
              
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
- Aspirations: {req.user_profile.career_goal}

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
    
class TooltipRequest(BaseModel):
    category: str
    user_score: float
    benchmark_score: float
    user_profile: UserProfile

@app.post("/generate_tooltips")
def generate_tooltips(req: TooltipRequest):
    prompt = f"""
As a career advisor AI, generate personalized tooltips for a skill category comparison.

[User Profile]
Education: {req.user_profile.education_level}
Experience: Not specified
Domain: {req.user_profile.field}
Career Goal: {req.user_profile.career_goal}

[Skill Category]
{req.category}:
- Your Score: {req.user_score:.1f}%
- Benchmark: {req.benchmark_score}%

Instructions:
1. Create a USER tooltip (max 30 words): 
   - Acknowledge current performance
   - Provide constructive feedback  
   - Use encouraging tone

2. Create a BENCHMARK tooltip (max 30 words):
   - Explain benchmark significance
   - Suggest how to reach benchmark
   - Keep it motivational

Return in JSON format:
{{
    "user_tooltip": "Your personalized feedback...",
    "benchmark_tooltip": "Your benchmark guidance..."
}}
"""

    try:
        response = gemini_model.generate_content(prompt)
        raw_text = response.text.strip()
        print("Raw Gemini tooltip response:", raw_text)

        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        json_data = json.loads(clean_text)

        if "user_tooltip" not in json_data or "benchmark_tooltip" not in json_data:
            raise HTTPException(status_code=500, detail="Tooltip keys missing in Gemini response")

        return json_data

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse JSON from Gemini response")
    except Exception as e:
        # Fallback tooltips
        return {
            "user_tooltip": f"Your {req.user_score:.1f}% in {req.category} shows solid potential. Focus on real-world application to improve.",
            "benchmark_tooltip": f"Top performers score {req.benchmark_score}% in {req.category}. Practice consistently to reach that level."
        }


class GrowthProjectionRequest(BaseModel):
    user_data: UserProfile
    user_scores: Dict[str, float]
    benchmark_scores: Dict[str, float]

def get_tier_label(score: float) -> str:
    if score >= 85:
        return "Top Talent"
    elif score >= 70:
        return "Emerging Leader"
    elif score >= 55:
        return "Skilled Contributor"
    else:
        return "Emerging Talent"

@app.post("/generate_growth_projection")
def generate_growth_projection(req: GrowthProjectionRequest):
    """AI-Driven Career Growth Projection Generator using Gemini"""

    avg_score = sum(req.user_scores.values()) / len(req.user_scores) if req.user_scores else 0
    tier = get_tier_label(avg_score)

    prompt = f"""
## ROLE
You are an expert career analyst generating growth projections for professionals.
Profile:
- Name: {req.user_data.name}
- Education: {req.user_data.education_level}
- Experience: {req.user_data.exp_level}
- Domain: {req.user_data.domain}
- Career Goal: {req.user_data.career_goal}
    
Assessment Data:
- User Scores (0-100 scale): {json.dumps(req.user_scores)}
- Market Benchmarks (0-100 scale): {json.dumps(req.benchmark_scores)}

### TASKS:
1. Calculate the following strictly using reasoning:
   - Current Score (average of user scores)
   - Projected Scores (3, 6, 12 months) assuming realistic growth if user follows best practices
   - Peer Percentile (estimated relative to benchmarks, 1–99%)
   - Assign a Tier: "Top Talent", "Emerging Leader", "Skilled Contributor", or "Emerging Talent"

2. Write a **3-sentence motivational summary**:
   - Highlight weakest skill categories
   - Show connection to their career goal
   - Encourage percentile growth

3. Suggest **exactly 3 actionable steps** (max 15 words each):
   - Be measurable, specific, and role-relevant
   - Use strong action verbs (Complete, Practice, Build, Analyze, Join)

### RULES:
- DO NOT make up random numbers—base projections logically on score gaps vs benchmarks.
- Use realistic, human-like advice (no generic statements).
- Respond ONLY in this JSON structure:
{{
  "growth_projection": {{
    "current_score": {avg_score:.1f},
    "3_months": <float>,
    "6_months": <float>,
    "12_months": <float>,
    "peer_percentile": <float>,
    "tier": "{tier}"
  }},
  "growth_summary": "Your 3-sentence motivational text here.",
  "action_steps": [
    "Step 1 here",
    "Step 2 here",
    "Step 3 here"
  ]
}}
"""

    try:
        response = gemini_model.generate_content(prompt)
        raw_text = response.text.strip()
        print("Raw Gemini growth response:", raw_text)

        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        json_data = json.loads(clean_text)

        if "growth_projection" not in json_data:
            raise ValueError("Missing 'growth_projection' in response")

        return json_data

    except Exception as e:
        print(f"[ERROR] Gemini growth projection failed: {str(e)}")

        # Fallback response
        current_score = avg_score
        return {
            "growth_projection": {
                "current_score": round(current_score, 1),
                "3_months": round(current_score * 1.05, 1),
                "6_months": round(current_score * 1.10, 1),
                "12_months": round(current_score * 1.15, 1),
                "peer_percentile": 60.0,
                "tier": tier
            },
            "growth_summary": "Focus on closing key gaps to accelerate toward your career target. You're on track!",
            "action_steps": [
                "Complete 1 hands-on project this month",
                "Practice weekly domain-specific challenges",
                "Join 1 professional community for peer learning"
            ]
        }
    

class MarketAnalysisRequest(BaseModel):
    user_profile: UserProfile
    final_score: float
    overall_percentage: float
    tier: str
    percentile: float
    strengths: List[str]
    weaknesses: List[str]
    benchmark_scores: Dict[str, float]

@app.post("/generate_market_analysis")
def generate_market_analysis(req: MarketAnalysisRequest):
    """Generate bullet-point formatted market position analysis using Gemini"""

    score = req.final_score
    # Optional: recompute tier based on score
    if score < 40:
        tier = "Emerging Talent"
    elif score < 60:
        tier = "Developing Professional"
    elif score < 80:
        tier = "Skilled Practitioner"
    else:
        tier = "Industry Expert"

    MARKET_ANALYSIS_PROMPT = f"""
As a senior career strategist, generate a clear, **bullet-point formatted** market position analysis.

[User Profile]
- Name: {req.user_profile.name}
- Education: {req.user_profile.education_level}
- Experience Level: {req.user_profile.exp_level}
- Professional Domain: {req.user_profile.domain}
- Career Goal: {req.user_profile.career_goal}

[Assessment Results]
- Overall Score: {score:.1f}/100
- Career Tier: {tier}
- Market Percentile: {req.percentile:.1f}% (ahead of peers)
- Strengths: {', '.join(req.strengths) if req.strengths else 'None'}
- Weaknesses: {', '.join(req.weaknesses) if req.weaknesses else 'None'}

[Market Benchmarks]
{", ".join([f"{cat}: {val}%" for cat, val in req.benchmark_scores.items()])}

### TASK
1. Convert every section into **3-4 crisp bullet points**, written in second person (e.g., "You demonstrate…").
2. Be **personalized, motivational, and encouraging**.
3. Make it sound like **an AI career mentor giving you feedback**.
4. Use **numbers only when necessary** (e.g., percentile, years, salary).
5. Keep sentences short, professional, and **visually scannable**.

### OUTPUT FORMAT (STRICT JSON)
{{
  "tier": {{
    "label": "{tier}",
    "bullets": ["...", "...", "..."]
  }},
  "experience": {{
    "label": "Equivalent experience (e.g., 2-3 years)",
    "bullets": ["...", "..."]
  }},
  "percentile": {{
    "label": "Ahead of {req.percentile:.1f}% of peers",
    "bullets": ["...", "..."]
  }},
  "salary": {{
    "label": "Estimated salary range",
    "bullets": ["...", "..."]
  }},
  "overall_message": ["...", "..."]
}}
"""

    def get_fallback_market_analysis():
        return {
            "tier": {
                "label": tier,
                "bullets": [
                    f"You are positioned as a {tier}, showcasing strong domain readiness.",
                    "Your score reflects consistent performance across core competencies."
                ]
            },
            "experience": {
                "label": "1-3 years",
                "bullets": [
                    "Your skill level matches early-career professionals with ~2 years of experience."
                ]
            },
            "percentile": {
                "label": f"Ahead of {req.percentile:.1f}% of peers",
                "bullets": [
                    f"You outperform {req.percentile:.1f}% of peers in problem-solving and adaptability."
                ]
            },
            "salary": {
                "label": "$65K-$85K",
                "bullets": [
                    "Your current skills align with salary bands for high-performing early-career roles."
                ]
            },
            "overall_message": [
                "You are on a strong growth trajectory.",
                "Focus on weak areas to accelerate toward leadership roles."
            ],
            "readiness_score": round(req.overall_percentage, 1)
        }

    try:
        response = gemini_model.generate_content(MARKET_ANALYSIS_PROMPT)
        raw_text = response.text.strip()
        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        json_data = json.loads(clean_text)

        if not json_data:
            raise ValueError("Empty or invalid JSON from Gemini")

        return {
            **json_data,
            "readiness_score": round(req.overall_percentage, 1)
        }

    except Exception as e:
        print(f"[ERROR] Gemini market analysis failed: {str(e)}")
        return get_fallback_market_analysis()
    
class PeerBenchmarkRequest(BaseModel):
    user_data: UserProfile
    combined_score: float
    mcq_scores: Dict[str, float]
    open_scores: Dict[str, float]
    strong_categories: List[str]
    weak_categories: List[str]
    benchmarks: Dict[str, float]

@app.post("/generate_peer_benchmark")
def generate_peer_benchmark(req: PeerBenchmarkRequest):
    """Generate peer benchmark and in-demand traits analysis report using Gemini"""

    prompt = f"""
## ROLE
You are acting as a **career market intelligence analyst** for a skill-assessment platform.  
Your goal: Generate **highly personalized, market-aligned insights** that compare the user's performance to peers and map their skills to in-demand industry traits.

---

## CONTEXT
- Name: {req.user_data.name}
- Domain: {req.user_data.domain}
- Career Goal: {req.user_data.career_goal}
- Experience Level: {req.user_data.exp_level}
- Combined Score: {req.combined_score:.1f}/100
- MCQ Scores: {json.dumps(req.mcq_scores)}
- Open-Ended Scores: {json.dumps(req.open_scores)}
- Strong Categories: {', '.join(req.strong_categories) or 'None'}
- Weak Categories: {', '.join(req.weak_categories) or 'None'}
- Benchmarks: {json.dumps(req.benchmarks)}

---

1. **Percentile Positioning**  
   - Predict the user's skill percentile vs. peers in the same **domain & career goal** (e.g., "Top 72% among final-year AI engineering students").  
   - Justify percentile using **peer performance trends or aggregated test-taker data**.

2. **Peer Benchmark Narrative**  
   - Write **2 engaging sentences** comparing the user to typical peers, highlighting both competitive edges and gaps.

3. **In-Demand Traits Mapping**  
   - Map **3 in-demand traits** (from current job market, internships, or hiring trends) to the user's strongest/weakest areas.  
   - Be **specific** (e.g., "Your high score in Work Behavior aligns with demand for reliable agile team contributors").

Return ONLY valid JSON in this format:
{{
  "peer_benchmark": {{
    "percentile": "Top 72% among peers in {req.user_data.domain}",
    "narrative": "Your performance outpaces many peers in problem-solving, but lags in communication skills.",
    "in_demand_traits": [
      "Strong analytical thinking aligns with current hiring demand for data-driven roles",
      "Moderate teamwork scores limit opportunities in agile-based internships",
      "High learning agility matches rapid tech adoption trends in AI startups"
    ]
  }}
}}
"""

    def fallback_response():
        return {
            "peer_benchmark": {
                "percentile": "Top 70% among peers",
                "narrative": "Your skills are competitive in your domain with strengths in key areas.",
                "in_demand_traits": [
                    "Technical proficiency matches industry requirements",
                    "Leadership skills align with management expectations",
                    "Strategic thinking could be improved for senior roles"
                ]
            }
        }

    try:
        response = gemini_model.generate_content(prompt)
        raw_text = response.text.strip()
        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        parsed = json.loads(clean_text)

        if "peer_benchmark" not in parsed:
            raise ValueError("Missing 'peer_benchmark' key")

        return parsed

    except Exception as e:
        print(f"[ERROR] Gemini peer benchmark failure: {str(e)}")
        return fallback_response()

class ActionPlanRequest(BaseModel):
    user_data: UserProfile
    mcq_scores: Dict[str, float]
    open_scores: Dict[str, float]
    market_benchmarks: Dict[str, float]
    strong_categories: List[str]
    moderate_categories: List[str]
    weak_categories: List[str]

@app.post("/generate_action_plan")
def generate_action_plan(req: ActionPlanRequest):
    """Generate a personalized 90-day roadmap based on skill scores and benchmarks"""

    # Combine MCQ + Open scores → average per category
    combined_scores = {}
    for k in set(req.mcq_scores) | set(req.open_scores):
        mcq = req.mcq_scores.get(k, 0)
        open_ = req.open_scores.get(k, 0)
        combined_scores[k] = round((mcq + open_) / 2, 1)

    # Average score
    current_avg = np.mean(list(combined_scores.values()))

    # Gemini prompt
    prompt = f"""
## ROLE  
You are a **personalized career coach and skill strategist**.  
Your task: **Design a hyper-personalized, practical 90-day career development roadmap** for a professional, based entirely on their **scores, benchmark gaps, and profile**.

---

## CONTEXT – User Data  
Name: {req.user_data.name}  
Education: {req.user_data.education_level}  
Experience Level: {req.user_data.exp_level}  
Professional Domain: {req.user_data.domain}  
Career Goal: {req.user_data.career_goal}  

Current Overall Score: {current_avg:.1f}  
Category-wise Scores vs Market Benchmarks:  
{chr(10).join([
    f"- {cat}: {combined_scores.get(cat, 0)} vs {req.market_benchmarks.get(cat, 'N/A')}"
    for cat in combined_scores
])}

Strong Categories: {', '.join(req.strong_categories) or 'None'}  
Moderate Categories: {', '.join(req.moderate_categories) or 'None'}  
Weak Categories: {', '.join(req.weak_categories) or 'None'}  

---

## TASK – 90-Day Roadmap Only  

✅ **STRICTLY output ONLY a 3-phase roadmap** (no ROI narrative, no extra sections).  
✅ **Make it feel like a website-style career roadmap** → clean, simple, motivational.  
✅ **Be extremely personalized**: Mention the user's domain, role, and specific skill gaps.  
✅ **Use bullet points, short sentences, and practical weekly steps.**  
✅ **Include measurable progress milestones.**  

---

### **OUTPUT FORMAT (STRICT)**

90-DAY PERSONALIZED ROADMAP

### PHASE 1 (0–30 Days) – [Motivational Title]
- **Focus Areas:** [Specific weak categories & why (personalized)]
- **Weekly Actions:**
  - Week 1: [Specific step]
  - Week 2: [Step]
  - Week 3: [...]
  - Week 4: [...]
- **Milestone by Day 30:** [Score target or tangible skill achievement]

### PHASE 2 (31–60 Days) – [Motivational Title]
- **Focus Areas:** [Moderate skill clusters, why they matter for career goal]
- **Weekly Actions:**
  - Week 5: [...]
  - Week 6: [...]
  - Week 7: [...]
  - Week 8: [...]
- **Milestone by Day 60:** [Clear achievement]

### PHASE 3 (61–90 Days) – [Motivational Title]
- **Focus Areas:** [Strong categories → leadership & visibility, very role-specific]
- **Weekly Actions:**
  - Week 9: [...]
  - Week 10: [...]
  - Week 11: [...]
  - Week 12: [...]
- **Milestone by Day 90:** [E.g., "Score crosses 75%+, ready for mid-level role"]

---

## STYLE RULES
- Be **personal, encouraging, and clear** (like talking directly to the user).
- Avoid paragraphs – keep it **structured and scannable**.
- **DO NOT** generate generic career roadmaps found online – strictly use **this user's data**.
- No extra ROI text, no reporting metrics – **ONLY the roadmap**.
"""

    try:
        response = gemini_model.generate_content(prompt)
        roadmap_text = response.text.strip()
        return {"roadmap_text": roadmap_text}
    except Exception as e:
        print(f"[ERROR] Gemini 90-day roadmap generation failed: {str(e)}")
        return {
            "roadmap_text": """90-DAY PERSONALIZED ROADMAP

### PHASE 1 (0–30 Days) – Build Foundation in Core Gaps
- **Focus Areas:** Time Management, Data Interpretation
- **Weekly Actions:**
  - Week 1: Use Pomodoro timer daily
  - Week 2: Analyze 1 dataset using Excel weekly
  - Week 3: Practice case-based MCQs
  - Week 4: Join 1 peer learning group
- **Milestone by Day 30:** 20% score increase in 2 weakest categories

### PHASE 2 (31–60 Days) – Strengthen for Career Goal
- **Focus Areas:** Communication, Research
- **Weekly Actions:**
  - Week 5: Record weekly domain summary videos
  - Week 6: Analyze 2 research papers
  - Week 7: Write weekly reflection journal
  - Week 8: Peer presentation or webinar
- **Milestone by Day 60:** Public portfolio submission

### PHASE 3 (61–90 Days) – Demonstrate Strengths with Visibility
- **Focus Areas:** Leadership, Critical Thinking
- **Weekly Actions:**
  - Week 9: Lead 1 project meeting
  - Week 10: Mentor a junior peer
  - Week 11: Publish insight article
  - Week 12: Pitch for internship/freelance role
- **Milestone by Day 90:** Ready for higher responsibility or role transition"""
        }

class GrowthSourcesRequest(BaseModel):
    user_data: UserProfile
    weak_categories: List[str]
    strong_categories: List[str]
    moderate_categories: List[str]
    combined_scores: Dict[str, float]

# ==== HARD-CODED SOURCE LIBRARY ====

RECOMMENDED_SOURCES = {
    "Cognitive & Creative Skills": {
        "below_70": {
            "title": "Logical and Critical Thinking – University of Auckland",
            "link": "https://www.futurelearn.com/courses/logical-and-critical-thinking",
            "duration": "8 hrs (2 weeks)",
            "outcome": "Strengthens logical reasoning and structured problem-solving"
        },
        "above_70": {
            "title": "Deep Learning Fundamentals – Lightning AI",
            "link": "https://lightning.ai/courses/deep-learning-fundamentals/",
            "duration": "6 hrs (self-paced)",
            "outcome": "Enhances creative problem-solving using modern AI techniques"
        }
    },
    "Work & Professional Behavior": {
        "below_70": {
            "title": "Effective Time Management – Alison",
            "link": "https://alison.com/course/time-management",
            "duration": "3 hrs (self-paced)",
            "outcome": "Improves task prioritization and daily work consistency"
        },
        "above_70": {
            "title": "Leading Cross-Functional Teams – TrainingCred",
            "link": "https://trainingcred.com/training-course/leading-cross-functional-collaboration",
            "duration": "6 hrs (1 week)",
            "outcome": "Develops collaboration & leadership skills for cross-team projects"
        }
    },
    "Emotional & Social Competence": {
        "below_70": {
            "title": "Emotional Resilience at Work – Alison",
            "link": "https://alison.com/course/introduction-to-resilience-training",
            "duration": "2 hrs (self-paced)",
            "outcome": "Builds resilience and emotional stability in workplace stress"
        },
        "above_70": {
            "title": "Managing Emotions in Times of Stress – Yale University",
            "link": "https://online.yale.edu/courses/managing-emotions-times-uncertainty-and-stress",
            "duration": "6 hrs (self-paced)",
            "outcome": "Improves emotional intelligence and adaptability in uncertain environments"
        }
    }
}

DEFAULT_RECOMMENDATIONS = [
    {
        "category": "General",
        "title": "LinkedIn Learning: Career Development",
        "link": "https://www.linkedin.com/learning",
        "why": "Broad career development resources to strengthen your professional profile",
        "duration": "Varies",
        "outcome": "Improve key professional skills"
    },
    {
        "category": "General",
        "title": "Coursera: Professional Development Courses",
        "link": "https://www.coursera.org",
        "why": "High-quality courses to enhance your career skills",
        "duration": "Varies",
        "outcome": "Develop professional skills across multiple domains"
    }
]

# ==== FUNCTION ====

def generate_recommended_sources(user_data, weak_categories, moderate_categories, combined_scores):
    recommendations = []
    career_goal = user_data.get("career_goal", "your career goal")

    # Prioritize weak categories
    for category in weak_categories:
        if len(recommendations) >= 3:
            break
        if category in RECOMMENDED_SOURCES:
            score = combined_scores.get(category, 0)
            tier = "below_70" if score < 70 else "above_70"
            source = RECOMMENDED_SOURCES[category][tier]
            recommendations.append({
                "category": category,
                "title": source["title"],
                "link": source["link"],
                "why": f"Your {category} score ({score:.1f}) needs improvement for {career_goal}",
                "duration": source["duration"],
                "outcome": source["outcome"]
            })

    # Add moderate if not enough
    for category in moderate_categories:
        if len(recommendations) >= 3:
            break
        if category in RECOMMENDED_SOURCES and category not in [r['category'] for r in recommendations]:
            score = combined_scores.get(category, 0)
            tier = "below_70" if score < 70 else "above_70"
            source = RECOMMENDED_SOURCES[category][tier]
            recommendations.append({
    "category": category,
    "title": source["title"],
    "why": f"Your {category} score ({score:.1f}) needs improvement for {career_goal}",  # Map why -> description
    "link": source["link"],
    "duration": source["duration"],
    "outcome": source["outcome"]
})

    # Fallback: add generic ones
    if len(recommendations) < 2:
        recommendations.extend(DEFAULT_RECOMMENDATIONS[:2 - len(recommendations)])

    return recommendations[:3]

# ==== ENDPOINT ====

@app.post("/generate_growth_sources")
def generate_growth_sources(req: GrowthSourcesRequest):
    """Generate personalized growth sources based on skill scores"""
    try:
        sources = generate_recommended_sources(
            user_data=req.user_data.dict(),
            weak_categories=req.weak_categories,
            moderate_categories=req.moderate_categories,
            combined_scores=req.combined_scores
        )
        return {"sources": sources}
    except Exception as e:
        print(f"[ERROR] Failed to generate growth sources: {str(e)}")
        return {"sources": DEFAULT_RECOMMENDATIONS[:2]}

class MomentumAction(BaseModel):
    title: str
    description: str
    why: str
    effort: str

@app.post("/generate_momentum_toolkit")
def generate_momentum_toolkit():
    """Return 3 non-technical, easy-to-apply actions to build momentum"""

    formatted_actions = []
    IMMEDIATE_ACTIONS = {
        "Cognitive & Focus Boosters": [
            {
                "title": "The 20-Second Reset Rule",
                "description": "Stand, breathe deeply, and stretch for 20 seconds every 2 hours.",
                "why": "Resets mental fatigue instantly and keeps your brain sharp.",
                "effort": "🟢 Easy"
            },
            {
                "title": "The 1% Upgrade Rule",
                "description": "Do one small thing 1% better than yesterday.",
                "why": "Tiny daily upgrades compound into massive performance over time.",
                "effort": "🟡 Moderate"
            }
        ],
        "Work & Professional Behavior": [
            {
                "title": "Morning Priority Ritual",
                "description": "Write down 3 Most Important Tasks (MITs) first thing in the morning.",
                "why": "Starting with clarity increases reliability & consistency.",
                "effort": "🟢 Easy"
            },
            {
                "title": "Ask One Question Rule",
                "description": "Ask 1 thoughtful question in a meeting or to a peer daily.",
                "why": "Positions you as curious, proactive, and engaged.",
                "effort": "🟡 Moderate"
            }
        ],
        "Emotional & Social Competence": [
            {
                "title": "Mirror Pep Talk",
                "description": "Say 1 positive line to yourself every morning ('I can solve harder problems today than yesterday').",
                "why": "Boosts self-belief before the day begins.",
                "effort": "🟢 Easy"
            },
            {
                "title": "One Compliment a Day",
                "description": "Give 1 sincere compliment to a colleague or peer.",
                "why": "Strengthens social bonds effortlessly.",
                "effort": "🟢 Easy"
            }
        ],
        "Mindset & Reflection": [
            {
                "title": "The 'Why Not Me?' Question",
                "description": "Before starting any task, ask yourself 'If others can grow fast, why not me?'.",
                "why": "Triggers immediate motivation and action bias.",
                "effort": "🟢 Easy"
            },
            {
                "title": "What Did I Learn Today? Note",
                "description": "Write 1 line daily about something you learned today.",
                "why": "Creates awareness of daily growth & builds a habit of reflection.",
                "effort": "🟢 Easy"
            }
        ]
    }

    selected_actions = []
    categories = list(IMMEDIATE_ACTIONS.keys())
    random.shuffle(categories)

    for category in categories:
        if len(selected_actions) >= 3:
            break
        available = [a for a in IMMEDIATE_ACTIONS[category] if a not in selected_actions]
        if available:
            selected_actions.append(random.choice(available))

    if len(selected_actions) < 3:
        all_actions = [a for group in IMMEDIATE_ACTIONS.values() for a in group]
        selected_actions.extend(random.sample(all_actions, 3 - len(selected_actions)))

        
    for action in selected_actions:
        formatted_actions.append({
            "name": action["title"],  # Map title -> name
            "description": action["description"],
            "link": None  # Add link field (can be None)
        })
    return {"momentum_toolkit": formatted_actions}

class GrowthOpportunitiesRequest(BaseModel):
    user_profile: UserProfile
    scores: Dict[str, float]
    benchmarks: Dict[str, float]

@app.post("/generate_growth_opportunities")
def generate_growth_opportunities(req: GrowthOpportunitiesRequest):
    """
    Generate 3–4 personalized growth opportunities using Gemini
    """
    prompt = f"""
## ROLE
You are a career development strategist. Generate 3-4 personalized growth opportunities.

## USER PROFILE
Name: {req.user_profile.name}
Domain: {req.user_profile.domain}
Career Goal: {req.user_profile.career_goal}
Experience Level: {req.user_profile.exp_level}

## SKILL SCORES vs BENCHMARKS
{chr(10).join([f"- {cat}: {req.scores.get(cat, 0):.1f} (Benchmark: {req.benchmarks.get(cat, 0)})" for cat in req.scores])}

## TASK
- Generate 3-4 growth opportunities that leverage strengths and moderate skills
- Focus on future-focused career advancement
- Make each opportunity specific and actionable
- Include why it's recommended based on their profile

## OUTPUT FORMAT (JSON)
{{
  "opportunities": [
    {{
      "category": "Category Name",
      "opportunity": "Description of opportunity",
      "why": "Reason why recommended"
    }},
    ...
  ]
}}
"""

    fallback = {
        "opportunities": [
            {
                "category": "Workplace Strategy",
                "opportunity": "Take initiative to lead a mini-project in your domain.",
                "why": "Leadership experience early on aligns with your goal and showcases initiative."
            },
            {
                "category": "Technical Proficiency",
                "opportunity": "Enroll in an advanced-level online course relevant to your domain.",
                "why": "Strengthens technical depth and bridges minor gaps from benchmarks."
            },
            {
                "category": "Professional Branding",
                "opportunity": "Publish one insight or learning weekly on LinkedIn.",
                "why": "Builds visibility and credibility in your domain of interest."
            }
        ]
    }

    try:
        response = gemini_model.generate_content(prompt)
        raw_text = response.text.strip()
        clean = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        parsed = json.loads(clean)

        if "opportunities" not in parsed:
            raise ValueError("Missing 'opportunities' key")

        return parsed

    except Exception as e:
        print(f"[ERROR] Growth opportunity generation failed: {str(e)}")
        return fallback
