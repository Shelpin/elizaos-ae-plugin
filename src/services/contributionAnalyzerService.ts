/**
 * Service for analyzing contributions in Telegram and determining appropriate tip amounts
 * using ElizaOS LLM capabilities
 */
export class ContributionAnalyzerService {
  // Default tip amounts based on contribution levels
  private defaultTipAmounts: Record<ContributionLevel, string> = {
    [ContributionLevel.MINOR]: '0.1',    // 0.1 AE for minor contributions
    [ContributionLevel.HELPFUL]: '0.5',  // 0.5 AE for helpful contributions
    [ContributionLevel.VALUABLE]: '1.0', // 1.0 AE for valuable contributions
    [ContributionLevel.MAJOR]: '2.5',    // 2.5 AE for major contributions
    [ContributionLevel.EXCEPTIONAL]: '5.0', // 5.0 AE for exceptional contributions
  };

  // Reference to ElizaOS runtime for LLM access
  public runtime: any;

  /**
   * Create a new ContributionAnalyzerService with optional custom tip amounts
   * @param runtime - ElizaOS runtime for accessing LLM capabilities
   * @param customTipAmounts - Optional custom tip amounts
   */
  constructor(runtime: any, customTipAmounts?: Partial<Record<ContributionLevel, string>>) {
    this.runtime = runtime;
    
    if (customTipAmounts) {
      this.defaultTipAmounts = {
        ...this.defaultTipAmounts,
        ...customTipAmounts
      };
    }
  }

  /**
   * Analyze a contribution description using ElizaOS LLM and determine the appropriate level
   * @param contributionDescription - Description of the contribution
   * @returns The determined contribution level
   */
  public async analyzeContribution(contributionDescription: string): Promise<ContributionLevel> {
    try {
      // Use ElizaOS LLM to analyze the contribution if available
      if (this.runtime && this.runtime.llm) {
        const analysis = await this.runtime.llm.generateResponse({
          prompt: `Analyze this Telegram contribution: "${contributionDescription}". 
                  Rate its value on a scale from 1-5 where:
                  1=minor (basic thanks or simple question)
                  2=helpful (good explanation or clear answer)
                  3=valuable (detailed explanation or time-saving solution)
                  4=major (excellent contribution or deep analysis)
                  5=exceptional (game-changing or revolutionary content)
                  Respond with ONLY the number 1-5.`,
          maxTokens: 10
        });
        
        // Parse the LLM response to determine the level
        const rating = parseInt(analysis.trim(), 10);
        
        if (!isNaN(rating)) {
          switch(rating) {
            case 1: return ContributionLevel.MINOR;
            case 2: return ContributionLevel.HELPFUL;
            case 3: return ContributionLevel.VALUABLE;
            case 4: return ContributionLevel.MAJOR;
            case 5: return ContributionLevel.EXCEPTIONAL;
            default: return ContributionLevel.HELPFUL; // Default fallback
          }
        }
      }
      
      // Fallback to keyword-based analysis if LLM not available
      return this.keywordBasedAnalysis(contributionDescription);
    } catch (error) {
      console.error('Error using LLM for contribution analysis:', error);
      // Fallback to standard keyword analysis
      return this.keywordBasedAnalysis(contributionDescription);
    }
  }

  /**
   * Analyze contribution using keywords (fallback method)
   * @param contributionDescription - Description of the contribution
   * @returns The determined contribution level
   */
  private keywordBasedAnalysis(contributionDescription: string): ContributionLevel {
    // Normalize the description text
    const normalizedText = contributionDescription.toLowerCase();
    
    // Score for each level
    const scores = Object.keys(this.contributionKeywords).reduce((acc, level) => {
      acc[level as ContributionLevel] = 0;
      return acc;
    }, {} as Record<ContributionLevel, number>);
    
    // Calculate scores based on keyword presence
    for (const level of Object.keys(this.contributionKeywords) as ContributionLevel[]) {
      for (const keyword of this.contributionKeywords[level]) {
        if (normalizedText.includes(keyword)) {
          scores[level] += 1;
        }
      }
    }
    
    // Find the level with the highest score
    let highestLevel = ContributionLevel.MINOR; // Default to minor
    let highestScore = 0;
    
    for (const level of Object.keys(scores) as ContributionLevel[]) {
      if (scores[level] > highestScore) {
        highestScore = scores[level];
        highestLevel = level;
      }
    }
    
    // If no keywords matched, default to HELPFUL level
    if (highestScore === 0) {
      return ContributionLevel.HELPFUL;
    }
    
    return highestLevel;
  }

