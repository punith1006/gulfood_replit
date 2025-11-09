import OpenAI from 'openai';
import type { CompanyResearchData } from './companyResearch';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

/**
 * Robust JSON parsing with aggressive cleanup and brace-aware extraction
 * Handles common AI response issues like markdown, escaped quotes, newlines, nested structures
 */
function parseAIJSON<T>(content: string): T {
  let cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  cleaned = cleaned.trim();
  
  const extracted = extractFirstJSONStructure(cleaned);
  if (extracted) {
    cleaned = extracted;
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    try {
      cleaned = cleaned
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\n/g, ' ')
        .replace(/\r/g, '');
      
      return JSON.parse(cleaned);
    } catch (secondError) {
      console.error('Failed to parse AI JSON after cleanup:', cleaned.substring(0, 500));
      throw new Error(`JSON parsing failed: ${(secondError as Error).message}`);
    }
  }
}

/**
 * Extract the first balanced JSON structure (object or array) using character-by-character scanning
 */
function extractFirstJSONStructure(content: string): string | null {
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escapeNext = false;
  let currentBracket: '{' | '[' | null = null;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) {
      continue;
    }
    
    if (char === '{' || char === '[') {
      if (depth === 0) {
        startIndex = i;
        currentBracket = char;
      }
      depth++;
    }
    
    if (char === '}' || char === ']') {
      depth--;
      
      if (depth === 0 && startIndex !== -1) {
        return content.substring(startIndex, i + 1);
      }
    }
  }
  
  return null;
}

/**
 * Validate EvaluationResult structure
 */
function validateEvaluationResult(data: any): data is EvaluationResult {
  if (!data || typeof data !== 'object') {
    console.error('Validation failed: data is not an object');
    return false;
  }
  
  if (typeof data.passed !== 'boolean') {
    console.error('Validation failed: passed is not a boolean');
    return false;
  }
  
  if (typeof data.validationScore !== 'number' || isNaN(data.validationScore)) {
    console.error('Validation failed: validationScore is not a valid number');
    return false;
  }
  
  if (data.validationScore < 0 || data.validationScore > 100) {
    console.error(`Validation failed: validationScore ${data.validationScore} is out of range (0-100)`);
    return false;
  }
  
  if (typeof data.evaluatorFeedback !== 'string') {
    console.error('Validation failed: evaluatorFeedback is not a string');
    return false;
  }
  
  if (!Array.isArray(data.issuesFound)) {
    console.error('Validation failed: issuesFound is not an array');
    return false;
  }
  
  if (!Array.isArray(data.improvementSuggestions)) {
    console.error('Validation failed: improvementSuggestions is not an array');
    return false;
  }
  
  return true;
}

export interface AssessmentToEvaluate {
  companyName: string;
  websiteUrl: string;
  primaryGoal: string;
  country: string;
  extractedData: any;
  relevanceScore: number;
  scoreBreakdown: {
    productEventAlignment?: number;
    businessGoalAlignment?: number;
    marketMatch?: number;
    roiPotential?: number;
  };
  recommendations: any;
}

export interface EvaluationResult {
  passed: boolean;
  validationScore: number; // 0-100, how well the assessment was done
  evaluatorFeedback: string; // Detailed feedback
  issuesFound: string[]; // List of specific issues
  improvementSuggestions: string[]; // How to fix issues
}

/**
 * Evaluate an exhibitor assessment for correctness, fairness, quality, and alignment
 * 
 * This function performs AI-powered validation of exhibitor assessments, checking:
 * - Data accuracy against company research
 * - Fairness and lack of bias in scoring
 * - Goal alignment with user's stated objectives
 * - Geographic relevance for Gulfood (Dubai/MENA)
 * - Strategic relevance of recommendations
 * - Completeness and consistency
 * 
 * @param assessment - The assessment to evaluate
 * @param companyResearch - Research data about the company
 * @param primaryGoals - User's primary goals for attending
 * @param country - User's country
 * @returns Promise<EvaluationResult> - Validation results with pass/fail and feedback
 */
