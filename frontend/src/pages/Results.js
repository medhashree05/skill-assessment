import {React,useState,useEffect}from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Results.css';
import { LuBrain } from "react-icons/lu";
import { MdOutlineWorkOutline } from "react-icons/md";
import { IoPeopleOutline } from "react-icons/io5";
import { GiHealthPotion } from "react-icons/gi";
import { MdFamilyRestroom } from "react-icons/md";
import { IoInformationCircleOutline } from "react-icons/io5";
import { useMemo, useCallback, useRef } from 'react';

function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const userInfo = location.state?.userInfo;
  const tooltipsFetched = useRef(false);
 
  const skillIcons = { 
    "Cognitive & Creative Skills": <LuBrain />,
    "Work & Professional Behavior": <MdOutlineWorkOutline />,
    "Emotional & Social Competence": <IoPeopleOutline />,
    "Personal Management & Wellness": <GiHealthPotion />,
    "Family & Relationships": <MdFamilyRestroom />
  };
 
  const dummyMarketScores = {
    "Cognitive & Creative Skills": 65,
    "Work & Professional Behavior": 70,
    "Emotional & Social Competence": 60,
    "Personal Management & Wellness": 68,
    "Family & Relationships": 63
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

  const [barChartData, setBarChartData] = useState([]);
  const [skillsData, setSkillsData] = useState([]);
  const [tooltips, setTooltips] = useState({});
  const [loadingTooltips, setLoadingTooltips] = useState(false);
  const [growthProjection, setGrowthProjection] = useState(null);
  const [loadingGrowth, setLoadingGrowth] = useState(false);
  const [growthError, setGrowthError] = useState(null);
  const growthFetched = useRef(false);
  const [marketAnalysis, setMarketAnalysis] = useState(null);
  const [loadingMarketAnalysis, setLoadingMarketAnalysis] = useState(false);
  const [marketAnalysisError, setMarketAnalysisError] = useState(null);
  const marketAnalysisFetched = useRef(false);
  const [peerBenchmark, setPeerBenchmark] = useState(null);
  const [loadingPeerBenchmark, setLoadingPeerBenchmark] = useState(false);
  const [peerBenchmarkError, setPeerBenchmarkError] = useState(null);
  const peerBenchmarkFetched = useRef(false);
  const [actionPlan, setActionPlan] = useState(null);
  const [loadingActionPlan, setLoadingActionPlan] = useState(false);
  const [actionPlanError, setActionPlanError] = useState(null);
  const actionPlanFetched = useRef(false);
  const [growthSources, setGrowthSources] = useState(null);
  const [loadingGrowthSources, setLoadingGrowthSources] = useState(false);
  const [growthSourcesError, setGrowthSourcesError] = useState(null);
  const growthSourcesFetched = useRef(false);
  const [momentumToolkit, setMomentumToolkit] = useState([]);
  const [loadingMomentum, setLoadingMomentum] = useState(false);
  const [momentumError, setMomentumError] = useState(null);
  const momentumFetched = useRef(false);
  const [growthOpportunities, setGrowthOpportunities] = useState([]);
  const [loadingGrowthOpportunities, setLoadingGrowthOpportunities] = useState(false);
  const growthOpportunitiesFetched = useRef(false);
  const [growthOpportunitiesError, setGrowthOpportunitiesError] = useState(null);



  const calculatedData = useMemo(() => {
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

    const openEndedTotalScore = Object.values(openEndedCategoryAverages).reduce((a, b) => a + b, 0) / (Object.keys(openEndedCategoryAverages).length || 1);
    const mcqpercentage = totalMCQs > 0 ? Math.round((totalScore/160) * 70) : 0;
    const open_ended_percentage = totalMCQs > 0 ? Math.round((openEndedTotalScore/50) * 30) : 0;
    const percentage = mcqpercentage + open_ended_percentage;

    // Generate bar chart data
    const allCategories = new Set([
      ...Object.keys(categoryScores),
      ...Object.keys(openEndedCategoryAverages)
    ]);

    const chartData = [];
    allCategories.forEach((category) => {
      const mcq = categoryScores[category] || 0;
      const open = openEndedCategoryAverages[category] || 0;
      const weightedScore = Math.round((mcq / 160) * 70 + (open / 50) * 30);
      chartData.push({
        label: category,
        value: weightedScore,
        market: dummyMarketScores[category] || 65
      });
    });

    // Generate skills data for display
    const skills = chartData.map(item => ({
      skill: item.label,
      percentage: item.value
    }));

    return {
      openEndedCategoryAverages,
      percentage,
      chartData,
      skills
    };
  }, [categoryScores, openEndedScores, totalMCQs, totalScore]);

  // Set initial data only once
  useEffect(() => {
    setBarChartData(calculatedData.chartData);
    setSkillsData(calculatedData.skills);
  }, []); // Empty dependency array - runs only once

  // Memoize fetchTooltip function
  const fetchTooltip = useCallback(async (category, userScore, marketScore, userProfile) => {
    const payload = {
      category,
      user_score: Number(userScore) || 0,
      benchmark_score: Number(marketScore) || 0,
      user_profile: {
        name: userProfile.fullName || "Anonymous",
        age: Number(userProfile.age) || 0,
        education_level: userProfile.educationLevel || "",
        field: userProfile.field || "",
        domain: userProfile.domain || userProfile.field || "General",
        exp_level: userProfile.experienceLevel || "Beginner",
        interests: userProfile.hobbies
          ? userProfile.hobbies.split(',').map(s => s.trim())
          : (userProfile.interests || []),
        career_goal: userProfile.careerGoals || userProfile.aspiration || ""
      }
    };

    try {
      const response = await fetch("https://skill-assessment-n1dm.onrender.com/generate_tooltips", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Tooltip API failed for ${category}`, response.status, errorText);
        throw new Error('Failed to get tooltip');
      }


      const data = await response.json();
      console.log(data);
      return data;
    } catch (err) {
      console.error(`Error fetching tooltip for ${category}:`, err);
      return { user_tooltip: "", benchmark_tooltip: "" };
    }
  }, []); // Empty dependency array since this function doesn't depend on any state

  // Fetch tooltips only once when component mounts and data is ready
  useEffect(() => {
    const generateAllTooltips = async () => {
      // Only fetch if we haven't fetched before, have data, and have userInfo
      if (tooltipsFetched.current || calculatedData.chartData.length === 0 || !userInfo?.fullName) {
        return;
      }

      tooltipsFetched.current = true; // Mark as fetched immediately to prevent duplicate calls
      setLoadingTooltips(true);

      const newTooltips = {};

      try {
        // Use Promise.all to fetch all tooltips concurrently
        const tooltipPromises = calculatedData.chartData.map(async (item) => {
          const { label: category, value: user, market } = item;
          try {
            const result = await fetchTooltip(category, user, market, userInfo);
            return { category, result };
          } catch (err) {
            console.error(`Tooltip failed for ${category}`, err);
            return { category, result: { user_tooltip: "", benchmark_tooltip: "" } };
          }
        });

        const tooltipResults = await Promise.all(tooltipPromises);
        
        tooltipResults.forEach(({ category, result }) => {
          newTooltips[category] = result;
        });
        console.log("🧪 Generating tooltips...");

        setTooltips(newTooltips);
      } catch (error) {
        console.error('Error generating tooltips:', error);
      } finally {
        setLoadingTooltips(false);
      }
    };

    generateAllTooltips();
  }, []); // Empty dependency array - runs only once when component mounts

  useEffect(() => {
  const fetchGrowthProjection = async () => {
    if (
      growthFetched.current ||               // Already fetched
      !userInfo ||                           // User data not available
      skillsData.length === 0                // Skill scores not ready
    ) {
      return;
    }

    growthFetched.current = true; // Prevent future calls
    setLoadingGrowth(true);
    setGrowthError(null);

    const formattedScores = {};
    const formattedBenchmarks = {};

    const mapSkillNameToAPIFormat = (skillName) => {
    const mapping = {
    "Cognitive & Creative Skills": "Cognitive_and_Creative_Skills",
    "Work & Professional Behavior": "Work_and_Professional_Behavior", 
    "Emotional & Social Competence": "Emotional_and_Social_Competence",
    "Personal Management & Wellness": "Learning_and_Self_Management", // Note: API expects "Learning_and_Self_Management"
    "Family & Relationships": "Family_and_Relationships"
  };
  return mapping[skillName] || skillName;
};

skillsData.forEach(skill => {
  const apiSkillName = mapSkillNameToAPIFormat(skill.skill);
  formattedScores[apiSkillName] = skill.percentage || 0;
  formattedBenchmarks[apiSkillName] = dummyMarketScores[skill.skill] || 65;
});

    const payload = {
      user_data: {
        name: userInfo.fullName || "Anonymous",
        age: Number(userInfo.age) || 0,
        education_level: userInfo.educationLevel || "",
        field: userInfo.field || "",
        domain: userInfo.domain || userInfo.field || "General",
        exp_level: userInfo.experienceLevel || "Beginner",
        interests: userInfo.hobbies
          ? userInfo.hobbies.split(',').map(s => s.trim())
          : (userInfo.interests || []),
        career_goal: userInfo.careerGoals || userInfo.aspiration || ""
      },
      user_scores: formattedScores,
      benchmark_scores: formattedBenchmarks
    };

    try {
      const response = await fetch("https://skill-assessment-n1dm.onrender.com/generate_growth_projection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Growth Projection API failed", response.status, errorText);
        throw new Error("Failed to get growth projection");
      }

      const data = await response.json();
      console.log("📈 Growth Projection:", data);
      setGrowthProjection(data);
    } catch (error) {
      console.error("Error fetching growth projection:", error);
      setGrowthError("Failed to load growth projection.");
    } finally {
      setLoadingGrowth(false);
    }
  };

  fetchGrowthProjection();
}, [userInfo, skillsData]);
  useEffect(() => {
  const fetchMarketAnalysis = async () => {
    if (
      marketAnalysisFetched.current ||
      !userInfo ||
      !calculatedData.percentage ||
      barChartData.length === 0
    ) {
      return;
    }

    marketAnalysisFetched.current = true;
    setLoadingMarketAnalysis(true);
    setMarketAnalysisError(null);

    // Prepare formatted benchmark scores for the payload
    const benchmark_scores = {};
    barChartData.forEach(item => {
      benchmark_scores[item.label] = item.market;
    });

    const payload = {
      user_profile: {
        name: userInfo.fullName || "Anonymous",
        age: Number(userInfo.age) || 0,
        education_level: userInfo.educationLevel || "",
        field: userInfo.field || "",
        domain: userInfo.domain || userInfo.field || "General",
        exp_level: userInfo.experienceLevel || "Beginner",
        interests: userInfo.hobbies
          ? userInfo.hobbies.split(',').map(s => s.trim())
          : (userInfo.interests || []),
        career_goal: userInfo.careerGoals || userInfo.aspiration || ""
      },
      final_score: Number(totalScore || 0),
      overall_percentage: calculatedData.percentage || 0,
      tier: growthProjection?.growth_projection?.tier || "Emerging Talent",
      percentile: growthProjection?.growth_projection?.peer_percentile || 50.0,
      strengths: barChartData
        .filter(skill => skill.value >= 65)
        .map(skill => skill.label),
      weaknesses: barChartData
        .filter(skill => skill.value < 50)
        .map(skill => skill.label),
      benchmark_scores
    };

    try {
      const response = await fetch("https://skill-assessment-n1dm.onrender.com/generate_market_analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("Response status:", response.status); // Add this
  console.log("Payload sent:", payload); // Add this
  
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Market Analysis API failed", response.status, errorText);
        throw new Error("Failed to get market analysis");
      }

      const data = await response.json();
      console.log("📊 Market Analysis:", data);
      setMarketAnalysis(data);
    } catch (error) {
      console.error("Error fetching market analysis:", error);
      setMarketAnalysisError("Failed to load market analysis.");
    } finally {
      setLoadingMarketAnalysis(false);
    }
  };

  fetchMarketAnalysis();
}, [userInfo, barChartData, calculatedData.percentage, totalScore, growthProjection]);


  
useEffect(() => {
  const fetchPeerBenchmark = async () => {
    if (
      peerBenchmarkFetched.current ||
      !userInfo ||
      barChartData.length === 0 ||
      !calculatedData.percentage
    ) return;

    peerBenchmarkFetched.current = true;
    setLoadingPeerBenchmark(true);
    setPeerBenchmarkError(null);

    const mcqScores = {};
    const openScores = {};
    const benchmarks = {};

    barChartData.forEach(item => {
      mcqScores[item.label] = categoryScores[item.label] || 0;
      openScores[item.label] = calculatedData.openEndedCategoryAverages[item.label] || 0;
      benchmarks[item.label] = item.market;
    });

    const payload = {
      user_data: {
        name: userInfo.fullName || "Anonymous",
        age: Number(userInfo.age) || 0,
        education_level: userInfo.educationLevel || "",
        field: userInfo.field || "",
        domain: userInfo.domain || userInfo.field || "General",
        exp_level: userInfo.experienceLevel || "Beginner",
        interests: userInfo.hobbies
          ? userInfo.hobbies.split(',').map(s => s.trim())
          : (userInfo.interests || []),
        career_goal: userInfo.careerGoals || userInfo.aspiration || ""
      },
      combined_score: calculatedData.percentage || 0,
      mcq_scores: mcqScores,
      open_scores: openScores,
      strong_categories: barChartData.filter(item => item.value >= 65).map(item => item.label),
      weak_categories: barChartData.filter(item => item.value < 50).map(item => item.label),
      benchmarks
    };

    try {
      const res = await fetch("https://skill-assessment-n1dm.onrender.com/generate_peer_benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      console.log("peer benchmark ",data)
      setPeerBenchmark(data);
    } catch (err) {
      console.error("Peer benchmark error:", err);
      setPeerBenchmarkError("Failed to fetch peer benchmark");
    } finally {
      setLoadingPeerBenchmark(false);
    }
  };

  fetchPeerBenchmark();
}, [userInfo, barChartData, calculatedData.percentage,calculatedData.openEndedCategoryAverages]);

const safePeerBenchmark = peerBenchmark?.peer_benchmark || {
  percentile: 'Not available',
  narrative: 'Not available',
  in_demand_traits: []
};



const parseRoadmapText = (roadmapText) => {
  if (!roadmapText) return [];

  const phases = [];

  // Split by each phase header
  const phaseSections = roadmapText.split(/### PHASE \d+ \([^)]+\) – /);

  // Grab titles like: ### PHASE 1 (0–30 Days) – Title
  const titleMatches = [...roadmapText.matchAll(/### PHASE \d+ \(([^)]+)\) – ([^\n]+)/g)];

  for (let i = 1; i < phaseSections.length; i++) {
    const phaseContent = phaseSections[i];

    // Extract title
    const title = titleMatches[i - 1] ? titleMatches[i - 1][2].trim() : `Phase ${i}`;

    // Extract focus areas
    const focusMatch = phaseContent.match(/- \*\*Focus Areas:\*\*\s*(.*?)(?=\n- \*\*Weekly Actions:|\n- \*\*Milestone|$)/s);
    const focus = focusMatch ? focusMatch[1].trim().replace(/\n/g, ' ') : 'Not specified';

    // Extract weekly actions
    const weeklyActionsMatch = phaseContent.match(/- \*\*Weekly Actions:\*\*\s*((?:\s*- Week \d+:.*\n*)+)/s);
    let weeklyActions = [];

    if (weeklyActionsMatch) {
      const actionsText = weeklyActionsMatch[1].trim();
      weeklyActions = actionsText
        .split(/\n\s*-\s*/)
        .map(action => action.trim())
        .filter(action => action.startsWith("Week"))
        .map(action => action.replace(/^Week \d+:\s*/, '').trim());
    }

    // Extract milestone
    const milestoneMatch = phaseContent.match(/- \*\*Milestone by Day \d+:\*\*\s*(.*)/);
    const milestone = milestoneMatch ? milestoneMatch[1].trim() : 'Not specified';

    phases.push({
      title,
      focus,
      weekly_actions: weeklyActions,
      milestone,
    });
  }

  return phases;
};



useEffect(() => {
  const fetchActionPlan = async () => {
    if (
      actionPlanFetched.current ||
      !userInfo ||
      barChartData.length === 0
    ) return;

    actionPlanFetched.current = true;
    setLoadingActionPlan(true);
    setActionPlanError(null);

    const mcqScores = {};
    const openScores = {};
    const marketBenchmarks = {};

    barChartData.forEach(item => {
      mcqScores[item.label] = categoryScores[item.label] || 0;
      openScores[item.label] = calculatedData.openEndedCategoryAverages[item.label] || 0;
      marketBenchmarks[item.label] = item.market || 65;
    });
    
    const strongCategories = [];
    const moderateCategories = [];
    const weakCategories = [];

    barChartData.forEach(item => {
      const key = item.label;
      const score = item.value || 0;
      if (score >= 65) {
        strongCategories.push(key);
      } else if (score >= 50) {
        moderateCategories.push(key);
      } else {
        weakCategories.push(key);
      }
    });

    const payload = {
      user_data: {
        name: userInfo.fullName || "Anonymous",
        age: Number(userInfo.age) || 0,
        education_level: userInfo.educationLevel || "",
        field: userInfo.field || "",
        domain: userInfo.domain || userInfo.field || "General",
        exp_level: userInfo.experienceLevel || "Beginner",
        interests: userInfo.hobbies
          ? userInfo.hobbies.split(',').map(s => s.trim())
          : (userInfo.interests || []),
        career_goal: userInfo.careerGoals || userInfo.aspiration || ""
      },
      mcq_scores: mcqScores,
      open_scores: openScores,
      strong_categories: strongCategories,
      moderate_categories: moderateCategories,
      weak_categories: weakCategories,
      market_benchmarks: marketBenchmarks
    };

    try {
      const res = await fetch("https://skill-assessment-n1dm.onrender.com/generate_action_plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      console.log("action plan", data);
       setActionPlan(data.action_plan);
      
      // Parse the roadmap_text into actionPlan format
    // Parse the roadmap_text into actionPlan format
const parsedActionPlan = parseRoadmapText(data.roadmap_text);
setActionPlan(parsedActionPlan);
      
    } catch (err) {
      console.error("Action plan error:", err);
      setActionPlanError("Failed to fetch action plan");
    } finally {
      setLoadingActionPlan(false);
    }
  };

  fetchActionPlan();
}, [userInfo, barChartData]);
useEffect(() => {
  const fetchGrowthSources = async () => {
    if (
      growthSourcesFetched.current ||
      !userInfo ||
      !growthProjection ||
      barChartData.length === 0
    ) return;

    growthSourcesFetched.current = true;
    setLoadingGrowthSources(true);
    setGrowthSourcesError(null);

    const weakCategories = [];
    const moderateCategories = [];
    const strongCategories = [];
    const combinedScores = {};


     barChartData.forEach(item => {
      const apiLabel = item.label;
      const score1 = categoryScores[item.label] || 0;
      const score2 = calculatedData.openEndedCategoryAverages[item.label] || 0;
      const avg = (score1 + score2) / 2;

      combinedScores[apiLabel] = Number(avg.toFixed(1));

      if (item.value < 50) {
        weakCategories.push(apiLabel);
      } else if (item.value < 65) {
        moderateCategories.push(apiLabel);
      } else {
        strongCategories.push(apiLabel);
      }
    });

    const payload = {
      user_data: {
       name: userInfo.fullName || "Anonymous",
        age: Number(userInfo.age) || 0,
        education_level: userInfo.educationLevel || "",
        field: userInfo.field || "",
        domain: userInfo.domain || userInfo.field || "General",
        exp_level: userInfo.experienceLevel || "Beginner",
        interests: userInfo.hobbies
          ? userInfo.hobbies.split(',').map(s => s.trim())
          : (userInfo.interests || []),
        career_goal: userInfo.careerGoals || userInfo.aspiration || ""
      },
      weak_categories: weakCategories,
      moderate_categories: moderateCategories,
      strong_categories: strongCategories,
      combined_scores: combinedScores,
      projection: {
  growth_projection: {
    "current_score": growthProjection.current_score,
    "3_months": growthProjection["3_months"],
    "6_months": growthProjection["6_months"],
    "12_months": growthProjection["12_months"]
  }
}

    };

    try {
      const res = await fetch("https://skill-assessment-n1dm.onrender.com/generate_growth_sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      console.log("growth resources",data)
      setGrowthSources(data.sources);
    } catch (err) {
      console.error("Growth sources error:", err);
      setGrowthSourcesError("Failed to fetch growth sources");
    } finally {
      setLoadingGrowthSources(false);
    }
  };

  fetchGrowthSources();
}, [userInfo, growthProjection, barChartData]);

useEffect(() => {
  const fetchMomentumToolkit = async () => {
    if (momentumFetched.current) return;

    momentumFetched.current = true;
    setLoadingMomentum(true);
    setMomentumError(null);

    try {
      const res = await fetch("https://skill-assessment-n1dm.onrender.com/generate_momentum_toolkit", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      console.log("tool kit",data)
      setMomentumToolkit(data.momentum_toolkit);
    } catch (err) {
      console.error("Momentum Toolkit fetch error:", err);
      setMomentumError("Failed to load quick actions");
    } finally {
      setLoadingMomentum(false);
    }
  };

  fetchMomentumToolkit();
}, []);
useEffect(() => {
  const fetchGrowthOpportunities = async () => {
    if (
      growthFetched.current ||  
      !userInfo ||
      barChartData.length === 0
    ) return;

    growthFetched.current = true; // ❌ WRONG REF
    // ... rest of the code
  };
}, [userInfo, barChartData]);

// AFTER (FIXED):
useEffect(() => {
  const fetchGrowthOpportunities = async () => {
    if (
      growthOpportunitiesFetched.current || // ✅ CORRECT REF
      !userInfo ||
      barChartData.length === 0
    ) return;

    growthOpportunitiesFetched.current = true; // ✅ CORRECT REF
    setLoadingGrowthOpportunities(true);
    setGrowthOpportunitiesError(null);

    const scores = {};
    const benchmarks = {};

    barChartData.forEach(item => {
      scores[item.label] = categoryScores[item.label] || 0;
      benchmarks[item.label] = item.market || 65;
    });

    const payload = {
      user_profile: {
        name: userInfo.fullName || "Anonymous",
        age: Number(userInfo.age) || 0,
        education_level: userInfo.educationLevel || "",
        field: userInfo.field || "",
        domain: userInfo.domain || userInfo.field || "General",
        exp_level: userInfo.experienceLevel || "Beginner",
        interests: userInfo.hobbies
          ? userInfo.hobbies.split(',').map(s => s.trim())
          : (userInfo.interests || []),
        career_goal: userInfo.careerGoals || userInfo.aspiration || ""
      },
      scores,
      benchmarks
    };

    try {
      const res = await fetch("https://skill-assessment-n1dm.onrender.com/generate_growth_opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      console.log("opportunities", data);
      setGrowthOpportunities(data.opportunities); // ✅ Access .opportunities from response
    } catch (err) {
      console.error("Growth Opportunities error:", err);
      setGrowthOpportunitiesError("Failed to fetch personalized growth opportunities");
    } finally {
      setLoadingGrowthOpportunities(false);
    }
  };

  fetchGrowthOpportunities();
}, [userInfo, barChartData]);

  

  // Helper functions (memoized to prevent recreation on every render)
  const getPerformanceLevel = useCallback((score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Developing';
    return 'Needs Improvement';
  }, []);

  const getMarketPercentile = useCallback((score) => {
    if (score >= 80) return 'Top 10%';
    if (score >= 60) return 'Top 25%';
    if (score >= 40) return 'Bottom 40%';
    return 'Bottom 20%';
  }, []);

  const getSalaryRangeINR = useCallback((score) => {
    if (score >= 80) return '₹12L – ₹16L';
    if (score >= 60) return '₹9L – ₹12L';
    if (score >= 40) return '₹6L – ₹9L';
    return '₹3L – ₹6L';
  }, []);

  const getSalaryRangeUSD = useCallback((score) => {
    if (score >= 80) return '$80k – $100k';
    if (score >= 60) return '$65k – $80k';
    if (score >= 40) return '$50k – $65k';
    return '$30k – $45k';
  }, []);

  // Memoize derived values
  const percentage = calculatedData.percentage;
  const salaryRangeINR = getSalaryRangeINR(percentage);
  const salaryRangeUSD = getSalaryRangeUSD(percentage);
  const percentileText = getMarketPercentile(percentage);
  
  const getPercentileNumber = useCallback((percentileText) => {
    const match = percentileText.match(/(\d+)%/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return 0;
  }, []);
  
  const percentileNumber = getPercentileNumber(percentileText);
  const barMessage = `You're ahead of ${percentileNumber}% of students who took this test.`;

  // Get strongest skill from actual data
  const getStrongestSkill = useCallback(() => {
    if (Object.keys(categoryScores).length === 0) return 'Strategic Thinking';
    
    let strongestSkill = '';
    let highestScore = 0;
    
    Object.entries(categoryScores).forEach(([category, score]) => {
      const percentage = (score / 160) * 100;
      if (percentage > highestScore) {
        highestScore = percentage;
        strongestSkill = category;
      }
    });
    
    return strongestSkill || 'Strategic Thinking';
  }, [categoryScores]);

  const strongestSkill = getStrongestSkill();
  const normalizedSkill = strongestSkill.trim();
  const strongestSkillIcon = skillIcons[normalizedSkill] || "💜";

  const handleRetakeAssessment = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleDownloadReport = useCallback(() => {
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
  }, [percentage, strongestSkill, skillsData, percentileText, percentileNumber, salaryRangeINR, salaryRangeUSD]);

  const generateReportHTML = useCallback(() => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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

        /* Action Plan Table Styles */
        .action-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 13px;
        }
        
        .action-table th {
            background: #f8f9fa;
            padding: 8px;
            text-align: left;
            border: 1px solid #dee2e6;
            font-weight: 600;
            color: #495057;
        }
        
        .action-table td {
            padding: 8px;
            border: 1px solid #dee2e6;
            vertical-align: top;
            line-height: 1.4;
        }
        
        .action-table tr:nth-child(even) {
            background: #f8f9fa;
        }

        /* Growth Projection Styles */
        .growth-metrics {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .growth-metric {
            text-align: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        
        .growth-metric .metric-label {
            display: block;
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        
        .growth-metric .metric-value {
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #667eea;
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
            <div class="subtitle">Comprehensive Analysis for ${userInfo?.fullName || 'Candidate'}</div>
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
                            <span class="overview-value">${userInfo?.fullName || 'N/A'}</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Education:</span>
                            <span class="overview-value">${userInfo?.educationLevel || 'N/A'}</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Experience:</span>
                            <span class="overview-value">${userInfo?.workExperience || 'N/A'} years</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Professional Domain:</span>
                            <span class="overview-value">${userInfo?.professionalDomain || 'N/A'}</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Career Goals:</span>
                            <span class="overview-value">${userInfo?.careerGoals || 'N/A'}</span>
                        </div>
                    </div>
                    <div>
                        <div class="overview-item">
                            <span class="overview-label">Hobbies / Interests:</span>
                            <span class="overview-value">${userInfo?.hobbies || 'N/A'}</span>
                        </div>
                        <div class="overview-item">
                            <span class="overview-label">Preferred Language:</span>
                            <span class="overview-value">${userInfo?.preferredLanguage || 'N/A'}</span>
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
                        <div class="value">${salaryRangeUSD} / ${salaryRangeINR}</div>
                        <div class="label">US / India Market Range</div>
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
                            <h4>Next Steps</h4>
                        </div>
                        <ul class="action-items">
                            <li>Focus on developing strategic thinking through targeted learning</li>
                            <li>Leverage your ${strongestSkill.toLowerCase()} expertise in leadership roles</li>
                            <li>Consider mentorship opportunities in your field of strength</li>
                            <li>Join professional communities to network and learn</li>
                        </ul>
                    </div>
                </div>

           

    <div class="section">
  <div class="section-header">
    <span>📊</span>
    <h2>Peer Benchmark</h2>
  </div>

  <div class="insights-section">
    
      <div class="insight-card">
        <div class="insight-header">
          <span>📈</span>
          <h4>Benchmark Summary</h4>
        </div>
        <div class="insight-text">
          <p><strong>Percentile:</strong> ${safePeerBenchmark?.percentile}</p>
<p><strong>Narrative:</strong> ${safePeerBenchmark?.narrative}</p>
        </div>
      </div>

     
        <div class="insight-card">
          <div class="insight-header">
            <span>🧠</span>
            <h4>In-Demand Traits</h4>
          </div>
          <div class="insight-text">
            <ul>
              ${safePeerBenchmark?.in_demand_traits.map(trait => `<li>✅ ${trait}</li>`).join('')}
            </ul>
          </div>
        </div>
      

      
      </div>
</div>
          

           
          <div class="section">
  <div class="section-header">
    <span>🎯</span>
    <h2>90-Day Personalized Roadmap</h2>
  </div>
  
  ${
    actionPlan.map((phase, phaseIndex) => {
      const dayMilestone = (phaseIndex + 1) * 30;
      const startingWeek = phaseIndex * 4 + 1;
      
      return `
        <div class="insight-card">
          <div class="insight-header">
            <span>📌</span>
            <h4>PHASE ${phaseIndex + 1} (${dayMilestone - 29}–${dayMilestone} Days) – ${phase.title || 'Phase ' + (phaseIndex + 1)}</h4>
          </div>
          <div class="insight-text">
            <strong>Focus Areas:</strong> ${phase.focus || 'Not specified'}<br/><br/>
            <strong>Weekly Actions:</strong>
            <ul>
              ${Array.isArray(phase.weekly_actions) ?
                phase.weekly_actions.map((action, index) => `
                  <li>📅 Week ${startingWeek + index}: ${action}</li>
                `).join('') :
                '<li>No actions specified.</li>'
              }
            </ul>
            <strong>Milestone by Day ${dayMilestone}:</strong> ${phase.milestone || 'Not specified'}
          </div>
        </div>`;
    }).join('') 
  }
</div>


            
            <div class="section">
  <div class="section-header">
    <span>📚</span>
    <h2>Recommended Resources</h2>
  </div>
  <div class="insights-section">
    ${ 
      growthSources.map(source => `
        <div class="insight-card">
          <div class="insight-header">
            <span>📘</span>
            <h4>${source.category || 'Resource'}</h4>
          </div>
          <div class="insight-text">
            <strong>${source.title || 'Title not available'}</strong><br/>
            ${source.why || 'Description not available'}<br/>
            ⏱️ <em>${source.duration || 'Duration not specified'}</em><br/>
            ✅ <em>${source.outcome || 'Outcome not specified'}</em><br/>
            ${source.link ? `🔗 <a href="${source.link}" target="_blank">${source.link}</a>` : ''}
          </div>
        </div>
      `).join('')
    }
  </div>
</div>
          <div class="section">
  <div class="section-header">
    <span>⚙️</span>
    <h2>Momentum Toolkit</h2>
  </div>

  <div class="insights-section">
    ${ 
      momentumToolkit.map((tool, index) => `
        <div class="insight-card">
          <div class="insight-header">
            <span>🛠️</span>
            <h4>Tool ${index + 1}</h4>
          </div>
          <div class="insight-text">
            <p><strong>Name:</strong> ${tool.name || 'Tool name not available'}</p>
            <p><strong>Purpose:</strong> ${tool.description || 'Description not available'}</p>
            ${tool.link ? `<p><strong>Explore:</strong> <a href="${tool.link}" target="_blank">${tool.link}</a></p>` : ''}
          </div>
        </div>
      `).join('')
    }
  </div>
</div>
<div class="section">
  <div class="section-header">
    <span>🌱</span>
    <h2>Growth Opportunities</h2>
  </div>

  <div class="insights-section">
    ${growthOpportunities.map((opportunity, index) => `
          <div class="insight-card">
            <div class="insight-header">
              <span>🎯</span>
              <h4>${opportunity.category}</h4>
            </div>
            <div class="insight-text">
              <p><strong>Opportunity:</strong> ${opportunity.opportunity}</p>
              <p><strong>Why Recommended:</strong> ${opportunity.why}</p>
            </div>
          </div>
        `).join('')}
        
  </div>
</div>

            

            
            
        </div>
    </div>
</body>
</html>`;
}, [percentage, strongestSkill, skillsData, percentileText, percentileNumber, salaryRangeINR, salaryRangeUSD, userInfo, totalMCQs, getPerformanceLevel, getMarketPercentile, growthProjection, peerBenchmark, actionPlan, growthSources,growthOpportunities ]);

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
        <div className="bar-chart-container">
  <div className="bar-chart">
    {barChartData.map((item, index) => (
      <div key={index} className="bar-chart-item">
        <div className="bar-chart-bar">
          <div className="tooltip-wrapper-2">
            <div
              className="bar-chart-fill-user"
              style={{ height: `${item.value}%` }}
            ></div>
            <div className="tooltip-text-2">
              {tooltips[item.label]?.user_tooltip || "Loading..."}
            </div>
          </div>
          <div className="tooltip-wrapper-2">
            <div
              className="bar-chart-fill-market"
              style={{ height: `${item.market || 60}%` }}
            ></div>
            <div className="tooltip-text-2">
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

      {growthProjection && (
  <div className="analysis-card">
    <div className="card-header">
      <span className="card-icon">📈</span>
      <h3>Growth Projection</h3>
      <p>Estimated skill improvement over time</p>
    </div>

    <div className="skills-list-2">
      <div className="growth-chart">
        <div className="chart-placeholder">
          <div className="growth-line"></div>
          <div className="growth-points">
            <div className="point start-point"></div>

            <div className="point-wrapper">
              <span className="growth-label">
                +{Math.round(growthProjection.growth_projection["3_months"] - growthProjection.growth_projection.current_score)}
              </span>
              <div className="point mid-point"></div>
            </div>

            <div className="point-wrapper">
              <span className="growth-label">
                +{Math.round(growthProjection.growth_projection["6_months"] - growthProjection.growth_projection.current_score)}
              </span>
              <div className="point mid-point"></div>
            </div>

            <div className="point-wrapper">
              <span className="growth-label">
                +{Math.round(growthProjection.growth_projection["12_months"] - growthProjection.growth_projection.current_score)}
              </span>
              <div className="point end-point"></div>
            </div>
          </div>
        </div>

        <div className="growth-timeline">
          <span>Current</span>
          <span>3 Months</span>
          <span>6 Months</span>
          <span>12 Months</span>
        </div>
      </div>

      <div className="growth-insight" style={{ marginTop: "1rem" }}>
        <span className="insight-icon">💡</span>
        <p>
          With focused development, you could improve by up to{" "}
          <strong>
            {Math.round(
              growthProjection.growth_projection["12_months"] -
              growthProjection.growth_projection.current_score
            )} points
          </strong>{" "}
          in the next year!
        </p>
        <p>
          <strong>Peer Percentile:</strong> You are currently ahead of{" "}
          <strong>{growthProjection.growth_projection.peer_percentile}%</strong> of your peers.
        </p>
      </div>

      <div className="action-steps" style={{ marginTop: "1rem" }}>
        <h4>🎯 Recommended Action Steps</h4>
        <ul style={{ paddingLeft: "1rem", marginTop: "0.5rem" }}>
          {growthProjection.action_steps.map((step, index) => (
            <li key={index} style={{ marginBottom: "0.5rem" }}>
              ✅ {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
)}



        {marketAnalysis && (
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
          <span className="position-title">{marketAnalysis.tier?.label || 'Position Pending'}</span>
          <span className="position-desc">{marketAnalysis.tier?.description || 'Analysis in progress'}</span>
        </div>
      </div>

      <div className="market-metrics">
        <div className="metric">
          <span className="metric-label">Industry Readiness</span>
          <div className="metric-bar">
            <div
              className="metric-fill"
              style={{ width: `${marketAnalysis.readiness_score || 0}%` }}
            ></div>
          </div>
          <span className="metric-value">{marketAnalysis.readiness_score || 0}%</span>
        </div>

        <div className="salary-range">
          <div className="salary-item">
            <span className="salary-label">{marketAnalysis.experience?.label || 'Experience Level'}</span>
            <span className="salary-desc">{marketAnalysis.experience?.bullets || 'Calculating...'}</span>
          </div>
          <div className="salary-item">
            <span className="salary-label">{marketAnalysis.salary?.label || 'Salary Range'}</span>
            <span className="salary-desc">{marketAnalysis.salary?.bullets || 'Estimating...'}</span>
          </div>
        </div>
      </div>

      <div className="overall-summary">
        {marketAnalysis.overall_message && Array.isArray(marketAnalysis.overall_message) ? (
          marketAnalysis.overall_message.map((message, index) => (
            <p key={index}>{message}</p>
          ))
        ) : (
          <p>{marketAnalysis.overall_message || 'Generating market insights...'}</p>
        )}
      </div>
    </div>
  </div>
)}

{/* Loading state */}
{loadingMarketAnalysis && (
  <div className="analysis-card">
    <div className="card-header">
      <span className="card-icon">📊</span>
      <h3>Market Position Analysis</h3>
      <p>Analyzing your market position...</p>
    </div>
    <div className="loading-spinner">Loading market analysis...</div>
  </div>
)}

{/* Error state */}
{marketAnalysisError && (
  <div className="analysis-card">
    <div className="card-header">
      <span className="card-icon">⚠️</span>
      <h3>Market Position Analysis</h3>
      <p>Unable to load market analysis</p>
    </div>
    <div className="error-message">{marketAnalysisError}</div>
  </div>
)}

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