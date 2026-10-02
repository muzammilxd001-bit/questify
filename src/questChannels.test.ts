import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
    loadQuestChannels,
    questChannelNotice,
    saveQuestChannel,
} from "./questChannels";

test("saves one configured quest channel per server and reloads it", () => {
    const directory = mkdtempSync(join(tmpdir(), "quest-channels-"));
    const file = join(directory, "channels.json");
    try {
        const channels: Record<string, string> = {};
        saveQuestChannel(channels, "12345678901234567", "23456789012345678", file);

        assert.equal(channels["12345678901234567"], "23456789012345678");
        assert.deepEqual(loadQuestChannels(file), {
            "12345678901234567": "23456789012345678",
        });
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("allows commands only in the configured server channel", () => {
    const channels = { "12345678901234567": "23456789012345678" };

    assert.equal(
        questChannelNotice(channels, "12345678901234567", "23456789012345678"),
        null,
    );
    assert.match(
        questChannelNotice(channels, "12345678901234567", "34567890123456789")!,
        /<#23456789012345678>/,
    );
    assert.match(
        questChannelNotice(channels, "98765432109876543", "23456789012345678")!,
        /No quest channel is set/,
    );
    assert.match(
        questChannelNotice(channels, undefined, "23456789012345678")!,
        /only available in a server/,
    );
});

test("rejects invalid snowflakes instead of persisting them", () => {
    assert.throws(() =>
        saveQuestChannel({}, "not-a-server", "23456789012345678", "/tmp/unused.json"),
    );
});