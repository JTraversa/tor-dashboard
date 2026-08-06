/**
 * Which rows of the Tor Project's "Related events" list count as censorship.
 *
 * This is the single filter the whole dashboard's censorship marking rests on.
 * It is consumed at build time by build-periods.mjs, which rolls the matching
 * events into at most one note per half-year for the worldwide chart.
 *
 * Source: https://gitlab.torproject.org/tpo/network-health/metrics/timeline
 * rendered at metrics.torproject.org as the table under every userstats graph,
 * collected into public/data/timeline.json by collect-timeline.mjs.
 *
 * The rule is deliberately narrow, and both halves of it matter:
 *
 *   1. The row must carry a country code. A person at the Tor Project decided
 *      it is about that place, which is the only country attribution here that
 *      is not inferred.
 *   2. The description must describe blocking, censorship, or a shutdown.
 *
 * That yields 135 events across 38 countries. Everything else in the timeline
 * — Tor release notes, bridge outages, geoip refreshes, and the many rows that
 * simply observe "relay users in Lithuania increased" — is not a censorship
 * event and is not drawn.
 */

// Blocking, censorship, or a shutdown — matched on the description rather than
// on any category assigned elsewhere, so the rule is visible in one place.
const CENSORSHIP =
  /\b(block|censor|shut ?down|blackout|throttl|filter|ban\b|bans\b|banned|restrict|unblock|interference|disrupt|outage|curfew|dpi\b|man-in-the-middle|mitm)/i

/**
 * Rows where the only match is Tor switching off its own equipment.
 *
 * "Sustained increase in meek users in Brazil. Locals believe that they are
 * not actual users, rather bots … End date coincides with shutdown of
 * meek-azure" is a bot observation that trips the word "shutdown". It is the
 * one false positive the rule above produces, and it is worth excluding by
 * name rather than weakening the rule for everything else.
 */
const INFRASTRUCTURE =
  /shut ?down of (meek|snowflake|the meek|the snowflake)|\bbots\b|\bbotnet\b/i

export function isCensorshipEvent(e) {
  return e.countries.length > 0 && CENSORSHIP.test(e.desc) && !INFRASTRUCTURE.test(e.desc)
}
