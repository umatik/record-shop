-- Admin może usuwać konta użytkowników (miękko: is_deleted), uprawnienie users:delete.
INSERT INTO permissions (id, name)
SELECT 12, 'users:delete'
WHERE EXISTS (SELECT 1 FROM roles WHERE name = 'admin')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
       JOIN permissions p ON p.name = 'users:delete'
WHERE r.name = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
