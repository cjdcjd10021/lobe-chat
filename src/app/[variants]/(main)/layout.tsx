// 文件：src/app/[variants]/(main)/layout.tsx

import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ServerConfigStoreProvider } from '@/store/serverConfig/Provider';
import GlobalLayout from '@/layout/GlobalProvider';
import { isDesktop } from '@/const/version';

interface RootLayoutProps {
  children: ReactNode;
  modal: ReactNode;
  params: { variants: string };
}

const RootLayout = async ({ children, modal, params }: RootLayoutProps) => {
  // 仅限桌面端访问
  if (!isDesktop) {
    return notFound();
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        style={{
          minHeight:      '100vh',             // 视口高度
          display:        'flex',
          flexDirection:  'column',
          justifyContent: 'space-between',     // 顶部内容 + 底部 footer 自动撑满
        }}
      >
        {/* ——— 主体内容 (ServerLayout + GlobalProvider + children) ——— */}
        <NuqsAdapter>
          <ServerConfigStoreProvider>
            <GlobalLayout appearance="auto" isMobile={false} locale="">
              {children}
            </GlobalLayout>
          </ServerConfigStoreProvider>
        </NuqsAdapter>

        {/* ——— 合规 ICP 备案号 （服务器端渲染） ——— */}
        <footer
          style={{
            color:     '#999',
            fontSize:  '12px',
            textAlign: 'center',
            padding:   '16px 0',
          }}
        >
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#999', textDecoration: 'none' }}
          >
            京ICP备2024067157号-2
          </a>
        </footer>
      </body>
    </html>
  );
};

export default RootLayout;
