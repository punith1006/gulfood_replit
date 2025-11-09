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
    productFit?: number;
    strategicGoalAlignment?: number;
    geographicOpportunities?: number;
    opportunisticAdvantages?: number;
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
    const requiredScores = ['productFit', 'strategicGoalAlignment', 'geographicOpportunities', 'opportunisticAdvantages'];
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

  try {
    const prompt = `You are an expert evaluator validating exhibitor assessments for Gulfood 2026 trade show in Dubai. Your role is to ensure assessments are accurate, fair, and strategically valuable.

ASSESSMENT TO VALIDATE:
Company: ${assessment.companyName}
Website: ${assessment.websiteUrl}
Country: ${assessment.country}
Primary Goal: ${assessment.primaryGoal}

ASSESSMENT SCORES:
- Overall Relevance Score: ${assessment.relevanceScore}/100
- Product Fit: ${assessment.scoreBreakdown.productFit ?? 'Not provided'}/100
- Strategic Goal Alignment: ${assessment.scoreBreakdown.strategicGoalAlignment ?? 'Not provided'}/100
- Geographic Opportunities: ${assessment.scoreBreakdown.geographicOpportunities ?? 'Not provided'}/100
- Opportunistic Advantages: ${assessment.scoreBreakdown.opportunisticAdvantages ?? 'Not provided'}/100

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
Research Confidence: ${companyResearch.confidenceScore}%
Summary: ${companyResearch.searchSummary}

USER CONTEXT:
Primary Goals: ${primaryGoals.join(', ')}
Country: ${country}

VALIDATION CRITERIA:

1. **Data Accuracy (Critical)**
   - Do the extracted company details (industry, products, size, markets) match the verified research data?
   - Are there any factual inconsistencies or contradictions?
   - Is the assessment working with accurate information?

2. **Fairness & Objectivity**
   - Are the scores justified by the evidence?
   - Is there any arbitrary score inflation or deflation?
   - Are similar factors weighted consistently?
   - Is the assessment free from bias?

3. **Goal Alignment**
   - Does the assessment specifically address the user's primary goal: "${assessment.primaryGoal}"?
   - Are recommendations tailored to this goal?
   - Is the relevance score appropriate given the goal?

4. **Geographic Relevance**
   - Does the assessment consider the user's country (${country}) appropriately?
   - Are MENA/Dubai market opportunities mentioned if relevant?
   - Is Gulfood's location advantage (Dubai) considered?

5. **Strategic Relevance**
   - Are recommendations specific, actionable, and strategic?
   - Do they relate to Gulfood 2026 exhibiting opportunities?
   - Are they relevant to the food & beverage industry?

6. **Completeness**
   - Are all score components present and justified?
   - Are key sections (products, goals, geography) adequately covered?
   - Is critical information missing?

7. **Consistency**
   - Do the scores match the explanations?
   - Are recommendations consistent with scores?
   - Is the overall relevance score aligned with component scores?

SCORING RUBRIC (be fair but thorough):

**90-100 (Excellent - Pass)**: Assessment is highly accurate, comprehensive, and exceptionally strategic. All criteria met excellently.

**80-89 (Good - Pass)**: Assessment is accurate, well-reasoned, and strategically valuable. May have minor areas for improvement but fundamentally sound and useful.

**70-79 (Needs Revision - Fail)**: Assessment is generally accurate but has notable gaps or weak areas that require regeneration for better quality.

**50-69 (Weak - Fail)**: Assessment has significant issues - missing key information, unjustified scores, or moderate goal misalignment.

**0-49 (Poor - Fail)**: Assessment is fundamentally flawed - major factual errors, arbitrary scoring, or severe misalignment.

INSTRUCTIONS:
- Be FAIR and THOROUGH. An assessment doesn't need to be perfect to pass - it needs to be accurate, useful, and well-reasoned.
- Identify SPECIFIC, CONCRETE issues (not vague criticisms)
- Provide ACTIONABLE improvement suggestions
- Consider Gulfood context (food & beverage trade show in Dubai)
- A score below 80 means the assessment should be regenerated to improve quality
- Balance quality standards with realistic expectations - good assessments with minor gaps should pass

RESPONSE FORMAT (valid JSON only):
{
  "passed": <boolean, true if validationScore >= 80, false otherwise>,
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

      // Ensure passed field matches the score threshold
      evaluationResult.passed = evaluationResult.validationScore >= 80;

      console.log(`✅ Assessment evaluation complete: ${evaluationResult.passed ? 'PASSED' : 'FAILED'} (score: ${evaluationResult.validationScore}/100)`);
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
