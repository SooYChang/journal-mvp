ALTER TABLE users ADD affiliation VARCHAR(255);

UPDATE journals
SET membership_note = 'Anyone may register as a Reader. Enter your name, email, affiliation, and a password, and you can read PDFs immediately.

To write notes on a PDF, apply for Annotator membership.
Annotator membership is limited to qualified and trustworthy members.

Email the address below with your name, affiliation, and a short reason why you should be allowed to write notes.'
WHERE id = 'josier'
  AND membership_note LIKE '%for Reader membership%';
