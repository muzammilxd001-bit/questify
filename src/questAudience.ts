import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const DATA_FILE = join(process.cwd(), ".data", "quest-audience.json");
const SNOWFLAKE = /^\d{17,20}$/;

export interface QuestAudienceEntry {
    recipients: string[];
    optedOut: string[];
}

export type QuestAudience = Record<string, QuestAudienceEntry>;

export function loadQuestAudience(file = DATA_FILE): QuestAudience {
    try {
        const data: unknown = JSON.parse(readFileSync(file, "utf8"));
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Invalid quest notification audience");
        }
        for (const [guildId, entry] of Object.entries(data)) {
            const value = entry as Partial<QuestAudienceEntry>;
            if (
                !SNOWFLAKE.test(guildId) ||
                !Array.isArray(value.recipients) ||
                !Array.isArray(value.optedOut) ||
                [...value.recipients, ...value.optedOut].some(
                    (id) => typeof id !== "string" || !SNOWFLAKE.test(id),
                )
            ) {
                throw new Error("Invalid quest notification audience");
            }
        }
        return data as QuestAudience;
    } catch (error: any) {
        if (error.code === "ENOENT") return {};
        throw error;
    }
}

export function recordQuestUser(
    audience: QuestAudience,
    guildId: string,
    userId: string,
    file = DATA_FILE,
): void {
    if (!SNOWFLAKE.test(guildId) || !SNOWFLAKE.test(userId)) {
        throw new Error("Invalid guild or user ID");
    }
    const current = audience[guildId] ?? { recipients: [], optedOut: [] };
    if (current.optedOut.includes(userId) || current.recipients.includes(userId)) {
        return;
    }
    const next = {
        ...audience,
        [guildId]: { ...current, recipients: [...current.recipients, userId] },
    };
    persistAudience(next, file);
    audience[guildId] = next[guildId];
}

export function setQuestNotification(
    audience: QuestAudience,
    guildId: string,
    userId: string,
    enabled: boolean,
    file = DATA_FILE,
): void {
    if (!SNOWFLAKE.test(guildId) || !SNOWFLAKE.test(userId)) {
        throw new Error("Invalid guild or user ID");
    }
    const current = audience[guildId] ?? { recipients: [], optedOut: [] };
    const recipients = current.recipients.filter((id) => id !== userId);
    const optedOut = current.optedOut.filter((id) => id !== userId);
    if (enabled) recipients.push(userId);
    else optedOut.push(userId);

    const next = { ...audience, [guildId]: { recipients, optedOut } };
    persistAudience(next, file);
    audience[guildId] = next[guildId];
}

export function getQuestRecipients(
    audience: QuestAudience,
    guildId: string,
): string[] {
    return [...(audience[guildId]?.recipients ?? [])];
}

function persistAudience(audience: QuestAudience, file: string): void {
    mkdirSync(dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    writeFileSync(temp, JSON.stringify(audience, null, 2) + "\n", {
        mode: 0o600,
    });
    renameSync(temp, file);
}