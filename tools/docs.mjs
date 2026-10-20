// What each area and type is for, and what to watch for. The area guides in reference/areas/
// are generated from this file and the examples (node scripts/build-reference.mjs).

export const AREA_DOCS = {
  process: "Processes over time: work moving between stages, waiting, returning and finishing.",
  research: "Turn interviews, surveys and usability tests into evidence a team can read in a PR or a ticket. Every figure keeps who said it and where it came from.",
  metrics: "Funnels, cohorts, test results and the everyday charts. Numbers are always printed next to the bars, so a reader or a model reads them instead of estimating lengths.",
  flows: "Agree on paths, states and journeys before anyone designs a screen. Text flows are quick to change in review and easy for an agent to turn into routes and state.",
  planning: "Roadmaps, priorities, ownership and decisions in a form that lives next to the work and diffs when plans change.",
  wireframes: "Screens built from a small set of primitives. The same primitive names map to real components in the design-system map, which is what lets a text wireframe become a prototype and then production code without reinterpretation.",
  systems: "Document the design system as data: scales, contrast, component states, layers and tokens. Contrast is computed, not eyeballed.",
  handoff: "Measurements and checklists for handing work to engineering and checking what came back.",
  layouts: "Whole deliverables on one page: a readout, a dashboard, a PR summary, a design review or a status update. Fill the slots with a sentence, short lists and ordinary specs; code places everything within 80 cells, putting narrow figures side by side and stacking the rest. Figures without their own source use the layout's. Export to HTML or PDF for a finished page in the kit's type; a file holding a list of layouts exports as one document, a layout to a page. Pick by the ask: a write-up or one-pager is a readout; weekly numbers a dashboard; what a PR changed a prSummary; choosing between options a designReview; where work stands a statusUpdate. When unsure, use a readout.",
  motion: "Write motion down as a decision before anyone animates it: why it moves, what starts it, how long, which curve, and what reduced motion shows instead. The HTML form plays it."
};

