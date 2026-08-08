import type { Section } from '../types/models'

export interface CurriculumResource {
  provider: 'Khan Academy' | 'IXL'
  course: string
  unit: string
  url: string
}

export interface CurriculumMapEntry {
  skillId: string
  section: Section
  domain: string
  requiredConcepts: string[]
  resource: CurriculumResource
  secondaryResource?: CurriculumResource
  doNotAssign?: string[]
  priorResourceTitles?: string[]
}

const KHAN_RW = 'https://www.khanacademy.org/test-prep/sat-reading-and-writing'
const KHAN_ALGEBRA = 'https://www.khanacademy.org/math/algebra'
const KHAN_STATS = 'https://www.khanacademy.org/math/probability'
const KHAN_GEOMETRY = 'https://www.khanacademy.org/math/geometry-home'

const rwInfo = `${KHAN_RW}/x0d47bcec73eb6c4b:medium-information-and-ideas`
const rwCraft = `${KHAN_RW}/x0d47bcec73eb6c4b:medium-craft-and-structure`
const rwExpression = `${KHAN_RW}/x0d47bcec73eb6c4b:medium-expression-of-ideas-and-standard-english-conventions`
const rwGrammar = `${KHAN_RW}/x0d47bcec73eb6c4b:digital-sat-grammar-practice`

const algebra = (unit: string) => `${KHAN_ALGEBRA}/x2f8bb11595b61c86:${unit}`
const statistics = (unit: string) => `${KHAN_STATS}/xa88397b6:${unit}`
const geometry = (unit: string) => `${KHAN_GEOMETRY}/${unit}`

