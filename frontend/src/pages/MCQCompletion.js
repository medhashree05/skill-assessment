import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './MCQCompletion.css';

function MCQCompletion() {
  const navigate = useNavigate();
  const location = useLocation();
  const questions = location.state?.questions || [];
  const userInfo = location.state?.userInfo || {};
  
 const {
  answers = {},
  totalQuestions = 40,
  currentCategory = '',
  currentQuestionIndex = 0,
  remainingTime = 20 * 60,
  categoryProgress = {},
  totalScore = 0,
  categoryScores = {}
} = location.state || {};

  const handleGoBack = () => {
  navigate('/assessment', {
    state: {
      previousAnswers: answers,
      previousCategory: currentCategory,
      previousIndex: currentQuestionIndex,
      previousRemainingTime: remainingTime,
      previousQuestions: location.state?.questions || [],
      previousProgress: categoryProgress

    }
  });
  setTimeout(() => {
    window.location.reload();
  }, 0); 
};
const generateOpenEndedQuestions = async () => {
  const payload = {
    user_profile: userInfo,  
    mcq_scores: categoryScores  
  };

  try {
    const response = await fetch("http://127.0.0.1:8000/generate_open_ended_questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to generate open-ended questions");
    }

    const data = await response.json();
    return data.questions || [];
  } catch (error) {
    console.error("Error generating open-ended questions:", error);
    return [];
  }
};



  // ✅ Proceed to open-ended section with MCQ responses
const handleProceedToOpenEnded = async () => {
  const generatedQuestions = await generateOpenEndedQuestions();

  navigate('/open-ended-questions', { 
    state: { 
      mcqAnswers: answers,
      totalMCQs: totalQuestions,
      totalScore,
      categoryScores,
      questions: generatedQuestions,
      userInfo
    } 
  });
};



  return (
    <div className="mcq-completion-container">
      <div className="completion-content">
        <button 
          onClick={handleGoBack}
          className="back-button"
        >
          ← Go Back to Questions
        </button>

        <div className="completion-main">
          <h1 className="completion-title">MCQ Section Completed!</h1>
          <p className="completion-subtitle">
            Great job! You've completed all {totalQuestions} multiple choice questions.
          </p>

          <div className="next-section-card">
            <div className="section-header">
              <div className="check-icon">✓</div>
              <h2 className="section-title">Ready for Open-Ended Questions</h2>
            </div>

            <p className="section-description">
              Next, you'll answer 3 open-ended questions based on your responses. These 
              questions will help us provide more personalized insights.
            </p>

            <div className="important-notice">
              <div className="warning-icon">⚠️</div>
              <div className="notice-content">
                <strong>Important:</strong> Once you proceed to the open-ended questions, you won't be able to go 
                back and modify your previous answers.
              </div>
            </div>

            <div className="expectations-section">
              <h3 className="expectations-title">What to expect:</h3>
              <ul className="expectations-list">
                <li>3 personalized questions based on your responses</li>
                <li>Each question requires thoughtful written answers</li>
                <li>No time limit for this section</li>
                <li>Your answers will enhance your final report</li>
              </ul>
            </div>

            <div className="action-section">
              <button 
                onClick={handleProceedToOpenEnded}
                className="proceed-button"
              >
                → Proceed to Open-Ended Questions
              </button>
              <p className="action-subtitle">
                Take your time to provide thoughtful answers
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MCQCompletion;
