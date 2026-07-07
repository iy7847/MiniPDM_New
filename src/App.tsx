import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import {
  BaseInput,
  CurrencyInput,
  PhoneInput,
  BizNoInput,
  Button,
  Card,
  Badge
} from '@/design-system'
import './index.css'

function App() {
  const [currency, setCurrency] = useState('')
  const [phone, setPhone] = useState('')
  const [bizNo, setBizNo] = useState('')

  return (
    <div className="w-full min-h-screen bg-bg-base text-text-primary p-8 flex justify-center">
      <div className="max-w-2xl w-full flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-brand-500 mb-2">Design System UI 검증</h1>
          <p className="text-text-secondary">ui_engineer 에이전트가 만든 공통 컴포넌트 목록입니다.</p>
        </div>

        <Card className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold border-b border-border-default pb-2">1. Formatted Inputs</h2>
          <div className="grid grid-cols-2 gap-4">
            <BaseInput label="기본 입력창" placeholder="일반 텍스트 입력..." />
            <BaseInput label="에러 상태" placeholder="에러가 있습니다." error="올바르지 않은 값입니다." />
            
            <CurrencyInput 
              label="단가 입력 (Currency)" 
              value={currency} 
              onChange={setCurrency} 
            />
            
            <PhoneInput 
              label="전화번호 (Phone)" 
              value={phone} 
              onChange={setPhone} 
            />
            
            <BizNoInput 
              label="사업자번호 (BizNo)" 
              value={bizNo} 
              onChange={setBizNo} 
            />
          </div>
          <div className="p-4 bg-bg-base rounded-md border border-border-default mt-2">
            <p className="text-sm font-semibold text-brand-500 mb-2">반환된 순수 데이터 확인</p>
            <p className="text-sm">Currency: <span className="text-success">{currency}</span></p>
            <p className="text-sm">Phone: <span className="text-success">{phone}</span></p>
            <p className="text-sm">BizNo: <span className="text-success">{bizNo}</span></p>
          </div>
        </Card>

        <Card className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold border-b border-border-default pb-2">2. Buttons & Badges</h2>
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-center">
              <Button variant="primary" icon={<Plus size={16} />}>신규 등록</Button>
              <Button variant="secondary" icon={<Search size={16} />} iconPosition="right">조회하기</Button>
              <Button variant="danger">삭제</Button>
              <Button variant="ghost">취소</Button>
            </div>
            
            <div className="flex gap-4 items-center mt-4">
              <Badge variant="default">대기중</Badge>
              <Badge variant="success">결제완료</Badge>
              <Badge variant="warning">배송지연</Badge>
              <Badge variant="danger">취소됨</Badge>
            </div>
          </div>
        </Card>

      </div>
    </div>
  )
}

export default App
