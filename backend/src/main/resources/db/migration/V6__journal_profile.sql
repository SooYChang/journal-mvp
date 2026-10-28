ALTER TABLE journals ADD editorial_board CLOB;
ALTER TABLE journals ADD contact_email VARCHAR(255);
ALTER TABLE journals ADD open_access_note CLOB;
ALTER TABLE journals ADD publisher_full_name VARCHAR(255);
ALTER TABLE journals ADD about_publisher CLOB;
ALTER TABLE journals ADD publisher_city VARCHAR(120);
ALTER TABLE journals ADD publisher_contact VARCHAR(255);

UPDATE journals
SET publisher_full_name = 'Social Innovation Education & Research Association (사회혁신교육연구학회)',
    publisher_city = 'Pohang'
WHERE id = 'josier'
  AND publisher_full_name IS NULL;
