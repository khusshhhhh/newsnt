-- Widens the audit trail (0008_activity_log.sql) to cover the new entity
-- types introduced alongside inquiries, reviews, project photos and finishes,
-- so logActivity() can log against them the same way it already does for
-- product/series/category.

alter table activity_log drop constraint if exists activity_log_entity_type_check;
alter table activity_log add constraint activity_log_entity_type_check
  check (entity_type in ('product', 'series', 'category', 'inquiry', 'review', 'project_photo', 'finish'));
