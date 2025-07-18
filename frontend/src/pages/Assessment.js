import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Assessment.css';
import Papa from 'papaparse';
 
const loadQuestions = async ({
  setQuestions,
  setCategories,
  setCategoryProgress,
  setCurrentCategory,
  setLoading,
  setError
}) => {
              
  try {
    const response = await fetch('/questions.csv');
    if (!response.ok) throw new Error('Failed to load questions');
    const csvText = await response.text();
    const parsedData = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    const parsedQuestions = parsedData.data.map((row) => ({
      id: row['ID']?.trim(),
      pillar: row['Pillar']?.trim(),
      subDomain: row['Sub-domain']?.trim(),
      category: row['Category']?.trim(),
      difficulty: row['Difficulty']?.trim(),
      questionText: row['Question Text']?.trim(),
      optionA: row['Option A']?.trim(),
      optionB: row['Option B']?.trim(),
      optionC: row['Option C']?.trim(),
      optionD: row['Option D']?.trim(),
      scoreA: parseInt(row['Score A']) || 0,
      scoreB: parseInt(row['Score B']) || 0,
      scoreC: parseInt(row['Score C']) || 0,
      scoreD: parseInt(row['Score D']) || 0,
      branchingLogic: row['Branching Logic']?.trim(),
      branchOptionA: row['Branch_OptionA']?.trim(),
      branchOptionB: row['Branch_OptionB']?.trim(),
      branchOptionC: row['Branch_OptionC']?.trim(),
      branchOptionD: row['Branch_OptionD']?.trim()
    }));

    setQuestions(parsedQuestions);

    const uniqueCategories = [...new Set(parsedQuestions.map(q => q.category))].filter(Boolean);
    setCategories(uniqueCategories);

    const progress = {};
    uniqueCategories.forEach(category => {
      const categoryQuestions = parsedQuestions.filter(q => q.category === category);
      progress[category] = {
        total: categoryQuestions.length,
        answered: 0,
        questions: categoryQuestions
      };
    });
    setCategoryProgress(progress);

    if (uniqueCategories.length > 0) {
      setCurrentCategory(uniqueCategories[0]);
    }

    setLoading(false);
  } catch (err) {
    console.error('Error loading questions:', err);
    setError('Failed to load questions. Please make sure questions.csv is in the public folder and formatted correctly.');
    setLoading(false);
  }
};

