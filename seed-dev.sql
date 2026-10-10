-- Usuários de exemplo — SÓ para desenvolvimento local (o docker-compose.prod.yml não carrega este arquivo).
INSERT INTO Usuarios (Nome, Email, Role, FirebaseUid)
VALUES (
    'Admin SACD',
    'admin@sacd.com',
    'gerenciador',
    'firebase_uid_admin_123'
) ON CONFLICT (Email) DO NOTHING;

INSERT INTO Usuarios (Nome, Email, Role, FirebaseUid)
VALUES (
    'Cidadão Teste',
    'cidadao@sacd.com',
    'cidadao',
    'firebase_uid_cidadao_456'
) ON CONFLICT (Email) DO NOTHING;
