import { describe, it, expect } from 'vitest';
import { isScheduleDue, getNextRunTime, buildDistributedSchedule } from './saas-scheduler';

describe('SaaS Multi-Tenant Scheduler & Hour Distribution', () => {
    describe('buildDistributedSchedule', () => {
        it('creates 1 post per day schedule at chosen time', () => {
            const res = buildDistributedSchedule(1, 9, 0);
            expect(res.cron).toBe('0 9 * * *');
            expect(res.hours).toEqual([9]);
            expect(res.intervalHours).toBe(24);
        });

        it('divides 2 posts into 12-hour intervals', () => {
            const res = buildDistributedSchedule(2, 9, 0);
            expect(res.cron).toBe('0 9,21 * * *');
            expect(res.hours).toEqual([9, 21]);
            expect(res.intervalHours).toBe(12);
        });

        it('divides 3 posts into 8-hour intervals', () => {
            const res = buildDistributedSchedule(3, 9, 0);
            expect(res.cron).toBe('0 1,9,17 * * *');
            expect(res.hours).toEqual([1, 9, 17]);
            expect(res.intervalHours).toBe(8);
        });

        it('divides 4 posts into 6-hour intervals', () => {
            const res = buildDistributedSchedule(4, 9, 0);
            expect(res.cron).toBe('0 3,9,15,21 * * *');
            expect(res.hours).toEqual([3, 9, 15, 21]);
            expect(res.intervalHours).toBe(6);
        });
    });

    describe('isScheduleDue & Missed Run Recovery', () => {
        it('accurately identifies when an exact daily schedule is due', () => {
            const schedule = '0 9 * * *'; // 09:00 AM
            const timezone = 'UTC';

            // Exactly at 09:00:15 UTC
            const now = new Date('2026-11-12T09:00:15.000Z');
            const check = isScheduleDue(schedule, timezone, null, now);
            expect(check.isDue).toBe(true);
            expect(check.reason).toBe('exact_slot');
        });

        it('fires on-time within the 5-minute execution window', () => {
            const schedule = '0 6 * * *'; // 06:00 AM
            const timezone = 'Asia/Kolkata'; // 00:30 UTC
            // Server ticks at 06:02 AM IST (00:32:00 UTC) - within 5-min window
            const nowBoot = new Date('2026-11-12T00:32:00.000Z');
            const yesterdayLastRun = '2026-11-11T17:08:11.281Z';

            const check = isScheduleDue(schedule, timezone, yesterdayLastRun, nowBoot);
            expect(check.isDue).toBe(true);
            expect(check.reason).toBe('exact_slot');
        });

        it('refuses to fire late if the scheduled slot passed more than 5 minutes ago', () => {
            const schedule = '0 6 * * *'; // 06:00 AM
            const timezone = 'Asia/Kolkata'; // 00:30 UTC
            // Server boots at 06:25 AM IST (00:55:00 UTC) - 25 minutes late
            const lateBoot = new Date('2026-11-12T00:55:00.000Z');
            const yesterdayLastRun = '2026-11-11T17:08:11.281Z';

            const check = isScheduleDue(schedule, timezone, yesterdayLastRun, lateBoot);
            expect(check.isDue).toBe(false);
            expect(check.reason).toBe('slot_expired_outside_window');
        });

        it('prevents duplicate executions for the same slot after it has run', () => {
            const schedule = '0 6 * * *';
            const timezone = 'Asia/Kolkata';
            const nowBoot = new Date('2026-11-12T01:24:37.000Z');
            const alreadyRanToday = '2026-11-12T01:24:40.000Z';

            const check = isScheduleDue(schedule, timezone, alreadyRanToday, nowBoot);
            expect(check.isDue).toBe(false);
            expect(check.reason).toBe('already_ran_for_slot');
        });

        it('handles distributed multi-post schedules throughout the day', () => {
            // 3 posts a day: 01:00, 09:00, 17:00 IST (which are 19:30, 03:30, 11:30 UTC)
            const schedule = '0 1,9,17 * * *';
            const timezone = 'Asia/Kolkata';

            // Check at 09:00:10 IST (03:30:10 UTC)
            const morningTime = new Date('2026-11-12T03:30:10.000Z');
            const check1 = isScheduleDue(schedule, timezone, null, morningTime);
            expect(check1.isDue).toBe(true);

            // After morning run, last run recorded at 03:30:15 UTC
            const morningLastRun = '2026-11-12T03:30:15.000Z';
            // Morning run won't repeat at 03:35 UTC
            const morningLater = new Date('2026-11-12T03:35:00.000Z');
            expect(isScheduleDue(schedule, timezone, morningLastRun, morningLater).isDue).toBe(false);

            // But afternoon slot at 17:00:10 IST (11:30:10 UTC) will run!
            const afternoonTime = new Date('2026-11-12T11:30:10.000Z');
            const check2 = isScheduleDue(schedule, timezone, morningLastRun, afternoonTime);
            expect(check2.isDue).toBe(true);
        });

        it('computes next run time accurately', () => {
            const schedule = '0 10 * * *';
            const timezone = 'UTC';
            const now = new Date('2026-11-12T08:00:00.000Z');

            const next = getNextRunTime(schedule, timezone, now);
            expect(next).toBe('2026-11-12T10:00:00.000Z');
        });
    });
});
