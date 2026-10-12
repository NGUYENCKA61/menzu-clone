-- An account's warranty report has no second round (the owner, 12/10/2026:
-- "bao hanh doi voi tai khoan khong can phai bo sung them thong tin dot 2"):
-- its ticket is the desk's from the moment it is made. Count every account
-- ticket's round as done when it was made, so none keeps waiting on answers
-- nobody will be asked for. Only rows still unstamped.
UPDATE "warranty_requests" AS w
SET "detailsDoneAt" = w."createdAt"
FROM "orders" AS o
JOIN "products" AS p ON p."id" = o."productId"
WHERE o."id" = w."orderId"
  AND p."productType" = 'ACCOUNT_GAME'
  AND w."detailsDoneAt" IS NULL;
