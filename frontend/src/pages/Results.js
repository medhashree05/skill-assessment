import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Results.css';
import { LuBrain } from "react-icons/lu";
import { MdOutlineWorkOutline } from "react-icons/md";
import { IoPeopleOutline } from "react-icons/io5";
import { GiHealthPotion } from "react-icons/gi";
import { MdFamilyRestroom } from "react-icons/md";
import { IoInformationCircleOutline } from "react-icons/io5";
function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const userInfo = location.state?.userInfo || {};
  console.log(userInfo);
  const skillIcons = {
  "Cognitive & Creative Skills": <LuBrain />,
  "Work & Professional Behavior": <MdOutlineWorkOutline />,
  "Emotional & Social Competence": <IoPeopleOutline />,
  "Personal Management & Wellness": <GiHealthPotion />,
  "Family & Relationships": <MdFamilyRestroom />
};
 const {
  mcqAnswers = {},
  openEndedResponses = {},
  openEndedScores = [],
  totalMCQs = 0,
  totalScore = 0,
  categoryScores = {},
  questions = [],
} = location.state || {};
console.log(categoryScores);
const openEndedCategoryScores = {};
openEndedScores.forEach(scoreObj => {
  const { category, score } = scoreObj;
  if (!openEndedCategoryScores[category]) {
    openEndedCategoryScores[category] = [];
  }
  openEndedCategoryScores[category].push(score);
});

const openEndedCategoryAverages = {};
Object.entries(openEndedCategoryScores).forEach(([category, scores]) => {
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  openEndedCategoryAverages[category] = avg;
});

// Average total open-ended score
const openEndedTotalScore = Object.values(openEndedCategoryAverages).reduce((a, b) => a + b, 0) / (Object.keys(openEndedCategoryAverages).length || 1);

  // Calculate percentage
  const mcqpercentage = totalMCQs > 0 ? Math.round((totalScore / 160) * 70) : 0;
  const open_ended_percentage = totalMCQs > 0 ? Math.round((totalScore / 160) * 30) : 0;
  const percentage = mcqpercentage + open_ended_percentage;
  
  // Determine performance level
  const getPerformanceLevel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Developing';
    return 'Needs Improvement';
  };

  // Get market percentile (mock calculation)
  const getMarketPercentile = (score) => {
    if (score >= 80) return 'Top 10%';
    if (score >= 60) return 'Top 25%';
    if (score >= 40) return 'Bottom 40%';
    return 'Bottom 20%';
  };
  
  