  // Keyword indicators for each contribution level (used as fallback)
  private contributionKeywords: Record<ContributionLevel, string[]> = {
    [ContributionLevel.MINOR]: [
      'thanks', 'thank you', 'appreciate', 'helpful', 'simple question'
    ],
    [ContributionLevel.HELPFUL]: [
      'good explanation', 'clear answer', 'solved my problem', 'useful info'
    ],
    [ContributionLevel.VALUABLE]: [
      'very helpful', 'great solution', 'detailed explanation', 'saved me time',
      'educational', 'informative'
    ],
    [ContributionLevel.MAJOR]: [
      'excellent contribution', 'outstanding explanation', 'deep analysis',
      'critical solution', 'thorough research'
    ],
    [ContributionLevel.EXCEPTIONAL]: [
      'life saver', 'revolutionary', 'invaluable', 'game changer',
      'best explanation', 'exceptional work'
    ]
  };

  /**
   * Get recommended tip amount based on contribution level
   * @param level - Contribution level
   * @returns Recommended tip amount in AE
   */
  public getTipAmount(level: ContributionLevel): string {
    return this.defaultTipAmounts[level];
  }

  /**
   * Analyze a contribution and get the recommended tip amount
   * @param contributionDescription - Description of the contribution
   * @returns Recommended tip amount in AE
   */
  public async getRecommendedTipAmount(contributionDescription: string): Promise<string> {
    const level = await this.analyzeContribution(contributionDescription);
    return this.getTipAmount(level);
  }

  /**
   * Determine if a contribution deserves a tip based on LLM evaluation
   * @param contributionDescription - Description of the contribution
   * @returns Whether the contribution deserves a tip
   */
  public async shouldTip(contributionDescription: string): Promise<boolean> {
    try {
      // Use ElizaOS LLM to decide if the contribution deserves a tip
      if (this.runtime && this.runtime.llm) {
        const analysis = await this.runtime.llm.generateResponse({
          prompt: `Here is a contribution in a Telegram group: "${contributionDescription}". 
                  Based on this contribution, does it deserve a tip with Aeternity tokens?
                  Consider factors like helpfulness, uniqueness, detail, and value to the community.
                  If it's a basic question, simple thanks, or low effort, it doesn't deserve a tip.
                  If it's helpful, detailed, educational, or valuable, it deserves a tip.
                  Respond with ONLY "YES" or "NO".`,
          maxTokens: 10
        });
        
        const response = analysis.trim().toUpperCase();
        return response === "YES";
      }
      
      // If LLM not available, use level-based determination
      const level = await this.analyzeContribution(contributionDescription);
      return level !== ContributionLevel.MINOR; // Tip for anything above MINOR
    } catch (error) {
      console.error('Error determining if contribution deserves tip:', error);
      // Default to level-based determination on error
      const level = await this.analyzeContribution(contributionDescription);
      return level !== ContributionLevel.MINOR;
    }
  }

  /**
   * Customize tip amounts for specific contribution levels
   * @param customAmounts - Custom tip amounts
   */
  public setTipAmounts(customAmounts: Partial<Record<ContributionLevel, string>>): void {
    this.defaultTipAmounts = {
      ...this.defaultTipAmounts,
      ...customAmounts
    };
  }
}

/**
 * Contribution levels from minor to exceptional
 */
export enum ContributionLevel {
  MINOR = 'minor',
  HELPFUL = 'helpful',
  VALUABLE = 'valuable',
  MAJOR = 'major',
  EXCEPTIONAL = 'exceptional'
}

/**
 * Contribution type categories
 */
export enum ContributionType {
  QUESTION_ANSWER = 'question_answer',
  CODE_SHARE = 'code_share',
  TUTORIAL = 'tutorial',
  RESOURCE_SHARING = 'resource_sharing',
  COMMUNITY_SUPPORT = 'community_support',
  BUG_REPORT = 'bug_report',
  TECHNICAL_EXPLANATION = 'technical_explanation',
  OTHER = 'other'
}

/**
 * Contribution analysis result
 */
export interface ContributionAnalysis {
  level: ContributionLevel;
  type: ContributionType;
  recommendedAmount: string;
  confidenceScore: number; // 0-1 confidence in the analysis
  deservesTip: boolean;    // Whether the contribution deserves a tip
} 