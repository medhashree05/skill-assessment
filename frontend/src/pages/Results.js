import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Results.css';
import { LuBrain } from "react-icons/lu";
import { MdOutlineWorkOutline } from "react-icons/md";
import { IoPeopleOutline, IoInformationCircleOutline } from "react-icons/io5";
import { GiHealthPotion } from "react-icons/gi";
import { MdFamilyRestroom } from "react-icons/md";

function Results() {
  const location = useLocation();
  const navigate = useNavigate();

  const userInfo = location.state?.userInfo || {};
  const {
    mcqAnswers = {},
    openEndedResponses = {},
    openEndedScores = [],
    totalMCQs = 0,
    totalScore = 0,
    categoryScores = {},
    questions = [],
  } = location.state || {};

  const skillIcons = {
    "Cognitive & Creative Skills": <LuBrain />,
    "Work & Professional Behavior": <MdOutlineWorkOutline />,
    "Emotional & Social Competence": <IoPeopleOutline />,
    "Personal Management & Wellness": <GiHealthPotion />,
    "Family & Relationships": <MdFamilyRestroom />
  };

  const [barChartData, setBarChartData] = useState([]);
  const [skillsData, setSkillsData] = useState([]);
  const [tooltips, setTooltips] = useState({});

  // Helper: fetch tooltip from backend with defensive checks
  async function fetchTooltip(category, userScore, marketScore, userProfile) {
    try {
      const response = await fetch("https://skill-assessment-n1dm.onrender.com/generate_tooltips", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          user_score: userScore,
          benchmark_score: marketScore,
          user_profile: {
            age: Number(userProfile.age) || 0,
            education_level: userProfile.educationLevel || "",
            field: userProfile.currentRole || userProfile.field || "",
            interests: userProfile.hobbies
              ? userProfile.hobbies.split(',').map(s => s.trim())
              : (userProfile.interests || []),
            aspirations: userProfile.careerGoals || userProfile.aspiration || "",
          }
        })
      });

      if (!response.ok) throw new Error('Failed to get tooltip');
      const data = await response.json();

      return data;
    } catch (err) {
      console.error(`Error fetching tooltip for ${category}:`, err);
      return { user_tooltip: "", benchmark_tooltip: "" };
    }
  }

  // Aggregate open-ended scores by category and compute averages
  const openEndedCategoryScores = {};
  openEndedScores.forEach(({ category, score }) => {
    if (!openEndedCategoryScores[category]) {
      openEndedCategoryScores[category] = [];
    }
    openEndedCategoryScores[category].push(score);
  });
  const openEndedCategoryAverages = {};
  Object.entries(openEndedCategoryScores).forEach(([category, scores]) => {
    openEndedCategoryAverages[category] = scores.reduce((a, b) => a + b, 0) / scores.length;
  });

  // Calculate combined weighted scores and prepare chart data
  useEffect(() => {
    const allCategories = new Set([
      ...Object.keys(categoryScores),
      ...Object.keys(openEndedCategoryAverages),
    ]);

    const updatedBarChartData = [];
    const updatedSkillsData = [];

    allCategories.forEach((category) => {
      const mcqScore = categoryScores[category] || 0;
      const openScore = openEndedCategoryAverages[category] || 0;

      // Weight MCQ 70%, open-ended 30%
      const weightedScore = Math.round((mcqScore * 0.7) + (openScore * 0.3));

      updatedSkillsData.push({
        skill: category,
        percentage: weightedScore,
      });

      updatedBarChartData.push({
        label: category,
        value: weightedScore,
        market: Math.round(Math.random() * 30 + 60), // Replace with real market data when available
      });
    });

    setSkillsData(updatedSkillsData);
    setBarChartData(updatedBarChartData);
  }, [categoryScores, openEndedCategoryAverages]);

  // Fetch tooltips for all valid barChartData entries with small delay to prevent request storm
  useEffect(() => {
    async function generateAllTooltips() {
      const newTooltips = {};

      for (const item of barChartData) {
        // Defensive check for required fields before calling API
        if (!item.label || item.value === undefined || item.market === undefined) {
          console.warn("Skipping invalid barChartData item:", item);
          continue;
        }
        const result = await fetchTooltip(item.label, item.value, item.market, userInfo);
        newTooltips[item.label] = result;

        // Small delay to avoid API overload or rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setTooltips(newTooltips);
    }

    if (barChartData.length && userInfo?.age) {
      generateAllTooltips();
    }
    // Only re-run when barChartData or userInfo.age changes to avoid excessive calls
  }, [barChartData, userInfo.age]);

  // Overall scoring & metrics
  const mcqpercentage = totalMCQs > 0 ? Math.round((totalScore / 160) * 70) : 0;
  const open_ended_percentage = totalMCQs > 0 ? Math.round((totalScore / 50) * 30) : 0;
  const percentage = mcqpercentage + open_ended_percentage;

  const getPerformanceLevel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Developing';
    return 'Needs Improvement';
  };

  const getMarketPercentile = (score) => {
    if (score >= 80) return 'Top 10%';
    if (score >= 60) return 'Top 25%';
    if (score >= 40) return 'Bottom 40%';
    return 'Bottom 20%';
  };

  const getSalaryRangeINR = (score) => {
    if (score >= 80) return '₹12L – ₹16L';
    if (score >= 60) return '₹9L – ₹12L';
    if (score >= 40) return '₹6L – ₹9L';
    return '₹3L – ₹6L';
  };

  const getSalaryRangeUSD = (score) => {
    if (score >= 80) return '$80k – $100k';
    if (score >= 60) return '$65k – $80k';
    if (score >= 40) return '$50k – $65k';
    return '$30k – $45k';
  };

  const salaryRangeINR = getSalaryRangeINR(percentage);
  const salaryRangeUSD = getSalaryRangeUSD(percentage);

  const getPercentileNumber = (percentileText) => {
    const match = percentileText.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const percentileText = getMarketPercentile(percentage);
  const percentileNumber = getPercentileNumber(percentileText);

  const barMessage = `You're ahead of ${percentileNumber}% of students who took this test.`;

  // Strongest skill logic
  const getStrongestSkill = () => {
    if (Object.keys(categoryScores).length === 0) return 'Strategic Thinking';

    let strongestSkill = '';
    let highestScore = 0;

    Object.entries(categoryScores).forEach(([category, score]) => {
      const perc = (score / 160) * 100;
      if (perc > highestScore) {
        highestScore = perc;
        strongestSkill = category;
      }
    });

    return strongestSkill || 'Strategic Thinking';
  };
  const strongestSkill = getStrongestSkill();
  const strongestSkillIcon = skillIcons[strongestSkill.trim()] || "💜";

  // Navigation handlers
  const handleRetakeAssessment = () => navigate('/');
  const handleDownloadReport = () => {
    const reportHTML = generateReportHTML();
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Skill_Assessment_Report.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Report generation function (unchanged, can be added here or imported)
  const generateReportHTML = () => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Skill Assessment Report</title>
      <style>/* Your styles here (same as before) */</style>
      </head><body>
      <h1>Skill Assessment Report for ${userInfo.fullName || 'Candidate'}</h1>
      <p>Date: ${currentDate}</p>
      <p>Overall Score: ${percentage}% (${getPerformanceLevel(percentage)})</p>
      <p>Market Percentile: ${percentileText}</p>
      <p>Salary Range: ${salaryRangeUSD} / ${salaryRangeINR}</p>
      <!-- Add more detailed report content here as needed -->
      </body></html>
    `;
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <div className="trophy-icon">🏆</div>
        <h1>Congratulations, {userInfo.fullName}</h1>
        <p>Your skill assessment is complete. Here's your personalized performance analysis with market insights.</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="info-icon" style={{ fontSize: '26px' }}>
            <IoInformationCircleOutline />
            <div className="tooltip">
              This score combines your MCQ and open-ended results to show current readiness. With effort, this will grow quickly.
            </div>
          </div>
          <div className="score-display" style={{ position: 'relative' }}>
            <span className="score-number">{percentage}.0%</span>
            <span className="score-label">Overall Score</span>
            <span className="score-status">{getPerformanceLevel(percentage)}</span>
          </div>
        </div>

        <div className="summary-card">
          <div className="percentile-display">
            <div className="percentile-icon">👥</div>
            <span className="percentile-label">{percentileText}</span>
            <span className="percentile-desc">Market Percentile</span>
            <div className="percentile-text">{barMessage}</div>
            <div className="percentile-bar-container">
              <div
                className="percentile-bar-fill"
                style={{ width: `${percentileNumber}%` }}
              >
                <div className="you-are-here-label">You are here</div>
              </div>
              <div className="percentile-bar-bg"></div>
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="tooltip-wrapper">
            <div className="tooltip-icon"><IoInformationCircleOutline />
              <span className="tooltip-text">
                You’re great at breaking down complex problems and making thoughtful decisions.
              </span>
            </div>
          </div>
          <div className="skill-display">
            <div className="skill-icon">{strongestSkillIcon}</div>
            <span className="skill-label">{strongestSkill}</span>
            <span className="skill-desc">Strongest Skill</span>
          </div>
        </div>
      </div>

      <div className="analysis-grid">
        <div className="bar-chart-container">
          <div className="bar-chart">
            {barChartData.map((item, index) => (
              <div key={index} className="bar-chart-item">
                <div className="bar-chart-bar">
                  <div className="tooltip-wrapper">
                    <div
                      className="bar-chart-fill-user"
                      style={{ height: `${item.value}%` }}
                    ></div>
                    <div className="tooltip-text">
                      {tooltips[item.label]?.user_tooltip || "Loading..."}
                    </div>
                  </div>
                  <div className="tooltip-wrapper">
                    <div
                      className="bar-chart-fill-market"
                      style={{ height: `${item.market || 60}%` }}
                    ></div>
                    <div className="tooltip-text">
                      {tooltips[item.label]?.benchmark_tooltip || "Loading..."}
                    </div>
                  </div>
                </div>
                <div className="bar-chart-label">{item.label.split(' ')[0]}</div>
              </div>
            ))}
          </div>

          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-color user-color"></div>
              <span>Your Performance</span>
            </div>
            <div className="legend-item">
              <div className="legend-color market-color"></div>
              <span>Market Average</span>
            </div>
          </div>
        </div>

        {/* Add your other analysis cards and sections here */}

      </div>

      <div className="action-buttons">
        <button className="retake-btn" onClick={handleRetakeAssessment}>
          🔄 Retake Assessment
        </button>
        <button className="download-btn" onClick={handleDownloadReport}>
          ↓ Download Complete Report
        </button>
      </div>
    </div>
  );
}

export default Results;
