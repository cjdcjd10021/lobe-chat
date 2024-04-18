import { SpeedInsights } from '@vercel/speed-insights/next';
import { ResolvingViewport } from 'next';
import { cookies } from 'next/headers';
import { PropsWithChildren } from 'react';
import { isRtlLang } from 'rtl-detect';

// 导入 Vercel Analytics 组件
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import Analytics from '@/components/Analytics';
import { DEFAULT_LANG, LOBE_LOCALE_COOKIE } from '@/const/locale';
import AuthProvider from '@/layout/AuthProvider';
import GlobalProvider from '@/layout/GlobalProvider';
import LayoutRoutes from '@/layout/routes';
import { isMobileDevice } from '@/utils/responsive';

const RootLayout = async ({ children }: PropsWithChildren) => {
  const cookieStore = cookies();

  const lang = cookieStore.get(LOBE_LOCALE_COOKIE);
  const direction = isRtlLang(lang?.value || DEFAULT_LANG) ? 'rtl' : 'ltr';

  return (
    <html dir={direction} lang={lang?.value || DEFAULT_LANG} suppressHydrationWarning>
      <head>
        {/* 在这里添加 Google Analytics 的代码 */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-VF2T9C8QF1"></script>
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-VF2T9C8QF1');
        ` }}></script>
      </head>
      <body>
        <GlobalProvider>
          <AuthProvider>
            <LayoutRoutes>{children}</LayoutRoutes>
          </AuthProvider>
        </GlobalProvider>
        {/* 在这里添加 Vercel Analytics 的组件 */}
        <VercelAnalytics />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
};

export default RootLayout;

export { default as metadata } from './metadata';

export const generateViewport = async (): ResolvingViewport => {
  const isMobile = isMobileDevice();

  const dynamicScale = isMobile ? { maximumScale: 1, userScalable: false } : {};

  return {
    ...dynamicScale,
    initialScale: 1,
    minimumScale: 1,
    themeColor: [
      { color: '#f8f8f8', media: '(prefers-color-scheme: light)' },
      { color: '#000', media: '(prefers-color-scheme: dark)' },
    ],
    viewportFit: 'cover',
    width: 'device-width',
  };
};