export const KIND_DOCS = {
  loop: { when: "Work that returns to an earlier stage.", traps: "Keep the return share grounded in a source.", motion: "Work travels forward; a share returns for another pass." },
  states: { when: "A state machine with a path to play.", traps: "Every step in the path needs a transition.", motion: "A token follows the played path." },
  queue: { when: "Work waiting between limited columns.", traps: "State each column's limit and time per card.", motion: "Cards wait when the next column is full." },
  rollout: { when: "A staged release with a guard metric.", traps: "A breach must name one of the stages.", motion: "Stages advance, pause and roll back at a breach." },
  loading: { when: "What appears while a request finishes.", traps: "Keep phases in time order.", motion: "The card develops beside a time ruler." },
  likert: { when: "A survey question answered on a five-point scale, compared across questions.", traps: "Show the counts or percentages; never hide neutral answers, they change the story." },
  themeMatrix: { when: "Synthesis after interviews: which themes came from how many people.", traps: "A theme from one loud participant looks small here, which is the point. Keep participant codes, never names." },
  affinity: { when: "Counting notes per cluster after an affinity session.", traps: "State what was counted (notes, people, sessions) in the title." },
  quoteCard: { when: "Evidence for a finding, quoted exactly.", traps: "Quote verbatim, cite the session and time, and never attach a real name without consent." },
  taskStats: { when: "Usability test timings and completion.", traps: "With fewer than about eight people, report the range and the completions, not a confident median." },
  emotionCurve: { when: "How a journey felt, stage by stage.", traps: "The score is a judgement from research, say whose and from what." },
  barChart: { when: "Ranked quantities.", traps: "Sort first; one scale per document; value as text on every row." },
  compare: { when: "Two versions of the same measures, side by side.", traps: "Every row needs its own unit in the text; ten cells is enough." },
  forecast: { when: "Measured values with a projection in the same bar.", traps: "Say how the projection was made in the legend line." },
  meter: { when: "Usage against a cap or quota.", traps: "Over 100%, the bar stays full and the word over says the rest." },
  sparkline: { when: "A trend inside a sentence or a table cell.", traps: "Print the first and last values; a sparkline has no axis." },
  heatmap: { when: "Density over a grid, such as activity by weekday.", traps: "Five levels is the limit people can tell apart." },
  calendarStrip: { when: "Yes or no per day.", traps: "Put date labels over the exact columns they name." },
  funnel: { when: "Steps people drop out of.", traps: "Use the same time window for every step." },
  cohort: { when: "Retention by start month or week.", traps: "Newer cohorts have fewer periods; blank is not zero." },
  abResult: { when: "A test result with confidence intervals.", traps: "Overlapping intervals mean no clear difference yet; don't round that into a win." },
  metricPanel: { when: "A few metrics at a glance with their trend and change.", traps: "Up isn't always good: time and tickets should go down. Say which way is better." },
  flow: { when: "A short linear sequence.", traps: "Four or five boxes per row at most." },
  branchFlow: { when: "A flow with decisions and failure paths.", traps: "Every decision's no-branch needs a destination, or it's a dead end nobody designed." },
  stateMachine: { when: "Anything with loading, saving, error or retry states.", traps: "Read the footer: it lists ends and unreachable states." },
  journeyMap: { when: "Stages of an experience with what people do, think and feel.", traps: "Thoughts are quotes or close paraphrases from research, not invented." },
  tree: { when: "Sitemaps, IA, file layouts, spec folders.", traps: "Past three levels deep it stops being readable; collapse the rest." },
  board: { when: "Now, next, later, or any set of columns.", traps: "Keep items short enough to fit two lines." },
  impactEffort: { when: "Choosing what to do first.", traps: "Scores are estimates; write who scored them." },
  swimlane: { when: "Who does what, in what order, across roles.", traps: "One action per row; returns go left once." },
  gantt: { when: "Release plans, animation tracks, anything over time.", traps: "One scale for all rows; print start and end as text." },
  statusKey: { when: "A legend for status across documents.", traps: "Keep the same mapping in every document of a project." },
  decisionLog: { when: "Recording what was decided and why.", traps: "Write the why as evidence, not opinion." },
  screen: { when: "A layout proposal: content, order and controls before visuals.", traps: "One screen per sketch; notes go outside the frame; use only the primitives so the map can translate them." },
  responsive: { when: "The same screen at two widths.", traps: "Show what moves or disappears, not just a narrower copy." },
  appShell: { when: "An app page with a header, a sidebar and content: admin pages, settings apps, anything with navigation. The default for a screen.", traps: "Sidebar 10 to width − 24 cells (18 by default); regions take the screen primitives." },
  cardGrid: { when: "Galleries, template pickers, grids of projects.", traps: "Up to 6 cards, 2 or 3 to a row by width; keep each card to a few rows." },
  listDetail: { when: "Inboxes, master and detail, anything where picking an item shows it.", traps: "Mark the picked item with selected (its index or text)." },
  modal: { when: "A dialog over a page: confirm, delete, a short form.", traps: "The page shows dimmed behind it; make the page tall enough for the dialog." },
  readout: { when: "A one-pager on a test or a study: headline, up to 3 summary lines, up to 4 figures of evidence, next steps.", traps: "The headline is the finding in one sentence, not a topic." },
  dashboard: { when: "Weekly numbers at a glance: 2 to 6 tiles and a note.", traps: "Tiles keep their natural width and share a row when they fit in 80 cells: narrow types (meter, sparkline) pack two or three to a row." },
  prSummary: { when: "What a pull request changed: one line, before and after side by side, checks, risks.", traps: "Before and after use the same type and scale; each up to 38 cells wide sits side by side." },
  designReview: { when: "Choosing between 2 or 3 options: the question, the options, a recommendation, open questions.", traps: "Give each option a title; draw them with the same type. Options up to 38 cells wide sit side by side." },
  statusUpdate: { when: "Where work stands: the period, progress figures, done, next and blocked lists.", traps: "Each blocked item says why in words." },
  spacingScale: { when: "Documenting spacing tokens.", traps: "State the unit per cell under the chart." },
  typeScale: { when: "Documenting type sizes and line heights.", traps: "Sizes in one unit; bars compare size, not weight." },
  contrast: { when: "Checking colour pairs against WCAG 2 thresholds.", traps: "AA needs 4.5:1 for body text and 3:1 for large text and UI parts." },
  stateMatrix: { when: "Which component states exist, are in progress or missing.", traps: "Blank means the state doesn't apply; missing is ░." },
  layerStack: { when: "z-index and surface order.", traps: "Name what each layer is for, not just its number." },
  tokenTable: { when: "Listing tokens with their values and uses.", traps: "Inside Markdown, a Markdown table is easier to edit." },
  table: { when: "Tables in places without Markdown: terminals, code comments.", traps: "In Markdown, use a Markdown table." },
  redline: { when: "Spacing and widths for handoff.", traps: "Widths are proportional but labels carry the real numbers." },
  qaChecklist: { when: "Design QA before release.", traps: "Blocked items need a reason in words." },
  anatomy: { when: "The parts of a component for a spec page or handoff: what each numbered part is, its token or rule, and which parts are optional.", traps: "Name parts as the design system does and put the rule in spec, not the look. Up to 8 parts; parts side by side take a row, stacked parts (a card) take direction column. Sizes are proportions, so real measurements belong in a redline.", motion: "The container stands first with its legend line, then each part lands in number order on the same step as its legend line, so the eye ties the number, its place on the component and its rule together; the dashed-edge key lands last." },
  motionTiming: { when: "Comparing durations and easing, today against proposed.", traps: "Keep the 500ms scale fixed across a report; a + is usually the finding." },
  intentCard: { when: "Deciding a single motion before building it.", traps: "No intent, no animation: if 'why' is empty, cut it. Reduced motion is designed, not 'none'." },
  transitionSpec: { when: "One transition, property by property.", traps: "Animate transform and opacity; anything else needs a measured reason." },
  stagger: { when: "Several elements entering in sequence.", traps: "Cap the total: past about 400ms the last item feels late." },
  filmstrip: { when: "Seeing an easing curve frame by frame.", traps: "Rows are equal slices of time, so bunched marks mean slow movement." },
  easingTable: { when: "Documenting easing tokens.", traps: "Three or four curves cover most products." }
};

