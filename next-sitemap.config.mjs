import { glob } from 'glob';

// 直接设置 siteUrl 为你的目标域名
const siteUrl = 'https://www.geminiapi.org/';

/** @type {import('next-sitemap').IConfig} */
const config = {
  additionalPaths: async () => {
    const routes = await glob('src/app/**/page.{md,mdx,ts,tsx}', {
      cwd: new URL('.', import.meta.url).pathname,
    });

    const publicRoutes = routes.filter(
      (page) => !page.split('/').some((folder) => folder.startsWith('_')),
    );

    const publicRoutesWithoutRouteGroups = publicRoutes.map((page) =>
      page
        .split('/')
        .filter((folder) => !folder.startsWith('(') && !folder.endsWith(')'))
        .join('/'),
    );

    const locs = publicRoutesWithoutRouteGroups.map((route) => {
      const path = route.replace(/^src\/app/, '').replace(/\/[^/]+$/, '');
      const loc = path === '' ? siteUrl : `${siteUrl}${path}`;
      return loc;
    });

    const paths = locs.map((loc) => ({
      changefreq: 'daily',
      lastmod: new Date().toISOString(),
      loc,
      priority: 0.7,
    }));

    return paths;
  },
  siteUrl,
  generateRobotsTxt: true,
};

export default config;
