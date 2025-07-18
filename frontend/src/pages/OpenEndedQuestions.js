import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './OpenEndedQuestions.css';

function OpenEndedQuestions() {
  const location = useLocation();
  const navigate = useNavigate(); 

  const userInfo = location.state?.userInfo || {};
    
  const {
    mcqAnswers = {}, 
    totalMCQs = 0,
    totalScore = 0,
    categoryScores = {},
    questions = []
  } = location.state || {};
  
  const [openEndedScores, setOpenEndedScores] = useState([]);

  function mapToBackendPayload(userInfo, categoryScores) {
    return {
      user_profile: {
        age: Number(userInfo.age) || 0,
        education_level: userInfo.educationLevel || "",
        field: userInfo.currentRole || userInfo.field || "",
        interests: userInfo.hobbies
          ? userInfo.hobbies.split(',').map(s => s.trim())
          : (userInfo.interests || []),
        aspirations: userInfo.careerGoals || userInfo.aspiration || "",
      },
      mcq_scores: {
        Cognitive_and_Creative_Skills: categoryScores["Cognitive & Creative Skills"] || 0,
        Work_and_Professional_Behavior: categoryScores["Work & Professional Behavior"] || 0,
        Emotional_and_Social_Competence: categoryScores["Emotional & Social Competence"] || 0,
        Learning_and_Self_Management: categoryScores["Learning & Self Management"] || 0,
        Family_and_Relationships: categoryScores["Family & Relationships"] || 0,
      }
    };
  }

  const [openEndedQuestions, setOpenEndedQuestions] = useState([]);
  // User responses keyed by question index
  const [responses, setResponses] = useState({});

  useEffect(() => {
    async function fetchOpenEndedQuestions() {
      try {
        const payload = mapToBackendPayload(userInfo, categoryScores);

        const response = await fetch('http://localhost:8000/generate_open_ended_questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Response error text:", errorText);
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.questions) {
          throw new Error("API response missing 'questions' array");
        }

        setOpenEndedQuestions(data.questions);

        const initialResponses = {};
        data.questions.forEach((_, idx) => {
          initialResponses[`q${idx + 1}`] = '';
        });
        setResponses(initialResponses);
      } catch (error) {
        console.error('Failed to load open-ended questions:', error);
      }
    }

    fetchOpenEndedQuestions();
  }, [userInfo, categoryScores]);

  // Handle textarea change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setResponses(prev => ({ ...prev, [name]: value }));
  };
  async function scoreOpenEndedResponses(userProfile, questionList, responsesMap) {
  const answers = questionList.map((q, idx) => ({
    question: q.question,
    answer: responsesMap[`q${idx + 1}`] || '',
    categories: [q.primary_category, ...(q.secondary_categories || [])]
  }));

  const payload = {
    user_profile: {
      age: Number(userProfile.age) || 0,
      education_level: userProfile.educationLevel || "",
      field: userProfile.currentRole || userProfile.field || "",
      interests: userProfile.hobbies
        ? userProfile.hobbies.split(',').map(s => s.trim())
        : (userProfile.interests || []),
      aspirations: userProfile.careerGoals || userProfile.aspiration || "",
    },
    answers
  };

  const response = await fetch('http://localhost:8000/score_open_ended_responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Scoring API error:", errorText);
    throw new Error("Failed to fetch open-ended scores");
  }

  const data = await response.json();
  if (!data.scores) throw new Error("Response missing 'scores' key");

  return data.scores;
}


  // Submit all answers and navigate to results
  const handleSubmit = async () => {
  try {
    const scores = await scoreOpenEndedResponses(userInfo, openEndedQuestions, responses);
    console.log("open_ended_scores",scores);
    setOpenEndedScores(scores); // optional if you want to show before navigating

    navigate('/results', {
      state: {
        mcqAnswers,
        openEndedResponses: responses,
        openEndedScores: scores,
        totalMCQs,
        totalScore,
        categoryScores,
        questions: openEndedQuestions,
        userInfo,
        responses
      }
    });
  } catch (error) {
    console.error("Error scoring open-ended responses:", error);
    alert("Something went wrong while evaluating your answers. Please try again.");
  }
};


  return (
    <div className="open-ended-container">
      <h1 className="title">Open-Ended Questions</h1>
      <p className="intro-text">
        Based on your responses, please answer the following personalized questions to help us understand your approach.
      </p>

      {openEndedQuestions.length === 0 && (
        <p>Loading your personalized questions...</p>
      )}

      {openEndedQuestions.map((q, index) => (
        <div className="question-block" key={index}>
          <label className="question-label">Question {index + 1} of {openEndedQuestions.length}</label>
          <p className="question-text">{q.question}</p>
          <textarea
            name={`q${index + 1}`}
            value={responses[`q${index + 1}`] || ''}
            onChange={handleChange}
            placeholder="Share your thoughts here... (minimum 50 words recommended)"
          />
        </div>
      ))}

      {openEndedQuestions.length > 0 && (
        <div className="submit-section">
          <button onClick={handleSubmit} className="submit-button">
            ✓ Complete Assessment
          </button>
        </div>
      )}
    </div>
  );
}

export default OpenEndedQuestions;
