export enum PronounSource {
    PRONOUNDB = "pronoundb",
    DISCORD_BIO = "discord_bio",
    CUSTOM = "custom"
}

export enum CorrectionMode {
    AUTO_CORRECT = "auto_correct",
    BLOCK_AND_WARN = "block_and_warn", 
    ASK_FIRST = "ask_first"
}

export interface PronounMismatch {
    wrongPronoun: string;
    correctPronoun: string;
    position: number;
    context: string;
    confidence: number;
}

export interface CorrectionResult {
    correctedText: string;
    correctedWords: Array<{
        original: string;
        corrected: string;
        position: number;
    }>;
}

export interface FetchOptions {
    sources: PronounSource[];
    customApiUrl?: string;
    timeout?: number;
}

export interface DetectionOptions {
    skipQuotedText?: boolean;
    confidenceThreshold?: number;
}

// My pronoun mappings for detection and correction
const PRONOUN_SETS = {
    "he/him": {
        subject: ["he"],
        object: ["him"],
        possessive: ["his"],
        possessiveObject: ["his"],
        reflexive: ["himself"]
    },
    "she/her": {
        subject: ["she"],
        object: ["her"],
        possessive: ["her"],
        possessiveObject: ["hers"],
        reflexive: ["herself"]
    },
    "they/them": {
        subject: ["they"],
        object: ["them"],
        possessive: ["their"],
        possessiveObject: ["theirs"],
        reflexive: ["themselves", "themself"]
    },
    "it/its": {
        subject: ["it"],
        object: ["it"],
        possessive: ["its"],
        possessiveObject: ["its"],
        reflexive: ["itself"]
    }
};