KIND_DOCS.funnel.motion = "People fall through the steps and departures drift out to the side.";
KIND_DOCS.abResult.motion = "Only with readings over time: give `data` as `{ days, readings: [{ day, people, variants }] }`. The intervals narrow reading by reading, numbers change in place and the verdict switches when the intervals part. The still is the last reading, with a line saying how long they overlapped.";

export const LIVE_DOC = `# Moving diagrams

Every type moves, in one of two ways. Seven keep moving, because change over time is what they show: six processes (a rework loop, a funnel of people, a state machine, a work queue, a staged rollout and a loading sequence) and a test result given readings over time. Every other type arrives once, in the order that carries its point, then stays still. Use \`node scripts/glyph-kit.mjs live spec.json --to html\` for a standalone page, or \`--to markdown\` for its still.

The still makes the same point and is used for reduced motion, print and no-JavaScript output. Playback starts from the still, so nothing jumps. A standalone page has a Still button that pauses it without changing the data. Processes use the data shapes in \`reference/areas/process.md\`. A funnel accepts either a list of steps or \`{steps: [...]}\`.

Structure changes in steps. Travelling marks use the kit’s \`▓▒░\` trail, arrivals flash, waiting work chases, and only changing values scramble. The clock is 120ms a step. No blur, sliding text or springs.

Arrivals play in HTML pages and decks, once, when a figure comes into view; a small ↺ in the corner plays one again. They step on 40ms and settle within about 600ms; diagrams grow along their lines in about 1.1s, and the motion types play their own timing at real speed. Reduced motion, print, Markdown and text show the figure as it is.

Cell-grid playback repaints text rather than using compositor transforms. Layout and routes are precomputed, the page is redrawn only when the step changes, and off-screen players stop. When a page has several moving diagrams, only the one most in view plays.

## Types that keep moving

`;
