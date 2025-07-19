import React, { useState } from 'react';
import Assessment from './Assessment'; 
import './Home.css';
import { useNavigate } from 'react-router-dom';
import { LuBrain } from "react-icons/lu";
import { MdOutlineWorkOutline } from "react-icons/md";
import { IoPeopleOutline } from "react-icons/io5";
import { GiHealthPotion } from "react-icons/gi";
import { MdFamilyRestroom } from "react-icons/md";
   
function Home() {
  const [formData, setFormData] = useState({
  fullName: '',
  age: '',
  educationLevel: '',
  workExperience: '',
  currentRole: '',
  professionalDomain: '',
  professionalDomainOther: '',
  careerGoals: '',
  careerGoalsOther: '',
  hobbies: '',
  preferredLanguage: '' // <-- add this
});


  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

   const handleSubmit = (e) => {
  e.preventDefault();

  
  const professionalDomainValue =
    formData.professionalDomain === 'other'
      ? formData.professionalDomainOther.trim()
      : formData.professionalDomain;

  const careerGoalsValue =
    formData.careerGoals === 'other'
      ? formData.careerGoalsOther.trim()
      : formData.careerGoals;

 
  if (!formData.fullName || !formData.age || !formData.educationLevel || !professionalDomainValue || !careerGoalsValue) {
    alert('Please fill in all required fields');
    return;
  }

  const finalFormData = {
    ...formData,
    professionalDomain: professionalDomainValue,
    careerGoals: careerGoalsValue
  };

  console.log('Form submitted:', finalFormData);

  navigate('/assessment', { state: { userInfo: finalFormData } });
};

  return (
    <div className="container">
      <header>
        <h1>Professional Skill Assessment</h1>
        <p className="subtitle">Discover your strengths and unlock your potential with our comprehensive skill evaluation designed for students and professionals</p>
      </header>

      <div className="content-grid">
        <section className="benefits-section">
          <h2>What You'll Get</h2>
          <ul>
            <li>40 carefully crafted multiple-choice questions across 5 key skill areas</li>
            <li>3 personalized open-ended questions based on your responses</li>
            <li>Detailed score breakdown and personalized development report</li>
          </ul>
        </section>

        <section className="skills-section">
          <h2>Skill Categories</h2>
          <div className="skills-grid">
            <div className="skill-item">< LuBrain />Cognitive & Creative Skills</div>
            <div className="skill-item"><MdOutlineWorkOutline/>Work & Professional Behavior</div>
            <div className="skill-item"><IoPeopleOutline/>Emotional & Social Competence</div>
            <div className="skill-item"><GiHealthPotion />Personal Management & Wellness</div>
            <div className="skill-item"><MdFamilyRestroom/>Family & Relationships</div>
          </div>
        </section>
      </div>

      <section className="form-section">
        <h2>Tell Us About Yourself</h2>
        <p>This helps us personalize your assessment experience.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input 
                type="text" 
                id="fullName" 
                name="fullName" 
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name" 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="age">Age *</label>
              <input 
                type="number" 
                id="age" 
                name="age" 
                value={formData.age}
                onChange={handleChange}
                placeholder="Your age" 
                min="1"
                max="120"
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="educationLevel">Education Level *</label>
            <select 
              id="educationLevel" 
              name="educationLevel" 
              value={formData.educationLevel}
              onChange={handleChange}
              required
            >
              <option value="">Select your education level</option>
              <option value="highSchool">High School</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="bachelor">Bachelor's Degree</option>
              <option value="master">Master's Degree</option>
              <option value="phd">PhD</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="workExperience">Work Experience</label>
            <select 
              id="workExperience" 
              name="workExperience" 
              value={formData.workExperience}
              onChange={handleChange}
            >
              <option value="">Select your experience level</option>
              <option value="noExperience">No experience</option>
              <option value="entryLevel">Entry Level (0-2 years)</option>
              <option value="midLevel">Mid Level (3-5 years)</option>
              <option value="seniorLevel">Senior Level (5+ years)</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="currentRole">Current Role/Field of Study</label>
            <input 
              type="text" 
              id="currentRole" 
              name="currentRole" 
              value={formData.currentRole}
              onChange={handleChange}
              placeholder="e.g. Software Engineer, Marketing Student, etc." 
            />
          </div>
          <div className="form-group">
  <label htmlFor="professionalDomain">Professional Domain or Field of Interest</label>
  <select
    id="professionalDomain"
    name="professionalDomain"
    value={formData.professionalDomain}
    onChange={handleChange}
  >
    <option value="">Select your domain</option>
    <option value="dataScience">Data Science</option>
    <option value="finance">Finance</option>
    <option value="uxDesign">UX Design</option>
    <option value="marketing">Marketing</option>
    <option value="softwareEngineering">Software Engineering</option>
    <option value="other">Other</option>
  </select>
  {formData.professionalDomain === 'other' && (
    <input
      type="text"
      name="professionalDomainOther"
      value={formData.professionalDomainOther}
      onChange={handleChange}
      placeholder="Please specify your domain"
      required
    />
  )}
</div>

<div className="form-group">
  <label htmlFor="careerGoals">Career Aspirations or Goals</label>
  <select
    id="careerGoals"
    name="careerGoals"
    value={formData.careerGoals}
    onChange={handleChange}
  >
    <option value="">Select your career goal</option>
    <option value="productManager">Become a Product Manager</option>
    <option value="dataAnalyst">Become a Data Analyst</option>
    <option value="teamLead">Become a Team Lead</option>
    <option value="entrepreneur">Start my own business</option>
    <option value="researcher">Pursue Research</option>
    <option value="other">Other</option>
  </select>
   {formData.careerGoals === 'other' && (
    <input
      type="text"
      name="careerGoalsOther"
      value={formData.careerGoalsOther}
      onChange={handleChange}
      placeholder="Please specify your career goal"
      required
    />
  )}
</div>


<div className="form-group">
  <label htmlFor="hobbies">Hobbies or Personal Interests <span style={{ fontWeight: 'normal', color: '#777' }}>(optional)</span></label>
  <input
    type="text"
    id="hobbies"
    name="hobbies"
    value={formData.hobbies}
    onChange={handleChange}
    placeholder="e.g. Sketching, Football, Reading"
  />
</div>

<div className="form-group">
  <label htmlFor="preferredLanguage">Preferred Language Fluency <span style={{ fontWeight: 'normal', color: '#777' }}>(optional)</span></label>
  <input
    type="text"
    id="preferredLanguage"
    name="preferredLanguage"
    value={formData.preferredLanguage}
    onChange={handleChange}
    placeholder="e.g. English, Hindi, Telugu"
  />
</div>


          <button type="submit" className="start-button">Start Assessment</button>
        </form>

        <p className="assessment-time">Assessment takes approximately 15-20 minutes to complete</p>
      </section>
    </div>
  );
}

export default Home;