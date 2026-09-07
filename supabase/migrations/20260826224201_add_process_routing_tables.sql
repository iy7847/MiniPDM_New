-- 1. routing_templates 테이블 생성
CREATE TABLE routing_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. routing_template_items 테이블 생성
CREATE TABLE routing_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES routing_templates(id) ON DELETE CASCADE,
    sequence_no INTEGER NOT NULL,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. process_logs 테이블 수정 (sequence_no, is_planned, process_id 추가)
ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS sequence_no INTEGER;
ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS is_planned BOOLEAN DEFAULT true;
ALTER TABLE process_logs ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES processes(id) ON DELETE SET NULL;

-- 4. RLS 활성화
ALTER TABLE routing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_template_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 추가
CREATE POLICY "Enable all operations for users based on company_id for routing_templates" ON routing_templates
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Enable all operations for users based on template company_id for routing_template_items" ON routing_template_items
    FOR ALL
    USING (
        template_id IN (
            SELECT id FROM routing_templates WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    )
    WITH CHECK (
        template_id IN (
            SELECT id FROM routing_templates WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );
