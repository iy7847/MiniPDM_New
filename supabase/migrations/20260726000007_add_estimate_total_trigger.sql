-- 견적 아이템(estimate_items)의 변경에 따라 견적서(estimates)의 총 금액(total_amount)을 자동 계산하는 트리거 함수

CREATE OR REPLACE FUNCTION public.update_estimate_total_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- INSERT 또는 UPDATE인 경우 NEW.estimate_id를 기준으로 합산
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.estimates
        SET total_amount = (
            SELECT COALESCE(SUM(supply_price), 0)
            FROM public.estimate_items
            WHERE estimate_id = NEW.estimate_id
        )
        WHERE id = NEW.estimate_id;
        RETURN NEW;
    -- DELETE인 경우 OLD.estimate_id를 기준으로 합산
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.estimates
        SET total_amount = (
            SELECT COALESCE(SUM(supply_price), 0)
            FROM public.estimate_items
            WHERE estimate_id = OLD.estimate_id
        )
        WHERE id = OLD.estimate_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있다면 삭제 후 재생성
DROP TRIGGER IF EXISTS trigger_update_estimate_total ON public.estimate_items;

CREATE TRIGGER trigger_update_estimate_total
AFTER INSERT OR UPDATE OF supply_price, qty OR DELETE
ON public.estimate_items
FOR EACH ROW
EXECUTE FUNCTION public.update_estimate_total_amount();
