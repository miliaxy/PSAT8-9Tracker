-- Align the visible skill catalog with the official College Board PSAT 8/9
-- taxonomy. Sources checked 2026-07-20:
-- https://satsuite.collegeboard.org/psat-8-9/whats-on-the-test/math
-- https://satsuite.collegeboard.org/psat-8-9/whats-on-the-test/reading

alter table public.skill_catalog
  add column if not exists is_active boolean not null default true;

insert into public.skill_catalog (id, section, domain, name, description, sort_order, is_active) values
  ('rw-central-ideas', 'Reading & Writing', 'Information and Ideas', 'Central ideas and details', 'Identify a text''s central idea and the details that support it.', 10, true),
  ('rw-command-evidence', 'Reading & Writing', 'Information and Ideas', 'Command of evidence', 'Use textual or quantitative evidence to support or challenge a claim.', 20, true),
  ('rw-inferences', 'Reading & Writing', 'Information and Ideas', 'Inferences', 'Draw the most logical conclusion supported by the text.', 30, true),
  ('rw-words-context', 'Reading & Writing', 'Craft and Structure', 'Words in context', 'Determine the precise meaning and function of words and phrases in context.', 40, true),
  ('rw-text-structure', 'Reading & Writing', 'Craft and Structure', 'Text structure and purpose', 'Analyze how a text is organized and why it was written.', 50, true),
  ('rw-cross-text', 'Reading & Writing', 'Craft and Structure', 'Cross-text connections', 'Compare related ideas and viewpoints across texts.', 60, true),
  ('rw-rhetorical-synthesis', 'Reading & Writing', 'Expression of Ideas', 'Rhetorical synthesis', 'Use notes to meet a specific rhetorical goal.', 70, true),
  ('rw-transitions', 'Reading & Writing', 'Expression of Ideas', 'Transitions', 'Select transitions that express the intended logical relationship.', 80, true),
  ('rw-boundaries', 'Reading & Writing', 'Standard English Conventions', 'Boundaries', 'Use punctuation and sentence boundaries correctly.', 90, true),
  ('rw-form-structure-sense', 'Reading & Writing', 'Standard English Conventions', 'Form, structure, and sense', 'Apply grammar, agreement, modifier, and usage conventions.', 100, true),

  ('math-linear-equations', 'Math', 'Algebra', 'Linear equations in 1 variable', 'Solve and interpret linear equations in one variable.', 110, true),
  ('math-linear-equations-two-variables', 'Math', 'Algebra', 'Linear equations in 2 variables', 'Represent, solve, and interpret linear equations in two variables.', 120, true),
  ('math-linear-functions', 'Math', 'Algebra', 'Linear functions', 'Represent and analyze linear functions in equations, tables, graphs, and contexts.', 130, true),
  ('math-systems', 'Math', 'Algebra', 'Systems of 2 linear equations in 2 variables', 'Solve systems of two linear equations and interpret their solutions.', 140, true),
  ('math-linear-inequalities', 'Math', 'Algebra', 'Linear inequalities in 1 or 2 variables', 'Solve, graph, and interpret linear inequalities in one or two variables.', 150, true),

  ('math-equivalent-expressions', 'Math', 'Advanced Math', 'Equivalent expressions', 'Rewrite expressions into equivalent forms that reveal useful structure.', 160, true),
  ('math-nonlinear-equations', 'Math', 'Advanced Math', 'Nonlinear equations in 1 variable and systems of equations in 2 variables', 'Solve nonlinear equations in one variable and systems containing nonlinear equations.', 170, true),
  ('math-nonlinear', 'Math', 'Advanced Math', 'Nonlinear functions', 'Analyze quadratic, exponential, polynomial, rational, radical, and other nonlinear functions.', 180, true),

  ('math-ratios', 'Math', 'Problem-Solving and Data Analysis', 'Ratios, rates, proportional relationships, and units', 'Use ratios, rates, proportional relationships, and unit conversions in context.', 190, true),
  ('math-percentages', 'Math', 'Problem-Solving and Data Analysis', 'Percentages', 'Solve problems involving percentages, percent change, and percent relationships.', 200, true),
  ('math-one-variable-data', 'Math', 'Problem-Solving and Data Analysis', '1-variable data: distributions and measures of center and spread', 'Interpret distributions and measures of center and spread for one-variable data.', 210, true),
  ('math-two-variable-data', 'Math', 'Problem-Solving and Data Analysis', '2-variable data: models and scatterplots', 'Interpret scatterplots and models for relationships between two variables.', 220, true),
  ('math-probability', 'Math', 'Problem-Solving and Data Analysis', 'Probability and conditional probability', 'Use probability models, including conditional probability, to solve problems.', 230, true),
  ('math-inference', 'Math', 'Problem-Solving and Data Analysis', 'Inference from sample statistics and margin of error', 'Draw inferences from samples and interpret margin of error.', 240, true),
  ('math-statistical-claims', 'Math', 'Problem-Solving and Data Analysis', 'Evaluating statistical claims: observational studies and experiments', 'Evaluate conclusions drawn from observational studies and experiments.', 250, true),

  ('math-area-volume', 'Math', 'Geometry and Trigonometry', 'Area and volume', 'Solve problems involving area, surface area, and volume.', 260, true),
  ('math-lines-angles', 'Math', 'Geometry and Trigonometry', 'Lines, angles, and triangles', 'Apply angle relationships and triangle properties.', 270, true),
  ('math-right-triangles-trigonometry', 'Math', 'Geometry and Trigonometry', 'Right triangles and trigonometry', 'Use right-triangle relationships and trigonometric ratios.', 280, true),
  ('math-circles', 'Math', 'Geometry and Trigonometry', 'Circles', 'Solve problems involving circle equations, angles, arcs, and measurements.', 290, true)
on conflict (id) do update set
  section = excluded.section,
  domain = excluded.domain,
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- Keep legacy aggregate evidence intact for auditability, but do not display it
-- as an official College Board skill. It cannot be truthfully split among the
-- five distinct data-analysis skills without question-level evidence.
update public.skill_catalog
set is_active = false
where id = 'math-data';

-- Give every existing student a neutral progress row for newly introduced
-- skills. One-to-one legacy skill IDs retain their evidence through the upsert
-- above; no score is copied into multiple skills.
insert into public.student_skill_progress (student_id, skill_id)
select students.id, catalog.id
from public.student_profiles as students
cross join public.skill_catalog as catalog
where catalog.is_active
on conflict (student_id, skill_id) do nothing;

create index if not exists skill_catalog_active_sort_idx
  on public.skill_catalog (section, is_active, sort_order);
