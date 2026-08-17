import { type ReactNode } from 'react';

interface KioskLayoutProps {
  header: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
}

/**
 * 현장 키오스크/태블릿을 위한 전체 화면 레이아웃
 * 헤더, 중앙 컨텐츠, 하단 푸터 액션 영역으로 구성됩니다.
 */
export function KioskLayout({ header, content, footer }: KioskLayoutProps) {
  return (
    <div className="flex flex-col h-full min-h-screen bg-bg-base text-text-primary">
      {/* 헤더 영역 */}
      <header className="flex-none p-6 border-b border-border-default bg-bg-surface">
        {header}
      </header>
      
      {/* 메인 컨텐츠 영역 (스크롤) */}
      <main className="flex-1 overflow-y-auto p-6">
        {content}
      </main>
      
      {/* 하단 액션 영역 (고정) */}
      {footer && (
        <footer className="flex-none p-6 border-t border-border-default bg-bg-surface shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {footer}
        </footer>
      )}
    </div>
  );
}
