export enum PronounSource {
    PRONOUNDB = "pronoundb",
    DISCORD_BIO = "discord_bio", 
    CUSTOM = "custom"
}

export enum CorrectionTone {
    GENTLE = "gentle",
    NEUTRAL = "neutral",
    EDUCATIONAL = "educational",
    CUSTOM = "custom"
}

export interface PronounAnalysis {
    foundPronouns: Array<{
        pronoun: string;
        position: number;
        context: string;
        confidence: number;
    }>;
    mentionContext: Array<{
        userId: string;
        surroundingText: string;
        pronounsNearby: string[];
    }>;
}

export interface CorrectionResult {
    shouldCorrect: boolean;
    confidence: number;
    incorrectPronouns: string[];
    correctPronouns: string;
    reasoning: string;
}

export interface FetchOptions {
    sources: PronounSource[];
    customApiUrl?: string;
    timeout?: number;
}

export interface ParseOptions {
    skipQuotes?: boolean;
    contextAwareness?: boolean;
    minConfidence?: number;
}

// Common pronoun mappings
const PRONOUN_SETS = {
    "he/him": ["he", "him", "his", "himself"],
    "she/her": ["she", "her", "hers", "herself"],
    "they/them": ["they", "them", "their", "theirs", "themselves", "themself"],
    "it/its": ["it", "its", "itself"],
    "xe/xem": ["xe", "xem", "xyr", "xyrs", "xemself"],
    "ze/zir": ["ze", "zir", "zirs", "zirself"],
    "fae/faer": ["fae", "faer", "faers", "faerself"],
    "ey/em": ["ey", "em", "eir", "eirs", "emself"]
};

// Expanded pronoun detection patterns
const PRONOUN_PATTERNS = [
    // Subject pronouns
    /\b(he|she|they|xe|ze|fae|ey|it)\b/gi,
    // Object pronouns  
    /\b(him|her|them|xem|zir|faer|em|it)\b/gi,
    // Possessive pronouns
    /\b(his|hers?|theirs?|xyrs?|zirs?|faers?|eirs?|its)\b/gi,
    // Reflexive pronouns
    /\b(himself|herself|themselves?|xemself|zirself|faerself|emself|itself)\b/gi
];

// Context clues that increase confidence
const POSITIVE_CONTEXT_PATTERNS = [
    /\b(person|individual|user|member|friend|colleague)\b/gi,
    /\b(said|told|mentioned|thinks|believes|likes|wants)\b/gi,
    /\bwhen (he|she|they|xe|ze|fae|ey)\b/gi
];

// Context clues that decrease confidence (likely false positives)
const NEGATIVE_CONTEXT_PATTERNS = [
    /\b(movie|song|book|game|show|video|meme)\b/gi,
    /\b(quote|lyrics|reference|from)\b/gi,
    /\bhttps?:\/\//gi,
    /\b(character|fictional|story)\b/gi
];

// Cache for fetched pronouns (5 minute TTL)
const pronounCache = new Map<string, { pronouns: string; timestamp: number; source: PronounSource }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchPronouns(userId: string, options: FetchOptions): Promise<string> {
    // Check cache first
    const cached = pronounCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.pronouns;
    }

    const sources = options.sources || [PronounSource.PRONOUNDB];
    const timeout = options.timeout || 5000;

    for (const source of sources) {
        try {
            const pronouns = await fetchFromSource(userId, source, options, timeout);
            if (pronouns && pronouns !== "unspecified") {
                // Cache the result
                pronounCache.set(userId, {
                    pronouns,
                    timestamp: Date.now(),
                    source
                });
                return pronouns;
            }
        } catch (error) {
            console.warn(`[PronounCorrector] Failed to fetch from ${source}:`, error);
        }
    }

    return "unspecified";
}

