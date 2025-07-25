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
from typing import Dict 
from typing import Optional

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

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "gemini-testing-2-466506-6087cde29f81.json"

# Configure Gemini
genai.configure()
gemini_model = genai.GenerativeModel("gemini-2.0-flash")

# Load questions once on startup
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

@app.post("/generate_growth_projection")
def generate_growth_projection(req: GrowthProjectionRequest):
    """AI-Driven Career Growth Projection Generator"""

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
    "current_score": <float>,
    "3_months": <float>,
    "6_months": <float>,
    "12_months": <float>,
    "peer_percentile": <float>
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
        # Replace this with your actual model call (Gemini or DeepSeek)
        response = gemini_model.generate_content(prompt)
        raw_text = response.text.strip()
        print("Raw Gemini growth response:", raw_text)

        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        json_data = json.loads(clean_text)

        # Basic validation
        if "growth_projection" not in json_data:
            raise HTTPException(status_code=500, detail="Missing 'growth_projection' in response")

        return json_data

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse JSON from Gemini API response")
    except Exception as e:
        # Fallback logic if API fails or is empty
        user_scores = req.user_scores
        current_score = sum(user_scores.values()) / len(user_scores) if user_scores else 0
        return {
            "growth_projection": {
                "current_score": round(current_score, 1),
                "3_months": round(current_score * 1.05, 1),
                "6_months": round(current_score * 1.10, 1),
                "12_months": round(current_score * 1.15, 1),
                "peer_percentile": 60.0
            },
            "growth_summary": "Focus on closing skill gaps to advance steadily in your career path.",
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
    """Generate AI-driven market position analysis report"""

    MARKET_ANALYSIS_PROMPT = f"""
As a career advisor AI, generate a comprehensive market position analysis for a user based on their profile and assessment results.

[User Profile]
Name: {req.user_profile.name}
Education: {req.user_profile.education_level}
Experience: {req.user_profile.exp_level}
Professional Domain: {req.user_profile.domain}
Career Goal: {req.user_profile.career_goal}

[Assessment Results]
Overall Score: {req.final_score:.1f}/160 ({req.overall_percentage:.1f}%)
Career Tier: {req.tier}
Market Percentile: {req.percentile:.1f}% (ahead of peers)
Strengths: {', '.join(req.strengths) if req.strengths else 'None'}
Weaknesses: {', '.join(req.weaknesses) if req.weaknesses else 'None'}

[Market Benchmarks]
""" + "\n".join([f"- {cat}: {score}%" for cat, score in req.benchmark_scores.items()]) + """

Instructions:
1. Generate equivalent experience based on tier and domain (e.g., "0-2 years" for Emerging Talent)
2. Estimate salary range based on tier, experience, domain, and location norms
3. Create personalized descriptions for each metric (2-3 sentences each)
4. Generate an overall professional summary (2 sentences)
5. Use professional, encouraging, and constructive language

Return in JSON format:
{
    "tier": {
        "label": "%s",
        "description": "Personalized description of what this tier means"
    },
    "experience": {
        "label": "Equivalent experience range",
        "description": "Explanation of experience equivalence"
    },
    "percentile": {
        "label": "Ahead of %.1f%% of peers",
        "description": "Personalized interpretation of percentile"
    },
    "salary": {
        "label": "Salary estimate",
        "description": "Personalized salary explanation"
    },
    "overall_message": "2-sentence professional summary"
}
""" % (req.tier, req.percentile)

    def get_fallback_market_analysis(tier, percentile):
        return {
            "tier": {
                "label": tier,
                "description": f"Your skills place you at the {tier} level in your field."
            },
            "experience": {
                "label": "1-2 years",
                "description": "Your skills are comparable to professionals with 1–2 years of experience."
            },
            "percentile": {
                "label": f"Ahead of {percentile:.1f}% of peers",
                "description": f"You outperform {percentile:.1f}% of professionals at your career stage."
            },
            "salary": {
                "label": "$60K-$75K",
                "description": "Typical salary range for professionals at your skill level."
            },
            "overall_message": "You're making good progress in your career development. Focus on strengthening your weak areas to advance further.",
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
        print(f"[ERROR] Gemini market analysis failure: {str(e)}")
        return get_fallback_market_analysis(req.tier, req.percentile)
    
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
    """Generate peer benchmark and in-demand traits analysis report"""

    # Define the JSON format outside the f-string to avoid formatting issues
    json_format = '''{
  "peer_benchmark": {
    "percentile": "Top 72% among peers in Data Science",
    "narrative": "Your performance outpaces many peers in problem-solving, but lags in communication skills.",
    "in_demand_traits": [
      "Strong analytical thinking aligns with current hiring demand for data-driven roles",
      "Moderate teamwork scores limit opportunities in agile-based internships",
      "High learning agility matches rapid tech adoption trends in AI startups"
    ],
    "sources": [
      "LinkedIn Talent Insights – 60% of data roles require analytical excellence – https://linkedin.com/...",
      "NASSCOM 2024 Report – Agile teamwork is critical in 78% of tech internships – https://nasscom.in/...",
      "WEF Future of Jobs – Learning agility tops emerging AI skills – https://weforum.org/..."
    ]
  }
}'''

    PEER_BENCHMARK_PROMPT = f"""
As a career market intelligence AI, generate a personalized benchmark and industry trait analysis based on a user's performance data and profile.

[User Profile]
- Name: {req.user_data.name}
- Domain: {req.user_data.domain}
- Career Goal: {req.user_data.career_goal}
- Experience Level: {req.user_data.exp_level}

[Assessment Summary]
- Combined Score: {req.combined_score:.1f}/100
- MCQ Scores: {json.dumps(req.mcq_scores)}
- Open-Ended Scores: {json.dumps(req.open_scores)}
- Strong Categories: {', '.join(req.strong_categories) if req.strong_categories else 'None'}
- Weak Categories: {', '.join(req.weak_categories) if req.weak_categories else 'None'}

[Benchmarks]
{json.dumps(req.benchmarks, indent=2)}

Instructions:
1. Estimate the user's **percentile** relative to peers in the same domain and goal (e.g., "Top 72%").
2. Write a **2-sentence narrative** comparing the user to typical peers, with strengths and improvement areas.
3. Map **3 in-demand traits** from the job market to their skill strengths or gaps.
4. Support your insight with **3 one-line industry references** in the format:
   Source – Context – URL

Return only valid JSON in this format:
{json_format}
"""

    def get_fallback_peer_benchmark():
        return {
            "peer_benchmark": {
                "percentile": "Top 70% among peers",
                "narrative": "Your skills are competitive in your domain with strengths in key areas.",
                "in_demand_traits": [
                    "Technical proficiency matches industry requirements",
                    "Leadership skills align with management expectations",
                    "Strategic thinking could be improved for senior roles"
                ],
                "sources": [
                    "LinkedIn Talent Insights – Industry skills report – https://linkedin.com",
                    "WEF Future of Jobs – Key skills for 2025 – https://weforum.org",
                    "McKinsey Global Institute – Career development paths – https://mckinsey.com"
                ]
            }
        }

    try:
        response = gemini_model.generate_content(PEER_BENCHMARK_PROMPT)
        raw_text = response.text.strip()
        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        benchmark = json.loads(clean_text)

        if "peer_benchmark" not in benchmark:
            raise ValueError("Missing 'peer_benchmark' key")

        return benchmark

    except Exception as e:
        print(f"[ERROR] Gemini peer benchmark failure: {str(e)}")
        return get_fallback_peer_benchmark()


class ActionPlanRequest(BaseModel):
    user_data: UserProfile
    mcq_scores: Dict[str, float]
    open_scores: Dict[str, float]
    strong_categories: List[str]
    weak_categories: List[str]

@app.post("/generate_action_plan")
def generate_action_plan(req: ActionPlanRequest):
    """Generate 90-day action plan with specific measurable steps"""

    # Define the example format outside the f-string to avoid formatting issues
    example_format = '''
{
  "action_plan": {
    "Weak Skills": [
      {"Skill Cluster": "Category Name", "Your Level": "Weak", "Suggested Actions & Tools": "12-15 word measurable step"}
    ],
    "Moderate Skills": [
      {"Skill Cluster": "Category Name", "Your Level": "Moderate", "Suggested Actions & Tools": "..."}
    ],
    "Strong Skills": [
      {"Skill Cluster": "Category Name", "Your Level": "Strong", "Suggested Actions & Tools": "..."}
    ]
  }
}'''

    ACTION_PLAN_PROMPT = f"""
As a senior career strategist and personalized skill coach, design a customized 90-day development plan based on the user's scores and goals.

[User Profile]
- Name: {req.user_data.name}
- Education Level: {req.user_data.education_level}
- Experience Level: {req.user_data.exp_level}
- Professional Domain: {req.user_data.domain}
- Career Goal: {req.user_data.career_goal}

[Assessment Scores]
- MCQ Scores: {json.dumps(req.mcq_scores)}
- Open-Ended Scores: {json.dumps(req.open_scores)}
- Strong Skill Areas: {', '.join(req.strong_categories) or 'None'}
- Weak Skill Areas: {', '.join(req.weak_categories) or 'None'}

Instructions:
1. Group skills into **Weak**, **Moderate**, and **Strong** based on scores.
2. For each, provide 12–15 word **measurable and realistic** actions using tools, resources, or tasks.
3. Keep actions specific and tailored to the career goal.

Return strictly in this JSON format:
{example_format}
"""

    def get_fallback_action_plan():
        return {
            "action_plan": {
                "Weak Skills": [
                    {
                        "Skill Cluster": "Time Management",
                        "Your Level": "Weak",
                        "Suggested Actions & Tools": "Use Pomodoro method daily to improve focus and task efficiency"
                    }
                ],
                "Moderate Skills": [
                    {
                        "Skill Cluster": "Communication",
                        "Your Level": "Moderate",
                        "Suggested Actions & Tools": "Join weekly Toastmasters to refine structured speaking and feedback"
                    }
                ],
                "Strong Skills": [
                    {
                        "Skill Cluster": "Problem Solving",
                        "Your Level": "Strong",
                        "Suggested Actions & Tools": "Take lead on project sprints to apply logic under time pressure"
                    }
                ]
            }
        }

    try:
        response = gemini_model.generate_content(ACTION_PLAN_PROMPT)
        raw_text = response.text.strip()
        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        action_plan = json.loads(clean_text)

        if "action_plan" not in action_plan:
            raise ValueError("Missing 'action_plan' key in Gemini response")

        return action_plan

    except Exception as e:
        print(f"[ERROR] Gemini action plan generation failed: {str(e)}")
        return get_fallback_action_plan()

class GrowthSourcesRequest(BaseModel):
    user_data: UserProfile
    weak_categories: List[str]
    strong_categories: List[str]
    projection: Dict[str, Dict[str, float]]

@app.post("/generate_growth_sources")
def generate_growth_sources(req: GrowthSourcesRequest):
    """Generate credible sources for growth projection"""

    # Safely extract projection data with error handling
    try:
        growth_proj = req.projection.get('growth_projection', {})
        current_score = growth_proj.get('current_score', 0.0)
        three_months = growth_proj.get('3_months', 0.0)
        six_months = growth_proj.get('6_months', 0.0)
        twelve_months = growth_proj.get('12_months', 0.0)
    except (KeyError, AttributeError, TypeError) as e:
        print(f"[ERROR] Error accessing projection data: {str(e)}")
        print(f"[DEBUG] Projection structure: {req.projection}")
        # Use default values
        current_score = 0.0
        three_months = 0.0
        six_months = 0.0
        twelve_months = 0.0

    GROWTH_SOURCES_PROMPT = f"""
As a career market analyst and researcher, provide high-confidence references to support projected skill growth timelines for a user.

[User Context]
- Domain: {req.user_data.domain}
- Career Goal: {req.user_data.career_goal}
- Experience Level: {req.user_data.exp_level}
- Weak Skill Categories: {', '.join(req.weak_categories) if req.weak_categories else 'None'}
- Strong Skill Categories: {', '.join(req.strong_categories) if req.strong_categories else 'None'}

[Growth Projection Scores]
- Current: {current_score:.1f}
- 3 Months: {three_months:.1f}
- 6 Months: {six_months:.1f}
- 12 Months: {twelve_months:.1f}

Instructions:
1. For each timeframe (Current, 3 Months, 6 Months, 12 Months), give 1 reliable source supporting that level of growth.
2. Tailor the context to the user's domain and career goal.
3. Use only respected industry sources (LinkedIn, WEF, NASSCOM, McKinsey, academic reports, etc).
4. Format each as:
   Source Name – Context – URL

Return valid JSON:
{{
  "sources": {{
    "Current": "Source – Context – URL",
    "3 Months": "Source – Context – URL",
    "6 Months": "Source – Context – URL",
    "12 Months": "Source – Context – URL"
  }}
}}
"""

    def get_fallback_growth_sources():
        return {
            "sources": {
                "Current": "LinkedIn Talent Insights – Growing demand in your domain – https://linkedin.com",
                "3 Months": "WEF Future of Jobs Report – Skills needed for career growth – https://weforum.org",
                "6 Months": "McKinsey Industry Report – Career progression paths – https://mckinsey.com",
                "12 Months": "Deloitte Talent Trends – Long-term career development – https://deloitte.com"
            }
        }

    try:
        response = gemini_model.generate_content(GROWTH_SOURCES_PROMPT)
        raw_text = response.text.strip()
        clean_text = re.sub(r"^```json\s*|```$", "", raw_text, flags=re.DOTALL).strip()
        sources = json.loads(clean_text)

        if "sources" not in sources:
            raise ValueError("Missing 'sources' key in Gemini response")

        return sources

    except Exception as e:
        print(f"[ERROR] Gemini growth sources generation failed: {str(e)}")
        return get_fallback_growth_sources()