export const curriculumMap: CurriculumMapEntry[] = [
  {
    skillId: 'rw-central-ideas', section: 'Reading & Writing', domain: 'Information and Ideas',
    requiredConcepts: ['Identify the main idea', 'Separate supporting details from background information', 'Choose the answer that captures the whole text without overreaching'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 5: Medium Information and Ideas · Central ideas and details', url: rwInfo },
    doNotAssign: ['Advanced or Challenge practice before the 95% Easy/Medium gate'],
    priorResourceTitles: ['Ch 6: Reading Comprehension'],
  },
  {
    skillId: 'rw-command-evidence', section: 'Reading & Writing', domain: 'Information and Ideas',
    requiredConcepts: ['Command of textual evidence', 'Command of quantitative evidence', 'Match the evidence precisely to the claim'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 5: Medium Information and Ideas · Command of evidence', url: rwInfo },
    doNotAssign: ['Advanced or Challenge practice before the 95% Easy/Medium gate'],
    priorResourceTitles: ['Ch 6: Reading Comprehension'],
  },
  {
    skillId: 'rw-inferences', section: 'Reading & Writing', domain: 'Information and Ideas',
    requiredConcepts: ['Draw only the conclusion supported by the text', 'Use the strongest textual clues', 'Reject answers that require an unsupported assumption'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 5: Medium Information and Ideas · Inferences', url: rwInfo },
    doNotAssign: ['Advanced or Challenge practice before the 95% Easy/Medium gate'],
    priorResourceTitles: ['Ch 6: Reading Comprehension'],
  },
  {
    skillId: 'rw-words-context', section: 'Reading & Writing', domain: 'Craft and Structure',
    requiredConcepts: ['Use sentence and paragraph context', 'Choose precise rather than merely plausible meanings', 'Determine a word or phrase’s function in the passage'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 6: Medium Craft and Structure · Words in context', url: rwCraft },
    doNotAssign: ['Standalone vocabulary memorization as a substitute for context work'],
    priorResourceTitles: ['Ch 6: Reading Comprehension'],
  },
  {
    skillId: 'rw-text-structure', section: 'Reading & Writing', domain: 'Craft and Structure',
    requiredConcepts: ['Identify the author’s purpose', 'Recognize common text structures', 'Explain how one sentence or paragraph functions within the whole text'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 6: Medium Craft and Structure · Text structure and purpose', url: rwCraft },
    doNotAssign: ['Advanced or Challenge practice before the 95% Easy/Medium gate'],
    priorResourceTitles: ['Ch 6: Reading Comprehension'],
  },
  {
    skillId: 'rw-cross-text', section: 'Reading & Writing', domain: 'Craft and Structure',
    requiredConcepts: ['State each author’s claim separately', 'Identify agreement, disagreement, or qualification', 'Predict how one author would respond to the other'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 6: Medium Craft and Structure · Cross-text connections', url: rwCraft },
    doNotAssign: ['Advanced or Challenge practice before the 95% Easy/Medium gate'],
    priorResourceTitles: ['Ch 6: Reading Comprehension', 'Cross-Text Connections: Lesson'],
  },
  {
    skillId: 'rw-rhetorical-synthesis', section: 'Reading & Writing', domain: 'Expression of Ideas',
    requiredConcepts: ['Identify the exact rhetorical goal', 'Select only relevant notes', 'Combine notes accurately and efficiently'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 7: Medium Expression of Ideas · Rhetorical synthesis', url: rwExpression },
    doNotAssign: ['Advanced or Challenge practice before the 95% Easy/Medium gate'],
    priorResourceTitles: ['Ch 10: Rhetoric'],
  },
  {
    skillId: 'rw-transitions', section: 'Reading & Writing', domain: 'Expression of Ideas',
    requiredConcepts: ['Name the logical relationship first', 'Distinguish continuation, contrast, cause, example, and conclusion', 'Check that the transition fits both neighboring sentences'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 7: Medium Expression of Ideas · Transitions', url: rwExpression },
    doNotAssign: ['Memorizing transition lists without identifying the relationship'],
    priorResourceTitles: ['Ch 10: Rhetoric'],
  },
  {
    skillId: 'rw-boundaries', section: 'Reading & Writing', domain: 'Standard English Conventions',
    requiredConcepts: ['Recognize independent and dependent clauses', 'Link clauses with periods, semicolons, commas, and conjunctions', 'Punctuate supplements and nonessential information'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 12: SAT grammar practice · Linking clauses, supplements, and punctuation', url: rwGrammar },
    secondaryResource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 7: Medium Standard English Conventions · Boundaries', url: rwExpression },
    priorResourceTitles: ['Ch 8: Punctuation'],
  },
  {
    skillId: 'rw-form-structure-sense', section: 'Reading & Writing', domain: 'Standard English Conventions',
    requiredConcepts: ['Subject-verb agreement', 'Pronoun-antecedent agreement', 'Verb forms and tense', 'Modifier placement', 'Plurals and possessives'],
    resource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 12: SAT grammar practice · Form, structure, and sense', url: rwGrammar },
    secondaryResource: { provider: 'Khan Academy', course: 'SAT Reading and Writing', unit: 'Unit 7: Medium Standard English Conventions · Form, structure, and sense', url: rwExpression },
    priorResourceTitles: ['Ch 9: Grammar'],
  },

  {
    skillId: 'math-linear-equations', section: 'Math', domain: 'Algebra',
    requiredConcepts: ['Multi-step equations', 'Variables on both sides', 'Equations with fractions and decimals', 'No solution, one solution, or infinitely many solutions', 'Rearrange formulas'],
    resource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 2: Solving equations and inequalities · equation lessons only', url: algebra('solve-equations-inequalities') },
    doNotAssign: ['Compound inequalities from this unit for the linear-equations skill'],
    priorResourceTitles: ['Algebra foundations', 'Solving equations & inequalities'],
  },
  {
    skillId: 'math-linear-equations-two-variables', section: 'Math', domain: 'Algebra',
    requiredConcepts: ['Solutions to equations in two variables', 'Graph a linear equation', 'Slope and intercepts', 'Translate among equation, graph, table, and context'],
    resource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 4: Linear equations and graphs', url: algebra('linear-equations-graphs') },
    priorResourceTitles: ['Linear equations & graphs', 'Forms of linear equations'],
  },
  {
    skillId: 'math-linear-functions', section: 'Math', domain: 'Algebra',
    requiredConcepts: ['Function notation and evaluation', 'Rate of change and initial value', 'Interpret tables, graphs, and equations', 'Compare two linear functions', 'Model a context with a linear function'],
    resource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 8: Functions · function inputs, outputs, and representations', url: algebra('functions') },
    secondaryResource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Units 4–5: Linear equations, graphs, and forms', url: algebra('linear-equations-graphs') },
    priorResourceTitles: ['Linear equations & graphs', 'Forms of linear equations', 'Functions'],
  },
  {
    skillId: 'math-systems', section: 'Math', domain: 'Algebra',
    requiredConcepts: ['Solve systems graphically', 'Solve by substitution', 'Solve by elimination', 'Interpret no solution, one solution, and infinitely many solutions', 'Model a context with a system'],
    resource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 6: Systems of equations', url: algebra('systems-of-equations') },
    priorResourceTitles: ['Systems of equations'],
  },
  {
    skillId: 'math-linear-inequalities', section: 'Math', domain: 'Algebra',
    requiredConcepts: ['Solve multi-step inequalities', 'Reverse the inequality when multiplying or dividing by a negative', 'Graph one-variable inequalities', 'Graph two-variable inequalities', 'Interpret systems of inequalities'],
    resource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 7: Inequalities — systems and graphs', url: algebra('inequalities-systems-graphs') },
    secondaryResource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 2: Solving equations and inequalities · multi-step inequalities', url: algebra('solve-equations-inequalities') },
    priorResourceTitles: ['Solving equations & inequalities'],
  },
  {
    skillId: 'math-equivalent-expressions', section: 'Math', domain: 'Advanced Math',
    requiredConcepts: ['Combine like terms and distribute', 'Apply exponent rules', 'Multiply monomials and binomials', 'Factor out a greatest common factor', 'Factor quadratic trinomials, including grouping when the leading coefficient is not 1', 'Recognize and factor difference-of-squares and perfect-square forms'],
    resource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 13: Quadratics — multiplying and factoring · only the listed expression skills', url: algebra('quadratics-multiplying-factoring') },
    secondaryResource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 11: Exponents and radicals · exponent rules only', url: algebra('rational-exponents-radicals') },
    doNotAssign: ['Every lesson in Unit 13 as one assignment', 'Proof-heavy or enrichment items not represented in PSAT 8/9 questions'],
    priorResourceTitles: ['Algebra foundations', 'Exponents', 'Quadratics: Multiplying & factoring'],
  },
  {
    skillId: 'math-nonlinear-equations', section: 'Math', domain: 'Advanced Math',
    requiredConcepts: ['Solve quadratic equations by factoring', 'Solve equations using square roots', 'Use the quadratic formula when factoring is impractical', 'Identify the number of real solutions', 'Solve a linear–quadratic system from intersections', 'Check for extraneous solutions when radicals are involved'],
    resource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 14: Quadratic functions and equations · solving lessons', url: algebra('quadratic-functions-equations') },
    secondaryResource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 13: Quadratics — multiplying and factoring', url: algebra('quadratics-multiplying-factoring') },
    doNotAssign: ['Complex-number solutions', 'An entire rational-equations or radical-equations course without PSAT evidence'],
    priorResourceTitles: ['Quadratics: Multiplying & factoring', 'Quadratic functions & equations'],
  },
  {
    skillId: 'math-nonlinear', section: 'Math', domain: 'Advanced Math',
    requiredConcepts: ['Exponential growth and decay', 'Interpret initial value and growth factor', 'Recognize and interpret quadratic features', 'Zeros, vertex, and equivalent quadratic forms', 'Compare nonlinear representations'],
    resource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 14: Quadratic functions and equations', url: algebra('quadratic-functions-equations') },
    secondaryResource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 12: Exponential growth and decay', url: algebra('exponential-growth-decay') },
    doNotAssign: ['Logarithms', 'Complex numbers', 'Advanced polynomial or rational-function behavior unless a PSAT 8/9 question demonstrates the need'],
    priorResourceTitles: ['Functions', 'Exponential growth & decay', 'Quadratics: Multiplying & factoring', 'Quadratic functions & equations'],
  },
  {
    skillId: 'math-ratios', section: 'Math', domain: 'Problem-Solving and Data Analysis',
    requiredConcepts: ['Ratios and unit rates', 'Proportional relationships', 'Unit conversion', 'Scale and density', 'Multi-step rate problems'],
    resource: { provider: 'Khan Academy', course: '7th grade math', unit: 'Units 1–2: Proportional relationships, rates, and percentages', url: 'https://www.khanacademy.org/math/cc-seventh-grade-math' },
    secondaryResource: { provider: 'Khan Academy', course: 'Algebra 1', unit: 'Unit 3: Working with units', url: algebra('working-units') },
    priorResourceTitles: ['Working with units'],
  },
  {
    skillId: 'math-percentages', section: 'Math', domain: 'Problem-Solving and Data Analysis',
    requiredConcepts: ['Percent of a quantity', 'Percent increase and decrease', 'Reverse percent', 'Multi-step percent problems'],
    resource: { provider: 'Khan Academy', course: '7th grade math', unit: 'Unit 2: Rates and percentages · percent word problems', url: 'https://www.khanacademy.org/math/cc-seventh-grade-math/cc-7th-fractions-decimals/cc-7th-percent-word-problems' },
    priorResourceTitles: ['Math Basics'],
  },
  {
    skillId: 'math-one-variable-data', section: 'Math', domain: 'Problem-Solving and Data Analysis',
    requiredConcepts: ['Read dot plots, histograms, and box plots', 'Mean, median, and range', 'Interquartile range and standard deviation as measures of spread', 'Compare distributions', 'Understand how an outlier changes center and spread'],
    resource: { provider: 'Khan Academy', course: 'Statistics essentials', unit: 'Unit 1: Displaying a single quantitative variable', url: statistics('display-quantitative') },
    secondaryResource: { provider: 'Khan Academy', course: 'Statistics essentials', unit: 'Unit 2: Analyzing a single quantitative variable · standard deviation and comparing distributions only', url: statistics('analyze-quantitative') },
    doNotAssign: ['Normal-distribution calculations or z-scores unless specifically supported by the PSAT 8/9 question bank'],
  },
  {
    skillId: 'math-two-variable-data', section: 'Math', domain: 'Problem-Solving and Data Analysis',
    requiredConcepts: ['Interpret scatterplots', 'Describe direction, form, and strength', 'Use and interpret a line of best fit', 'Interpret slope and intercept in context', 'Distinguish association from causation'],
    resource: { provider: 'Khan Academy', course: 'Statistics essentials', unit: 'Unit 4: Scatterplots · trend lines and interpretation', url: statistics('scatterplots') },
    secondaryResource: { provider: 'Khan Academy', course: '8th grade math', unit: 'Unit 7: Data and modeling', url: 'https://www.khanacademy.org/math/cc-eighth-grade-math/cc-8th-data/cc-8th-scatter-plots' },
    doNotAssign: ['Residual plots or formal regression inference unless a PSAT 8/9 question requires them'],
  },
  {
    skillId: 'math-probability', section: 'Math', domain: 'Problem-Solving and Data Analysis',
    requiredConcepts: ['Simple and compound probability', 'Addition and multiplication rules', 'Conditional probability', 'Two-way tables and Venn diagrams', 'Interpret probability in context'],
    resource: { provider: 'Khan Academy', course: 'Statistics essentials', unit: 'Unit 6: Probability · two-way tables, compound, and conditional probability', url: statistics('probability') },
    doNotAssign: ['Permutations and combinations unless a PSAT 8/9 question requires them'],
  },
  {
    skillId: 'math-inference', section: 'Math', domain: 'Problem-Solving and Data Analysis',
    requiredConcepts: ['Distinguish population, sample, parameter, and statistic', 'Decide whether a sample is representative', 'Make an inference from a random sample', 'Interpret margin of error qualitatively'],
    resource: { provider: 'Khan Academy', course: 'Statistics essentials', unit: 'Unit 5: Study design · population, samples, generalizability, and sampling', url: statistics('study-design') },
    doNotAssign: ['Confidence-interval calculations', 'Hypothesis testing', 'Sampling-distribution formulas'],
  },
  {
    skillId: 'math-statistical-claims', section: 'Math', domain: 'Problem-Solving and Data Analysis',
    requiredConcepts: ['Observational study versus experiment', 'Random sampling versus random assignment', 'Bias and generalizability', 'Association versus causation', 'Evaluate whether a conclusion is supported'],
    resource: { provider: 'Khan Academy', course: 'Statistics essentials', unit: 'Unit 5: Study design · studies, experiments, and conclusions', url: statistics('study-design') },
    doNotAssign: ['Formal significance testing calculations'],
  },
  {
    skillId: 'math-area-volume', section: 'Math', domain: 'Geometry and Trigonometry',
    requiredConcepts: ['Area and perimeter of common plane figures', 'Surface area', 'Volume of prisms, cylinders, cones, pyramids, and spheres', 'Scale factors and unit conversion', 'Composite figures'],
    resource: { provider: 'Khan Academy', course: 'Geometry (all content)', unit: 'Unit 8: Volume and surface area', url: geometry('geometry-volume-surface-area') },
    secondaryResource: { provider: 'Khan Academy', course: 'Geometry (all content)', unit: 'Unit 7: Area and perimeter', url: geometry('geometry-area-perimeter') },
    priorResourceTitles: ['7th Grade Geometry', 'Ch 14: Geometry'],
  },
  {
    skillId: 'math-lines-angles', section: 'Math', domain: 'Geometry and Trigonometry',
    requiredConcepts: ['Parallel lines and angle relationships', 'Triangle angle relationships', 'Triangle congruence and similarity', 'Scale factors', 'Coordinate geometry with lines'],
    resource: { provider: 'Khan Academy', course: 'Geometry (all content)', unit: 'Units 2 and 4: Angles and triangles', url: geometry('geometry-angles') },
    secondaryResource: { provider: 'Khan Academy', course: 'Geometry (all content)', unit: 'Unit 4: Triangles', url: geometry('triangle-properties') },
    doNotAssign: ['Formal Euclidean proofs as a prerequisite for PSAT 8/9 drills'],
    priorResourceTitles: ['7th Grade Geometry', 'Ch 14: Geometry'],
  },
  {
    skillId: 'math-right-triangles-trigonometry', section: 'Math', domain: 'Geometry and Trigonometry',
    requiredConcepts: ['Pythagorean theorem', 'Special right triangles', 'Sine, cosine, and tangent in right triangles', 'Solve for a missing side or angle', 'Right-triangle applications'],
    resource: { provider: 'Khan Academy', course: 'Geometry (all content)', unit: 'Unit 13: Trigonometry · right-triangle lessons through modeling', url: geometry('right-triangles-topic') },
    secondaryResource: { provider: 'Khan Academy', course: 'Geometry (all content)', unit: 'Unit 9: Pythagorean theorem', url: geometry('geometry-pythagorean-theorem') },
    doNotAssign: ['Law of sines', 'Law of cosines', 'Unit-circle trigonometry', 'Trig identities'],
    priorResourceTitles: ['7th Grade Geometry', 'Ch 14: Geometry'],
  },
  {
    skillId: 'math-circles', section: 'Math', domain: 'Geometry and Trigonometry',
    requiredConcepts: ['Radius, diameter, circumference, and area', 'Arc measure and arc length', 'Central and inscribed angles', 'Tangents', 'Equation of a circle in the coordinate plane'],
    resource: { provider: 'Khan Academy', course: 'Geometry (all content)', unit: 'Unit 14: Circles · only the listed PSAT concepts', url: geometry('cc-geometry-circles') },
    secondaryResource: { provider: 'Khan Academy', course: 'Geometry (all content)', unit: 'Unit 15: Analytic geometry · circle equations only', url: geometry('analytic-geometry-topic') },
    doNotAssign: ['Radians beyond what is needed for an official PSAT 8/9 question', 'Formal circle proofs or constructions'],
    priorResourceTitles: ['7th Grade Geometry', 'Ch 14: Geometry'],
  },
]

export const curriculumBySkillId = new Map(curriculumMap.map((entry) => [entry.skillId, entry]))

const IXL_RW = 'https://www.ixl.com/ela/grade-8/skills'
const IXL_MATH_7 = 'https://www.ixl.com/math/grade-7/skills'
const IXL_MATH_8 = 'https://www.ixl.com/math/grade-8/skills'
const IXL_ALGEBRA = 'https://www.ixl.com/math/algebra-1/skills'
const IXL_GEOMETRY = 'https://www.ixl.com/math/geometry/skills'

export const ixlBySkillId = new Map<string, CurriculumResource>([
  ['rw-central-ideas', { provider: 'IXL', course: '8th grade language arts', unit: 'Main idea · determine the main idea and identify supporting details', url: IXL_RW }],
  ['rw-command-evidence', { provider: 'IXL', course: '8th grade language arts', unit: 'Developing arguments + text evidence · choose evidence and identify supporting details', url: IXL_RW }],
  ['rw-inferences', { provider: 'IXL', course: '8th grade language arts', unit: 'Making inferences · literary and informational texts', url: IXL_RW }],
  ['rw-words-context', { provider: 'IXL', course: '8th grade language arts', unit: 'Context clues + word meaning in context', url: IXL_RW }],
  ['rw-text-structure', { provider: 'IXL', course: '8th grade language arts', unit: 'Author’s purpose and tone + text structure', url: IXL_RW }],
  ['rw-cross-text', { provider: 'IXL', course: '8th grade language arts', unit: 'Compare texts · main ideas, tone, perspective, and informational structure', url: IXL_RW }],
  ['rw-rhetorical-synthesis', { provider: 'IXL', course: '8th grade language arts', unit: 'Editing and revising · relevant evidence, clarity, and concise synthesis', url: IXL_RW }],
  ['rw-transitions', { provider: 'IXL', course: '8th grade language arts', unit: 'Writing clearly and concisely · transitions with conjunctive adverbs', url: IXL_RW }],
  ['rw-boundaries', { provider: 'IXL', course: '8th grade language arts', unit: 'Punctuation · linking clauses, commas, semicolons, colons, and dashes', url: IXL_RW }],
  ['rw-form-structure-sense', { provider: 'IXL', course: '8th grade language arts', unit: 'Grammar and mechanics · agreement, verb forms, modifiers, and pronouns', url: IXL_RW }],

  ['math-linear-equations', { provider: 'IXL', course: '8th grade math', unit: 'One-variable equations · multi-step equations and number of solutions', url: IXL_MATH_8 }],
  ['math-linear-equations-two-variables', { provider: 'IXL', course: '8th grade math', unit: 'Linear equations · solutions, slope, intercepts, and graphs', url: IXL_MATH_8 }],
  ['math-linear-functions', { provider: 'IXL', course: '8th grade math', unit: 'Function concepts + linear functions · evaluate, compare, and interpret', url: IXL_MATH_8 }],
  ['math-systems', { provider: 'IXL', course: '8th grade math', unit: 'Systems of equations · graphing, substitution, elimination, and solution count', url: IXL_MATH_8 }],
  ['math-linear-inequalities', { provider: 'IXL', course: '8th grade math', unit: 'One-variable inequalities + Algebra 1 systems of inequalities', url: IXL_MATH_8 }],
  ['math-equivalent-expressions', { provider: 'IXL', course: 'Algebra 1', unit: 'Expressions, exponent rules, polynomial products, and factoring quadratics', url: IXL_ALGEBRA }],
  ['math-nonlinear-equations', { provider: 'IXL', course: 'Algebra 1', unit: 'Quadratic equations · square roots, factoring, formula, and linear-quadratic systems', url: IXL_ALGEBRA }],
  ['math-nonlinear', { provider: 'IXL', course: 'Algebra 1', unit: 'Exponential functions + quadratic functions and equations', url: IXL_ALGEBRA }],
  ['math-ratios', { provider: 'IXL', course: '7th grade math', unit: 'Rates, ratios, units, and proportional relationships', url: IXL_MATH_7 }],
  ['math-percentages', { provider: 'IXL', course: '7th grade math', unit: 'Rates and percentages · percent change and multi-step percent problems', url: IXL_MATH_7 }],
  ['math-one-variable-data', { provider: 'IXL', course: '8th grade math', unit: 'Data and graphs · dot plots, histograms, box plots, center, and spread', url: IXL_MATH_8 }],
  ['math-two-variable-data', { provider: 'IXL', course: '8th grade math', unit: 'Data and graphs · scatterplots, association, and lines of best fit', url: IXL_MATH_8 }],
  ['math-probability', { provider: 'IXL', course: 'Algebra 1', unit: 'Two-way tables and probability · compound and conditional probability', url: IXL_ALGEBRA }],
  ['math-inference', { provider: 'IXL', course: 'Algebra 1', unit: 'Sampling, populations, bias, and interpreting margin of error', url: IXL_ALGEBRA }],
  ['math-statistical-claims', { provider: 'IXL', course: 'Algebra 1', unit: 'Study design · samples, experiments, association, and causation', url: IXL_ALGEBRA }],
  ['math-area-volume', { provider: 'IXL', course: 'Geometry', unit: 'Area and perimeter + surface area and volume', url: IXL_GEOMETRY }],
  ['math-lines-angles', { provider: 'IXL', course: 'Geometry', unit: 'Lines and angles + triangle properties, congruence, and similarity', url: IXL_GEOMETRY }],
  ['math-right-triangles-trigonometry', { provider: 'IXL', course: 'Geometry', unit: 'Right triangle trigonometry · special triangles, sin, cos, tan, sides, and angles', url: IXL_GEOMETRY }],
  ['math-circles', { provider: 'IXL', course: 'Geometry', unit: 'Circles · arcs, angles, tangents, measurements, and circle equations', url: IXL_GEOMETRY }],
])