async function fetchFromSource(
    userId: string, 
    source: PronounSource, 
    options: FetchOptions, 
    timeout: number
): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        switch (source) {
            case PronounSource.PRONOUNDB:
                return await fetchPronounDB(userId, controller.signal);
            
            case PronounSource.DISCORD_BIO:
                return await fetchDiscordBio(userId, controller.signal);
            
            case PronounSource.CUSTOM:
                if (options.customApiUrl) {
                    return await fetchCustomAPI(userId, options.customApiUrl, controller.signal);
                }
                break;
        }
        return "unspecified";
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchPronounDB(userId: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(
        `https://pronoundb.org/api/v1/lookup?platform=discord&id=${userId}`,
        { signal }
    );
    
    if (!response.ok) {
        throw new Error(`PronounDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    return normalizePronouns(data.pronouns || "unspecified");
}

async function fetchDiscordBio(userId: string, signal: AbortSignal): Promise<string> {
    // This would integrate with Discord's user profile API if available
    // For now, this is a placeholder for future implementation
    throw new Error("Discord Bio integration not yet implemented");
}

async function fetchCustomAPI(userId: string, apiUrl: string, signal: AbortSignal): Promise<string> {
    const url = apiUrl.replace(/{userId}/g, userId);
    const response = await fetch(url, { signal });
    
    if (!response.ok) {
        throw new Error(`Custom API error: ${response.status}`);
    }
    
    const data = await response.json();
    // Assume the API returns { pronouns: "she/her" } or similar
    return normalizePronouns(data.pronouns || "unspecified");
}

function normalizePronouns(pronouns: string): string {
    if (!pronouns || pronouns === "unspecified") return "unspecified";
    
    // Convert PronounDB format to readable format
    const mapping: { [key: string]: string } = {
        "hh": "he/him",
        "hi": "he/it", 
        "hs": "he/she",
        "ht": "he/they",
        "ih": "it/he",
        "ii": "it/its",
        "is": "it/she", 
        "it": "it/they",
        "shh": "she/he",
        "sh": "she/her",
        "si": "she/it",
        "st": "she/they",
        "th": "they/he",
        "ti": "they/it",
        "ts": "they/she", 
        "tt": "they/them",
        "any": "any pronouns",
        "other": "other pronouns",
        "ask": "ask for pronouns",
        "avoid": "avoid pronouns"
    };
    
    return mapping[pronouns.toLowerCase()] || pronouns;
}

export function parseContextualPronouns(text: string, options: ParseOptions = {}): PronounAnalysis {
    const result: PronounAnalysis = {
        foundPronouns: [],
        mentionContext: []
    };

    let processedText = text;

    // Skip quoted text if enabled
    if (options.skipQuotes) {
        processedText = processedText.replace(/```[\s\S]*?```/g, "");
        processedText = processedText.replace(/`[^`]+`/g, "");
        processedText = processedText.replace(/>[^\n]+/gm, "");
    }

    // Find all pronouns with context
    for (const pattern of PRONOUN_PATTERNS) {
        let match;
        while ((match = pattern.exec(processedText)) !== null) {
            const pronoun = match[0].toLowerCase();
            const position = match.index;
            const contextStart = Math.max(0, position - 50);
            const contextEnd = Math.min(processedText.length, position + match[0].length + 50);
            const context = processedText.slice(contextStart, contextEnd);
            
            let confidence = 50; // Base confidence

            // Adjust confidence based on context
            if (options.contextAwareness) {
                confidence = calculateContextConfidence(context, pronoun);
            }

            result.foundPronouns.push({
                pronoun,
                position,
                context,
                confidence
            });
        }
    }

    // Analyze mention context
    const mentions = extractMentions(processedText);
    for (const userId of mentions) {
        const mentionPattern = new RegExp(`<@!?${userId}>`, 'g');
        let match;
        
        while ((match = mentionPattern.exec(processedText)) !== null) {
            const mentionPos = match.index;
            const surroundingStart = Math.max(0, mentionPos - 100);
            const surroundingEnd = Math.min(processedText.length, mentionPos + match[0].length + 100);
            const surroundingText = processedText.slice(surroundingStart, surroundingEnd);
            
            // Find pronouns near this mention
            const nearbyPronouns = result.foundPronouns
                .filter(p => Math.abs(p.position - mentionPos) < 200)
                .map(p => p.pronoun);

            result.mentionContext.push({
                userId,
                surroundingText,
                pronounsNearby: [...new Set(nearbyPronouns)]
            });
        }
    }

    return result;
}

function calculateContextConfidence(context: string, pronoun: string): number {
    let confidence = 50;

    // Check for positive indicators
    for (const pattern of POSITIVE_CONTEXT_PATTERNS) {
        if (pattern.test(context)) {
            confidence += 15;
        }
    }

    // Check for negative indicators
    for (const pattern of NEGATIVE_CONTEXT_PATTERNS) {
        if (pattern.test(context)) {
            confidence -= 25;
        }
    }

    // Pronouns at the start of sentences are more likely to be referential
    if (/^\s*\b(he|she|they|xe|ze|fae|ey)\b/i.test(context)) {
        confidence += 10;
    }

    // Pronouns followed by verbs are more likely to be referential
    if (new RegExp(`\\b${pronoun}\\s+(is|was|will|can|should|would|has|had|goes|went|says|said)\\b`, 'i').test(context)) {
        confidence += 20;
    }

    return Math.max(0, Math.min(100, confidence));
}

export function shouldCorrect(
    analysis: PronounAnalysis,
    userPronouns: string,
    userId: string,
    options: { requireConfidence: number; contextAwareness: boolean } = { requireConfidence: 75, contextAwareness: true }
): CorrectionResult {
    if (userPronouns === "unspecified" || userPronouns === "any pronouns") {
        return {
            shouldCorrect: false,
            confidence: 0,
            incorrectPronouns: [],
            correctPronouns: userPronouns,
            reasoning: "User pronouns are unspecified or accepts any pronouns"
        };
    }

    // Get the user's accepted pronoun set
    const acceptedPronouns = getPronounSet(userPronouns);
    if (!acceptedPronouns) {
        return {
            shouldCorrect: false,
            confidence: 0,
            incorrectPronouns: [],
            correctPronouns: userPronouns,
            reasoning: "Could not parse user pronouns"
        };
    }

    // Find pronouns used in context of this user
    const userContext = analysis.mentionContext.find(ctx => ctx.userId === userId);
    if (!userContext || !userContext.pronounsNearby.length) {
        return {
            shouldCorrect: false,
            confidence: 0,
            incorrectPronouns: [],
            correctPronouns: userPronouns,
            reasoning: "No pronouns found near user mention"
        };
    }

    // Check which pronouns are incorrect
    const incorrectPronouns = userContext.pronounsNearby.filter(
        pronoun => !acceptedPronouns.includes(pronoun.toLowerCase())
    );

    if (!incorrectPronouns.length) {
        return {
            shouldCorrect: false,
            confidence: 100,
            incorrectPronouns: [],
            correctPronouns: userPronouns,
            reasoning: "All pronouns used are correct"
        };
    }

    // Calculate confidence based on context
    let confidence = 80; // Base confidence for clear mismatch

    if (options.contextAwareness) {
        // Get confidence from pronoun analysis
        const relevantPronouns = analysis.foundPronouns.filter(p => 
            incorrectPronouns.includes(p.pronoun)
        );
        
        if (relevantPronouns.length > 0) {
            const avgConfidence = relevantPronouns.reduce((sum, p) => sum + p.confidence, 0) / relevantPronouns.length;
            confidence = Math.min(confidence, avgConfidence + 20);
        }

        // Reduce confidence if the incorrect pronouns are common false positives
        if (incorrectPronouns.some(p => ["it", "its"].includes(p.toLowerCase()))) {
            confidence -= 15;
        }
    }

    return {
        shouldCorrect: confidence >= options.requireConfidence,
        confidence,
        incorrectPronouns,
        correctPronouns: userPronouns,
        reasoning: `Found incorrect pronouns: ${incorrectPronouns.join(", ")}. User uses: ${userPronouns}`
    };
}

function getPronounSet(pronouns: string): string[] | null {
    const normalized = pronouns.toLowerCase().trim();
    
    // Direct match
    if (PRONOUN_SETS[normalized]) {
        return PRONOUN_SETS[normalized];
    }

    // Try to parse custom formats
    const parts = normalized.split(/[\/,\s]+/).filter(p => p.length > 0);
    if (parts.length >= 2) {
        // Find matching pronoun set
        for (const [key, set] of Object.entries(PRONOUN_SETS)) {
            if (parts.every(part => set.includes(part))) {
                return set;
            }
        }
        
        // If no exact match, return the parts we found
        return parts;
    }

    return null;
}

export function extractMentions(text: string): string[] {
    const mentionPattern = /<@!?(\d+)>/g;
    const mentions = [];
    let match;
    
    while ((match = mentionPattern.exec(text)) !== null) {
        mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // Remove duplicates
}

// Cleanup function for cache
export function clearPronounCache(): void {
    pronounCache.clear();
}

// Function to get cache stats
export function getCacheStats(): { size: number; entries: Array<{ userId: string; pronouns: string; age: number; source: PronounSource }> } {
    const now = Date.now();
    const entries = Array.from(pronounCache.entries()).map(([userId, data]) => ({
        userId,
        pronouns: data.pronouns,
        age: now - data.timestamp,
        source: data.source
    }));

    return { size: pronounCache.size, entries };
}