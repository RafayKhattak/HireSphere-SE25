const cron = require('node-cron');
const JobAlert = require('../models/JobAlert');
const Job = require('../models/Job');
const User = require('../models/User');
const emailTransporter = require('../config/emailConfig');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI for personalized job recommendations
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

/**
 * Match jobs with alert criteria
 * @param {Object} alert - The job alert to match against
 * @param {Date} lastSentDate - The date of the last alert sent
 * @returns {Promise<Array>} - Array of matching jobs
 */
const findMatchingJobs = async (alert, lastSentDate) => {
  try {
    // Base query - only open jobs
    let query = { status: 'open' };
    console.log(`[Job Alert Match] Finding jobs for alert ${alert._id} (Seeker: ${alert.jobSeeker}) since ${lastSentDate || 'the beginning'}. Criteria:`, { keywords: alert.keywords, locations: alert.locations, jobTypes: alert.jobTypes }); // Log criteria
    
    // Add date filter if lastSentDate is provided
    if (lastSentDate) {
      query.createdAt = { $gt: lastSentDate };
    }
    
    // Add keywords filter - search in title, description, and requirements
    if (alert.keywords && alert.keywords.length > 0) {
      const keywordRegexes = alert.keywords.map(keyword => new RegExp(keyword, 'i'));
      console.log('[Job Alert Match] Keyword Regexes:', keywordRegexes); // Log the regex array
      query.$or = [
        { title: { $in: keywordRegexes } },
        { description: { $in: keywordRegexes } },
        { requirements: { $in: keywordRegexes } }
      ];
    }
    
    // Add locations filter
    if (alert.locations && alert.locations.length > 0) {
      const locationRegexes = alert.locations.map(location => new RegExp(location, 'i'));
      console.log('[Job Alert Match] Location Regexes:', locationRegexes); // Log the regex array
      query.location = { $in: locationRegexes };
    }
    
    // Add job types filter - Make it case-insensitive
    if (alert.jobTypes && alert.jobTypes.length > 0) {
      const jobTypeRegexes = alert.jobTypes.map(type => new RegExp(`^${type}$`, 'i')); // Match full string, case-insensitive
      console.log('[Job Alert Match] Job Type Regexes:', jobTypeRegexes); // Log the regex array
      query.type = { $in: jobTypeRegexes };
    }
    
    // Add salary filter if specified
    if (alert.salary && (alert.salary.min > 0 || alert.salary.max > 0)) {
      query['salary.min'] = { $gte: alert.salary.min || 0 };
      if (alert.salary.max > 0) {
        query['salary.max'] = { $lte: alert.salary.max };
      }
    }
    
    console.log('[Job Alert Match] Final Query Object:', query); // Log the query object directly
    // console.log(`[Job Alert Match] Executing query:`, JSON.stringify(query)); // Remove JSON.stringify version

    // Find matching jobs, sort by newest first
    const matchingJobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('employer', 'name companyName');
      
    console.log(`[Job Alert Match] Found ${matchingJobs.length} matching jobs for alert ${alert._id}.`); // Log match count
    return matchingJobs;
  } catch (error) {
    console.error('Error finding matching jobs:', error);
    return [];
  }
};

/**
 * Get personalized job descriptions using AI
 * @param {Object} jobSeeker - The job seeker user object
 * @param {Array} jobs - Array of matching jobs
 * @returns {Promise<String>} - Personalized descriptions
 */
const getPersonalizedDescriptions = async (jobSeeker, jobs) => {
  if (!genAI || !jobs.length) return null;

  try {
    // Extract relevant data from job seeker
    const skills = jobSeeker.skills || [];
    const experience = jobSeeker.experience || [];
    const education = jobSeeker.education || [];
    
    // Create a summary of the job seeker's profile
    const jobSeekerSummary = `
      Skills: ${skills.join(', ')}
      Experience: ${experience.map(exp => `${exp.title} at ${exp.company}`).join(', ')}
      Education: ${education.map(edu => `${edu.degree} from ${edu.institution}`).join(', ')}
    `;
    
    // Create job summaries
    const jobSummaries = jobs.map(job => `
      Job Title: ${job.title}
      Company: ${job.employer.companyName || job.employer.name}
      Description: ${job.description.substring(0, 100)}...
    `).join('\n\n');
    
    // Prompt for Gemini
    const prompt = `
      I have a job seeker with the following profile:
      ${jobSeekerSummary}
      
      They have the following job matches:
      ${jobSummaries}
      
      For each job, please give a very brief (max 2 sentences) explanation of why this job might be a good fit for the candidate based on their profile, or what skills they should highlight in their application.
      Format as a bulleted list with the job title first, then your brief recommendation.
    `;
    
    // Generate content using Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const result = await model.generateContent(prompt);
    const personalizedContent = result.response.text();
    
    return personalizedContent;
  } catch (error) {
    console.error('Error generating personalized descriptions:', error);
    return null;
  }
};

/**
 * Send job alert email
 * @param {Object} jobSeeker - The job seeker user object
 * @param {Object} alert - The job alert object
 * @param {Array} matchingJobs - Array of matching jobs
 * @returns {Promise<Boolean>} - Whether email was sent successfully
 */
