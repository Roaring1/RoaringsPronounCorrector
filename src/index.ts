import definePlugin, { OptionType } from "@utils/types";
import { addPreSendListener, removePreSendListener, MessageObject } from "@api/MessageEvents";
import { findByPropsLazy } from "@webpack";
import { UserStore, ChannelStore } from "@webpack/common";
import { Toasts, showToast } from "@webpack/common";
import { 
    fetchPronouns, 
    detectPronounMismatches, 
    correctPronouns,
    extractMentions,
    PronounSource,
    CorrectionMode 
} from "./pronounAutoCorrect";

const MessageActions = findByPropsLazy("sendMessage", "editMessage");

export default definePlugin({
    name: "RoaringsPronounAutoCorrect",
    description: "I automatically correct pronouns in my messages before sending, or block messages with wrong pronouns.",
    authors: [{ name: "Roaring", id: 0n }],
    
    options: {
        enabled: {
            type: OptionType.BOOLEAN,
            description: "Enable my pronoun auto-correction",
            default: true
        },
        
        correctionMode: {
            type: OptionType.SELECT,
            description: "How I want to handle wrong pronouns",
            options: [
                { label: "Auto-correct my message", value: CorrectionMode.AUTO_CORRECT, default: true },
                { label: "Block my message and warn me", value: CorrectionMode.BLOCK_AND_WARN },
                { label: "Ask me before correcting", value: CorrectionMode.ASK_FIRST }
            ]
        },

        pronounSources: {
            type: OptionType.MULTISELECT,
            description: "Where I want to check for pronouns",
            options: [
                { label: "PronounDB", value: PronounSource.PRONOUNDB, default: true },
                { label: "Discord Bio/About Me", value: PronounSource.DISCORD_BIO },
                { label: "My custom API", value: PronounSource.CUSTOM }
            ]
        },

        customApiUrl: {
            type: OptionType.STRING,
            description: "My custom pronoun API URL (use {userId} as placeholder)",
            default: "https://api.example.com/pronouns/{userId}"
        },

        showToasts: {
            type: OptionType.BOOLEAN,
            description: "Show me notifications when I auto-correct pronouns",
            default: true
        },

        confidenceThreshold: {
            type: OptionType.SLIDER,
            description: "How confident the detection should be before I auto-correct",
            default: 80,
            markers: [60, 70, 80, 90, 95]
        },

        skipQuotedText: {
            type: OptionType.BOOLEAN,
            description: "Don't correct pronouns in quoted text or code blocks",
            default: true
        },

        debugMode: {
            type: OptionType.BOOLEAN,
            description: "Show me debug info about pronoun detection",
            default: false
        }
    },

    // Track my correction statistics
    stats: {
        totalCorrections: 0,
        autoCorrections: 0,
        blockedMessages: 0,
        sessionStarted: Date.now()
    },

    preSendListener: null as any,

    start() {
        console.log("[RoaringsPronounAutoCorrect] Starting my pronoun auto-correction...");
        
        // Add my pre-send message listener
        this.preSendListener = addPreSendListener(async (channelId, messageObj, extra) => {
            return await this.interceptMyMessage(channelId, messageObj, extra);
        });

        if (this.options.showToasts) {
            showToast("Roaring's Pronoun Auto-Correction is now active! 💙", Toasts.Type.SUCCESS);
        }
    },

    stop() {
        console.log("[RoaringsPronounAutoCorrect] Stopping my pronoun auto-correction...");
        
        if (this.preSendListener) {
            removePreSendListener(this.preSendListener);
            this.preSendListener = null;
        }

        if (this.options.showToasts) {
            showToast("Roaring's Pronoun Auto-Correction stopped", Toasts.Type.MESSAGE);
        }
    },

    async interceptMyMessage(channelId: string, messageObj: MessageObject, extra: any) {
        // Only process if I have the feature enabled
        if (!this.options.enabled) return;

        const content = messageObj.content;
        if (!content || typeof content !== "string") return;

        try {
            // Debug logging if enabled
            if (this.options.debugMode) {
                console.log("[RoaringsPronounAutoCorrect] Checking my message:", content);
            }

            // Look for mentions in my message
            const mentions = extractMentions(content);
            if (mentions.length === 0) return; // No mentions, nothing to check

            // Check each mentioned user for pronoun mismatches
            const corrections = await this.checkForPronounMismatches(content, mentions);
            
            if (corrections.length === 0) return; // No issues found

            // Handle the corrections based on my settings
            return await this.handleCorrections(messageObj, corrections, channelId);

        } catch (error) {
            console.error("[RoaringsPronounAutoCorrect] Error checking my message:", error);
            
            if (this.options.debugMode) {
                showToast(`Error in pronoun check: ${error.message}`, Toasts.Type.FAILURE);
            }
        }
    },

    async checkForPronounMismatches(content: string, mentions: string[]) {
        const corrections = [];

        for (const userId of mentions) {
            try {
                // Get the user's correct pronouns
                const userPronouns = await fetchPronouns(userId, {
                    sources: this.options.pronounSources,
                    customApiUrl: this.options.customApiUrl
                });

                if (userPronouns === "unspecified" || userPronouns === "any pronouns") {
                    continue; // Skip if no specific pronouns
                }

                // Detect mismatches in my message
                const mismatches = detectPronounMismatches(content, userId, userPronouns, {
                    skipQuotedText: this.options.skipQuotedText,
                    confidenceThreshold: this.options.confidenceThreshold
                });

                if (mismatches.length > 0) {
                    corrections.push({
                        userId,
                        userPronouns,
                        mismatches,
                        confidence: Math.max(...mismatches.map(m => m.confidence))
                    });
                }

            } catch (error) {
                console.warn(`[RoaringsPronounAutoCorrect] Failed to check pronouns for user ${userId}:`, error);
            }
        }

        return corrections;
    },

    async handleCorrections(messageObj: MessageObject, corrections: any[], channelId: string) {
        const mode = this.options.correctionMode;

        switch (mode) {
            case CorrectionMode.AUTO_CORRECT:
                return await this.autoCorrectMessage(messageObj, corrections);

            case CorrectionMode.BLOCK_AND_WARN:
                return await this.blockMessageAndWarn(messageObj, corrections, channelId);

            case CorrectionMode.ASK_FIRST:
                return await this.askBeforeCorrection(messageObj, corrections);

            default:
                return; // Let message send normally
        }
    },

    async autoCorrectMessage(messageObj: MessageObject, corrections: any[]) {
        let correctedContent = messageObj.content;
        const correctedWords = [];

        // Apply all corrections to my message
        for (const correction of corrections) {
            const result = correctPronouns(correctedContent, correction);
            correctedContent = result.correctedText;
            correctedWords.push(...result.correctedWords);
        }

        // Update my message content
        messageObj.content = correctedContent;

        // Track my statistics
        this.stats.totalCorrections++;
        this.stats.autoCorrections++;

        // Show me a notification if enabled
        if (this.options.showToasts && correctedWords.length > 0) {
            const correctionList = correctedWords.map(w => `"${w.original}" → "${w.corrected}"`).join(", ");
            showToast(`Auto-corrected: ${correctionList}`, Toasts.Type.MESSAGE);
        }

        // Debug info
        if (this.options.debugMode) {
            console.log("[RoaringsPronounAutoCorrect] Auto-corrected my message:", {
                original: messageObj.content,
                corrected: correctedContent,
                corrections: correctedWords
            });
        }

        // Let the corrected message send
        return;
    },

    async blockMessageAndWarn(messageObj: MessageObject, corrections: any[], channelId: string) {
        // Prevent my message from sending
        const correctionSummary = corrections.map(c => {
            const user = UserStore.getUser(c.userId);
            const userName = user?.displayName || user?.username || "Unknown User";
            const wrongPronouns = c.mismatches.map(m => m.wrongPronoun).join(", ");
            return `${userName} uses ${c.userPronouns} (you used: ${wrongPronouns})`;
        }).join("\n");

        showToast(
            `Message blocked! Pronoun corrections needed:\n${correctionSummary}`, 
            Toasts.Type.FAILURE,
            { duration: 8000 }
        );

        // Track statistics
        this.stats.totalCorrections++;
        this.stats.blockedMessages++;

        // Debug info
        if (this.options.debugMode) {
            console.log("[RoaringsPronounAutoCorrect] Blocked my message:", {
                content: messageObj.content,
                corrections
            });
        }

        // Return false to prevent the message from sending
        return false;
    },

    async askBeforeCorrection(messageObj: MessageObject, corrections: any[]) {
        // For now, we'll auto-correct but show a detailed notification
        // In a full implementation, this would show a modal dialog
        
        const correctionSummary = corrections.map(c => {
            const user = UserStore.getUser(c.userId);
            const userName = user?.displayName || user?.username || "Unknown User";
            return `${userName}: ${c.userPronouns}`;
        }).join(", ");

        showToast(
            `Pronoun corrections available for: ${correctionSummary}\nAuto-applying corrections...`, 
            Toasts.Type.MESSAGE,
            { duration: 5000 }
        );

        // Apply corrections after showing the warning
        return await this.autoCorrectMessage(messageObj, corrections);
    },

    // Command to show my statistics
    getMyStats() {
        const uptime = Date.now() - this.stats.sessionStarted;
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        
        return {
            ...this.stats,
            uptimeHours: hours,
            settingsActive: this.options.enabled
        };
    },

    // Reset my statistics
    resetMyStats() {
        this.stats = {
            totalCorrections: 0,
            autoCorrections: 0,
            blockedMessages: 0,
            sessionStarted: Date.now()
        };
        
        showToast("My pronoun correction stats have been reset!", Toasts.Type.SUCCESS);
    }
});