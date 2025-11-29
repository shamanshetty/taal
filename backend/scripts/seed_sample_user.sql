-- Supabase-ready seed script for Mohan Kumar (demo account).
-- Run inside the Supabase SQL editor or via psql to recreate all sample data.

DO $$
DECLARE
  v_user_id uuid := '52253808-d4e7-4903-b245-0e5500cf11fb';
  v_email   text := 'gautamgupta.1008@gmail.com';
  v_name    text := 'Mohan Kumar';

  v_client_bloom uuid;
  v_client_kora uuid;
  v_client_tiny uuid;

  v_tx_retainer_oct uuid;
  v_tx_retainer_nov uuid;
  v_tx_tinyowl_shoot uuid;
  v_tx_workspace_rent uuid;
  v_tx_equipment_lights uuid;
  v_tx_marketing_push uuid;
  v_tx_gst_payment uuid;
  v_tx_team_payout uuid;
  v_tx_tinyowl_balance uuid;
  v_tx_tax_transfer uuid;
  v_tx_travel_research uuid;
BEGIN
  INSERT INTO users (id, email, full_name)
  VALUES (v_user_id, v_email, v_name)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;

  DELETE FROM agent_memories   WHERE user_id = v_user_id;
  DELETE FROM whatsapp_nudges  WHERE user_id = v_user_id;
  DELETE FROM chat_messages    WHERE user_id = v_user_id;
  DELETE FROM tax_records      WHERE user_id = v_user_id;
  DELETE FROM pulse_history    WHERE user_id = v_user_id;
  DELETE FROM goals            WHERE user_id = v_user_id;
  DELETE FROM compliance_tasks WHERE user_id = v_user_id;
  DELETE FROM invoices         WHERE user_id = v_user_id;
  DELETE FROM transactions     WHERE user_id = v_user_id;
  DELETE FROM clients          WHERE user_id = v_user_id;
  DELETE FROM income_sources   WHERE user_id = v_user_id;

  INSERT INTO income_sources (user_id, source_name, source_type, amount, frequency) VALUES
    (v_user_id,'Design Retainer - Bloom Studios','monthly',   82000,'monthly'),
    (v_user_id,'Freelance Shoots & Campaigns',   'freelance', 45000,'monthly'),
    (v_user_id,'Weekend Workshops',              'gig',       12000,'weekly');

  INSERT INTO clients (id, user_id, name, email, phone, gst_number, notes)
  VALUES
    (gen_random_uuid(), v_user_id, 'Bloom Studios','finance@bloomstudios.in','+91 98765 43210','29ABCDE1234F1Z5','Flagship retainer client; quick payor.')
  RETURNING id INTO v_client_bloom;

  INSERT INTO clients (id, user_id, name, email, phone, gst_number, notes)
  VALUES
    (gen_random_uuid(), v_user_id, 'Koramangala Co-Work','ops@korawork.com','+91 99822 77441','29KORA5674L1Z2','Studio lease and utilities.')
  RETURNING id INTO v_client_kora;

  INSERT INTO clients (id, user_id, name, email, phone, gst_number, notes)
  VALUES
    (gen_random_uuid(), v_user_id, 'Tiny Owl Foods','accounts@tinyowlfoods.com','+91 98111 22114','29TINY4321Z5K6','Seasonal food-tech campaigns with large GST input.')
  RETURNING id INTO v_client_tiny;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, v_client_bloom, 'income',82000,'INR','Client Retainer','Bloom Studios',
    'October creative ops retainer','2025-10-05',NULL,true,'FREQ=MONTHLY;BYMONTHDAY=5',true,18.0,'cleared',
    false,NULL,true,ARRAY['retainer','client-payment'],'Auto-collected via ACH.','auto-sync'
  )
  RETURNING id INTO v_tx_retainer_oct;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, v_client_bloom, 'income',82000,'INR','Client Retainer','Bloom Studios',
    'November creative ops retainer','2025-11-05',NULL,true,'FREQ=MONTHLY;BYMONTHDAY=5',true,18.0,'cleared',
    false,NULL,true,ARRAY['retainer','client-payment'],'Includes strategy day add-on.','auto-sync'
  )
  RETURNING id INTO v_tx_retainer_nov;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, v_client_tiny, 'income',125000,'INR','Projects','Tiny Owl Foods',
    'Q4 product launch shoot (50% advance)','2025-10-18',NULL,false,NULL,true,12.0,'cleared',
    false,NULL,true,ARRAY['gst','campaign'],'Advance cleared; balance due on final delivery.','manual-entry'
  )
  RETURNING id INTO v_tx_tinyowl_shoot;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, v_client_kora, 'expense',18500,'INR','Workspace','Rent',
    'Koramangala studio lease','2025-10-01',NULL,true,'FREQ=MONTHLY;BYMONTHDAY=1',false,NULL,'cleared',
    false,NULL,true,ARRAY['workspace','fixed'],'Auto-debited from ICICI current account.','bank-sync'
  )
  RETURNING id INTO v_tx_workspace_rent;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, NULL, 'expense',42000,'INR','Equipment','Lighting',
    'Godox bi-color lighting kit','2025-10-10',NULL,false,NULL,true,18.0,'cleared',
    false,NULL,true,ARRAY['capital','gear'],'Claim ITC under CGST/SGST.','manual-entry'
  )
  RETURNING id INTO v_tx_equipment_lights;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, NULL, 'expense',12500,'INR','Marketing','Paid Media',
    'Instagram ads for holiday workshops','2025-10-22',NULL,false,NULL,false,NULL,'pending',
    true,'Waiting on Meta invoice email.',false,ARRAY['ads','growth'],'Auto-schedule receipt reminder.','ai-draft'
  )
  RETURNING id INTO v_tx_marketing_push;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, NULL, 'expense',36000,'INR','Taxes','GST',
    'GSTR-3B payment for October','2025-11-15',NULL,false,NULL,false,NULL,'pending',
    true,'Need challan upload + confirmation.',false,ARRAY['gst','compliance'],'Auto-nudge CA once challan ready.','manual-entry'
  )
  RETURNING id INTO v_tx_gst_payment;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, NULL, 'expense',54000,'INR','Payroll','Crew',
    'Associate crew payouts','2025-10-30',NULL,true,'FREQ=MONTHLY;BYMONTHDAY=30',false,NULL,'cleared',
    false,NULL,false,ARRAY['team','recurring'],'Split between UPI + bank transfer.','bank-sync'
  )
  RETURNING id INTO v_tx_team_payout;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, v_client_tiny, 'income',110000,'INR','Projects','Tiny Owl Foods',
    'Tiny Owl final delivery balance','2025-11-28','2025-12-12',false,NULL,false,NULL,'pending',
    false,NULL,false,ARRAY['scheduled','campaign'],'Will auto-match once payment hits.','ai-draft'
  )
  RETURNING id INTO v_tx_tinyowl_balance;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, NULL, 'transfer',25000,'INR','Internal Transfer','Tax Reserve',
    'Moved cash to tax-saver FD','2025-11-20',NULL,false,NULL,false,NULL,'cleared',
    false,NULL,true,ARRAY['reserve','cash-management'],'Helps maintain 6 months runway.','manual-entry'
  )
  RETURNING id INTO v_tx_tax_transfer;

  INSERT INTO transactions (
    id,user_id,client_id,type,amount,currency,category,subcategory,description,
    date,scheduled_for,is_recurring,recurrence_rule,gst_eligible,gst_rate,ledger_status,
    requires_follow_up,follow_up_reason,has_receipt,tags,notes,source
  )
  VALUES (
    gen_random_uuid(), v_user_id, NULL, 'expense',6800,'INR','Travel','Research',
    'Pune recce trip','2025-09-25',NULL,false,NULL,false,NULL,'cleared',
    false,NULL,true,ARRAY['travel','client-prospect'],'Attach boarding pass scan.','manual-entry'
  )
  RETURNING id INTO v_tx_travel_research;

  INSERT INTO invoices (
    user_id,client_id,number,description,issue_date,due_date,amount,currency,status,
    expected_payment_date,actual_payment_date,reminder_count,income_transaction_id
  ) VALUES
    (v_user_id,v_client_bloom,'INV-2025-109','Bloom Studios retainer - November 2025','2025-11-01','2025-11-10',82000,'INR','paid',
     '2025-11-09','2025-11-09',1,v_tx_retainer_nov),
    (v_user_id,v_client_tiny,'INV-2025-118','Tiny Owl Foods Q4 product shoot','2025-10-15','2025-10-25',125000,'INR','paid',
     '2025-10-22','2025-10-22',2,v_tx_tinyowl_shoot),
    (v_user_id,v_client_tiny,'INV-2025-204','Tiny Owl final payment (delivery balance)','2025-11-28','2025-12-12',110000,'INR','sent',
     '2025-12-15',NULL,0,v_tx_tinyowl_balance);

  INSERT INTO compliance_tasks (user_id,transaction_id,task_type,title,due_date,status,notes) VALUES
    (v_user_id,v_tx_gst_payment,'gst','File GSTR-3B for October','2025-11-20','in_progress','Need challan proof tied to gst_payment_oct.'),
    (v_user_id,v_tx_retainer_nov,'tax','Verify Bloom Studios TDS credit','2025-12-05','pending','Match Form 26AS once available.'),
    (v_user_id,v_tx_travel_research,'bookkeeping','Attach receipts for Pune recce travel','2025-11-30','completed','Boarding pass + hotel bills filed in Drive.');

  INSERT INTO goals (user_id,title,description,category,status,priority,target_amount,current_amount,deadline,monthly_contribution,required_monthly,icon_key,tags,notes) VALUES
    (v_user_id,'Save ₹6L by December','Emergency + tax buffer for 6 months runway.','Safety Net','active','high',600000,360000,'2025-12-31',50000,45000,'shield-check',ARRAY['savings','safety'],'Auto-transfer ₹50k whenever inflows exceed ₹80k.'),
    (v_user_id,'Gift fund for parents','Plan a surprise trip + shopping on 5 December.','Family','active','medium',30000,12000,'2025-12-05',7500,6000,'gift',ARRAY['family','experience'],'Triggered from chat → keep showing reminders.'),
    (v_user_id,'Camera upgrade (FX6)','Upgrade to Sony FX6 body with cine glass.','Equipment','paused','low',180000,65000,'2026-04-15',15000,12500,'camera',ARRAY['gear','studio'],'Paused until emergency buffer hits ₹5L.');

  INSERT INTO pulse_history (user_id,score,trend,volatility,savings_rate,calculated_at) VALUES
    (v_user_id,62,'up',0.280,28.4,'2025-06-30T09:00:00Z'),
    (v_user_id,65,'up',0.255,30.1,'2025-07-30T09:00:00Z'),
    (v_user_id,63,'stable',0.240,29.5,'2025-08-30T09:00:00Z'),
    (v_user_id,66,'up',0.230,31.0,'2025-09-30T09:00:00Z'),
    (v_user_id,68,'up',0.215,33.2,'2025-10-30T09:00:00Z'),
    (v_user_id,67,'down',0.245,32.1,'2025-11-30T09:00:00Z');

  INSERT INTO tax_records (user_id,financial_year,quarter,estimated_tax,paid_tax) VALUES
    (v_user_id,'2025-26','Q1',135000,90000),
    (v_user_id,'2025-26','Q2',142000,110000),
    (v_user_id,'2025-26','Q3',156000,36000),
    (v_user_id,'2025-26','Q4',160000,0);

  INSERT INTO whatsapp_nudges (user_id,message,sent_at,status) VALUES
    (v_user_id,'Heads-up! GSTR-3B for Oct is due on 20 Nov. Need challan screenshot.','2025-11-12T10:30:00Z','delivered'),
    (v_user_id,'Goal check-in: you''re 60% towards the ₹6L buffer. Move extra cash today?','2025-11-19T07:45:00Z','read'),
    (v_user_id,'Upload Pune travel receipts so we can close books for Q3.','2025-10-02T14:10:00Z','sent');

  INSERT INTO chat_messages (user_id,role,content,created_at) VALUES
    (v_user_id,'user','Hey, I''m Mohan. Please keep my Koramangala studio costs on watch.','2025-11-18T08:55:00Z'),
    (v_user_id,'assistant','Got it! I''ll surface workspace spikes or GST savings tied to the studio lease.','2025-11-18T08:55:00Z'),
    (v_user_id,'user','I want to save ₹6L by December without missing GST filings.','2025-11-18T08:57:00Z'),
    (v_user_id,'assistant','Tracking that as the top goal. I''ll auto-move surplus cash and remind you before each filing.','2025-11-18T08:58:00Z');

  INSERT INTO agent_memories (user_id,topic,content,metadata) VALUES
    (v_user_id,'profile','Mohan Kumar is a Bangalore-based creative director who prioritizes runway and GST compliance.',
     jsonb_build_object('source','demo_seed','confidence',0.86,'entities',ARRAY['Mohan Kumar','Bangalore','creative director'])),
    (v_user_id,'financial_preferences','Prefers automated cash sweeps once inflows exceed ₹80k and wants nudges for compliance tasks.',
     jsonb_build_object('source','demo_seed','confidence',0.79,'triggers',ARRAY['cash_sweep','compliance_nudge']));
END $$;
