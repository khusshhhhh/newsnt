-- The admin activity log is retired (see 0033): nothing reads or writes it,
-- and no function, view or trigger references it. Drop the table and its
-- history. Its indexes and RLS policies go with it.

drop table if exists activity_log;
