-- Correct the Math catalog to the official PSAT 8/9 scope.
-- Sources verified 2026-08-31:
-- https://satsuite.collegeboard.org/in-school-assessments/whats-on-the-test/psat-8-9/math
-- https://satsuite.collegeboard.org/media/pdf/assessment-framework-for-digital-sat-suite.pdf
--
-- Historical progress and assignments are retained for auditability. These
-- skills are only removed from the active catalog and future roadmap/planning.

update public.skill_catalog
set is_active = false
where id in (
  'math-inference',
  'math-statistical-claims',
  'math-right-triangles-trigonometry',
  'math-circles'
);

update public.skill_catalog
set
  domain = 'Geometry',
  name = 'Area and volume',
  description = 'Solve problems involving area, perimeter, surface area, volume, scale factors, and composite figures.'
where id = 'math-area-volume';

update public.skill_catalog
set
  domain = 'Geometry',
  name = 'Lines, angles, and triangles, including right triangles',
  description = 'Apply angle and triangle relationships, including right-triangle relationships, without trigonometric ratios.'
where id = 'math-lines-angles';

comment on table public.skill_catalog is
  'Official PSAT 8/9 taxonomy only. Broader SAT Suite skills remain inactive for historical auditability.';
