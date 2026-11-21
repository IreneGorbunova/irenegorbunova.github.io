/**
 * The people kit: every person in the textbook is drawn with it (the rules, «People»). Files:
 *   core.ts   – points, SVG helpers, the skeleton by age (SKELETON), joint limits (LIMITS), two-bone IK (ik) and FK (fk);
 *   hand.ts   – the hand (palm, thumb, four fingers of three segments; back, palm and edge views; mitten and glove);
 *   body.ts   – the figure (body, head, clothes, arms and legs within the limits, hands, grip frames);
 *   motion.ts – easing, reach between poses, the walk cycle, attaching a held object to a hand;
 *   debug.ts  – `?people-debug`: per-pose data in window.__people for the checker.
 * Colors: PeopleStyles.astro (include it once on a page that draws a person with the kit's own class prefixes).
 */
export * from './core';
export * from './hand';
export * from './body';
export * from './motion';
export { publish } from './debug';