function Assessment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [hasRestoredState, setHasRestoredState] = useState(false);
  const userInfo = location.state?.userInfo || {};
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answers, setAnswers] = useState({});
  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('');
  const [categoryProgress, setCategoryProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startTime] = useState(Date.now());
  const [remainingTime, setRemainingTime] = useState(20 * 60); 
  const [assessmentComplete, setAssessmentComplete] = useState(false);

 
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(prevTime => {
        if (prevTime <= 1) {
          handleMCQCompletion();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
  loadQuestions({
    setQuestions,
    setCategories,
    setCategoryProgress,
    setCurrentCategory,
    setLoading,
    setError
  });
}, []);

useEffect(() => {
if (!hasRestoredState && !loading && questions.length > 0 && location.state) {

    setAnswers(previousAnswers);
    setCurrentCategory(previousCategory || categories[0]);
    setCurrentQuestionIndex(previousIndex);
    setRemainingTime(previousRemainingTime);

    
    if (Object.keys(previousProgress).length > 0) {
      setCategoryProgress(previousProgress);
      setCategories(Object.keys(previousProgress));
    } else {
      const progress = {};
      categories.forEach(category => {
        const categoryQuestions = questions.filter(q => q.category === category);
        progress[category] = {
          total: categoryQuestions.length,
          answered: categoryQuestions.filter(q => previousAnswers[q.id]).length,
          questions: categoryQuestions
        };
      });
      setCategoryProgress(progress);
    }

    const firstQuestion = questions.find(q => q.category === previousCategory) || questions[0];
    setSelectedAnswer(previousAnswers[firstQuestion?.id] || '');

    setHasRestoredState(true);
  }
}, [loading, questions, hasRestoredState]);

const {
  previousAnswers = {},
  previousCategory = '',
  previousIndex = 0,
  previousRemainingTime = 20 * 60,
  previousQuestions = [],
  previousProgress = {}
} = location.state || {};

const handleMCQCompletion = () => {
  const totalQuestions = questions.length;

  let totalScore = 0;
  const categoryScores = {};

  for (const question of questions) {
    const selected = answers[question.id];

    let score = 0;
    switch (selected) {
      case 'A': score = question.scoreA || 0; break;
      case 'B': score = question.scoreB || 0; break;
      case 'C': score = question.scoreC || 0; break;
      case 'D': score = question.scoreD || 0; break;
    }

    totalScore += score;

    if (question.category) {
      if (!categoryScores[question.category]) {
        categoryScores[question.category] = 0;
      }
      categoryScores[question.category] += score;
    }
  }

  navigate('/mcq-completion', {
    state: {
      answers,
      totalQuestions,
      currentCategory,
      currentQuestionIndex,
      remainingTime,
      questions,
      categoryProgress,
      totalScore,         
      categoryScores,
      userInfo     
    }
  });
};

  const getCurrentCategoryQuestions = () => {
    return questions.filter(q => q.category === currentCategory);
  };

  const getCurrentQuestion = () => {
    const categoryQuestions = getCurrentCategoryQuestions();
    return categoryQuestions[currentQuestionIndex] || null;
  };

  const handleAnswerSelect = (option) => {
    setSelectedAnswer(option);
  };

  const handleNext = () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

   const newAnswers = {
  ...answers,
  [currentQuestion.id]: selectedAnswer
};
setAnswers(newAnswers);

const newProgress = { ...categoryProgress };
Object.keys(newProgress).forEach(cat => {
  const answeredCount = newProgress[cat].questions.filter(q => newAnswers[q.id]).length;
  newProgress[cat].answered = answeredCount;
});
setCategoryProgress(newProgress);
    const categoryQuestions = getCurrentCategoryQuestions();
    
    if (currentQuestionIndex < categoryQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(answers[categoryQuestions[currentQuestionIndex + 1]?.id] || '');
    } else {
      const currentCategoryIndex = categories.indexOf(currentCategory);
      if (currentCategoryIndex < categories.length - 1) {
        const nextCategory = categories[currentCategoryIndex + 1];
        setCurrentCategory(nextCategory);
        setCurrentQuestionIndex(0);
        const nextCategoryQuestions = questions.filter(q => q.category === nextCategory);
        setSelectedAnswer(answers[nextCategoryQuestions[0]?.id] || '');
      } else {
        handleMCQCompletion();
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const categoryQuestions = getCurrentCategoryQuestions();
      setSelectedAnswer(answers[categoryQuestions[currentQuestionIndex - 1]?.id] || '');
    } else {
      const currentCategoryIndex = categories.indexOf(currentCategory);
      if (currentCategoryIndex > 0) {
        const prevCategory = categories[currentCategoryIndex - 1];
        setCurrentCategory(prevCategory);
        const prevCategoryQuestions = questions.filter(q => q.category === prevCategory);
        setCurrentQuestionIndex(prevCategoryQuestions.length - 1);
        setSelectedAnswer(answers[prevCategoryQuestions[prevCategoryQuestions.length - 1]?.id] || '');
      }
    }
  };

  const handleQuestionJump = (questionNum) => {
    const categoryQuestions = getCurrentCategoryQuestions();
    if (questionNum >= 1 && questionNum <= categoryQuestions.length) {
      setCurrentQuestionIndex(questionNum - 1);
      setSelectedAnswer(answers[categoryQuestions[questionNum - 1]?.id] || '');
    }
  };

  const getTotalProgress = () => {
    const total = Object.values(categoryProgress).reduce((sum, cat) => sum + cat.total, 0);
    const answered = Object.values(categoryProgress).reduce((sum, cat) => sum + cat.answered, 0);
    return { total, answered };
  };

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        Loading questions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div>
          <h2>Error Loading Questions</h2>
          <p>{error}</p>
          <p>Please ensure your questions.csv file is in the public folder with the correct format.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();
  const categoryQuestions = getCurrentCategoryQuestions();
  const totalProgress = getTotalProgress();
  const currentCategoryIndex = categories.indexOf(currentCategory);

  return (
    <div className="assessment-app">
      <div className="header">
        <h1 className="header-title">Skill Assessment</h1>
        <div className="timer">
          <span className="timer-icon">🕐</span>
          {formatTime(remainingTime)}
        </div>
      </div>

      <div className="main-content">
        <div className="sidebar">
          <div className="progress-section">
            <h3 className="progress-title">Categories</h3>
            <div className="progress-text">
              {totalProgress.answered} of {totalProgress.total} completed
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{
                  width: `${(totalProgress.answered / totalProgress.total) * 100}%`
                }}
              />
            </div>
          </div>

          {categories.map((category) => (
            <div
              key={category}
              onClick={() => {
                setCurrentCategory(category);
                setCurrentQuestionIndex(0);
                const categoryQuestions = questions.filter(q => q.category === category);
                setSelectedAnswer(answers[categoryQuestions[0]?.id] || '');
              }}
              className={`category-item ${category === currentCategory ? 'active' : ''}`}
            >
              <div className="category-name">{category}</div>
              <div className="category-progress">
                {categoryProgress[category]?.answered || 0}/{categoryProgress[category]?.total || 0} answered
              </div>

              {category === currentCategory && (
                <div className="question-numbers">
                  {Array.from({ length: categoryProgress[category]?.questions.length || 0 }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuestionJump(num);
                      }}
                      className={`question-number ${num === currentQuestionIndex + 1 ? 'current' : ''} ${
                        answers[categoryProgress[category]?.questions[num - 1]?.id] ? 'answered' : ''
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="question-area">
          {currentQuestion && (
            <div className="question-card">
              <div className="question-header">
                <h2 className="question-category">{currentCategory}</h2>
                <div className="question-counter">
                  Question {currentQuestionIndex + 1} of {categoryQuestions.length}
                </div>
              </div>

              <div className="question-content">
                <h3 className="question-text">
                  {currentQuestion.questionText}
                </h3>
                
                <div className="options-container">
                  {[
                    { key: 'A', text: currentQuestion.optionA },
                    { key: 'B', text: currentQuestion.optionB },
                    { key: 'C', text: currentQuestion.optionC },
                    { key: 'D', text: currentQuestion.optionD }
                  ].filter(option => option.text).map(option => (
                    <label key={option.key} className={`option-label ${selectedAnswer === option.key ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="answer"
                        value={option.key}
                        checked={selectedAnswer === option.key}
                        onChange={() => handleAnswerSelect(option.key)}
                        className="option-radio"
                      />
                      <span className="option-text">{option.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="navigation">
                <button 
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0 && currentCategoryIndex === 0}
                  className="nav-button prev-button"
                >
                  ← Previous
                </button>
                
                <div className="category-indicator">
                  Category {currentCategoryIndex + 1} of {categories.length}
                </div>
                
                <button 
                  onClick={handleNext}
                  disabled={!selectedAnswer}
                  className="nav-button next-button"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Assessment;