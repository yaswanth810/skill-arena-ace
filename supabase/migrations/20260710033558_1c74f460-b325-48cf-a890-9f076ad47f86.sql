DELETE FROM mock_tests WHERE slug='week-1-dppqa';

INSERT INTO mock_section_questions (section_id, question_id, question_order)
SELECT '9c114867-59b0-4acc-bec8-6c669d255bad', q.id, row_number() OVER (ORDER BY q.created_at)
FROM (SELECT q.id, q.created_at FROM questions q JOIN topics t ON t.id=q.topic_id
      WHERE t.category='quantitative' AND t.slug NOT IN ('ratios','discounts')
      ORDER BY q.created_at LIMIT 10) q;

INSERT INTO mock_section_questions (section_id, question_id, question_order)
SELECT '6239ae67-4f71-470d-a816-6ffa8acd5b47', q.id, row_number() OVER (ORDER BY q.created_at)
FROM (SELECT q.id, q.created_at FROM questions q JOIN topics t ON t.id=q.topic_id
      WHERE t.slug IN ('ratios','discounts') ORDER BY q.created_at LIMIT 8) q;

INSERT INTO mock_section_questions (section_id, question_id, question_order)
SELECT 'a91bacd4-ba3f-4360-b41c-45ef6fb85c4c', q.id, row_number() OVER (ORDER BY q.created_at DESC)
FROM (SELECT q.id, q.created_at FROM questions q JOIN topics t ON t.id=q.topic_id
      WHERE t.category='quantitative' ORDER BY q.created_at DESC LIMIT 10) q;

INSERT INTO mock_section_questions (section_id, question_id, question_order)
SELECT '3fb22e97-616b-4ae5-a336-ba30363bbae7', q.id, row_number() OVER (ORDER BY random())
FROM (SELECT id FROM questions ORDER BY random() LIMIT 10) q;