// Parse percentile number from string like 'Top 10%', 'Bottom 40%'
const getPercentileNumber = (percentileText) => {
  const match = percentileText.match(/(\d+)%/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0; // fallback if no number found
};
const percentileText = getMarketPercentile(percentage); 
const percentileNumber = getPercentileNumber(percentileText); 


// Text for bar message:
const barMessage = `You're ahead of ${percentileNumber}% of students who took this test.`;


  // Get strongest skill from actual data
  const getStrongestSkill = () => {
    if (Object.keys(categoryScores).length === 0) return 'Strategic Thinking';
    
    let strongestSkill = '';
    let highestScore = 0;
    
    Object.entries(categoryScores).forEach(([category, score]) => {
  const percentage = (score / 160) * 100; // Assuming total = 3
  if (percentage > highestScore) {
    highestScore = percentage;
    strongestSkill = category;
  }
});
    
    return strongestSkill || 'Strategic Thinking';
  };
  const strongestSkill = getStrongestSkill();
const strongestSkillIcon = skillIcons[strongestSkill] || "💜"; // fallback emoji


  // Convert categoryScores to chart data
  const performanceData = Object.entries(categoryScores).map(([category, score]) => ({
  category,
  userScore: Math.round((score / 160) * 100), // Assuming total = 3
  marketAverage: Math.round(Math.random() * 30 + 60)
}));


  // Bar chart data from actual category scores
  const barChartData = Object.entries(categoryScores).map(([category, score]) => ({
  label: category,
  value: Math.round((score / 160) * 100) // Again assuming total = 3
}));


const skillsData = [];

const allCategories = new Set([
  ...Object.keys(categoryScores),
  ...Object.keys(openEndedCategoryAverages)
]);

allCategories.forEach((category) => {
  const mcqScore = categoryScores[category]
  ? (categoryScores[category] / 3) * 100
  : 0;

  const openScore = openEndedCategoryAverages[category] || 0;

  const weightedScore = Math.round((mcqScore * 0.7) + (openScore * 0.3));
  skillsData.push({
    skill: category,
    percentage: weightedScore,
  });
});


  const handleRetakeAssessment = () => {
    navigate('/');
  };

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

  const generateReportHTML = () => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const strongestSkill = getStrongestSkill();
    const marketPercentile = getMarketPercentile(percentage);
    

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skill Assessment Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: #333;
        }
        
        .report-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .report-header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .report-header .subtitle {
            font-size: 16px;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        
        .report-header .date {
            font-size: 14px;
            opacity: 0.8;
        }
        
        .report-content {
            padding: 30px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .section-header h2 {
            color: #667eea;
            font-size: 20px;
            font-weight: 600;
        }
        
        .overview-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .overview-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .overview-item:last-child {
            border-bottom: none;
        }
        
        .overview-label {
            font-weight: 500;
            color: #666;
        }
        
        .overview-value {
            font-weight: 600;
            color: #333;
        }
        
        .performance-cards {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .performance-card {
            background: linear-gradient(135deg, #ff6b9d, #ff8e8e);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
        }
        
        .performance-card.percentile {
            background: linear-gradient(135deg, #4ecdc4, #44a08d);
        }
        
        .performance-card.salary {
            background: linear-gradient(135deg, #f093fb, #f5576c);
        }
        
        .performance-card h3 {
            font-size: 14px;
            margin-bottom: 10px;
            opacity: 0.9;
            font-weight: 500;
        }
        
        .performance-card .value {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .performance-card .label {
            font-size: 12px;
            opacity: 0.8;
        }
        
        .skills-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .skill-item-1 {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .skill-item-1:last-child {
            border-bottom: none;
        }
        
        .skill-name {
            font-weight: 500;
            color: #333;
        }
        
        .skill-percentage {
            font-weight: 600;
            color: #667eea;
            font-size: 16px;
        }
        
        .insights-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
        }
        
        .insight-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
        }
        
        .insight-card:last-child {
            margin-bottom: 0;
        }
        
        .insight-card.strength {
            border-left-color: #28a745;
        }
        
        .insight-card.growth {
            border-left-color: #ffc107;
        }
        
        .insight-card.action {
            border-left-color: #dc3545;
        }
        
        .insight-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .insight-header h4 {
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }
        
        .insight-text {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        }
        
        .action-items {
            list-style: none;
            padding: 0;
        }
        
        .action-items li {
            padding: 8px 0;
            padding-left: 20px;
            position: relative;
            font-size: 14px;
            color: #666;
        }
        
        .action-items li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .report-container {
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>🎯 Skill Assessment Report</h1>
            <div class="subtitle">Comprehensive Analysis for ${userInfo.fullName || 'Candidate'}</div>
            <div class="date">${currentDate}</div>
        </div>
        
        <div class="report-content">
            <div class="section">
                <div class="section-header">
                    <span>📋</span>
                    <h2>Assessment Overview</h2>
                </div>
                <div class="overview-grid">
                    <div>
                        <div class="overview-item">
    <span class="overview-label">Name:</span>
    <span class="overview-value">${userInfo.fullName || 'N/A'}</span>
</div>
<div class="overview-item">
    <span class="overview-label">Education:</span>
    <span class="overview-value">${userInfo.educationLevel || 'N/A'}</span>
</div>
<div class="overview-item">
    <span class="overview-label">Experience:</span>
    <span class="overview-value">${userInfo.workExperience || 'N/A'} years</span>
</div>
<div class="overview-item">
  <span class="overview-label">Professional Domain:</span>
  <span class="overview-value">${userInfo.professionalDomain || 'N/A'}</span>
</div>
<div class="overview-item">
  <span class="overview-label">Career Goals:</span>
  <span class="overview-value">${userInfo.careerGoals || 'N/A'}</span>
</div>


                    </div>
                    <div>
                    <div class="overview-item">
  <span class="overview-label">Hobbies / Interests:</span>
  <span class="overview-value">${userInfo.hobbies || 'N/A'}</span>
</div>
<div class="overview-item">
  <span class="overview-label">Preferred Language:</span>
  <span class="overview-value">${userInfo.preferredLanguage || 'N/A'}</span>
</div>
                        <div class="overview-item">
                            <span class="overview-label">Assessment Date:</span>
                            <span class="overview-value">${currentDate}</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Questions Completed:</span>
                            <span class="overview-value">${totalMCQs} MCQ + 3 Open ended</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Duration:</span>
                            <span class="overview-value">Comprehensive Assessment</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header">
                    <span>🏆</span>
                    <h2>Overall Performance</h2>
                </div>
                <div class="performance-cards">
                    <div class="performance-card">
                        <h3>Overall Score</h3>
                        <div class="value">${percentage}.0%</div>
                        <div class="label">${getPerformanceLevel(percentage)}</div>
                    </div>
                    <div class="performance-card percentile">
                        <h3>Market Percentile</h3>
                        <div class="value">${marketPercentile}</div>
                        <div class="label">${getPerformanceLevel(percentage)}</div>
                    </div>
                    <div class="performance-card salary">
                        <h3>Salary Range</h3>
                        <div class="value">$45k - $65k</div>
                        <div class="label">Market Range</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header">
                    <span>🎯</span>
                    <h2>Skills Analysis</h2>
                </div>
                <div class="skills-list">
                    ${skillsData.map(skill => `
                        <div class="skill-item-1">
                            <span class="skill-name">${skill.skill}</span>
                            <span class="skill-percentage">${skill.percentage}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="section">
                <div class="section-header">
                    <span>💡</span>
                    <h2>Personalized Insights</h2>
                </div>
                <div class="insights-section">
                    <div class="insight-card strength">
                        <div class="insight-header">
                            <span>⭐</span>
                            <h4>Your Strengths</h4>
                        </div>
                        <div class="insight-text">
                            ${strongestSkill} is your superpower! You scored ${skillsData.find(s => s.skill === strongestSkill)?.percentage || 0}%, which puts you ahead of most experienced professionals in this area.
                        </div>
                    </div>
                    
                    <div class="insight-card growth">
                        <div class="insight-header">
                            <span>🌱</span>
                            <h4>Growth Opportunities</h4>
                        </div>
                        <div class="insight-text">
                            ${strongestSkill} presents your biggest opportunity for growth. Focusing here could significantly boost your overall profile.
                        </div>
                    </div>
                    
                    <div class="insight-card action">
                        <div class="insight-header">
                            <span>🎯</span>
                            <h4>Action Plan</h4>
                        </div>
                        <ul class="action-items">
                            <li>Focus on developing strategic thinking through targeted learning</li>
                            <li>Leverage your ${strongestSkill.toLowerCase()} expertise in leadership roles</li>
                            <li>Consider mentorship opportunities in your field of strength</li>
                            <li>Join professional communities to network and learn</li>
                        </ul>
                    </div>
                </div>
                <!-- Market Intelligence Section -->
<div class="section">
  <div class="section-header" style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #e9ecef;">
    <span>📊</span>
    <h2 style="color:#667eea;font-size:20px;font-weight:600;">Market Intelligence</h2>
  </div>
  <div class="insights-section" style="background:#ffece6;padding:20px;border-radius:10px;margin-top:10px;">
    <div class="insight-card" style="background:white;padding:15px;border-radius:8px;margin-bottom:15px;border-left:4px solid #ff6b6b;">
      <div class="insight-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span>📉</span>
        <h4 style="font-size:16px;font-weight:600;color:#333;">Industry Position</h4>
      </div>
      <div class="insight-text" style="font-size:14px;color:#666;line-height:1.5;">
        Based on current market data, you rank in the <strong>Bottom 40%</strong> of professionals in your field. This positions you as <strong>developing</strong> in today’s job market.
      </div>
    </div>

    <div class="insight-card" style="background:white;padding:15px;border-radius:8px;margin-bottom:15px;border-left:4px solid #f093fb;">
      <div class="insight-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span>💰</span>
        <h4 style="font-size:16px;font-weight:600;color:#333;">Earning Potential</h4>
      </div>
      <div class="insight-text" style="font-size:14px;color:#666;line-height:1.5;">
        Your skill profile suggests a market salary range of <strong>$45k - $65k</strong>, reflecting your current competency level and growth trajectory.
      </div>
    </div>

    <div class="insight-card" style="background:white;padding:15px;border-radius:8px;margin-bottom:0;border-left:4px solid #4ecdc4;">
      <div class="insight-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span>📈</span>
        <h4 style="font-size:16px;font-weight:600;color:#333;">Industry Trends</h4>
      </div>
      <div class="insight-text" style="font-size:14px;color:#666;line-height:1.5;">
        <ul style="padding-left:20px;list-style-type:disc;">
          <li>Remote work skills are increasingly valued</li>
          <li>Digital literacy is essential across all roles</li>
          <li>Soft skills command premium salaries</li>
          <li>Continuous learning is a key differentiator</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- 90-Day Development Plan Section -->
<div class="section">
  <div class="section-header" style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #e9ecef;">
    <span>🧭</span>
    <h2 style="color:#667eea;font-size:20px;font-weight:600;">90-Day Development Plan</h2>
  </div>
  <div class="insights-section" style="background:#e3f2fd;padding:20px;border-radius:10px;margin-top:10px;">
    <div class="insight-card" style="background:white;padding:15px;border-radius:8px;margin-bottom:15px;border-left:4px solid #1e88e5;">
      <div class="insight-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span>📅</span>
        <h4 style="font-size:16px;font-weight:600;color:#333;">Days 1–30</h4>
      </div>
      <div class="insight-text" style="font-size:14px;color:#666;line-height:1.5;">
        Focus on strategic thinking — Take online courses, practice daily, and seek feedback from peers.
      </div>
    </div>

    <div class="insight-card" style="background:white;padding:15px;border-radius:8px;margin-bottom:15px;border-left:4px solid #43a047;">
      <div class="insight-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span>🔨</span>
        <h4 style="font-size:16px;font-weight:600;color:#333;">Days 31–60</h4>
      </div>
      <div class="insight-text" style="font-size:14px;color:#666;line-height:1.5;">
        Apply your strategic thinking in real projects while continuing to develop weaker areas.
      </div>
    </div>

    <div class="insight-card" style="background:white;padding:15px;border-radius:8px;margin-bottom:0;border-left:4px solid #f9a825;">
      <div class="insight-header" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span>🤝</span>
        <h4 style="font-size:16px;font-weight:600;color:#333;">Days 61–90</h4>
      </div>
      <div class="insight-text" style="font-size:14px;color:#666;line-height:1.5;">
        Seek mentorship, join professional communities, and prepare for reassessment to track progress.
      </div>
    </div>
  </div>
</div>

            </div>
        </div>
    </div>
</body>
</html>`;
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
           <div className="info-icon" style={{fontSize:'26px'}}><IoInformationCircleOutline/>
      <div className="tooltip">
        This score combines your MCQ and open-ended results to show current readiness. With effort, this will grow quickly.
      </div>
    </div>
  <div className="score-display" style={{ position: 'relative' }}>
    <span className="score-number">{percentage}.0%</span>
    <span className="score-label">Overall Score</span>
    <span className="score-status">{getPerformanceLevel(percentage)}</span>
    
    {/* Info icon */}
   
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
        <div className="analysis-card">
          <div className="card-header">
            <span className="card-icon">📊</span>
            <h3>Your Performance vs Market Standards</h3>
            <p>Comparing your skills with advanced level professionals</p>
          </div>
          <div className="bar-chart-container-2">
  <div className="bar-chart-2">
    {barChartData.map((item, index) => (
      <div key={index} className="bar-chart-item-2">
        <div className="bar-chart-bar-2">
          <div 
            className="bar-chart-fill-user" 
            style={{ height: `${item.value}%` }}
          ></div>
          <div 
            className="bar-chart-fill-market" 
            style={{ height: `${item.market || 60}%` }}  // Static or dynamic market score
          ></div>
        </div>
        <div className="bar-chart-label-2">{item.label.split(' ')[0]}</div>
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

        </div>

        <div className="analysis-card">
          <div className="card-header">
            <span className="card-icon">⚠️</span>
            <h3>Skills Distribution</h3>
            <p>Visual breakdown of your competencies</p>
          </div>
          <div className="skills-list-2">
            {skillsData.map((skill, index) => (
  <div key={index} className="skill-item-2">
    <div className="skill-info-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span className="skill-icon-2" style={{ fontSize: '20px' }}>
        {skillIcons[skill.skill] || '🎯'}
      </span>
      <span className="skill-name-2">{skill.skill}</span>
      <span className="percentage-text-2">{skill.percentage}%</span>
    </div>
   <div className="percentage-bar-2">
  <div className="percentage-fill-2" style={{ width: `${skill.percentage}%` }}></div>


</div>
  </div>
))}

          </div>
        </div>

        <div className="analysis-card">
          <div className="card-header">
            <span className="card-icon">📈</span>
            <h3>Growth Projection</h3>
            <p>Estimated improvement trajectory</p>
          </div>
          <div className="growth-chart">
            <div className="chart-placeholder">
              <div className="growth-line"></div>
              <div className="growth-points">
                <div className="point start-point"></div>
                <div className="point mid-point"></div>
                <div className="point end-point"></div>
              </div>
            </div>
            <div className="growth-timeline">
              <span>Current</span>
              <span>3 Months</span>
              <span>6 Months</span>
              <span>12 Months</span>
            </div>
            <div className="growth-insight">
              <span className="insight-icon">💡</span>
              <p>With focused development, you could improve by up to 25 points in the next year!</p>
            </div>
          </div>
        </div>

        <div className="analysis-card">
          <div className="card-header">
            <span className="card-icon">📊</span>
            <h3>Market Position Analysis</h3>
            <p>Where you stand in the job market</p>
          </div>
          <div className="market-position">
            <div className="position-badge">
              <span className="position-icon">📝</span>
              <div className="position-info">
                <span className="position-title">Emerging Talent</span>
                <span className="position-desc">Great potential for rapid growth and development</span>
              </div>
            </div>
            <div className="market-metrics">
              <div className="metric">
                <span className="metric-label">Industry Readiness</span>
                <div className="metric-bar">
                  <div className="metric-fill" style={{ width: '65%' }}></div>
                </div>
                <span className="metric-value">65%</span>
              </div>
              <div className="salary-range">
                <div className="salary-item">
                  <span className="salary-label">0+</span>
                  <span className="salary-desc">Years Experience Equivalent</span>
                </div>
                <div className="salary-item">
                  <span className="salary-label">$45k</span>
                  <span className="salary-desc">Market Salary Range</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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