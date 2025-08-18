-- 1) Archive table
CREATE TABLE IF NOT EXISTS RefreshTokens_Archive (
    TokenId            BINARY(16)   NOT NULL,
    Persoid            BINARY(16)   NOT NULL,
    SessionId          BINARY(16)   NOT NULL,
    HashedToken        VARCHAR(255) NOT NULL,
    AccessTokenJti     VARCHAR(50)  NOT NULL,
    ExpiresRollingUtc  DATETIME     NOT NULL,
    ExpiresAbsoluteUtc DATETIME     NOT NULL,
    RevokedUtc         DATETIME     NULL,
    Status             INT          NOT NULL,
    IsPersistent       BOOLEAN      NOT NULL DEFAULT FALSE,
    DeviceId           VARCHAR(255),
    UserAgent          VARCHAR(255),
    CreatedUtc         DATETIME     NOT NULL,
    ArchivedAt         DATETIME     NOT NULL DEFAULT UTC_TIMESTAMP(),
    INDEX ix_archived_at (ArchivedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Trigger (drop/create for idempotency)
DROP TRIGGER IF EXISTS trg_RefreshTokens_Archive;

DELIMITER $$
CREATE TRIGGER trg_RefreshTokens_Archive
BEFORE UPDATE ON RefreshTokens
FOR EACH ROW
BEGIN
  INSERT INTO RefreshTokens_Archive
    (TokenId, Persoid, SessionId, HashedToken, AccessTokenJti,
     ExpiresRollingUtc, ExpiresAbsoluteUtc, RevokedUtc, Status, IsPersistent,
     DeviceId, UserAgent, CreatedUtc, ArchivedAt)
  VALUES
    (OLD.TokenId, OLD.Persoid, OLD.SessionId, OLD.HashedToken, OLD.AccessTokenJti,
     OLD.ExpiresRollingUtc, OLD.ExpiresAbsoluteUtc, OLD.RevokedUtc, OLD.Status, OLD.IsPersistent,
     OLD.DeviceId, OLD.UserAgent, OLD.CreatedUtc, UTC_TIMESTAMP());
END$$
DELIMITER ;
