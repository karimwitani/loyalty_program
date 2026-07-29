SET check_function_bodies = false;
CREATE FUNCTION public.fn_decrement_balance(p_balance_id uuid, p_amount integer)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_balance_transaction_id uuid;
BEGIN
	IF p_amount < 1 THEN
		RAISE EXCEPTION 'amout should be positive';
	END IF;

	INSERT INTO balance_transactions (balance_id, type, amount )
	VALUES (p_balance_id, 'debit', p_amount)
	RETURNING id INTO v_balance_transaction_id;
	
	UPDATE balances SET balance = balance - p_amount WHERE id = p_balance_id;
	
	return v_balance_transaction_id;
END
$function$;
REVOKE ALL ON FUNCTION public.fn_increment_balance(uuid, integer) FROM service_role;
