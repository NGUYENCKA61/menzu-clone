-- The FAQ shelf stops holding articles (the owner, 01/10/2026: "FAQ xóa các
-- bài viết đi" — the questions themselves live in the settings). What it held
-- were the "… Là Gì?" concept pieces, which is the new GLOSSARY shelf
-- ("Khái niệm và thuật ngữ"). Moved, not deleted. Its own migration: a new
-- enum value cannot be used in the transaction that adds it.
UPDATE "doc_articles" SET "category" = 'GLOSSARY' WHERE "category" = 'FAQ';
