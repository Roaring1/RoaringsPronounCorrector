import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, UserStore } from "@webpack/common";
import { Settings } from "@api/Settings";
import { 
    fetchPronouns, 
    shouldCorrect, 
    extractMentions, 
    parseContextualPronouns,
    PronounSource,
    CorrectionTone 
} from "./pronouns";
import { DuplicateTracker } from "./duplicateTracker";

const MessageActions = findByPropsLazy("sendMessage", "editMessage");

interface CorrectionCache {
    [channelId: string]: {
        [userId: string]: {
            lastCorrection: number;
            count: number;
        }
    }
}

const correctionCache: CorrectionCache = {};
const duplicateTracker = new DuplicateTracker();

export default definePlugin({
    name: "PronounCorrector",
    description: "Automatically detects potential misgendering and suggests corrections based on fetched pronouns with advanced context awareness.",
    authors: [Devs.YourName], // Replace with actual dev info
    
    settings: {
        enabled: {
            type: OptionType.BOOLEAN,
            description: "Enable pronoun correction",
            default: true
        },
        correctionTone: {
            type: OptionType.SELECT,
            description: "Tone for correction messages",
            options: [
                { label: "Gentle", value: CorrectionTone.GENTLE, default: true },
                { label: "Neutral", value: CorrectionTone.NEUTRAL },
                { label: "Educational", value: CorrectionTone.EDUCATIONAL },
                { label: "Custom", value: CorrectionTone.CUSTOM }
            ]
        },
        customMessage: {
            type: OptionType.STRING,
            description: "Custom correction message template (use {user} for mention, {pronouns} for correct pronouns)",
            default: "Just a heads up: {user} uses {pronouns} pronouns! 💙"
        },
        pronounSources: {
            type: OptionType.MULTISELECT,
            description: "Pronoun data sources to check",
            options: [
                { label: "PronounDB", value: PronounSource.PRONOUNDB, default: true },
                { label: "Discord Bio", value: PronounSource.DISCORD_BIO },
                { label: "Custom API", value: PronounSource.CUSTOM }
            ]
        },
        customApiUrl: {
            type: OptionType.STRING,
            description: "Custom pronoun API URL (use {userId} as placeholder)",
            default: ""
        },
        cooldownMinutes: {
            type: OptionType.SLIDER,
            description: "Minutes between corrections for same user in same channel",
            default: 30,
            markers: [5, 15, 30, 60, 120]
        },
        maxCorrectionsPerUser: {
            type: OptionType.SLIDER,
            description: "Maximum corrections per user per day",
            default: 3,
            markers: [1, 2, 3, 5, 10]
        },
        contextAwareness: {
            type: OptionType.BOOLEAN,
            description: "Enable advanced context awareness to reduce false positives",
            default: true
        },
        skipQuotes: {
            type: OptionType.BOOLEAN,
            description: "Skip corrections in quoted text",
            default: true
        },
        skipBots: {
            type: OptionType.BOOLEAN,
            description: "Skip corrections for bot users",
            default: true
        },
        requireConfidence: {
            type: OptionType.SLIDER,
            description: "Minimum confidence level for corrections (0-100%)",
            default: 75,
            markers: [50, 60, 70, 75, 80, 90, 95]
        }
    },

    flux: {
        MESSAGE_CREATE: this.onMessage
    },

    async onMessage(message: any) {
        if (!this.settings.store.enabled) return;
        if (message.author?.bot && this.settings.store.skipBots) return;
        if (message.author?.id === UserStore.getCurrentUser()?.id) return;

        const content = message.content;
        if (!content || typeof content !== "string") return;

        // Skip if message is too short or doesn't contain potential pronouns
        if (content.length < 10) return;

        try {
            await this.processMessage(message);
        } catch (error) {
            console.error("[PronounCorrector] Error processing message:", error);
        }
    },

    async processMessage(message: any) {
        const channelId = message.channel_id;
        const content = message.content;

        // Extract contextual pronoun usage
        const pronounAnalysis = parseContextualPronouns(content, {
            skipQuotes: this.settings.store.skipQuotes,
            contextAwareness: this.settings.store.contextAwareness
        });

        if (!pronounAnalysis.foundPronouns.length) return;

        // Extract mentions
        const mentions = extractMentions(content);
        if (!mentions.length) return;

        // Process each mentioned user
        for (const userId of mentions) {
            if (await this.shouldSkipUser(channelId, userId)) continue;

            try {
                const userPronouns = await fetchPronouns(userId, {
                    sources: this.settings.store.pronounSources,
                    customApiUrl: this.settings.store.customApiUrl
                });

                const correction = shouldCorrect(
                    pronounAnalysis,
                    userPronouns,
                    userId,
                    {
                        requireConfidence: this.settings.store.requireConfidence,
                        contextAwareness: this.settings.store.contextAwareness
                    }
                );

                if (correction.shouldCorrect && correction.confidence >= this.settings.store.requireConfidence) {
                    await this.sendCorrection(channelId, userId, userPronouns, correction);
                    this.trackCorrection(channelId, userId);
                }
            } catch (error) {
                console.error(`[PronounCorrector] Error processing user ${userId}:`, error);
            }
        }
    },

    async shouldSkipUser(channelId: string, userId: string): Promise<boolean> {
        // Check if user is bot
        if (this.settings.store.skipBots) {
            try {
                const user = UserStore.getUser(userId);
                if (user?.bot) return true;
            } catch (e) {
                // User not in cache, continue
            }
        }

        // Check cooldown
        const cache = correctionCache[channelId]?.[userId];
        if (cache) {
            const timeSinceLastCorrection = Date.now() - cache.lastCorrection;
            const cooldownMs = this.settings.store.cooldownMinutes * 60 * 1000;
            
            if (timeSinceLastCorrection < cooldownMs) return true;
            
            // Check daily limit
            const oneDayMs = 24 * 60 * 60 * 1000;
            if (timeSinceLastCorrection < oneDayMs && cache.count >= this.settings.store.maxCorrectionsPerUser) {
                return true;
            }
        }

        // Check for duplicate corrections
        return duplicateTracker.isDuplicate(channelId, userId);
    },

    async sendCorrection(channelId: string, userId: string, pronouns: string, correction: any) {
        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return;

        const message = this.formatCorrectionMessage(userId, pronouns, correction);
        
        try {
            await MessageActions.sendMessage(channelId, {
                content: message,
                invalidEmojis: [],
                tts: false
            });
        } catch (error) {
            console.error("[PronounCorrector] Failed to send correction:", error);
        }
    },

    formatCorrectionMessage(userId: string, pronouns: string, correction: any): string {
        const tone = this.settings.store.correctionTone;
        const userMention = `<@${userId}>`;

        switch (tone) {
            case CorrectionTone.GENTLE:
                return `Hey! Just a gentle reminder that ${userMention} uses **${pronouns}** pronouns 💙`;
            
            case CorrectionTone.NEUTRAL:
                return `${userMention} uses **${pronouns}** pronouns.`;
            
            case CorrectionTone.EDUCATIONAL:
                return `Friendly correction: ${userMention} uses **${pronouns}** pronouns. Using correct pronouns shows respect and creates an inclusive environment! 🌈`;
            
            case CorrectionTone.CUSTOM:
                return this.settings.store.customMessage
                    .replace(/{user}/g, userMention)
                    .replace(/{pronouns}/g, `**${pronouns}**`);
            
            default:
                return `${userMention} uses **${pronouns}** pronouns 💙`;
        }
    },

    trackCorrection(channelId: string, userId: string) {
        if (!correctionCache[channelId]) {
            correctionCache[channelId] = {};
        }
        
        if (!correctionCache[channelId][userId]) {
            correctionCache[channelId][userId] = { lastCorrection: 0, count: 0 };
        }
        
        const cache = correctionCache[channelId][userId];
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        // Reset daily count if more than 24 hours passed
        if (now - cache.lastCorrection > oneDayMs) {
            cache.count = 0;
        }
        
        cache.lastCorrection = now;
        cache.count++;
        
        // Add to duplicate tracker
        duplicateTracker.addCorrection(channelId, userId);
    },

    start() {
        console.log("[PronounCorrector] Plugin started");
    },

    stop() {
        console.log("[PronounCorrector] Plugin stopped");
        // Clear caches
        Object.keys(correctionCache).forEach(key => delete correctionCache[key]);
        duplicateTracker.clear();
    }
});