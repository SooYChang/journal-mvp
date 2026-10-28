ALTER TABLE journals ADD membership_note CLOB;
ALTER TABLE journals ADD membership_email VARCHAR(255);

UPDATE journals
SET membership_email = 'syc@postech.ac.kr',
    membership_note = 'To read a PDF, apply for Reader membership. To write notes on a PDF, apply for Annotator membership. Annotator membership is limited to qualified and trustworthy members.

Send your name, affiliation, and the membership you are requesting. For Annotator membership, also give a short reason why you should be allowed to write notes.'
WHERE id = 'josier'
  AND membership_email IS NULL;