// Cache for pronouns I've looked up (so I don't spam APIs)
const myPronounCache = new Map<string, { pronouns: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchPronouns(userId: string, options: FetchOptions): Promise<string> {
    // Check my cache first
    const cached = myPronounCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.pronouns;
    }

    const sources = options.sources || [PronounSource.PRONOUNDB];
    const timeout = options.timeout || 5000;

    // Try each source I've configured
    for (const source of sources) {
        try {
            const pronouns = await fetchFromSource(userId, source, options, timeout);
            if (pronouns && pronouns !== "unspecified") {
                // Cache the result for my future use
                myPronounCache.set(userId, {
                    pronouns,
                    timestamp: Date.now()
                });
                return pronouns;
            }
        } catch (error) {
            console.warn(`[RoaringsPronounAutoCorrect] My ${source} lookup failed:`, error);
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
                return await fetchFromPronounDB(userId, controller.signal);
            
            case PronounSource.DISCORD_BIO:
                return await fetchFromDiscordBio(userId, controller.signal);
            
            case PronounSource.CUSTOM:
                if (options.customApiUrl) {
                    return await fetchFromMyCustomAPI(userId, options.customApiUrl, controller.signal);
                }
                break;
        }
        return "unspecified";
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchFromPronounDB(userId: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(
        `https://pronoundb.org/api/v1/lookup?platform=discord&id=${userId}`,
        { signal }
    );
    
    if (!response.ok) {
        throw new Error(`PronounDB error: ${response.status}`);
    }
    
    const data = await response.json();
    return normalizePronounsForMe(data.pronouns || "unspecified");
}

async function fetchFromDiscordBio(userId: string, signal: AbortSignal): Promise<string> {
    // This would extract pronouns from Discord bio/about me
    // For now, this is a placeholder for future implementation
    throw new Error("Discord Bio integration not yet implemented in my plugin");
}

async function fetchFromMyCustomAPI(userId: string, apiUrl: string, signal: AbortSignal): Promise<string> {
    const url = apiUrl.replace(/{userId}/g, userId);
    const response = await fetch(url, { signal });
    
    if (!response.ok) {
        throw new Error(`My custom API error: ${response.status}`);
    }
    
    const data = await response.json();
    return normalizePronounsForMe(data.pronouns || "unspecified");
}

function normalizePronounsForMe(pronouns: string): string {
    if (!pronouns || pronouns === "unspecified") return "unspecified";
    
    // Convert PronounDB codes to readable format for my use
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

export function detectPronounMismatches(
    content: string, 
    userId: string, 
    correctPronouns: string,
    options: DetectionOptions = {}
): PronounMismatch[] {
    const mismatches: PronounMismatch[] = [];
    
    if (correctPronouns === "unspecified" || correctPronouns === "any pronouns") {
        return mismatches; // Can't detect mismatches if no specific pronouns
    }

    let processedContent = content;

    // Skip quoted text and code blocks if I want to
    if (options.skipQuotedText) {
        processedContent = processedContent.replace(/```[\s\S]*?```/g, "");
        processedContent = processedContent.replace(/`[^`]+`/g, "");
        processedContent = processedContent.replace(/>[^\n]+/gm, "");
    }

    // Get the correct pronoun set for this user
    const correctSet = PRONOUN_SETS[correctPronouns.toLowerCase()];
    if (!correctSet) {
        console.warn(`[RoaringsPronounAutoCorrect] I don't know how to handle pronouns: ${correctPronouns}`);
        return mismatches;
    }

    // Find where I mentioned this user
    const mentionPattern = new RegExp(`<@!?${userId}>`, 'g');
    const mentionMatches = Array.from(processedContent.matchAll(mentionPattern));

    for (const mentionMatch of mentionMatches) {
        const mentionPos = mentionMatch.index!;
        
        // Look for pronouns near this mention (within 200 characters)
        const searchStart = Math.max(0, mentionPos - 100);
        const searchEnd = Math.min(processedContent.length, mentionPos + 300);
        const contextArea = processedContent.slice(searchStart, searchEnd);
        
        // Check all pronoun types against what I wrote
        for (const [type, correctOptions] of Object.entries(correctSet)) {
            // Build pattern for all pronouns of this type from other sets
            const allPronounsOfType = Object.values(PRONOUN_SETS)
                .flatMap(set => set[type as keyof typeof set] || [])
                .filter(p => !correctOptions.includes(p.toLowerCase()));

            if (allPronounsOfType.length === 0) continue;

            const wrongPronounPattern = new RegExp(
                `\\b(${allPronounsOfType.join('|')})\\b`,
                'gi'
            );

            let match;
            while ((match = wrongPronounPattern.exec(contextArea)) !== null) {
                const wrongPronoun = match[0].toLowerCase();
                const absolutePosition = searchStart + match.index!;
                
                // Calculate confidence based on proximity to mention
                const distanceFromMention = Math.abs(absolutePosition - mentionPos);
                let confidence = Math.max(60, 100 - (distanceFromMention / 10));

                // Increase confidence if it's clearly referential
                const surroundingText = contextArea.slice(
                    Math.max(0, match.index! - 20),
                    Math.min(contextArea.length, match.index! + match[0].length + 20)
                );

                if (/\b(is|was|will|can|should|would|has|had|goes|went|says|said)\b/i.test(surroundingText)) {
                    confidence += 15;
                }

                if (confidence >= (options.confidenceThreshold || 70)) {
                    // Find the best correction for this wrong pronoun
                    const correctPronoun = findBestCorrection(wrongPronoun, correctSet);
                    
                    mismatches.push({
                        wrongPronoun,
                        correctPronoun,
                        position: absolutePosition,
                        context: surroundingText,
                        confidence: Math.round(confidence)
                    });
                }
            }
        }
    }

    return mismatches;
}

function findBestCorrection(wrongPronoun: string, correctSet: any): string {
    const wrong = wrongPronoun.toLowerCase();
    
    // Map common wrong pronouns to the correct type
    const typeMapping = {
        'he': 'subject',
        'she': 'subject', 
        'they': 'subject',
        'it': 'subject',
        'him': 'object',
        'her': 'object',
        'them': 'object',
        'his': 'possessive',
        'hers': 'possessiveObject',
        'theirs': 'possessiveObject',
        'its': 'possessive',
        'himself': 'reflexive',
        'herself': 'reflexive',
        'themselves': 'reflexive',
        'themself': 'reflexive',
        'itself': 'reflexive'
    };

    const type = typeMapping[wrong];
    if (type && correctSet[type] && correctSet[type].length > 0) {
        return correctSet[type][0]; // Return first option of correct type
    }

    // Fallback to subject pronoun
    return correctSet.subject?.[0] || wrongPronoun;
}

export function correctPronouns(content: string, correction: any): CorrectionResult {
    let correctedText = content;
    const correctedWords: Array<{ original: string; corrected: string; position: number }> = [];

    // Sort mismatches by position (reverse order so positions don't shift)
    const sortedMismatches = correction.mismatches.sort((a: any, b: any) => b.position - a.position);

    for (const mismatch of sortedMismatches) {
        const { wrongPronoun, correctPronoun, position } = mismatch;
        
        // Find the exact word to replace (case-preserving)
        const beforeChar = position > 0 ? content[position - 1] : ' ';
        const afterChar = position + wrongPronoun.length < content.length ? 
            content[position + wrongPronoun.length] : ' ';

        // Only replace if it's a whole word
        if (/\W/.test(beforeChar) && /\W/.test(afterChar)) {
            // Preserve original case
            const originalCase = content.slice(position, position + wrongPronoun.length);
            const correctedPronoun = preserveCase(originalCase, correctPronoun);
            
            // Replace in the text
            correctedText = correctedText.slice(0, position) + 
                          correctedPronoun + 
                          correctedText.slice(position + wrongPronoun.length);

            correctedWords.push({
                original: originalCase,
                corrected: correctedPronoun,
                position
            });
        }
    }

    return {
        correctedText,
        correctedWords
    };
}

function preserveCase(original: string, replacement: string): string {
    if (original === original.toUpperCase()) {
        return replacement.toUpperCase(); // ALL CAPS
    } else if (original[0] === original[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1).toLowerCase(); // Title Case
    } else {
        return replacement.toLowerCase(); // lowercase
    }
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

// Clear my pronoun cache
export function clearMyPronounCache(): void {
    myPronounCache.clear();
}

// Get my cache statistics
export function getMyCacheStats(): { 
    size: number; 
    entries: Array<{ userId: string; pronouns: string; age: number }> 
} {
    const now = Date.now();
    const entries = Array.from(myPronounCache.entries()).map(([userId, data]) => ({
        userId,
        pronouns: data.pronouns,
        age: now - data.timestamp
    }));

    return { size: myPronounCache.size, entries };
}