-- Two ranks above Diamond: Elite, then Signature at the top. Only the enum
-- grows; every existing account keeps the tier it holds.
ALTER TYPE "MemberTier" ADD VALUE 'ELITE';
ALTER TYPE "MemberTier" ADD VALUE 'SIGNATURE';