const sendAlertEmail = async (jobSeeker, alert, matchingJobs) => {
  try {
    if (!matchingJobs || matchingJobs.length === 0) {
      console.log(`[Job Alert Email] No matching jobs found for alert ${alert._id} (Seeker: ${jobSeeker._id}). Skipping email.`); // Log skip
      return false;
    }
    
    console.log(`[Job Alert Email] Preparing email for alert ${alert._id} to ${jobSeeker.email} with ${matchingJobs.length} jobs.`); // Log email prep
    // Try to get personalized descriptions if GEMINI_API_KEY is available
    const personalizedContent = await getPersonalizedDescriptions(jobSeeker, matchingJobs);
    
    // Build HTML content for matching jobs
    const jobsHtml = matchingJobs.map(job => `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h3 style="margin-top: 0; color: #1976d2;">${job.title}</h3>
        <p><strong>Company:</strong> ${job.employer.companyName || job.employer.name}</p>
        <p><strong>Location:</strong> ${job.location}</p>
        <p><strong>Type:</strong> ${job.type}</p>
        <p><strong>Salary:</strong> ${job.salary.min} - ${job.salary.max} ${job.salary.currency || 'USD'}</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobs/${job._id}" style="background-color: #1976d2; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px;">View Job</a></p>
      </div>
    `).join('');
    
    // Email content
    const subject = `New Job Matches Found - HireSphere Job Alert`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">HireSphere Job Alerts</h2>
        <p>Hello ${jobSeeker.firstName || jobSeeker.name},</p>
        <p>We've found ${matchingJobs.length} new job${matchingJobs.length > 1 ? 's' : ''} that match your alert criteria:</p>
        
        ${jobsHtml}
        
        ${personalizedContent ? `
          <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
            <h3 style="margin-top: 0; color: #1976d2;">Personalized Recommendations</h3>
            <div style="white-space: pre-line;">${personalizedContent}</div>
          </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <p>You can <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/job-alerts" style="color: #1976d2;">manage your job alerts here</a>.</p>
          <p>Best regards,<br>The HireSphere Team</p>
        </div>
      </div>
    `;
    
    // Send email
    await emailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: jobSeeker.email,
      subject,
      html
    });
    
    console.log(`[Job Alert Email] Successfully sent email to ${jobSeeker.email} for alert ${alert._id}.`); // Log success
    return true;
  } catch (error) {
    console.error(`[Job Alert Email] Error sending job alert email to ${jobSeeker.email} for alert ${alert._id}:`, error); // Log error
    return false;
  }
};

/**
 * Process all job alerts based on frequency (daily, weekly, immediate)
 * @param {String} frequency - The frequency to process ('daily', 'weekly', 'immediate')
 */
const processJobAlerts = async (frequency) => {
  try {
    console.log(`[Job Alert Process] Starting processing for frequency: ${frequency}...`);
    
    // Find all active alerts with the specified frequency
    const alerts = await JobAlert.find({
      isActive: true,
      frequency
    });
    
    console.log(`[Job Alert Process] Found ${alerts.length} active alerts for frequency: ${frequency}.`);
    
    // Process each alert
    for (const alert of alerts) {
      try {
        // Get job seeker
        const jobSeeker = await User.findById(alert.jobSeeker);
        
        // Skip if job seeker not found or alerts not enabled
        if (!jobSeeker) {
          console.log(`[Job Alert Process] Skipping alert ${alert._id} - Job seeker ${alert.jobSeeker} not found.`); // Log skip (no seeker)
          continue;
        }
        if (!jobSeeker.alertSettings?.enabled) {
           console.log(`[Job Alert Process] Skipping alert ${alert._id} for ${jobSeeker.email} - Alerts disabled in profile.`); // Log skip (disabled)
           continue;
        }
        
        console.log(`[Job Alert Process] Processing alert ${alert._id} for ${jobSeeker.email}...`); // Log processing start
        // Find matching jobs since last alert sent
        const matchingJobs = await findMatchingJobs(alert, alert.lastSentAt);
        
        // Skip if no matching jobs
        if (!matchingJobs || matchingJobs.length === 0) {
          continue;
        }
        
        // Send email alert
        const emailSent = await sendAlertEmail(jobSeeker, alert, matchingJobs);
        
        if (emailSent) {
          // Update last sent timestamp
          await JobAlert.findByIdAndUpdate(alert._id, {
            lastSentAt: new Date()
          });
          
          console.log(`[Job Alert Process] Alert ${alert._id} processed successfully for ${jobSeeker.email}. Email sent.`); // Log success
        }
      } catch (error) {
        console.error(`[Job Alert Process] Error processing single alert ${alert._id}:`, error); // Log single alert error
      }
    }
    
    console.log(`[Job Alert Process] Completed processing for frequency: ${frequency}.`);
  } catch (error) {
    console.error(`[Job Alert Process] Top-level error during processing for frequency ${frequency}:`, error); // Log top-level error
  }
};

/**
 * Initialize job alert schedulers
 */
const initJobAlertSchedulers = () => {
  console.log('[Job Alert Scheduler] Initializing cron schedules...');
  
  // Schedule daily job alerts (runs at 9:00 AM every day)
  cron.schedule('0 9 * * *', () => {
    console.log('[Job Alert Scheduler] Triggering DAILY job alert processing...'); // Log trigger
    processJobAlerts('daily');
  });
  
  // Schedule weekly job alerts (runs at 10:00 AM every Monday)
  cron.schedule('0 10 * * 1', () => {
    console.log('[Job Alert Scheduler] Triggering WEEKLY job alert processing...'); // Log trigger
    processJobAlerts('weekly');
  });
  
  // Schedule immediate job alerts (runs every hour)
  cron.schedule('0 * * * *', () => {
    console.log('[Job Alert Scheduler] Triggering IMMEDIATE job alert processing (hourly)...'); // Log trigger
    processJobAlerts('immediate');
  });
  
  console.log('[Job Alert Scheduler] Cron schedules initialized.');
};

module.exports = {
  initJobAlertSchedulers,
  processJobAlerts,
  findMatchingJobs,
  sendAlertEmail
}; 