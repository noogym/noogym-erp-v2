-- Prevent duplicate member identity fields inside the same organization.
UPDATE `Member` SET `email` = LOWER(TRIM(`email`)) WHERE `email` IS NOT NULL;
UPDATE `Member` SET `phone` = TRIM(`phone`) WHERE `phone` IS NOT NULL;
UPDATE `Member` SET `documentNumber` = TRIM(`documentNumber`) WHERE `documentNumber` IS NOT NULL;

UPDATE `Member` SET `email` = NULL WHERE `email` = '';
UPDATE `Member` SET `phone` = NULL WHERE `phone` = '';
UPDATE `Member` SET `documentNumber` = NULL WHERE `documentNumber` = '' OR `documentNumber` = '000000000LA000';

UPDATE `Member` m
JOIN (
  SELECT `id`
  FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (PARTITION BY `organizationId`, `email` ORDER BY `createdAt`, `id`) AS duplicateRank
    FROM `Member`
    WHERE `email` IS NOT NULL
  ) ranked
  WHERE ranked.duplicateRank > 1
) duplicate ON duplicate.`id` = m.`id`
SET m.`email` = NULL;

UPDATE `Member` m
JOIN (
  SELECT `id`
  FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (PARTITION BY `organizationId`, `phone` ORDER BY `createdAt`, `id`) AS duplicateRank
    FROM `Member`
    WHERE `phone` IS NOT NULL
  ) ranked
  WHERE ranked.duplicateRank > 1
) duplicate ON duplicate.`id` = m.`id`
SET m.`phone` = NULL;

UPDATE `Member` m
JOIN (
  SELECT `id`
  FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (PARTITION BY `organizationId`, `documentNumber` ORDER BY `createdAt`, `id`) AS duplicateRank
    FROM `Member`
    WHERE `documentNumber` IS NOT NULL
  ) ranked
  WHERE ranked.duplicateRank > 1
) duplicate ON duplicate.`id` = m.`id`
SET m.`documentNumber` = NULL;

CREATE UNIQUE INDEX `Member_organizationId_email_key` ON `Member`(`organizationId`, `email`);
CREATE UNIQUE INDEX `Member_organizationId_phone_key` ON `Member`(`organizationId`, `phone`);
CREATE UNIQUE INDEX `Member_organizationId_documentNumber_key` ON `Member`(`organizationId`, `documentNumber`);
