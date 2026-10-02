import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
    getQuestRecipients,
    loadQuestAudience,
    recordQuestUser,
    setQuestNotification,
} from "./questAudience";

test("tracks bot users once per server and reloads the recipient list", () => {
    const directory = mkdtempSync(join(tmpdir(), "quest-audience-"));
    const file = join(directory, "audience.json");
    try {
        const audience = {};
        recordQuestUser(audience, "12345678901234567", "23456789012345678", file);
        recordQuestUser(audience, "12345678901234567", "23456789012345678", file);

        assert.deepEqual(getQuestRecipients(audience, "12345678901234567"), [
            "23456789012345678",
        ]);
        assert.deepEqual(
            getQuestRecipients(loadQuestAudience(file), "12345678901234567"),
            ["23456789012345678"],
        );
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("honors notification opt-out and opt-in", () => {
    const directory = mkdtempSync(join(tmpdir(), "quest-audience-"));
    const file = join(directory, "audience.json");
    try {
        const audience = {};
        const guildId = "12345678901234567";
        const userId = "23456789012345678";
        recordQuestUser(audience, guildId, userId, file);
        setQuestNotification(audience, guildId, userId, false, file);
        recordQuestUser(audience, guildId, userId, file);
        assert.deepEqual(getQuestRecipients(audience, guildId), []);

        setQuestNotification(audience, guildId, userId, true, file);
        assert.deepEqual(getQuestRecipients(audience, guildId), [userId]);
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});