export async function evaluateAssessment(
  assessment: AssessmentToEvaluate,
  companyResearch: CompanyResearchData,
  primaryGoals: string[],
  country: string
): Promise<EvaluationResult> {
  if (!openai) {
    console.error('OpenAI client not initialized');
    return createFailureResponse('OpenAI client not initialized - cannot evaluate assessment');
  }

  console.log(`🔍 Evaluating assessment for: ${assessment.companyName}`);

  // ========================================
  // PRE-FLIGHT COMPLETENESS CHECKS
  // Fail-fast if assessment is structurally incomplete
  // ========================================
  const completenessIssues: string[] = [];
  
  // Check recommendations array
  if (!assessment.recommendations || !Array.isArray(assessment.recommendations)) {
    completenessIssues.push('Recommendations field is missing or not an array');
  } else if (assessment.recommendations.length === 0) {
    completenessIssues.push('Recommendations array is empty - must contain at least 3 actionable recommendations');
  } else if (assessment.recommendations.length < 3) {
    completenessIssues.push(`Recommendations array has only ${assessment.recommendations.length} items - must contain at least 3 actionable recommendations`);
  }
  
  // Check extractedData
  if (!assessment.extractedData || typeof assessment.extractedData !== 'object') {
    completenessIssues.push('ExtractedData field is missing or not an object');
  } else {
    // Check for required extractedData fields
    const requiredFields = ['industry', 'products', 'targetMarkets', 'companySize', 'businessModel', 'sustainability'];
    for (const field of requiredFields) {
      if (!assessment.extractedData[field]) {
        completenessIssues.push(`ExtractedData is missing required field: ${field}`);
      }
    }
  }
  
  // Check scoreBreakdown
  if (!assessment.scoreBreakdown || typeof assessment.scoreBreakdown !== 'object') {
    completenessIssues.push('ScoreBreakdown field is missing or not an object');
  } else {
    const requiredScores = ['productEventAlignment', 'businessGoalAlignment', 'marketMatch', 'roiPotential'];
    const missingScores = requiredScores.filter(score => assessment.scoreBreakdown[score as keyof typeof assessment.scoreBreakdown] === undefined);
    if (missingScores.length > 0) {
      completenessIssues.push(`ScoreBreakdown is missing scores: ${missingScores.join(', ')}`);
    }
  }
  
  // If critical completeness issues found, fail immediately without AI evaluation
  if (completenessIssues.length > 0) {
    console.log(`❌ Pre-flight completeness check FAILED: ${completenessIssues.length} critical issues found`);
    return {
      passed: false,
      validationScore: 30, // Low score for structurally incomplete assessments
      evaluatorFeedback: `Assessment is structurally incomplete and cannot be validated. ${completenessIssues.length} critical issues found: ${completenessIssues[0]}${completenessIssues.length > 1 ? ` and ${completenessIssues.length - 1} more` : ''}.`,
      issuesFound: completenessIssues,
      improvementSuggestions: [
        'Ensure the assessment includes all required sections: extractedData, scoreBreakdown, and recommendations',
        'Recommendations array must contain at least 3 specific, actionable recommendations',
        'ExtractedData must include: industry, products, targetMarkets, companySize, businessModel, sustainability',
        'ScoreBreakdown must include all 4 score components with numeric values'
      ]
    };
  }
  
  console.log('✅ Pre-flight completeness check passed');

  // ========================================
  // DYNAMIC THRESHOLD BASED ON RESEARCH CONFIDENCE
  // ========================================
  const researchConfidence = companyResearch.confidenceScore;
  let validationThreshold: number;
  let qualityExpectation: string;
  
  if (researchConfidence >= 70) {
    validationThreshold = 85;
    qualityExpectation = "HIGH - Comprehensive research data available, expect detailed MENA analysis and specific recommendations";
  } else if (researchConfidence >= 40) {
    validationThreshold = 75;
    qualityExpectation = "MEDIUM - Limited research data available, focus on accuracy of available data and reasonable extrapolations";
  } else {
    validationThreshold = 70;
    qualityExpectation = "BASIC - Minimal research data available, accept honest assessments that work with limited information";
  }
  
  console.log(`📊 Research Confidence: ${researchConfidence}% → Validation Threshold: ${validationThreshold}% (${qualityExpectation.split(' - ')[0]} expectations)`);

  try {
    const prompt = `You are an expert evaluator validating exhibitor assessments for Gulfood 2026 trade show in Dubai. Your role is to ensure assessments are accurate, fair, and strategically valuable.

ASSESSMENT TO VALIDATE:
Company: ${assessment.companyName}
Website: ${assessment.websiteUrl}
Country: ${assessment.country}
Primary Goal: ${assessment.primaryGoal}

ASSESSMENT SCORES:
- Overall Relevance Score: ${assessment.relevanceScore}/100
- Product-Event Alignment: ${assessment.scoreBreakdown.productEventAlignment ?? 'Not provided'}/100
- Business Goal Alignment: ${assessment.scoreBreakdown.businessGoalAlignment ?? 'Not provided'}/100
- Market Match: ${assessment.scoreBreakdown.marketMatch ?? 'Not provided'}/100
- ROI Potential: ${assessment.scoreBreakdown.roiPotential ?? 'Not provided'}/100

ASSESSMENT DATA:
${JSON.stringify(assessment.extractedData, null, 2)}

ASSESSMENT RECOMMENDATIONS:
${JSON.stringify(assessment.recommendations, null, 2)}

VERIFIED COMPANY RESEARCH DATA:
Industry: ${companyResearch.industry.join(', ')}
Products: ${companyResearch.products.join(', ')}
Company Size: ${companyResearch.companySize}
Business Model: ${companyResearch.businessModel}
Target Markets: ${companyResearch.targetMarkets.join(', ')}
Market Presence: ${companyResearch.marketPresence}
Recent News: ${companyResearch.recentNews.length > 0 ? companyResearch.recentNews.join('; ') : 'None'}
Sustainability: ${companyResearch.sustainability}
Research Confidence: ${companyResearch.confidenceScore}% ← IMPORTANT: This determines quality expectations
Summary: ${companyResearch.searchSummary}

USER CONTEXT:
Primary Goals: ${primaryGoals.join(', ')}
Country: ${country}

⚠️ CRITICAL: QUALITY EXPECTATIONS CALIBRATED TO RESEARCH CONFIDENCE ⚠️
Research Confidence: ${researchConfidence}%
Expected Quality Level: ${qualityExpectation}
Validation Threshold: ${validationThreshold}% (assessments below this fail)

${researchConfidence < 70 ? `
🔴 LIMITED DATA SCENARIO - ADJUST EXPECTATIONS:
The research confidence is ${researchConfidence}%, indicating limited publicly available data about this company.
In this situation, you MUST be more lenient:
- DO NOT penalize for missing MENA market analysis if the company has no documented MENA presence
- DO NOT penalize for generic sustainability information if none was found in research
- DO NOT penalize for limited geographic detail if the company operates primarily in ${country}
- DO focus on: accuracy of available data, reasonable assumptions clearly stated, honest scoring
- DO pass assessments that work honestly with limited data rather than fabricating details
` : `
✅ SUFFICIENT DATA SCENARIO - NORMAL EXPECTATIONS:
The research confidence is ${researchConfidence}%, indicating good publicly available data.
Apply normal quality standards: expect detailed MENA analysis, specific recommendations, comprehensive coverage.
`}

⚠️ CRITICAL: HONESTY OVER HIGH SCORES ⚠️
The assessment's purpose is to help exhibitors make informed decisions about whether to exhibit at Gulfood.
An honest assessment saying "DON'T EXHIBIT" (with low scores 20-40%) is MORE VALUABLE than an inflated assessment.

VALIDATION CRITERIA:

1. **Data Accuracy (Critical - Always Required)**
   - Do the extracted company details (industry, products, size, markets) match the verified research data?
   - Are there any factual inconsistencies or contradictions?
   - Is the assessment working with accurate information?

2. **Honesty & Score Justification (Critical - Always Required)**
   - Are the scores HONESTLY justified by SPECIFIC EVIDENCE from the research data?
   - LOW SCORES (20-40%) ARE ACCEPTABLE but MUST include:
     * Explicit citation of company's actual industry/products from research data
     * Clear explanation of mismatch with Gulfood's F&B scope
     * Evidence-backed rationale (not vague statements)
   - Is the assessment avoiding score inflation to make the company feel better?
   - Is it honest about poor fit when company doesn't align with Gulfood's scope?
   - **IMPORTANT**: A well-justified 25% score is BETTER than an inflated 70% score
   - **REJECT**: Shallow "don't exhibit" conclusions without detailed evidence

3. **Goal Alignment (High Priority - Always Required)**
   - Does the assessment specifically address the user's primary goal: "${assessment.primaryGoal}"?
   - Are recommendations tailored to this goal (even if advising against exhibiting)?
   - Is the relevance score appropriate given the goal AND the company's actual fit?

4. **Gulfood Scope Assessment (Critical)**
   - Does the assessment honestly evaluate if the company fits Gulfood's F&B trade show scope?
   - If company is OUTSIDE F&B industry (tech, finance, consulting, etc.), does assessment reflect this with LOW scores?
   - Are Product-Event Alignment scores appropriate for the company's actual industry?
   - **ACCEPT**: Assessments that conclude "Don't exhibit - poor fit" with 20-40% scores

5. **Recommendation Quality (High Priority)**
   - Are there AT LEAST 3 specific, actionable recommendations?
   - Are recommendations honest and realistic given the company's actual alignment?
   - For POOR FIT companies (20-40% scores): Recommendations MUST:
     * Clearly explain WHY they shouldn't exhibit (cite specific mismatches)
     * Provide at least ONE alternative action (e.g., "Consider food tech events if serving F&B as B2B vendor")
     * Be specific and actionable, not vague discouragement
   - For GOOD FIT companies (60%+ scores): Recommendations MUST:
     * Relate specifically to Gulfood 2026 opportunities
     * Include concrete actions (hall selection, networking strategies, etc.)
     * Address the primary goal with specific tactics
   - **REJECT**: Generic or vague recommendations for any score level

6. **Completeness (${researchConfidence >= 70 ? 'Strict' : 'LENIENT - Accept gaps where data unavailable'})**
   - Are all score components present and justified?
   ${researchConfidence >= 70
     ? '- REQUIRED: Are all key sections (products, goals, geography, sustainability) comprehensively covered?'
     : '- ACCEPTABLE: Key sections covered with honest acknowledgment where data is limited (e.g., "sustainability information not available")'}
   - Is critical information missing without explanation?

7. **Consistency (High Priority - Always Required)**
   - Do the scores match the explanations?
   - Are recommendations consistent with scores (low scores = "don't exhibit" recommendations)?
   - Is the overall relevance score aligned with component scores?

SCORING RUBRIC (calibrated to ${researchConfidence}% research confidence):

**IMPORTANT**: Validation score measures QUALITY OF ASSESSMENT, not company fit score.
- A high-quality assessment can have low company fit scores (20-40%)
- Judge the HONESTY and ACCURACY, not whether the company should exhibit

**90-100 (Excellent - Pass)**: 
- Assessment is honest, accurate, and comprehensive with EVIDENCE-BACKED justifications
- Scores cite specific research data (industry, products, markets)
- For poor-fit companies: Clearly explains WHY with specific mismatches + alternatives
- For good-fit companies: Provides exceptional strategic value with concrete actions
- At least 3 specific, actionable recommendations
- ${researchConfidence >= 70 ? 'Comprehensive MENA analysis with specific market opportunities' : 'Works honestly with available data'}

**${validationThreshold}-89 (Good - Pass)**: 
- Assessment is honest and well-reasoned with SPECIFIC justifications
- Scores appropriately reflect company's actual fit based on research evidence
- LOW company scores (20-40%) accepted IF:
  * Explicitly cites company's industry/products from research
  * Explains specific mismatch with F&B scope
  * Provides at least 3 recommendations including alternatives
- Recommendations are realistic, specific, and actionable (minimum 3)

**${validationThreshold - 10}-${validationThreshold - 1} (Needs Revision - Fail)**: 
- Assessment has score inflation or deflation issues
- Not honest about poor fit OR not recognizing good fit
- Recommendations don't match the company's actual situation

**50-${validationThreshold - 11} (Weak - Fail)**: 
- Assessment has significant honesty issues
- Scores don't match evidence (e.g., giving tech company 70% F&B fit)
- Missing key justifications

**0-49 (Poor - Fail)**: 
- Assessment is fundamentally dishonest or inaccurate
- Major factual errors
- Severe score inflation/deflation

CRITICAL EXAMPLES:
✅ PASS (85%): Tech company gets 25% overall score, clear "don't exhibit" advice → HONEST
✅ PASS (90%): Beverage company gets 85% overall score, detailed exhibit strategy → HONEST  
❌ FAIL (50%): Tech company gets 65% score, vague positive recommendations → DISHONEST INFLATION
❌ FAIL (60%): F&B company gets 45% score without clear justification → DISHONEST DEFLATION

INSTRUCTIONS:
- REWARD HONESTY: Low company scores are acceptable when justified
- PENALIZE INFLATION: Don't accept inflated scores for poor-fit companies
- Be FAIR and THOROUGH: Assessment quality ≠ company fit score
- Calibrate expectations to research confidence: ${qualityExpectation}
- Identify SPECIFIC issues (not vague criticisms)
- ${researchConfidence < 70 ? 'IMPORTANT: Accept honest assessments with limited data' : 'Apply standard quality expectations'}
- A validation score below ${validationThreshold} means the assessment lacks honesty/accuracy

RESPONSE FORMAT (valid JSON only):
{
  "passed": <boolean, true if validationScore >= ${validationThreshold}, false otherwise>,
  "validationScore": <number 0-100>,
  "evaluatorFeedback": "<2-3 sentences summarizing overall quality and key issues or strengths>",
  "issuesFound": [
    "<Specific issue 1, e.g., 'Product fit score of 85 is not justified - company products (dairy) don't align strongly with user goal (beverage sourcing)'>",
    "<Specific issue 2, e.g., 'Geographic opportunities section missing analysis of MENA market potential'>",
    "<Specific issue 3, e.g., 'Recommendations are too generic - not tailored to stated goal of finding halal suppliers'>"
  ],
  "improvementSuggestions": [
    "<Specific suggestion 1, e.g., 'Recalculate product fit based on actual product overlap with user needs'>",
    "<Specific suggestion 2, e.g., 'Add analysis of Dubai/MENA market opportunities for this company'>",
    "<Specific suggestion 3, e.g., 'Tailor recommendations to halal certification and Middle East distribution channels'>"
  ]
}

CRITICAL JSON FORMATTING:
- Return ONLY valid JSON object, no markdown, no explanations
- Use double quotes for all strings
- Escape quotes inside strings with backslash
- Arrays can be empty [] if no issues found (for passed assessments)
- Keep feedback concise (2-3 sentences max)
- Make issues and suggestions specific and actionable`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2, // Low temperature for consistent, strict evaluation
      max_tokens: 2500
    });

    const content = completion.choices[0]?.message?.content;
    const finishReason = completion.choices[0]?.finish_reason;

    if (finishReason === 'length') {
      console.warn('⚠️  AI evaluation response was truncated due to max_tokens limit');
    }

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      const evaluationResult = parseAIJSON<EvaluationResult>(content);

      if (!validateEvaluationResult(evaluationResult)) {
        console.error('❌ AI returned invalid evaluation result structure');
        throw new Error('Invalid AI response structure');
      }

      // Ensure passed field matches the dynamic score threshold
      evaluationResult.passed = evaluationResult.validationScore >= validationThreshold;

      console.log(`✅ Assessment evaluation complete: ${evaluationResult.passed ? 'PASSED' : 'FAILED'} (score: ${evaluationResult.validationScore}/${validationThreshold})`);
      if (!evaluationResult.passed) {
        console.log(`   Issues found: ${evaluationResult.issuesFound.length}`);
      }

      return evaluationResult;

    } catch (parseError) {
      console.error('❌ Failed to parse or validate evaluation result:', (parseError as Error).message);
      console.error('Response preview:', content.substring(0, 500));
      return createFailureResponse('Failed to parse evaluation response from AI');
    }

  } catch (error) {
    console.error('❌ Assessment evaluation failed:', (error as Error).message);
    return createFailureResponse(`Evaluation failed: ${(error as Error).message}`);
  }
}

/**
 * Create failure response when evaluation cannot be completed
 */
function createFailureResponse(reason: string): EvaluationResult {
  console.warn('⚠️  Returning failure evaluation result');
  return {
    passed: false,
    validationScore: 0,
    evaluatorFeedback: `Evaluation could not be completed. ${reason}. Assessment should be regenerated.`,
    issuesFound: ['Evaluation system error - unable to validate assessment'],
    improvementSuggestions: ['Retry assessment generation with valid evaluation system']
  };
}
