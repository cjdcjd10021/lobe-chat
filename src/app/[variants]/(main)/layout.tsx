// src/app/[variants]/(main)/layout.tsx

import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ServerConfigStoreProvider } from '@/store/serverConfig/Provider';
import GlobalLayout from '@/layout/GlobalProvider';
import { isDesktop } from '@/const/version';

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = async ({ children }: RootLayoutProps) => {
  if (!isDesktop) {
    return notFound();
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        style={{
          display:        'flex',
          flexDirection:  'column',
          justifyContent: 'space-between',
          minHeight:      '100vh',
        }}
      >
        {/* 主体内容 */}
        <NuqsAdapter>
          <ServerConfigStoreProvider>
            <GlobalLayout appearance="auto" isMobile={false} locale="">
              {children}
            </GlobalLayout>
          </ServerConfigStoreProvider>
        </NuqsAdapter>

        {/* 底部备案号 */}
        <footer
          style={{
            color:     '#999',
            fontSize:  '12px',
            padding:   '16px 0',
            textAlign: 'center',
          }}
        >
          <a
            href="https://beian.miit.gov.cn/"
            rel="noreferrer"
            style={{ color: '#999', textDecoration: 'none' }}
            target="_blank"
          >
            京ICP备2024067157号-2
          </a>
        </footer>
      </body>
    </html>
  );
};

export default RootLayout;
